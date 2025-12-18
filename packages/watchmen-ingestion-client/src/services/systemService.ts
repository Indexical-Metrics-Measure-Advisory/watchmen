import { API_BASE_URL, getDefaultHeaders } from '../utils/apiConfig';

export class SystemService {
  private useMockData: boolean;

  constructor(useMockData: boolean = false) {
    this.useMockData = useMockData;
  }

  async fetchSystemEnv(): Promise<string> {
    if (this.useMockData) {
      return 'MOCK';
    }

    try {
      const response = await fetch(`${API_BASE_URL}/system/env`, {
        method: 'GET',
        headers: getDefaultHeaders(),
      });

      if (!response.ok) {
        console.warn(`Failed to fetch system env: ${response.status}`);
        return '';
      }

      const text = await response.text();
      try {
        // Try to parse as JSON first
        const data = JSON.parse(text);
        if (typeof data === 'string') {
            return data;
        }
        // If it's an object, check if it has a common value field, otherwise return stringified or empty?
        // Assuming if object, it might be { env: "VALUE" } or similar. 
        // Without spec, safe to return text if not a simple string JSON.
        // Or maybe the user expects the whole JSON? 
        // "This value... returned by calling system/env". 
        // Given it replaces "DESIGN", it must be a string.
        return String(data);
      } catch {
        // Not JSON, return raw text
        return text;
      }
    } catch (error) {
      console.error('Error fetching system env:', error);
      return '';
    }
  }
}

export const systemService = new SystemService();
