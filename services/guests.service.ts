import { apiService } from './api';
import { API_ENDPOINTS } from '@/constants/api';
import { Guest, GuestQuery } from '@/types';

export class GuestsService {
  async getGuests(query?: GuestQuery): Promise<{ guests: Guest[]; total: number }> {
    const params: any = {};
    if (query?.hotelId) params.hotelId = query.hotelId;
    if (query?.page) params.page = query.page;
    if (query?.limit) params.limit = query.limit;
    if (query?.search) params.search = query.search;
    if (query?.guestType) params.guestType = query.guestType;

    return apiService.get<{ guests: Guest[]; total: number }>('/guests', params);
  }

  async getGuestById(id: string): Promise<Guest> {
    return apiService.get<Guest>(`/guests/${id}`);
  }

  async createGuest(guest: Partial<Guest>): Promise<{ message: string; guest: Guest }> {
    return apiService.post<{ message: string; guest: Guest }>('/guests', guest);
  }

  async updateGuest(id: string, guest: Partial<Guest>): Promise<{ message: string; guest: Guest }> {
    return apiService.patch<{ message: string; guest: Guest }>(`/guests/${id}`, guest);
  }

  async deleteGuest(id: string): Promise<{ message: string }> {
    return apiService.delete<{ message: string }>(`/guests/${id}`);
  }

  async createBookingForGuest(
    guestId: string,
    request: {
      roomId: string;
      checkInDate: Date | string;
      checkOutDate?: Date | string;
      rateType?: 'hourly' | 'daily' | 'nightly';
      advancePayment?: number;
      notes?: string;
      adults?: number;
      children?: number;
    }
  ): Promise<any> {
    return apiService.post(`/guests/${guestId}/create-booking`, {
      ...request,
      checkInDate:
        typeof request.checkInDate === 'string'
          ? request.checkInDate
          : request.checkInDate.toISOString(),
      checkOutDate: request.checkOutDate
        ? typeof request.checkOutDate === 'string'
          ? request.checkOutDate
          : request.checkOutDate.toISOString()
        : undefined,
    });
  }

  async assignGuestToRoom(
    guestId: string,
    request: {
      roomId: string;
      checkInTime?: Date | string;
      rateType?: string;
      guestInfo?: any;
    }
  ): Promise<any> {
    return apiService.post(`/guests/${guestId}/assign-room`, {
      ...request,
      checkInTime: request.checkInTime
        ? typeof request.checkInTime === 'string'
          ? request.checkInTime
          : request.checkInTime.toISOString()
        : undefined,
    });
  }

  async findGuestByIdNumber(idNumber: string, hotelId: string): Promise<Guest[]> {
    return apiService.get<Guest[]>(`/guests/find`, { idNumber, hotelId });
  }

  async getGuestsByRoom(roomId: string): Promise<Guest[]> {
    return apiService.get<Guest[]>(`/guests/room/${roomId}`);
  }

  async mergeGuests(primaryId: string, secondaryId: string): Promise<Guest> {
    return apiService.post<Guest>('/guests/merge', {
      primaryId,
      secondaryId,
    });
  }
}

export const guestsService = new GuestsService();

