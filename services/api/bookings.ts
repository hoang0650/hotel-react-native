import { apiClient } from './client';
import { API_ENDPOINTS } from './config';
import { Booking, BookingStatus } from '@/types/hotel';
import { mockBookings } from '@/mocks/hotelData';

export interface ApiBooking {
  _id: string;
  guest?: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  guestName?: string;
  room?: {
    _id: string;
    roomNumber: string;
  };
  roomNumber?: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  totalAmount: number;
  paidAmount?: number;
  numberOfGuests?: {
    adults: number;
    children: number;
  };
  adults?: number;
  children?: number;
  specialRequests?: string;
  createdAt: string;
  updatedAt: string;
}

const mapBookingStatus = (status: string): BookingStatus => {
  const statusMap: Record<string, BookingStatus> = {
    'confirmed': 'confirmed',
    'pending': 'confirmed',
    'checked_in': 'checked_in',
    'checkedIn': 'checked_in',
    'checked_out': 'checked_out',
    'checkedOut': 'checked_out',
    'cancelled': 'cancelled',
    'canceled': 'cancelled',
  };
  return statusMap[status] || 'confirmed';
};

const mapApiBookingToBooking = (apiBooking: ApiBooking): Booking => ({
  id: apiBooking._id,
  guestId: apiBooking.guest?._id || '',
  guestName: apiBooking.guest?.name || apiBooking.guestName || 'Khách hàng',
  roomId: apiBooking.room?._id || '',
  roomNumber: apiBooking.room?.roomNumber || apiBooking.roomNumber || '',
  checkIn: apiBooking.checkInDate?.split('T')[0] || '',
  checkOut: apiBooking.checkOutDate?.split('T')[0] || '',
  status: mapBookingStatus(apiBooking.status),
  totalAmount: apiBooking.totalAmount || 0,
  paidAmount: apiBooking.paidAmount || 0,
  adults: apiBooking.numberOfGuests?.adults || apiBooking.adults || 1,
  children: apiBooking.numberOfGuests?.children || apiBooking.children || 0,
  specialRequests: apiBooking.specialRequests,
  createdAt: apiBooking.createdAt,
});

export const bookingsApi = {
  getAll: async (): Promise<Booking[]> => {
    try {
      const response = await apiClient.get<ApiBooking[] | { data: ApiBooking[] }>(API_ENDPOINTS.BOOKINGS.BASE);
      const bookings = Array.isArray(response) ? response : (response?.data || []);
      return bookings.map(mapApiBookingToBooking);
    } catch (error) {
      console.error('[bookingsApi.getAll] Error:', error);
      console.log('[bookingsApi.getAll] Using mock data as fallback');
      return mockBookings;
    }
  },

  getById: async (id: string): Promise<Booking | null> => {
    try {
      const response = await apiClient.get<ApiBooking>(API_ENDPOINTS.BOOKINGS.BY_ID(id));
      return mapApiBookingToBooking(response);
    } catch (error) {
      console.error('[bookingsApi.getById] Error:', error);
      return null;
    }
  },

  create: async (bookingData: Partial<Booking>): Promise<Booking | null> => {
    try {
      const response = await apiClient.post<ApiBooking>(API_ENDPOINTS.BOOKINGS.BASE, bookingData);
      return mapApiBookingToBooking(response);
    } catch (error) {
      console.error('[bookingsApi.create] Error:', error);
      return null;
    }
  },

  update: async (id: string, bookingData: Partial<Booking>): Promise<Booking | null> => {
    try {
      const response = await apiClient.put<ApiBooking>(API_ENDPOINTS.BOOKINGS.BY_ID(id), bookingData);
      return mapApiBookingToBooking(response);
    } catch (error) {
      console.error('[bookingsApi.update] Error:', error);
      return null;
    }
  },

  cancel: async (id: string): Promise<boolean> => {
    try {
      await apiClient.post(API_ENDPOINTS.ROOMS.CANCEL_BOOKING(id), {}, false);
      return true;
    } catch (error) {
      console.error('[bookingsApi.cancel] Error:', error);
      return false;
    }
  },
};
