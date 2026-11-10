import { checkResponse, getDefaultHeaders, TASKHUB_API_BASE_URL } from '@/utils/apiConfig';

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${TASKHUB_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...getDefaultHeaders(),
      ...init.headers
    }
  });
  return await checkResponse(response) as T;
}

export const jsonBody = (value: unknown): RequestInit => ({ body: JSON.stringify(value) });
