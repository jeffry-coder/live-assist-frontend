import { CustomerInfo } from '../types/customer';

export const fetchCustomerInfo = async (email: string): Promise<CustomerInfo> => {
  console.log('Fetching customer info for email:', email);
  
  try {
    // Check if we're in Electron environment
    if (window.electronAPI) {
      console.log('Using Electron IPC for API call');
      const data = await window.electronAPI.fetchCustomerInfo(email);
      console.log('Response data:', data);
      return data;
    } else {
      // Fallback to direct fetch for web environment
      console.log('Using direct fetch for API call');
      const API_BASE_URL = 'https://kehpecxde2.execute-api.ap-southeast-2.amazonaws.com/default';
      const url = `${API_BASE_URL}/getCustomerInfo?email=${encodeURIComponent(email)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      return data;
    }
  } catch (error) {
    console.error('API call error:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to API. Check your internet connection or CORS policy.');
    }
    throw error;
  }
};