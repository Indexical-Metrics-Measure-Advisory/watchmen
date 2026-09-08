// API configuration and header management
import { authService } from '@/services/authService';
import { getAIServiceHost, getServiceHost, getWatchmenCoreHost } from './utils';

export const API_BASE_URL = getServiceHost();
export const API_AI_URL = getAIServiceHost();
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

// Registered by the app/auth layer (AuthContext) to clear the session and
// redirect to the login page when any API call answers 401. Kept as a callback
// so this module does not need to know about routing or storage details.
let unauthorizedHandler: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  unauthorizedHandler = handler;
};

// Helper function to check if the response is ok
export const checkResponse = async (response: Response) => {
  if (!response.ok) {
    if (response.status === 401) {
      unauthorizedHandler?.();
    }
    const errorData = await response.json().catch(() => ({}));
    // FastAPI error responses carry the message in `detail` (string or validation error array)
    const detail = typeof errorData.detail === 'string' ? errorData.detail : undefined;
    throw new Error(errorData.message || detail || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};