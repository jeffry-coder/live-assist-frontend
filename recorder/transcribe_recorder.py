#!/usr/bin/env python3
import asyncio
import datetime
import pathlib
import signal
import subprocess
import sys
import threading
import time
import json
import os
import boto3
import uuid
import requests
from amazon_transcribe.client import TranscribeStreamingClient
from amazon_transcribe.handlers import TranscriptResultStreamHandler
from amazon_transcribe.model import TranscriptEvent

# ─── Logging ─────────────────────────────────────────────────────────────────
activity_log = []

def log_activity(message: str) -> None:
    """Log activity with timestamp"""
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    entry = f"[{timestamp}] {message}"
    activity_log.append(entry)
    print(entry, flush=True)

def dump_log() -> None:
    """Dump all logged activities"""
    print("\n" + "="*50, flush=True)
    print("ACTIVITY LOG DUMP", flush=True)
    print("="*50, flush=True)
    for entry in activity_log:
        print(entry, flush=True)
    print("="*50, flush=True)

# ─── Settings ────────────────────────────────────────────────────────────────
REC_SECONDS = 15
MIC_SOURCE = "default"
SYS_SOURCE = "@DEFAULT_MONITOR@"
SAMPLE_RATE = 16000
CHUNK_SIZE = 1024 * 2  # 2KB chunks for streaming

# Generate unique session ID for this run
SESSION_ID = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

# API Configuration
API_ENDPOINT = "https://egy9qthh94.execute-api.ap-southeast-2.amazonaws.com/default/callAgent"
CALL_ID = str(uuid.uuid4())
window_counter = 0
CLIENT_EMAIL = "main.jac.mil@gmail.com"  # Default email - can be updated via parameter

# ─── Transcription Storage ──────────────────────────────────────────────────
transcription_buffer = {
    'mic': [],
    'system': []
}

# Add thread lock for transcription buffer synchronization
transcription_lock = threading.Lock()

# Recording readiness tracking
recording_ready = threading.Event()
streams_ready = {'mic': False, 'system': False}

class TranscriptionHandler(TranscriptResultStreamHandler):
    def __init__(self, output_stream, channel_name):
        super().__init__(output_stream)
        self.channel_name = channel_name
        self.last_print_time = 0
        self.events_received = 0
        self.chunks_processed = 0
    
    async def handle_transcript_event(self, transcript_event: TranscriptEvent):
        self.events_received += 1
        
        results = transcript_event.transcript.results
        if len(results) == 0:
            # Just log every 50th empty event to avoid spam
            if self.events_received % 50 == 0:
                log_activity(f"🔍 [{self.channel_name}]: Event #{self.events_received} - no speech detected (audio flowing)")
            return
        
        for i, result in enumerate(results):
            for j, alt in enumerate(result.alternatives):
                transcript = alt.transcript
                confidence = getattr(alt, 'confidence', None)
                
                if not result.is_partial and transcript.strip():
                    timestamp = datetime.datetime.now().isoformat() + "Z"
                    
                    # Use thread lock to safely add to transcription buffer
                    with transcription_lock:
                        transcription_buffer[self.channel_name].append({
                            'timestamp': timestamp,
                            'text': transcript
                        })
                        buffer_size = len(transcription_buffer[self.channel_name])
                    
                    conf_str = f" (confidence: {confidence:.2f})" if confidence else ""
                    log_activity(f"🎙️ [{self.channel_name.upper()}] FINAL: {transcript}{conf_str}")
                    log_activity(f"📝 [{self.channel_name.upper()}] BUFFER: Added transcript (buffer size: {buffer_size})")
                elif result.is_partial and transcript.strip():
                    log_activity(f"🔄 [{self.channel_name.upper()}] PARTIAL: {transcript}")

# ─── Audio Stream Generator ─────────────────────────────────────────────────
async def mic_stream():
    """Generate audio stream from microphone"""
    cmd = [
        "ffmpeg",
        "-f", "pulse", "-i", MIC_SOURCE,
        "-ar", str(SAMPLE_RATE),
        "-ac", "1",  # mono
        "-acodec", "pcm_s16le",
        "-f", "s16le",
        "-"
    ]
    
    log_activity(f"🔍 DEBUG [MIC]: Starting ffmpeg with command: {' '.join(cmd)}")
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    chunk_count = 0
    try:
        while True:
            chunk = proc.stdout.read(CHUNK_SIZE)
            if not chunk:
                log_activity(f"🔍 DEBUG [MIC]: No more chunks, breaking (total chunks: {chunk_count})")
                break
            chunk_count += 1
            if chunk_count % 500 == 0:  # Log every 500 chunks
                log_activity(f"🔍 [MIC]: Sent chunk #{chunk_count} ({len(chunk)} bytes)")
            yield chunk
    except Exception as e:
        log_activity(f"❌ DEBUG [MIC]: Stream error: {e}")
    finally:
        try:
            if proc.poll() is None:
                proc.terminate()
            if proc.stderr and not proc.stderr.closed:
                stderr = proc.stderr.read().decode('utf-8', errors='ignore')
                if stderr:
                    log_activity(f"🔍 DEBUG [MIC]: FFmpeg stderr: {stderr}")
            proc.wait()
        except Exception as cleanup_error:
            log_activity(f"🔍 DEBUG [MIC]: Cleanup error: {cleanup_error}")
        log_activity(f"🔍 DEBUG [MIC]: Stream ended, total chunks: {chunk_count}")

