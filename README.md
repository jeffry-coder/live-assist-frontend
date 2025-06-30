# Live Electron

A live call recording and transcription application built with Electron, React, TypeScript, and AWS services.

## Features

- **Real-time Audio Recording**: Records audio from microphone and system audio
- **Live Transcription**: Uses AWS Transcribe for real-time speech-to-text conversion
- **Customer Management**: Track customer interactions and analytics
- **Call Analytics**: Monitor call metrics and customer satisfaction
- **Modern UI**: Built with React, TypeScript, and Tailwind CSS
- **Cross-platform**: Desktop application built with Electron

## Architecture

### Frontend
- **Electron** - Cross-platform desktop application framework
- **React** - User interface library
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component library

### Backend Services
- **AWS Transcribe** - Real-time speech-to-text transcription
- **AWS S3** - Audio file storage
- **AWS Lambda** - Serverless API endpoints
- **DynamoDB** - Call data storage

### Audio Processing
- **Python scripts** - Handle audio recording and processing
- **FFmpeg/PulseAudio** - Audio capture and processing

## Getting Started

### Prerequisites
- Node.js (v16 or later)
- Python 3.x
- AWS CLI configured with appropriate permissions

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd live-electron
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Install Python dependencies:
```bash
cd recorder
pip install -r requirements.txt
```

### Development

1. Start the Electron application:
```bash
cd frontend
npm start
```

2. For web development:
```bash
npm run web
```

### Building

- Package the application:
```bash
npm run package
```

- Create distributable:
```bash
npm run make
```

## Project Structure

```
live-electron/
├── frontend/           # Electron React application
│   ├── src/           # Source code
│   ├── components/    # React components
│   └── services/      # API services
├── recorder/          # Python audio recording scripts
├── layers/           # AWS Lambda layers
└── node_modules/     # Dependencies
```
