import { apiService } from './api';

export interface RevenueQuery {
  hotelId: string;
  startDate?: string;
  endDate?: string;
  period?: 'day' | 'week' | 'month';
}

export interface RevenueData {
  labels: string[];
  revenueData: number[];
  paymentData: number[];
  expenseData: number[];
  totalRevenue: number;
  totalPayment: number;
  totalExpense: number;
}

class RevenueService {
  async getRevenue(query: RevenueQuery): Promise<RevenueData> {
    const params = new URLSearchParams();
    params.append('hotelId', query.hotelId);
    if (query.startDate) params.append('startDate', query.startDate);
    if (query.endDate) params.append('endDate', query.endDate);
    if (query.period) params.append('period', query.period);

    return await apiService.get(`/shift-handover/revenue/period?${params.toString()}`);
  }

  async getRevenueStats(hotelId: string, startDate?: string, endDate?: string): Promise<any> {
    const params = new URLSearchParams();
    params.append('hotelId', hotelId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    return await apiService.get(`/shift-handover/revenue?${params.toString()}`);
  }
}

export const revenueService = new RevenueService();

