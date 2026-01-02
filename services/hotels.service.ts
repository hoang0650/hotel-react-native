import { apiService } from './api';
import { API_ENDPOINTS } from '@/constants/api';
import { Hotel } from '@/types';

export class HotelsService {
  async getHotels(): Promise<Hotel[]> {
    return apiService.get<Hotel[]>(API_ENDPOINTS.HOTELS.BASE);
  }

  async getHotelById(id: string): Promise<Hotel> {
    return apiService.get<Hotel>(API_ENDPOINTS.HOTELS.BY_ID(id));
  }
}

export const hotelsService = new HotelsService();

