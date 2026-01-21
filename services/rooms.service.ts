import { apiService } from './api';
import { API_ENDPOINTS } from '@/constants/api';
import { Room, Event, Booking } from '@/types';

export interface GetRoomsParams {
  hotelId?: string;
  floor?: number;
}

export interface GetAvailableRoomsParams {
  hotelId: string;
  checkInDate?: string;
  checkOutDate?: string;
  floor?: number;
}

export interface GetRoomEventsParams {
  limit?: number;
  skip?: number;
  type?: string;
  startDate?: string;
  endDate?: string;
  excludeCheckedOut?: boolean;
}

export interface CheckInData {
  status: 'occupied';
  events: Array<{
    type: 'checkin';
    checkinTime: Date | string;
    guestInfo: any;
    paymentMethod?: string;
    rateType?: import('@/types').RateType;
    advancePayment?: number;
    additionalCharges?: number;
    discount?: number;
    notes?: string;
    selectedServices?: any[];
  }>;
  bookingId?: string;
}

export interface CheckOutData {
  bookingId?: string;
  staffId?: string;
  paymentMethod?: string;
  totalAmount?: number;
  remainingAmount?: number;
  additionalCharges?: number;
  discount?: number;
  notes?: string;
  services?: any[];
  events?: any[];
  checkoutTime?: Date | string;
  createDebt?: boolean;
}

export class RoomsService {
  async getRooms(params?: GetRoomsParams): Promise<Room[]> {
    return apiService.get<Room[]>(API_ENDPOINTS.ROOMS.BASE, params);
  }

  async getRoomById(
    id: string,
    options?: {
      limit?: number;
      includeOldEvents?: boolean;
      excludeCheckedOut?: boolean;
    }
  ): Promise<Room> {
    const params: any = {};
    if (options?.limit) params.limit = options.limit;
    if (options?.includeOldEvents) params.includeOldEvents = 'true';
    if (options?.excludeCheckedOut !== undefined) {
      params.excludeCheckedOut = options.excludeCheckedOut.toString();
    }
    return apiService.get<Room>(API_ENDPOINTS.ROOMS.BY_ID(id), params);
  }

  async getEventsByHotelId(
    hotelId: string,
    options?: {
      limit?: number;
      skip?: number;
      types?: string[];
    }
  ): Promise<any[]> {
    const params: any = { hotelId };
    if (options?.limit) params.limit = options.limit;
    if (options?.skip) params.skip = options.skip;
    if (options?.types) params.types = JSON.stringify(options.types);
    return apiService.get<any[]>('/rooms/events', params);
  }

  async getRoomEvents(
    roomId: string,
    options?: GetRoomEventsParams
  ): Promise<Event[]> {
    return apiService.get<Event[]>(
      API_ENDPOINTS.ROOMS.EVENTS(roomId),
      options
    );
  }

  async getAvailableRooms(
    params: GetAvailableRoomsParams
  ): Promise<Room[]> {
    return apiService.get<Room[]>(API_ENDPOINTS.ROOMS.AVAILABLE, params);
  }

  async checkInRoom(roomId: string, data: CheckInData): Promise<any> {
    return apiService.post(
      API_ENDPOINTS.ROOMS.CHECKIN(roomId),
      data
    );
  }

  async checkOutRoom(roomId: string, data: CheckOutData): Promise<any> {
    return apiService.post(
      API_ENDPOINTS.ROOMS.CHECKOUT(roomId),
      data
    );
  }

  async createBooking(data: any): Promise<any> {
    return apiService.post(API_ENDPOINTS.ROOMS.BOOKING, data);
  }

  async cancelBooking(
    roomId: string,
    reason: string,
    bookingId?: string,
    checkInDate?: Date
  ): Promise<any> {
    const body: any = { reason };
    if (bookingId) body.bookingId = bookingId;
    if (checkInDate) body.checkInDate = checkInDate.toISOString();
    return apiService.post(API_ENDPOINTS.ROOMS.CANCEL_BOOKING(roomId), body);
  }

  async cleanRoom(roomId: string, roomUpdate: any): Promise<any> {
    return apiService.post(`/rooms/clean/${roomId}`, roomUpdate);
  }

  async recheckinRoom(payload: {
    roomId: string;
    invoiceId?: string;
    historyId?: string;
  }): Promise<any> {
    return apiService.post('/rooms/recheckin', payload);
  }

