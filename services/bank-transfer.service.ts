import { apiService } from './api';

export interface BankTransfer {
  _id?: string;
  hotelId: string;
  userId: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  transactionDate: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  referenceNumber?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SepayTransaction {
  id: string;
  bank_brand_name: string;
  account_number: string;
  transaction_date: string;
  amount_out: string;
  amount_in: string;
  content: string;
  reference_code?: string;
}

export interface BankTransferQuery {
  hotelId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  page?: number;
  limit?: number;
}

class BankTransferService {
  async getBankTransfers(query?: BankTransferQuery): Promise<{ transfers: BankTransfer[]; pagination?: any }> {
    const params = new URLSearchParams();
    if (query?.hotelId) params.append('hotelId', query.hotelId);
    if (query?.userId) params.append('userId', query.userId);
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);
    if (query?.status) params.append('status', query.status);
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());

    const endpoint = `/bank-transfers${params.toString() ? `?${params.toString()}` : ''}`;
    return await apiService.get(endpoint);
  }

  async getSepayTransactions(query?: { startDate?: string; endDate?: string }): Promise<{ transactions: SepayTransaction[] }> {
    const params = new URLSearchParams();
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);

    return await apiService.get(`/sepay/transactions?${params.toString()}`);
  }

  async getPaymentHistory(query?: { userId?: string; startDate?: string; endDate?: string }): Promise<any> {
    const params = new URLSearchParams();
    if (query?.userId) params.append('userId', query.userId);
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);

    return await apiService.get(`/sepay/payment-history?${params.toString()}`);
  }

  async getPayPalPaymentHistory(query?: { userId?: string }): Promise<any> {
    const params = new URLSearchParams();
    if (query?.userId) params.append('userId', query.userId);

    return await apiService.get(`/paypal/payment-history?${params.toString()}`);
  }

  async getCryptoPaymentHistory(query?: { userId?: string }): Promise<any> {
    const params = new URLSearchParams();
    if (query?.userId) params.append('userId', query.userId);

    return await apiService.get(`/crypto/payment-history?${params.toString()}`);
  }
}

export const bankTransferService = new BankTransferService();