async def system_stream():
    """Generate audio stream from system audio"""
    cmd = [
        "ffmpeg",
        "-f", "pulse", "-i", SYS_SOURCE,
        "-ar", str(SAMPLE_RATE),
        "-ac", "1",  # mono
        "-acodec", "pcm_s16le",
        "-f", "s16le",
        "-"
    ]
    
    log_activity(f"🔍 DEBUG [SYSTEM]: Starting ffmpeg with command: {' '.join(cmd)}")
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    chunk_count = 0
    try:
        while True:
            chunk = proc.stdout.read(CHUNK_SIZE)
            if not chunk:
                log_activity(f"🔍 DEBUG [SYSTEM]: No more chunks, breaking (total chunks: {chunk_count})")
                break
            chunk_count += 1
            if chunk_count % 500 == 0:  # Log every 500 chunks
                log_activity(f"🔍 [SYSTEM]: Sent chunk #{chunk_count} ({len(chunk)} bytes)")
            yield chunk
    except Exception as e:
        log_activity(f"❌ DEBUG [SYSTEM]: Stream error: {e}")
    finally:
        try:
            if proc.poll() is None:
                proc.terminate()
            if proc.stderr and not proc.stderr.closed:
                stderr = proc.stderr.read().decode('utf-8', errors='ignore')
                if stderr:
                    log_activity(f"🔍 DEBUG [SYSTEM]: FFmpeg stderr: {stderr}")
            proc.wait()
        except Exception as cleanup_error:
            log_activity(f"🔍 DEBUG [SYSTEM]: Cleanup error: {cleanup_error}")
        log_activity(f"🔍 DEBUG [SYSTEM]: Stream ended, total chunks: {chunk_count}")

