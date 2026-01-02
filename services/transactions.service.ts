import { apiService } from './api';

export interface Expense {
  _id?: string;
  hotelId: string;
  amount: number;
  method: 'cash' | 'credit_card' | 'bank_transfer' | 'card' | 'virtual_card' | 'other';
  expenseCategory?: 'supplies' | 'utilities' | 'salary' | 'maintenance' | 'marketing' | 'other';
  description?: string;
  notes?: string;
  recipient?: string;
  status?: 'pending' | 'completed' | 'failed' | 'cancelled' | 'approved' | 'rejected';
  createdAt?: Date;
  updatedAt?: Date;
  details?: {
    recipient?: string;
    [key: string]: any;
  };
  approvedBy?: string;
  processedAt?: Date;
}

export interface Income {
  _id?: string;
  hotelId: string;
  amount: number;
  method: 'cash' | 'credit_card' | 'bank_transfer' | 'card' | 'virtual_card' | 'other';
  incomeCategory?: 'room_revenue' | 'service_revenue' | 'other';
  description?: string;
  notes?: string;
  payer?: string;
  status?: 'pending' | 'completed' | 'failed' | 'cancelled';
  createdAt?: Date;
  updatedAt?: Date;
}

class TransactionsService {
  // Expenses
  async getExpenses(params?: {
    hotelId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ expenses: Expense[]; pagination?: any }> {
    const queryParams = new URLSearchParams();
    if (params?.hotelId) queryParams.append('hotelId', params.hotelId);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const endpoint = `/transactions/expenses${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await apiService.get(endpoint);
  }

  async createExpense(data: Omit<Expense, '_id' | 'createdAt' | 'updatedAt'>): Promise<Expense> {
    return await apiService.post('/transactions/expenses', data);
  }

  async updateExpense(expenseId: string, data: Partial<Expense>): Promise<Expense> {
    return await apiService.put(`/transactions/expenses/${expenseId}`, data);
  }

  async deleteExpense(expenseId: string): Promise<void> {
    return await apiService.delete(`/transactions/expenses/${expenseId}`);
  }

  // Income
  async getIncome(params?: {
    hotelId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ income: Income[]; pagination?: any }> {
    const queryParams = new URLSearchParams();
    if (params?.hotelId) queryParams.append('hotelId', params.hotelId);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const endpoint = `/transactions/income${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await apiService.get(endpoint);
  }

  async createIncome(data: Omit<Income, '_id' | 'createdAt' | 'updatedAt'>): Promise<Income> {
    return await apiService.post('/transactions/income', data);
  }

  async updateIncome(incomeId: string, data: Partial<Income>): Promise<Income> {
    return await apiService.put(`/transactions/income/${incomeId}`, data);
  }

  async deleteIncome(incomeId: string): Promise<void> {
    return await apiService.delete(`/transactions/income/${incomeId}`);
  }
}

export const transactionsService = new TransactionsService();

