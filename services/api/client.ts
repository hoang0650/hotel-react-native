import { API_CONFIG } from './config';
import { Platform } from 'react-native';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  useApiPrefix?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private apiPrefix: string;
  private timeout: number;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    this.apiPrefix = API_CONFIG.API_PREFIX;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, useApiPrefix = true } = options;
    
    const url = useApiPrefix 
      ? `${this.baseUrl}${this.apiPrefix}${endpoint}`
      : `${this.baseUrl}${endpoint}`;

    console.log(`[API] ${method} ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      };

      if (Platform.OS === 'web') {
        fetchOptions.mode = 'cors';
      }

      const response = await fetch(url, fetchOptions);

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[API Error] ${response.status}: ${errorText}`);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`[API Response] ${endpoint}:`, data);
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('[API] CORS or network error - server may not allow requests from this origin');
        throw new Error('Network error: Unable to connect to server. This may be due to CORS restrictions.');
      }
      throw error;
    }
  }

  async get<T>(endpoint: string, useApiPrefix = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', useApiPrefix });
  }

  async post<T>(endpoint: string, body?: unknown, useApiPrefix = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body, useApiPrefix });
  }

  async put<T>(endpoint: string, body?: unknown, useApiPrefix = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body, useApiPrefix });
  }

  async patch<T>(endpoint: string, body?: unknown, useApiPrefix = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body, useApiPrefix });
  }

  async delete<T>(endpoint: string, useApiPrefix = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', useApiPrefix });
  }
}

export const apiClient = new ApiClient();