# ─── Transcription Functions ────────────────────────────────────────────────
async def start_transcription(stream_generator, channel_name):
    """Start transcription for a given audio stream"""
    log_activity(f"🔍 DEBUG [{channel_name}]: Initializing transcription client for region ap-southeast-2")
    
    try:
        # Get credentials from the poweruser AWS profile
        log_activity(f"🔍 DEBUG [{channel_name}]: Creating boto3 session...")
        session = boto3.Session(profile_name='poweruser', region_name='ap-southeast-2')
        log_activity(f"🔍 DEBUG [{channel_name}]: Getting credentials...")
        credentials = session.get_credentials()
        
        # Set environment variables for amazon-transcribe client
        log_activity(f"🔍 DEBUG [{channel_name}]: Setting environment variables...")
        os.environ['AWS_ACCESS_KEY_ID'] = credentials.access_key
        os.environ['AWS_SECRET_ACCESS_KEY'] = credentials.secret_key
        if credentials.token:
            os.environ['AWS_SESSION_TOKEN'] = credentials.token
        os.environ['AWS_DEFAULT_REGION'] = 'ap-southeast-2'
        
        log_activity(f"🔍 DEBUG [{channel_name}]: Set AWS credentials from profile 'poweruser'")
        log_activity(f"🔍 DEBUG [{channel_name}]: Creating TranscribeStreamingClient...")
        client = TranscribeStreamingClient(region="ap-southeast-2")
        
        log_activity(f"🔍 DEBUG [{channel_name}]: Starting stream transcription...")
        stream = await client.start_stream_transcription(
            language_code="en-US",
            media_sample_rate_hz=SAMPLE_RATE,
            media_encoding="pcm"
        )
        log_activity(f"🔍 DEBUG [{channel_name}]: Stream transcription started successfully")
        
        # Create handler after stream is created
        handler = TranscriptionHandler(stream.output_stream, channel_name)
        
        chunks_sent = 0
        async def write_chunks():
            nonlocal chunks_sent
            log_activity(f"🔍 DEBUG [{channel_name}]: Starting to write audio chunks...")
            try:
                log_activity(f"🔍 DEBUG [{channel_name}]: About to call stream_generator()")
                stream_gen = stream_generator()
                log_activity(f"🔍 DEBUG [{channel_name}]: Stream generator created: {type(stream_gen)}")
                # Emit recording_active event when audio processing starts
                first_chunk = True
                async for chunk in stream_gen:
                    chunks_sent += 1
                    if first_chunk:
                        log_activity(f"🔍 [{channel_name}]: Audio processing started - first chunk received")
                        # Mark this stream as ready
                        streams_ready[channel_name] = True
                        # Check if both streams are ready
                        if all(streams_ready.values()):
                            if not recording_ready.is_set():
                                recording_ready.set()
                                log_activity("🚀 Both audio streams ready - Starting API timer!")
                        first_chunk = False
                    if chunks_sent % 500 == 0:  # Log every 500 chunks
                        log_activity(f"🔍 [{channel_name}]: Sent {chunks_sent} chunks to AWS")
                    await stream.input_stream.send_audio_event(audio_chunk=chunk)
                log_activity(f"🔍 DEBUG [{channel_name}]: Ending stream after {chunks_sent} chunks")
                await stream.input_stream.end_stream()
            except Exception as e:
                log_activity(f"❌ DEBUG [{channel_name}]: Error in write_chunks: {e}")
                import traceback
                log_activity(f"❌ DEBUG [{channel_name}]: write_chunks traceback: {traceback.format_exc()}")
        
        log_activity(f"🔍 DEBUG [{channel_name}]: Creating async tasks...")
        handler_task = asyncio.create_task(handler.handle_events())
        write_task = asyncio.create_task(write_chunks())
        
        log_activity(f"🔍 DEBUG [{channel_name}]: Starting concurrent tasks...")
        
        # Run tasks with reasonable timeout to prevent indefinite hanging
        try:
            await asyncio.wait_for(asyncio.gather(handler_task, write_task), timeout=300.0)  # 5 minute timeout
        except asyncio.TimeoutError:
            log_activity(f"⚠️ DEBUG [{channel_name}]: 5 minute timeout - Events received: {handler.events_received}")
            log_activity(f"⚠️ DEBUG [{channel_name}]: Handler task done: {handler_task.done()}, Write task done: {write_task.done()}")
            # Don't treat timeout as fatal error, just log and continue
        except asyncio.CancelledError:
            log_activity(f"🔍 DEBUG [{channel_name}]: Tasks cancelled gracefully")
        except Exception as task_error:
            log_activity(f"❌ DEBUG [{channel_name}]: Task error: {task_error}")
        finally:
            # Clean up tasks
            if not handler_task.done():
                handler_task.cancel()
            if not write_task.done():
                write_task.cancel()
            
            # Allow some time for any final transcripts to be processed
            await asyncio.sleep(0.5)
        
        log_activity(f"🔍 DEBUG [{channel_name}]: Transcription completed - Total events: {handler.events_received}")
        
    except Exception as e:
        log_activity(f"❌ Transcription error for {channel_name}: {str(e)}")
        import traceback
        log_activity(f"🔍 DEBUG [{channel_name}]: Full traceback: {traceback.format_exc()}")

# ─── API Request Sender ─────────────────────────────────────────────────────
def send_api_requests_periodically():
    """Send transcriptions to API periodically"""
    global window_counter
    
    # Wait for recording to be actually ready before starting timer
    log_activity("⏳ API sender waiting for recording streams to be ready...")
    recording_ready.wait()
    log_activity(f"✅ Recording ready! Starting {REC_SECONDS}-second API request timer...")
    
    while True:
        time.sleep(REC_SECONDS)
        
        # Capture buffer state at the moment of sending (not before)
        log_activity("⏰ API timer triggered - checking for transcriptions...")
        
        # Use thread lock to safely read and capture transcription buffer
        with transcription_lock:
            # Log current buffer state
            mic_count = len(transcription_buffer['mic'])
            system_count = len(transcription_buffer['system'])
            log_activity(f"📊 BUFFER STATUS: mic={mic_count}, system={system_count}")
            
            # Combine mic (agent) and system (customer) transcriptions
            all_transcriptions = []
            
            # Add mic transcriptions as agent
            for entry in transcription_buffer['mic']:
                all_transcriptions.append({
                    'speaker': 'agent',
                    'transcript': entry['text'],
                    'timestamp': entry['timestamp']
                })
            
            # Add system transcriptions as customer
            for entry in transcription_buffer['system']:
                all_transcriptions.append({
                    'speaker': 'customer', 
                    'transcript': entry['text'],
                    'timestamp': entry['timestamp']
                })
            
            # Sort by timestamp
            all_transcriptions.sort(key=lambda x: x['timestamp'])
            
            # Take recent transcriptions (last 10 or all if fewer)
            recent_transcriptions = all_transcriptions[-10:] if len(all_transcriptions) > 10 else all_transcriptions
            
            # Clear buffer immediately after capturing to prevent loss
            cleared_mic = len(transcription_buffer['mic'])
            cleared_system = len(transcription_buffer['system'])
            transcription_buffer['mic'] = []
            transcription_buffer['system'] = []
            
            # Log what we're about to send
            if recent_transcriptions:
                log_activity(f"📤 SENDING {len(recent_transcriptions)} transcriptions (buffer cleared: mic={cleared_mic}, system={cleared_system}):")
                for i, trans in enumerate(recent_transcriptions):
                    log_activity(f"  {i+1}. [{trans['speaker']}] {trans['transcript'][:50]}...")
            else:
                log_activity(f"📡 No transcriptions to send (cleared empty buffer: mic={cleared_mic}, system={cleared_system})")
        
        if recent_transcriptions:
            window_counter += 1
            
            payload = {
                "call_id": CALL_ID,
                "window_num": window_counter,
                "client_email": CLIENT_EMAIL,
                "turns": recent_transcriptions
            }
            
            try:
                log_activity(f"📤 Sending API request (window {window_counter})...")
                response = requests.post(API_ENDPOINT, json=payload, timeout=30)
                log_activity(f"📡 API Request sent (window {window_counter}): {response.status_code}")
                
                # Save response to JSON file
                response_data = {
                    "call_id": CALL_ID,
                    "window": window_counter,
                    "status_code": response.status_code,
                    "timestamp": datetime.datetime.now().isoformat(),
                    "request_payload": payload,
                    "response_body": response.text
                }
                
                filename = f"api_response_{SESSION_ID}_window_{window_counter}.json"
                with open(filename, 'w') as f:
                    json.dump(response_data, f, indent=2)
                log_activity(f"💾 Response saved to {filename}")
                
                # Send response data to frontend via special log message
                print(f"🔄 API_RESPONSE_DATA: {json.dumps(response_data)}", flush=True)
                
                if response.status_code != 200:
                    log_activity(f"❌ API Error: {response.text}")
            except Exception as e:
                log_activity(f"❌ API Request failed: {str(e)}")
        
        # Note: Buffer was already cleared immediately after capture to prevent race conditions

