import { apiService } from './api';
import { API_ENDPOINTS } from '@/constants/api';
import { Debt, DebtQuery, DebtResponse, SettleDebtRequest } from '@/types';

export class DebtService {
  async getDebts(query?: DebtQuery): Promise<DebtResponse> {
    const params: any = {};
    if (query?.page) params.page = query.page;
    if (query?.pageSize) params.limit = query.pageSize;
    if (query?.hotelId) params.hotelId = query.hotelId;
    if (query?.status) params.status = query.status;
    if (query?.customerId) params.customerId = query.customerId;
    if (query?.startDate) params.startDate = query.startDate;
    if (query?.endDate) params.endDate = query.endDate;

    return apiService.get<DebtResponse>('/debts', params);
  }

  async getDebtById(id: string): Promise<{ message: string; debt: Debt }> {
    return apiService.get<{ message: string; debt: Debt }>(`/debts/${id}`);
  }

  async createDebt(
    invoiceId: string,
    notes?: string,
    dueDate?: Date | string
  ): Promise<{ message: string; debt: Debt }> {
    return apiService.post<{ message: string; debt: Debt }>('/debts', {
      invoiceId,
      notes,
      dueDate: dueDate
        ? typeof dueDate === 'string'
          ? dueDate
          : dueDate.toISOString()
        : undefined,
    });
  }

  async settleDebt(id: string, request: SettleDebtRequest): Promise<{ message: string; debt: Debt }> {
    return apiService.post<{ message: string; debt: Debt }>(`/debts/${id}/settle`, request);
  }

  async deleteDebt(id: string): Promise<{ message: string }> {
    return apiService.delete<{ message: string }>(`/debts/${id}`);
  }

  async updateDebtLabels(
    id: string,
    labels: Array<string | { name: string; color?: string }>
  ): Promise<{ message: string; debt: Debt }> {
    return apiService.patch<{ message: string; debt: Debt }>(`/debts/${id}/labels`, { labels });
  }
}

export const debtService = new DebtService();

