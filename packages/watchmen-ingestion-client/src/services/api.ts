import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import jsonBigint from 'json-bigint';
import { ApiResponse, ApiError } from '../models/api.models';

// Define base API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/watchmen';
const API_TIMEOUT = 30000; // 30 seconds

// Create API service class
class ApiService {
  private instance: AxiosInstance;
  
  constructor() {
    // Create axios instance with default config
    const JSONbigString = jsonBigint({ storeAsString: true });
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      transformResponse: [function (data) {
        // Preserve large integers by parsing them as strings
        if (typeof data === 'string') {
          try {
            return JSONbigString.parse(data);
          } catch (e) {
            try {
              return JSON.parse(data);
            } catch {
              return data;
            }
          }
        }
        return data;
      }]
    });
    
    // Add request interceptor for auth tokens, etc.
    this.instance.interceptors.request.use(
      (config) => {
        // Get auth token from localStorage or other storage
        const token = localStorage.getItem('auth_token');
        
        // If token exists, add to headers
        if (token && config.headers) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Add response interceptor for error handling
    this.instance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => this.handleApiError(error)
    );
  }
  
  // Handle API errors
  private handleApiError(error: AxiosError): Promise<ApiError> {
    const { response, request, message } = error;
    
    // Handle different error scenarios
    if (response) {
      // Server responded with error status
      const errorData: ApiError = {
        message: (response.data as any)?.message || 'Server error occurred',
        status: response.status,
        data: response.data
      };
      
      // Handle specific status codes
      if (response.status === 401) {
        // Handle unauthorized (e.g., redirect to login)
        // You could dispatch an event or call a function here
        console.error('Authentication error: Please log in again');
      }
      
      return Promise.reject(errorData);
    } else if (request) {
      // Request was made but no response received
      return Promise.reject({
        message: 'No response from server. Please check your connection.'
      });
    } else {
      // Error in setting up the request
      return Promise.reject({
        message: message || 'Error setting up the request'
      });
    }
  }
  
  // Generic request method
  public async request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<T> = await this.instance.request(config);
      return {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      };
    } catch (error) {
      throw error;
    }
  }
  
  // Convenience methods for common HTTP verbs
  public async get<T>(url: string, params?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'GET',
      url,
      params,
      ...config
    });
  }
  
  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'POST',
      url,
      data,
      ...config
    });
  }
  
  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'PUT',
      url,
      data,
      ...config
    });
  }
  
  public async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'PATCH',
      url,
      data,
      ...config
    });
  }
  
  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'DELETE',
      url,
      ...config
    });
  }
}

// Export a singleton instance
export const apiService = new ApiService();

// Export default for flexibility
export default apiService;