import { apiService } from './api';
import { API_ENDPOINTS } from '@/constants/api';
import { Booking } from '@/types';

export interface GetBookingsParams {
  hotelId?: string;
  roomId?: string;
  startDate?: string;
  endDate?: string;
}

export class BookingsService {
  async getBookings(params?: GetBookingsParams): Promise<{ bookings: Booking[] }> {
    return apiService.get<{ bookings: Booking[] }>(
      API_ENDPOINTS.ROOMS.BOOKINGS,
      params
    );
  }

  async getBookingById(id: string): Promise<Booking> {
    return apiService.get<Booking>(API_ENDPOINTS.BOOKINGS.BY_ID(id));
  }
}

export const bookingsService = new BookingsService();

