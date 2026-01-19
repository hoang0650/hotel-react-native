import { apiService } from './api';
import { shiftHandoverService, ShiftHandover } from './shift-handover.service';
import { financialSummaryService } from './financial-summary.service';
import { format, startOfWeek, startOfMonth, subDays, subWeeks, subMonths } from 'date-fns';

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
  /**
   * Nhóm dữ liệu shift handover theo period
   * Tính tổng doanh thu và tổng chi từ Lịch sử phòng trong ca (roomHistory) và expenses
   * Không tính giao tiền quản lý (managerHandoverAmount)
   */
  private groupShiftHandoversByPeriod(
    shiftHandovers: ShiftHandover[],
    period: 'day' | 'week' | 'month'
  ): { labels: string[], revenueData: number[], expenseData: number[], paymentData: number[] } {
    const grouped: { [key: string]: { revenue: number, expense: number, payment: number } } = {};
    
    shiftHandovers.forEach(record => {
      // Lấy thời gian giao ca để nhóm theo period
      const handoverDate = new Date(record.handoverTime);
      let key: string;
      
      switch (period) {
        case 'day':
          key = format(handoverDate, 'yyyy-MM-dd');
          break;
        case 'week':
          key = format(startOfWeek(handoverDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
          break;
        case 'month':
          key = format(startOfMonth(handoverDate), 'yyyy-MM');
          break;
        default:
          key = format(handoverDate, 'yyyy-MM-dd');
      }
      
      if (!grouped[key]) {
        grouped[key] = { revenue: 0, expense: 0, payment: 0 };
      }
      
      // Tính doanh thu từ Lịch sử phòng trong ca (roomHistory)
      // Công thức: roomTotal + additionalCharges - discount + serviceAmount
      // (Không trừ advancePayment vì đó là tiền đặt trước, không phải doanh thu thực tế)
      let totalRevenueFromRooms = 0;
      let totalPaymentFromRooms = 0;
      
      if (record.roomHistory && Array.isArray(record.roomHistory)) {
        record.roomHistory.forEach((room: any) => {
          const roomTotal = room.roomTotal || 0;
          const additionalCharges = room.additionalCharges || 0;
          const discount = room.discount || 0;
          const serviceAmount = room.serviceAmount || room.serviceTotal || 0;
          
          // Tổng doanh thu từ mỗi phòng = tiền phòng + phụ thu - khuyến mãi + tiền dịch vụ
          const roomRevenue = roomTotal + additionalCharges - discount + serviceAmount;
          totalRevenueFromRooms += roomRevenue;
          
          // Payment chỉ tính tiền phòng (roomTotal)
          totalPaymentFromRooms += roomTotal;
        });
      }
      
      grouped[key].revenue += totalRevenueFromRooms;
      grouped[key].payment += totalPaymentFromRooms;
      
      // Tính chi phí từ expenses (phiếu chi)
      let expenseAmount = 0;
      if (record.expenses && Array.isArray(record.expenses)) {
        expenseAmount = record.expenses.reduce((sum: number, expense: any) => {
          return sum + (expense.amount || 0);
        }, 0);
      } else {
        expenseAmount = record.expenseAmount || 0;
      }
      
      grouped[key].expense += expenseAmount;
    });
    
    // Sắp xếp keys và tạo arrays
    const sortedKeys = Object.keys(grouped).sort();
    const labels: string[] = [];
    const revenueData: number[] = [];
    const expenseData: number[] = [];
    const paymentData: number[] = [];
    
    sortedKeys.forEach(key => {
      // Format label
      let label: string;
      if (period === 'day' || period === 'week') {
        const parts = key.split('-');
        if (parts.length === 3) {
          label = `${parts[2]}/${parts[1]}`;
        } else {
          label = key;
        }
      } else if (period === 'month') {
        const parts = key.split('-');
        if (parts.length === 2) {
          label = `${parts[1]}/${parts[0]}`;
        } else {
          label = key;
        }
      } else {
        label = key;
      }
      
      labels.push(label);
      revenueData.push(grouped[key].revenue);
      expenseData.push(grouped[key].expense);
      paymentData.push(grouped[key].payment);
    });
    
    return { labels, revenueData, expenseData, paymentData };
  }

  async getRevenue(query: RevenueQuery): Promise<RevenueData> {
    if (!query.hotelId) {
      console.error('hotelId is required for revenue query');
      throw new Error('hotelId is required');
    }

    console.log('Getting revenue for hotelId:', query.hotelId, 'Period:', query.period);

    try {
      // Gọi API backend trực tiếp để đảm bảo tính nhất quán với Angular
      const params = new URLSearchParams();
      params.append('hotelId', query.hotelId);
      if (query.period) params.append('period', query.period);
      if (query.startDate) params.append('startDate', query.startDate);
      if (query.endDate) params.append('endDate', query.endDate);

      const response = await apiService.get<RevenueData>(`/shift-handover/revenue/period?${params.toString()}`);

      return {
        labels: response.labels || [],
        revenueData: response.revenueData || [],
        expenseData: response.expenseData || [],
        paymentData: response.paymentData || [],
        totalRevenue: response.totalRevenue || 0,
        totalPayment: response.totalPayment || 0,
        totalExpense: response.totalExpense || 0,
      };
    } catch (error) {
      console.error('Error loading revenue from backend:', error);
      // Fallback về tính toán client-side nếu API lỗi
      console.warn('Falling back to client-side calculation');
      
      // Tính toán khoảng thời gian dựa trên period
      const now = new Date();
      let startDate: Date;
      let endDate = now;
      
      switch (query.period || 'day') {
        case 'day':
          startDate = subDays(now, 6); // 7 ngày gần nhất
          break;
        case 'week':
          startDate = subWeeks(now, 3); // 4 tuần gần nhất
          break;
        case 'month':
          startDate = subMonths(now, 11); // 12 tháng gần nhất
          break;
        default:
          startDate = subDays(now, 6);
      }

      // Sử dụng startDate và endDate từ query nếu có
      if (query.startDate) {
        startDate = new Date(query.startDate);
      }
      if (query.endDate) {
        endDate = new Date(query.endDate);
      }

      // Lấy dữ liệu từ shift handover history với hotelId cụ thể
      const shiftHandoverResponse = await shiftHandoverService.getShiftHandoverHistory({
        hotelId: query.hotelId,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        page: 1,
        limit: 1000 // Lấy tối đa 1000 records
      });

      const shiftHandovers = shiftHandoverResponse.data || [];
      
      // Lọc lại theo hotelId để đảm bảo (nếu backend chưa lọc đúng)
      const filteredShiftHandovers = shiftHandovers.filter((record: any) => {
        const recordHotelId = typeof record.hotelId === 'string' 
          ? record.hotelId 
          : (record.hotelId as any)?._id || record.hotelId;
        return recordHotelId && recordHotelId.toString() === query.hotelId.toString();
      });
      
      if (filteredShiftHandovers.length === 0) {
        console.warn('No shift handover data found for hotel:', query.hotelId);
        return {
          labels: [],
          revenueData: [],
          expenseData: [],
          paymentData: [],
          totalRevenue: 0,
          totalPayment: 0,
          totalExpense: 0,
        };
      }
      
      // Nhóm dữ liệu theo period và tính toán (sử dụng filteredShiftHandovers)
      const groupedData = this.groupShiftHandoversByPeriod(filteredShiftHandovers, query.period || 'day');
      
      // Tính tổng doanh thu từ Lịch sử phòng trong ca (roomHistory) của tất cả các lần giao ca
      // Không tính giao tiền quản lý (managerHandoverAmount)
      let totalRevenueFromRooms = 0;
      let totalPaymentFromRooms = 0;
      
      filteredShiftHandovers.forEach((record: any) => {
        if (record.roomHistory && Array.isArray(record.roomHistory)) {
          record.roomHistory.forEach((room: any) => {
            const roomTotal = room.roomTotal || 0;
            const additionalCharges = room.additionalCharges || 0;
            const discount = room.discount || 0;
            const serviceAmount = room.serviceAmount || room.serviceTotal || 0;
            
            // Tổng doanh thu từ mỗi phòng = tiền phòng + phụ thu - khuyến mãi + tiền dịch vụ
            const roomRevenue = roomTotal + additionalCharges - discount + serviceAmount;
            totalRevenueFromRooms += roomRevenue;
            
            // Payment chỉ tính tiền phòng (roomTotal)
            totalPaymentFromRooms += roomTotal;
          });
        }
      });
      
      // Tổng doanh thu = tổng từ roomHistory
      const totalRevenue = totalRevenueFromRooms;
      
      // Tổng thanh toán = tổng tiền phòng từ roomHistory
      const totalPayment = totalPaymentFromRooms;
      
      // Tổng chi = tổng expenseAmount từ expenses (phiếu chi)
      const totalExpense = filteredShiftHandovers.reduce((sum, record) => {
        if (record.expenses && Array.isArray(record.expenses)) {
          return sum + record.expenses.reduce((expenseSum: number, expense: any) => {
            return expenseSum + (expense.amount || 0);
          }, 0);
        }
        return sum + (record.expenseAmount || 0);
      }, 0);

      return {
        labels: groupedData.labels,
        revenueData: groupedData.revenueData,
        expenseData: groupedData.expenseData,
        paymentData: groupedData.paymentData,
        totalRevenue,
        totalPayment,
        totalExpense,
      };
    }
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

