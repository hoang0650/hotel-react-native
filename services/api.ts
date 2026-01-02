import { API_CONFIG } from '@/constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiService {
  private baseURL: string;
  private timeout: number;

  constructor() {
    // Backend không có /api prefix cho rooms endpoint
    // Rooms: /rooms (không có /api)
    // Users: /api/users
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  private getFullUrl(endpoint: string): string {
    // Nếu endpoint đã có /api thì không thêm nữa
    if (endpoint.startsWith('/api')) {
      return API_CONFIG.BASE_URL + endpoint;
    }
    // Backend mount routes (từ app.js):
    // - app.use('/users', usersRouter) - không có /api
    // - app.use('/rooms', roomsRouter) - không có /api
    // - app.use('/hotels', hotelsRouter) - không có /api
    // - app.use('/bookings', bookingsRouter) - không có /api
    // Vậy tất cả các routes này không có /api prefix
    if (endpoint.startsWith('/users') || 
        endpoint.startsWith('/rooms') || 
        endpoint.startsWith('/hotels') ||
        endpoint.startsWith('/bookings') ||
        endpoint.startsWith('/services') ||
        endpoint.startsWith('/financial-summary') ||
        endpoint.startsWith('/businesses') ||
        endpoint.startsWith('/staffs') ||
        endpoint.startsWith('/priceConfig') ||
        endpoint.startsWith('/shift-handover') ||
        endpoint.startsWith('/invoices') ||
        endpoint.startsWith('/sepay') ||
        endpoint.startsWith('/paypal') ||
        endpoint.startsWith('/crypto') ||
        endpoint.startsWith('/transactions') ||
        endpoint.startsWith('/bank-transfers') ||
        endpoint.startsWith('/files')) {
      return API_CONFIG.BASE_URL + endpoint;
    }
    // Các endpoint khác (như /api/settings) thêm /api
    return API_CONFIG.BASE_URL + API_CONFIG.API_PREFIX + endpoint;
  }

  private async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('token');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  private async getHeaders(
    includeAuth: boolean = true, 
    customHeaders?: HeadersInit,
    isFormData: boolean = false
  ): Promise<HeadersInit> {
    // Convert HeadersInit to a plain object for easier manipulation
    const headers: Record<string, string> = {};
    
    // Handle customHeaders (can be object, array, or Headers)
    if (customHeaders) {
      if (customHeaders instanceof Headers) {
        customHeaders.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(customHeaders)) {
        // Array of [key, value] pairs
        customHeaders.forEach(([key, value]) => {
          headers[key] = value;
        });
      } else {
        // Plain object
        Object.assign(headers, customHeaders);
      }
    }

    // Only set Content-Type if not already set and not FormData
    // For FormData, browser will automatically set Content-Type with boundary
    if (!isFormData && !headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (includeAuth) {
      const token = await this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = 'An error occurred';
      let errorData: any = null;

      try {
        errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }

      throw new ApiError(errorMessage, response.status, errorData);
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return {} as T;
    }

    return response.json();
  }

  async get<T>(
    endpoint: string,
    params?: Record<string, any>,
    includeAuth: boolean = true
  ): Promise<T> {
    let fullUrl = this.getFullUrl(endpoint);
    
    if (params) {
      const searchParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          searchParams.append(key, String(params[key]));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        fullUrl += '?' + queryString;
      }
    }

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: await this.getHeaders(includeAuth),
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(
    endpoint: string,
    data?: any,
    includeAuth: boolean = true,
    customHeaders?: HeadersInit | string
  ): Promise<T> {
    const fullUrl = this.getFullUrl(endpoint);
    console.log('POST Request:', fullUrl, data);
    
    // Check if data is FormData
    const isFormData = data instanceof FormData;
    
    // Handle customHeaders - can be string (for Content-Type) or HeadersInit
    let normalizedHeaders: HeadersInit | undefined;
    if (typeof customHeaders === 'string') {
      // If string, treat as Content-Type
      normalizedHeaders = { 'Content-Type': customHeaders };
    } else {
      normalizedHeaders = customHeaders;
    }
    
    // If FormData, don't stringify and don't set Content-Type (browser will set it with boundary)
    const body = isFormData ? data : (data ? JSON.stringify(data) : undefined);
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: await this.getHeaders(includeAuth, normalizedHeaders, isFormData),
      body,
    });

    return this.handleResponse<T>(response);
  }

  async put<T>(
    endpoint: string,
    data?: any,
    includeAuth: boolean = true
  ): Promise<T> {
    const fullUrl = this.getFullUrl(endpoint);
    const response = await fetch(fullUrl, {
      method: 'PUT',
      headers: await this.getHeaders(includeAuth),
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async patch<T>(
    endpoint: string,
    data?: any,
    includeAuth: boolean = true
  ): Promise<T> {
    const fullUrl = this.getFullUrl(endpoint);
    const response = await fetch(fullUrl, {
      method: 'PATCH',
      headers: await this.getHeaders(includeAuth),
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(
    endpoint: string,
    includeAuth: boolean = true
  ): Promise<T> {
    const fullUrl = this.getFullUrl(endpoint);
    const response = await fetch(fullUrl, {
      method: 'DELETE',
      headers: await this.getHeaders(includeAuth),
    });

    return this.handleResponse<T>(response);
  }
}

export const apiService = new ApiService();

