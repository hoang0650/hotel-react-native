import { apiService } from './api';
import { Invoice } from '@/types';

export interface CreateInvoiceRequest {
  roomId: string;
  bookingId?: string;
  guestInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  items?: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  totalAmount: number;
  paymentMethod?: string;
  notes?: string;
}

class InvoicesService {
  async getInvoices(params?: {
    hotelId?: string;
    roomId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ invoices: Invoice[]; pagination?: any }> {
    const queryParams = new URLSearchParams();
    if (params?.hotelId) queryParams.append('hotelId', params.hotelId);
    if (params?.roomId) queryParams.append('roomId', params.roomId);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const endpoint = `/invoices${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await apiService.get(endpoint);
  }

  async getInvoiceById(invoiceId: string): Promise<Invoice> {
    return await apiService.get(`/invoices/${invoiceId}`);
  }

  async createInvoice(data: CreateInvoiceRequest): Promise<Invoice> {
    return await apiService.post('/invoices', data);
  }

  async updateInvoice(invoiceId: string, data: Partial<Invoice>): Promise<Invoice> {
    return await apiService.put(`/invoices/${invoiceId}`, data);
  }

  async deleteInvoice(invoiceId: string): Promise<void> {
    return await apiService.delete(`/invoices/${invoiceId}`);
  }

  async getInvoiceDetails(roomId: string, bookingId?: string): Promise<Invoice> {
    const params = new URLSearchParams();
    params.append('roomId', roomId);
    if (bookingId) params.append('bookingId', bookingId);
    return await apiService.get(`/invoices/details?${params.toString()}`);
  }
}

export const invoicesService = new InvoicesService();