# ─── Main Recording Loop ────────────────────────────────────────────────────
async def recording_loop(running_evt: threading.Event, stop_evt: threading.Event):
    """Main async recording loop"""
    while not stop_evt.is_set():
        if running_evt.is_set():
            log_activity("🎤🔊 Starting real-time transcription...")
            
            # Reset readiness tracking for new recording session
            recording_ready.clear()
            streams_ready['mic'] = False
            streams_ready['system'] = False
            
            try:
                # Start both transcription streams concurrently with timeout for initialization
                await asyncio.wait_for(asyncio.gather(
                    start_transcription(mic_stream, "mic"),
                    start_transcription(system_stream, "system")
                ), timeout=600.0)  # 10 minute timeout for initialization
            except asyncio.TimeoutError:
                log_activity("❌ Recording initialization timeout after 10 minutes")
                log_activity("🔄 Will retry in next loop iteration...")
            except Exception as e:
                log_activity(f"❌ Recording error: {str(e)}")
                import traceback
                log_activity(f"❌ Full traceback: {traceback.format_exc()}")
                
        await asyncio.sleep(0.5)

# ─── Main Function ──────────────────────────────────────────────────────────
def main():
    running = threading.Event()
    stop = threading.Event()
    
    # Start periodic API request sender
    api_sender_thread = threading.Thread(target=send_api_requests_periodically, daemon=True)
    api_sender_thread.start()
    
    # Start async recording loop in a separate thread
    def run_async_loop():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(recording_loop(running, stop))
    
    recording_thread = threading.Thread(target=run_async_loop, daemon=True)
    recording_thread.start()
    
    log_activity(f"Real-time transcription recorder started (Session: {SESSION_ID})")
    log_activity(f"Call ID: {CALL_ID}")
    log_activity(f"API Endpoint: {API_ENDPOINT}")
    log_activity("Commands: s=start, p=pause, q=quit")
    print("Real-time transcription recorder ready (s=start, p=pause, q=quit)", flush=True)
    
    try:
        while not stop.is_set():
            cmd = sys.stdin.readline().strip().lower()
            if cmd == "s":
                running.set()
                log_activity("🟢 Transcription mode activated")
            elif cmd == "p":
                running.clear()
                log_activity("🟡 Transcription paused")
            elif cmd == "q":
                log_activity("🔴 Quit command received")
                stop.set()
            elif cmd:
                print("Valid commands: s / p / q", flush=True)
    except KeyboardInterrupt:
        log_activity("🔴 Keyboard interrupt received")
        stop.set()
    finally:
        dump_log()

# Graceful shutdown
def shutdown_handler(*_):
    log_activity("🔴 Shutdown signal received")
    dump_log()
    sys.exit(0)

signal.signal(signal.SIGINT, shutdown_handler)
signal.signal(signal.SIGTERM, shutdown_handler)

if __name__ == "__main__":
    main()