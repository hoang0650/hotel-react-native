import { apiService } from './api';

export interface ShiftHandover {
  _id?: string;
  hotelId: string;
  fromStaffId: any;
  toStaffId: any;
  handoverTime: Date | string;
  previousShiftAmount: number;
  cashInShift: number;
  managerHandoverAmount: number;
  handoverAmount: number;
  cashAmount: number;
  bankTransferAmount: number;
  cardPaymentAmount: number;
  expenseAmount: number;
  incomeAmount: number;
  totalRoomRevenue?: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled';
  notes?: string;
  expenses?: Array<{
    _id?: string;
    description: string;
    amount: number;
    category?: string;
    recipient?: string;
    method?: 'cash' | 'bank_transfer' | 'card';
    timestamp: Date | string;
  }>;
  incomes?: Array<{
    _id?: string;
    description: string;
    amount: number;
    category?: string;
    source?: string;
    method?: 'cash' | 'bank_transfer' | 'card';
    timestamp: Date | string;
  }>;
  roomHistory?: Array<{
    roomNumber: string;
    action: string;
    guestName?: string;
    guestSource?: string;
    amount: number;
    paymentMethod: string;
    timestamp: Date | string;
    checkinTime?: Date | string;
    checkInTime?: Date | string;
    roomTotal?: number;
    additionalCharges?: number;
    discount?: number;
    serviceAmount?: number;
    serviceTotal?: number;
    advancePayment?: number;
    notes?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShiftHandoverQuery {
  hotelId: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface ShiftHandoverHistoryResponse {
  data: ShiftHandover[];
  pagination?: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}

class ShiftHandoverService {
  async getShiftHandoverHistory(query: ShiftHandoverQuery): Promise<ShiftHandoverHistoryResponse> {
    const params = new URLSearchParams();
    params.append('hotelId', query.hotelId);
    if (query.startDate) params.append('startDate', query.startDate);
    if (query.endDate) params.append('endDate', query.endDate);
    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());

    const response = await apiService.get(`/shift-handover/history?${params.toString()}`);
    // Backend trả về { message, data, pagination }
    if (response.data && response.pagination) {
      return response;
    }
    // Nếu response có cấu trúc khác, chuẩn hóa lại
    return {
      data: response.data || response || [],
      pagination: response.pagination || {
        totalItems: 0,
        totalPages: 0,
        currentPage: query.page || 1,
        pageSize: query.limit || 20,
      },
    };
  }

  async getShiftHandoverById(id: string): Promise<ShiftHandover> {
    return await apiService.get(`/shift-handover/history/${id}`);
  }

  async createShiftHandover(data: Partial<ShiftHandover>): Promise<ShiftHandover> {
    return await apiService.post('/shift-handover', data);
  }

  async getShiftHandoverStats(hotelId: string, startDate?: string, endDate?: string): Promise<any> {
    const params = new URLSearchParams();
    params.append('hotelId', hotelId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    return await apiService.get(`/shift-handover/stats?${params.toString()}`);
  }
}

export const shiftHandoverService = new ShiftHandoverService();

