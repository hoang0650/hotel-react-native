import { apiService } from './api';
import { API_ENDPOINTS } from '@/constants/api';
import { Staff, StaffPayroll } from '@/types';

export interface CalculateSalaryRequest {
  calculationDate?: Date | string;
  allowance?: number;
  insurance?: number;
  penalty?: number;
  bonus?: number;
  advancePayment?: number;
}

export interface CalculateSalaryResponse {
  message?: string;
  data?: {
    breakdown: {
      baseDate: Date | string;
      calculationDate: Date | string;
      baseSalary: number;
      daysWorked: number;
      allowance: number;
      insurance: number;
      penalty: number;
      bonus: number;
      advancePayment: number;
      netSalary: number;
      period?: {
        startDate: Date | string;
        endDate: Date | string;
      };
    };
  };
}

export interface PaySalaryRequest {
  calculationDate: Date | string;
  baseDate: Date | string;
  allowance?: number;
  insurance?: number;
  penalty?: number;
  bonus?: number;
  advancePayment?: number;
  paymentDate?: Date | string;
  paymentReference?: string;
}

export class StaffService {
  async getStaffs(hotelId?: string): Promise<Staff[]> {
    if (hotelId) {
      return apiService.get<Staff[]>(API_ENDPOINTS.STAFFS.BY_HOTEL(hotelId));
    }
    return apiService.get<Staff[]>(API_ENDPOINTS.STAFFS.BASE);
  }

  async getStaffById(id: string): Promise<Staff> {
    return apiService.get<Staff>(API_ENDPOINTS.STAFFS.BY_ID(id));
  }

  async createStaff(staff: Partial<Staff>): Promise<Staff> {
    return apiService.post<Staff>(API_ENDPOINTS.STAFFS.BASE, staff);
  }

  async updateStaff(id: string, staff: Partial<Staff>): Promise<Staff> {
    return apiService.put<Staff>(API_ENDPOINTS.STAFFS.BY_ID(id), staff);
  }

  async deleteStaff(id: string): Promise<void> {
    return apiService.delete<void>(API_ENDPOINTS.STAFFS.BY_ID(id));
  }

  async calculateSalary(staffId: string, data: CalculateSalaryRequest): Promise<CalculateSalaryResponse> {
    // Convert dates to ISO strings if they are Date objects
    const requestData: any = { ...data };
    if (requestData.calculationDate instanceof Date) {
      requestData.calculationDate = requestData.calculationDate.toISOString();
    }
    return apiService.post<CalculateSalaryResponse>(
      API_ENDPOINTS.STAFFS.CALCULATE_SALARY(staffId),
      requestData
    );
  }

  async paySalary(staffId: string, data: PaySalaryRequest): Promise<StaffPayroll> {
    // Convert dates to ISO strings if they are Date objects
    const requestData: any = { ...data };
    if (requestData.calculationDate instanceof Date) {
      requestData.calculationDate = requestData.calculationDate.toISOString();
    }
    if (requestData.baseDate instanceof Date) {
      requestData.baseDate = requestData.baseDate.toISOString();
    }
    if (requestData.paymentDate instanceof Date) {
      requestData.paymentDate = requestData.paymentDate.toISOString();
    }
    return apiService.post<StaffPayroll>(
      API_ENDPOINTS.STAFFS.PAY_SALARY(staffId),
      requestData
    );
  }
}

export const staffService = new StaffService();

