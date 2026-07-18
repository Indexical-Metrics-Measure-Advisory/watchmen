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

/**
 * Return a shallow copy of `obj` with `null` and `undefined` values removed.
 *
 * Watchmen's Pydantic models declare optional fields as `field: Type = None` (Python idiom
 * for "optional, defaults to None"). Pydantic v2 accepts an **absent** key for such fields,
 * but a key explicitly set to JSON `null` is run through the field's validator and rejected
 * (e.g. `string_type`, `enum` errors). `JSON.stringify` keeps `null` keys (it only drops
 * `undefined`), so we strip nil values before serializing request bodies.
 */
export const omitNil = <T extends Record<string, any>>(obj: T): Partial<T> => {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
};

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