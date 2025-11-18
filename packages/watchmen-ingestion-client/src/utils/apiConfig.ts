// API configuration and header management
import { authService } from '@/services/authService';
import jsonBigint from 'json-bigint';
import { getServiceHost } from './utils';

export const API_BASE_URL = getServiceHost()

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
    const errorText = await response.text().catch(() => '');
    let errorData: any = {};
    try {
      const JSONbigString = jsonBigint({ storeAsString: true });
      errorData = errorText ? JSONbigString.parse(errorText) : {};
    } catch {
      try {
        errorData = errorText ? JSON.parse(errorText) : {};
      } catch {
        errorData = {};
      }
    }
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  const text = await response.text();
  try {
    const JSONbigString = jsonBigint({ storeAsString: true });
    return JSONbigString.parse(text);
  } catch {
    return JSON.parse(text);
  }
};