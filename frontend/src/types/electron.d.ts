export interface ElectronAPI {
  fetchCustomerInfo: (email: string) => Promise<any>;
  fetchTicketsByName: (customerName: string, limit?: number) => Promise<any>;
  
  // Recorder control
  startRecorder: () => Promise<{ success: boolean; message: string }>;
  stopRecorder: () => Promise<{ success: boolean; message: string }>;
  resetRecorder: () => Promise<{ success: boolean; message: string }>;
  sendRecorderCommand: (command: string) => Promise<{ success: boolean; message: string }>;
  getRecorderStatus: () => Promise<{ isRunning: boolean; isRecording: boolean; lastActivity: number }>;
  
  // Recorder event listeners
  onRecorderStatus: (callback: (status: { isRunning: boolean; isRecording: boolean }) => void) => void;
  onRecorderActivity: (callback: (activity: { type: string; timestamp: number; message?: string }) => void) => void;
  onRecorderLog: (callback: (log: { message: string; timestamp: number }) => void) => void;
  onApiResponseData: (callback: (data: any) => void) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}