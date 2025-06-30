export interface DynamoData {
  created_at: string;
  customerTranscript: string;
  agentTranscript: string;
  aiTips: Array<{
    tag: string;
    content: string;
  }>;
  activityFeed: Array<{
    name: string;
    input?: string;
    output?: string;
    status: string;
  }>;
  call_id: string;
  window_number: number;
}

export interface DynamoResponse {
  latest_item: DynamoData;
}

class DynamoPollingService {
  private static instance: DynamoPollingService;
  private pollingInterval: NodeJS.Timeout | null = null;
  private currentData: DynamoData | null = null;
  private listeners: Array<(data: DynamoData) => void> = [];
  private readonly POLLING_INTERVAL = 5000; // 5 seconds
  private readonly API_URL = 'https://dflfkwhyc0.execute-api.ap-southeast-2.amazonaws.com/default/pollDynamo';
  private hasSeenInitialData: boolean = false;

  private constructor() {}

  static getInstance(): DynamoPollingService {
    if (!DynamoPollingService.instance) {
      DynamoPollingService.instance = new DynamoPollingService();
    }
    return DynamoPollingService.instance;
  }

  async fetchData(): Promise<DynamoData | null> {
    try {
      console.log('Polling DynamoDB API...');
      
      // Check if we're in Electron environment
      if (window.electronAPI && window.electronAPI.fetchDynamoData) {
        console.log('Using Electron IPC for DynamoDB API call');
        const data = await window.electronAPI.fetchDynamoData();
        console.log('Received data:', data);
        return data;
      } else {
        // Fallback to direct fetch for web environment
        console.log('Using direct fetch for DynamoDB API call');
        const response = await fetch(this.API_URL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const responseData: DynamoResponse = await response.json();
        console.log('Received data:', responseData.latest_item);
        return responseData.latest_item;
      }
    } catch (error) {
      console.error('Error fetching DynamoDB data:', error);
      return null;
    }
  }

  startPolling(): void {
    if (this.pollingInterval) {
      console.log('Polling already started, skipping');
      return;
    }

    console.log('Starting polling service');

    // Initial fetch only if we don't have data
    if (!this.currentData) {
      this.fetchData().then(data => {
        if (data) {
          console.log('Initial fetch completed, setting baseline data');
          this.currentData = data;
          this.notifyListeners(data);
        }
      });
    }

    // Start polling
    this.pollingInterval = setInterval(async () => {
      console.log('Polling interval triggered');
      const newData = await this.fetchData();
      if (newData) {
        if (this.hasDataChanged(newData)) {
          console.log('Data changed, updating and notifying');
          this.currentData = newData;
          this.notifyListeners(newData);
        } else {
          console.log('No data changes detected');
        }
      }
    }, this.POLLING_INTERVAL);
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  subscribe(callback: (data: DynamoData) => void): () => void {
    this.listeners.push(callback);
    
    // If we already have data, immediately call the callback
    if (this.currentData) {
      callback(this.currentData);
    }

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  getCurrentData(): DynamoData | null {
    return this.currentData;
  }

  private hasDataChanged(newData: DynamoData): boolean {
    if (!this.currentData) {
      console.log('No current data, treating as changed');
      return true;
    }

    // Compare key fields to detect changes
    const hasChanged = (
      this.currentData.created_at !== newData.created_at ||
      this.currentData.customerTranscript !== newData.customerTranscript ||
      this.currentData.agentTranscript !== newData.agentTranscript ||
      JSON.stringify(this.currentData.aiTips) !== JSON.stringify(newData.aiTips) ||
      JSON.stringify(this.currentData.activityFeed) !== JSON.stringify(newData.activityFeed) ||
      this.currentData.call_id !== newData.call_id ||
      this.currentData.window_number !== newData.window_number
    );
    
    console.log('Data changed:', hasChanged);
    if (hasChanged) {
      console.log('Old customer transcript:', this.currentData.customerTranscript);
      console.log('New customer transcript:', newData.customerTranscript);
    }
    
    return hasChanged;
  }

  private notifyListeners(data: DynamoData): void {
    console.log('Notifying listeners with data:', data);
    console.log('Number of listeners:', this.listeners.length);
    console.log('Has seen initial data:', this.hasSeenInitialData);
    
    if (!this.hasSeenInitialData) {
      console.log('First data notification - marking as seen but not notifying listeners');
      this.hasSeenInitialData = true;
      return;
    }
    
    console.log('Subsequent data - notifying all listeners');
    this.listeners.forEach(callback => callback(data));
  }

  // Reset data when starting a new session
  resetData(): void {
    console.log('Resetting data');
    this.currentData = null;
    this.hasSeenInitialData = false;
  }
}

export default DynamoPollingService;