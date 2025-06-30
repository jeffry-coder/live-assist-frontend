import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

interface RecorderStatus {
  isRunning: boolean;
  isRecording: boolean;
  lastActivity: number;
}

interface RecorderActivity {
  type: string;
  timestamp: number;
  message: string;
}

export const RecorderStatus: React.FC = () => {
  const [status, setStatus] = useState<RecorderStatus>({
    isRunning: false,
    isRecording: false,
    lastActivity: 0
  });
  const [awsTransmitting, setAwsTransmitting] = useState(false);
  const [actuallyRecording, setActuallyRecording] = useState(false);

  useEffect(() => {
    // Get initial status
    window.electronAPI.getRecorderStatus().then(setStatus);

    // Listen for status updates
    window.electronAPI.onRecorderStatus((newStatus) => {
      setStatus(newStatus);
    });

    // Listen for activity updates
    window.electronAPI.onRecorderActivity((activity) => {
      if (activity.type === 'recording_active') {
        setActuallyRecording(true);
      } else if (activity.type === 'aws_transmission') {
        setAwsTransmitting(true);
        setTimeout(() => setAwsTransmitting(false), 3000);
      }
    });

    // Note: Recorder logs are handled globally in renderer.ts

    // Poll status every 2 seconds to sync UI state
    const statusInterval = setInterval(() => {
      window.electronAPI.getRecorderStatus().then(setStatus);
    }, 2000);

    // Cleanup on unmount
    return () => {
      clearInterval(statusInterval);
      window.electronAPI.removeAllListeners('recorder-status');
      window.electronAPI.removeAllListeners('recorder-activity');
      // Note: Don't remove recorder-log listener as it's global
    };
  }, []);

  const handleStartRecorder = async () => {
    const result = await window.electronAPI.startRecorder();
    if (result.success) {
      console.log('Recorder started:', result.message);
    } else {
      console.error('Failed to start recorder:', result.message);
    }
  };

  const handleStopRecorder = async () => {
    const result = await window.electronAPI.stopRecorder();
    if (result.success) {
      console.log('Recorder stopped:', result.message);
    } else {
      console.error('Failed to stop recorder:', result.message);
    }
  };

  const handleResetRecorder = async () => {
    const result = await window.electronAPI.resetRecorder();
    if (result.success) {
      console.log('Recorder reset:', result.message);
      // Force refresh status
      setTimeout(() => {
        window.electronAPI.getRecorderStatus().then(setStatus);
      }, 100);
    } else {
      console.error('Failed to reset recorder:', result.message);
    }
  };

  const handleStartRecording = async () => {
    const result = await window.electronAPI.sendRecorderCommand('s');
    if (result.success) {
      console.log('Recording started:', result.message);
      setActuallyRecording(false); // Reset until we see actual audio
    } else {
      console.error('Failed to start recording:', result.message);
    }
  };

  const handlePauseRecording = async () => {
    const result = await window.electronAPI.sendRecorderCommand('p');
    if (result.success) {
      console.log('Recording paused:', result.message);
      setActuallyRecording(false);
    } else {
      console.error('Failed to pause recording:', result.message);
    }
  };

  const getStatusColor = () => {
    if (!status.isRunning) return 'destructive';
    if (status.isRecording && actuallyRecording) return 'default';
    if (status.isRecording) return 'secondary';
    return 'secondary';
  };

  const getStatusText = () => {
    if (!status.isRunning) return 'Stopped';
    if (status.isRecording && actuallyRecording) return 'Recording';
    if (status.isRecording) return 'Starting...';
    return 'Ready';
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span>Audio Recorder</span>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusColor()}>
              {getStatusText()}
            </Badge>
            {awsTransmitting && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                🌐 Sending to AWS
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          {!status.isRunning ? (
            <>
              <Button onClick={handleStartRecorder} size="sm">
                Start Recorder
              </Button>
              <Button onClick={handleResetRecorder} variant="outline" size="sm">
                Reset
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleStopRecorder} variant="destructive" size="sm">
                Stop Recorder
              </Button>
              {!status.isRecording ? (
                <Button onClick={handleStartRecording} size="sm">
                  Start Recording
                </Button>
              ) : (
                <Button onClick={handlePauseRecording} variant="secondary" size="sm">
                  Pause Recording
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};