  async getBookings(params?: {
    hotelId?: string;
    roomId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ bookings: Booking[] }> {
    return apiService.get<{ bookings: Booking[] }>(
      API_ENDPOINTS.ROOMS.BOOKINGS,
      params
    );
  }

  async getHotelFloors(hotelId: string): Promise<{ floors: number[] }> {
    return apiService.get<{ floors: number[] }>(
      `/rooms/hotel/${hotelId}/floors`
    );
  }

  async getRoomsByFloor(hotelId: string, floor: number): Promise<Room[]> {
    return apiService.get<Room[]>(
      `/rooms/hotel/${hotelId}/floor/${floor}`
    );
  }

  async createRoom(data: Partial<Room>): Promise<Room> {
    return apiService.post<Room>(API_ENDPOINTS.ROOMS.BASE, data);
  }

  async updateRoom(id: string, room: Partial<Room>): Promise<Room> {
    return apiService.put<Room>(API_ENDPOINTS.ROOMS.BY_ID(id), room);
  }

  async deleteRoom(id: string): Promise<void> {
    return apiService.delete<void>(API_ENDPOINTS.ROOMS.BY_ID(id));
  }

  async updateRoomStatus(
    roomId: string,
    status: string,
    staffId?: string,
    note?: string
  ): Promise<Room> {
    return apiService.patch<Room>(
      `${API_ENDPOINTS.ROOMS.BY_ID(roomId)}/status`,
      { status, staffId, note }
    );
  }

  async transferRoom(
    sourceRoomId: string,
    targetRoomId: string,
    staffId: string,
    notes: string
  ): Promise<any> {
    return apiService.post('/rooms/transfer', {
      sourceRoomId,
      targetRoomId,
      staffId,
      notes,
    });
  }

  async getRoomHistory(
    hotelId: string,
    filterType?: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ history: BookingHistory[]; pagination?: any; totalPages?: number; currentPage?: number; totalItems?: number }> {
    const params: any = { hotelId, page, limit };
    if (filterType) params.filterType = filterType;
    return apiService.get('/rooms/history', params);
  }

  async calculateRoomPrice(
    roomId: string,
    checkInDate: Date | string,
    checkOutDate: Date | string,
    rateType: 'hourly' | 'daily' | 'nightly'
  ): Promise<{
    roomId: string;
    totalPrice: number;
    priceDetails: any;
    durationInHours: number;
    rateType: string;
    originalRateType?: string;
  }> {
    return apiService.post<{
      roomId: string;
      totalPrice: number;
      priceDetails: any;
      durationInHours: number;
      rateType: string;
      originalRateType?: string;
    }>('/priceConfig/calculate', {
      roomId,
      checkInDate: typeof checkInDate === 'string' ? checkInDate : checkInDate.toISOString(),
      checkOutDate: typeof checkOutDate === 'string' ? checkOutDate : checkOutDate.toISOString(),
      rateType,
    });
  }

  async updateCheckinInfo(
    roomId: string,
    data: {
      guestInfo?: {
        name?: string;
        idNumber?: string;
        phone?: string;
        email?: string;
        address?: string;
        guestSource?: string;
      };
      advancePayment?: number;
      rateType?: import('@/types').RateType;
      additionalCharges?: number;
      discount?: number;
      selectedServices?: Array<{
        serviceId?: string;
        serviceName?: string;
        price?: number;
        quantity?: number;
        totalPrice?: number;
        orderTime?: Date;
      }>;
    }
  ): Promise<any> {
    return apiService.patch(`/rooms/${roomId}/checkin-info`, data);
  }

  async calculateCheckoutTotal(data: {
    roomId: string;
    checkInTime: Date | string;
    checkOutTime: Date | string;
    rateType?: import('@/types').RateType;
    selectedServices?: Array<{
      serviceId?: string;
      serviceName?: string;
      price?: number;
      quantity?: number;
      totalPrice?: number;
    }>;
    additionalCharges?: number;
    discount?: number;
    advancePayment?: number;
  }): Promise<{
    roomPriceTotal: number;
    servicesTotal: number;
    totalPrice: number;
    remainingAmount: number;
    rateType: string;
    priceDetails?: any;
  }> {
    return apiService.post('/rooms/calculate-checkout-total', {
      ...data,
      checkInTime: typeof data.checkInTime === 'string' ? data.checkInTime : data.checkInTime.toISOString(),
      checkOutTime: typeof data.checkOutTime === 'string' ? data.checkOutTime : data.checkOutTime.toISOString(),
    });
  }
}

export const roomsService = new RoomsService();

