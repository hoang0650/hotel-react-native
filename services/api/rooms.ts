import { apiClient } from './client';
import { API_ENDPOINTS } from './config';
import { Room, RoomStatus } from '@/types/hotel';
import { mockRooms } from '@/mocks/hotelData';

export interface ApiRoom {
  _id: string;
  roomNumber: string;
  roomType: string;
  floor: number;
  price: number;
  capacity: number;
  amenities: string[];
  status: string;
  currentGuest?: {
    name: string;
    checkOutDate?: string;
  };
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

const mapRoomStatus = (status: string, isAvailable: boolean): RoomStatus => {
  if (status === 'maintenance') return 'maintenance';
  if (status === 'cleaning') return 'cleaning';
  if (!isAvailable || status === 'occupied') return 'occupied';
  return 'available';
};

const mapApiRoomToRoom = (apiRoom: ApiRoom): Room => ({
  id: apiRoom._id,
  number: apiRoom.roomNumber,
  floor: apiRoom.floor || 1,
  type: (apiRoom.roomType?.toLowerCase() || 'standard') as Room['type'],
  status: mapRoomStatus(apiRoom.status, apiRoom.isAvailable),
  price: apiRoom.price || 0,
  capacity: apiRoom.capacity || 2,
  amenities: apiRoom.amenities || [],
  currentGuest: apiRoom.currentGuest?.name,
  checkoutDate: apiRoom.currentGuest?.checkOutDate,
});

export const roomsApi = {
  getAll: async (): Promise<Room[]> => {
    try {
      const response = await apiClient.get<ApiRoom[]>(API_ENDPOINTS.ROOMS.BASE, false);
      const rooms = Array.isArray(response) ? response : [];
      return rooms.map(mapApiRoomToRoom);
    } catch (error) {
      console.error('[roomsApi.getAll] Error:', error);
      console.log('[roomsApi.getAll] Using mock data as fallback');
      return mockRooms;
    }
  },

  getById: async (id: string): Promise<Room | null> => {
    try {
      const response = await apiClient.get<ApiRoom>(API_ENDPOINTS.ROOMS.BY_ID(id), false);
      return mapApiRoomToRoom(response);
    } catch (error) {
      console.error('[roomsApi.getById] Error:', error);
      return null;
    }
  },

  getAvailable: async (): Promise<Room[]> => {
    try {
      const response = await apiClient.get<ApiRoom[]>(API_ENDPOINTS.ROOMS.AVAILABLE, false);
      const rooms = Array.isArray(response) ? response : [];
      return rooms.map(mapApiRoomToRoom);
    } catch (error) {
      console.error('[roomsApi.getAvailable] Error:', error);
      console.log('[roomsApi.getAvailable] Using mock data as fallback');
      return mockRooms.filter(r => r.status === 'available');
    }
  },

  checkIn: async (id: string, guestData: unknown): Promise<Room | null> => {
    try {
      const response = await apiClient.post<ApiRoom>(API_ENDPOINTS.ROOMS.CHECKIN(id), guestData, false);
      return mapApiRoomToRoom(response);
    } catch (error) {
      console.error('[roomsApi.checkIn] Error:', error);
      return null;
    }
  },

  checkOut: async (id: string): Promise<Room | null> => {
    try {
      const response = await apiClient.post<ApiRoom>(API_ENDPOINTS.ROOMS.CHECKOUT(id), {}, false);
      return mapApiRoomToRoom(response);
    } catch (error) {
      console.error('[roomsApi.checkOut] Error:', error);
      return null;
    }
  },
};
