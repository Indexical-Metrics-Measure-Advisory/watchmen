import { authService } from '@/services/authService';

export const TASKHUB_API_BASE_URL = (import.meta.env.VITE_TASKHUB_API_BASE ?? '/watchmen/taskhub').replace(/\/$/, '');
export const WATCHMEN_API_BASE_URL = (import.meta.env.VITE_WATCHMEN_API_BASE ?? '/watchmen').replace(/\/$/, '');

export const getDefaultHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = authService.getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

let unauthorizedHandler: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  unauthorizedHandler = handler;
};

export const checkResponse = async (response: Response): Promise<any> => {
  if (!response.ok) {
    if (response.status === 401) unauthorizedHandler?.();
    const errorData = await response.json().catch(() => ({}));
    const detail = typeof errorData.detail === 'string' ? errorData.detail : undefined;
    throw new Error(errorData.message || detail || `HTTP error! status: ${response.status}`);
  }
  if (response.status === 204) return undefined;
  return response.json();
};
