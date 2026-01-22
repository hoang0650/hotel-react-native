import { apiService } from './api';
import { API_ENDPOINTS } from '@/constants/api';
import { Service, ServiceCategory } from '@/types';

export class ServiceService {
  async getServices(hotelId?: string, category?: string): Promise<Service[]> {
    const params: any = {};
    if (hotelId) params.hotelId = hotelId;
    if (category) params.category = category;
    
    return apiService.get<Service[]>(API_ENDPOINTS.SERVICES.BASE, params);
  }

  async getAvailableServices(hotelId: string): Promise<any[]> {
    const params: any = { hotelId };
    const response = await apiService.get<any>(API_ENDPOINTS.SERVICES.AVAILABLE, params);
    const services = response?.data?.services || [];
    return Array.isArray(services)
      ? services.map((s: any) => ({
          ...s,
          id: s.id || s._id,
        }))
      : [];
  }

  async getServiceById(id: string): Promise<Service> {
    return apiService.get<Service>(API_ENDPOINTS.SERVICES.BY_ID(id));
  }

  async getServiceCategories(hotelId: string): Promise<string[]> {
    return apiService.get<string[]>(API_ENDPOINTS.SERVICES.CATEGORIES, { hotelId });
  }

  async createService(service: Partial<Service>): Promise<Service> {
    return apiService.post<Service>(API_ENDPOINTS.SERVICES.BASE, service);
  }

  async updateService(id: string, service: Partial<Service>): Promise<Service> {
    return apiService.put<Service>(API_ENDPOINTS.SERVICES.BY_ID(id), service);
  }

  async deleteService(id: string): Promise<void> {
    return apiService.delete<void>(API_ENDPOINTS.SERVICES.BY_ID(id));
  }

  async getAllServiceOrdersForStatistics(
    hotelId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    const params: any = {
      hotelId,
      page: '1',
      limit: '10000',
    };
    
    if (startDate) {
      params.startDate = startDate.toISOString();
    }
    
    if (endDate) {
      params.endDate = endDate.toISOString();
    }
    
    const response = await apiService.get<{ orders: any[], totalPages: number, currentPage: number }>(
      API_ENDPOINTS.SERVICES.ORDERS_BY_HOTEL,
      params
    );
    
    return response.orders || [];
  }
}

export const serviceService = new ServiceService();

