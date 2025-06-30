import { contextBridge, ipcRenderer } from 'electron';

// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

contextBridge.exposeInMainWorld('electronAPI', {
  fetchCustomerInfo: (email: string) => ipcRenderer.invoke('fetch-customer-info', email),
  fetchTicketsByName: (customerName: string, limit: number = 100) => ipcRenderer.invoke('fetch-tickets-by-name', customerName, limit),
  fetchCallHistory: () => ipcRenderer.invoke('fetch-call-history'),
  fetchDynamoData: () => ipcRenderer.invoke('fetch-dynamo-data'),
  sendEmail: (emailData: { to: string; subject: string; body: string }) => ipcRenderer.invoke('send-email', emailData),
  
  // Recorder control
  startRecorder: () => ipcRenderer.invoke('start-recorder'),
  stopRecorder: () => ipcRenderer.invoke('stop-recorder'),
  resetRecorder: () => ipcRenderer.invoke('reset-recorder'),
  sendRecorderCommand: (command: string) => ipcRenderer.invoke('send-recorder-command', command),
  getRecorderStatus: () => ipcRenderer.invoke('get-recorder-status'),
  
  // Recorder event listeners
  onRecorderStatus: (callback: (status: any) => void) => {
    ipcRenderer.on('recorder-status', (event, status) => callback(status));
  },
  onRecorderActivity: (callback: (activity: any) => void) => {
    ipcRenderer.on('recorder-activity', (event, activity) => callback(activity));
  },
  onRecorderLog: (callback: (log: any) => void) => {
    ipcRenderer.on('recorder-log', (event, log) => callback(log));
  },
  onApiResponseData: (callback: (data: any) => void) => {
    ipcRenderer.on('api-response-data', (event, data) => callback(data));
  },
  
  // Cleanup listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
