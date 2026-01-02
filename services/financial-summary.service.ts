import { apiService } from './api';

export interface FinancialSummaryQuery {
  hotelId: string;
  startDate: string;
  endDate: string;
}

export interface FinancialSummary {
  hotelId: string;
  startDate: string;
  endDate: string;
  breakdown: {
    revenue: {
      roomRevenue: number;
      serviceRevenue: number;
      cafeRevenue?: number;
      otherServiceRevenue?: number;
      otherRevenue: number;
      receiptRevenue: number;
      totalRevenue: number;
    };
    expenses: {
      operatingExpenses: number;
      staffExpenses: number;
      utilityExpenses: number;
      maintenanceExpenses: number;
      otherExpenses: number;
      totalExpenses: number;
    };
    profit: {
      grossProfit: number;
      netProfit: number;
      profitMargin: number;
    };
  };
  config?: {
    depreciationRate?: number;
    loanPercentage?: number;
    interestRate?: number;
    taxRate?: number;
    wacc?: number;
    projectionYears?: number;
  };
}

class FinancialSummaryService {
  async getFinancialSummary(query: FinancialSummaryQuery): Promise<{ data: FinancialSummary }> {
    const params = new URLSearchParams();
    params.append('hotelId', query.hotelId);
    params.append('startDate', query.startDate);
    params.append('endDate', query.endDate);

    return await apiService.get(`/financial-summary?${params.toString()}`);
  }

  async updateFinancialConfig(hotelId: string, config: Partial<FinancialSummary['config']>): Promise<any> {
    return await apiService.patch(`/financial-summary/financial-config/${hotelId}`, config);
  }

  async exportFinancialSummary(query: FinancialSummaryQuery): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('hotelId', query.hotelId);
    params.append('startDate', query.startDate);
    params.append('endDate', query.endDate);

    return await apiService.get(`/financial-summary/export-excel?${params.toString()}`, {
      responseType: 'blob',
    });
  }
}

export const financialSummaryService = new FinancialSummaryService();

