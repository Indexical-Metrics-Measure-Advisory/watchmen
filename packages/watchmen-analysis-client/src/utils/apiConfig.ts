// API configuration and header management
import { authService } from '@/services/authService';
import { getServiceHost, getWatchmenCoreHost } from './utils';

export const API_BASE_URL = getServiceHost();
export const WATCHMEN_API_BASE_URL = getWatchmenCoreHost();



export interface ApiHeaders {
  'Content-Type': string;
  Authorization?: string;
  // Add other headers as needed
}

export const getDefaultHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };

  // Get token from logged-in user via authService
  const token = authService.getStoredToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
};

// Helper function to check if the response is ok
export const checkResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};