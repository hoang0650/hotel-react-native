import { apiClient } from './client';
import { API_ENDPOINTS } from './config';
import { DashboardStats } from '@/types/hotel';
import { roomsApi } from './rooms';
import { bookingsApi } from './bookings';

export interface ApiFinancialSummary {
  totalRevenue?: number;
  todayRevenue?: number;
  monthlyRevenue?: number;
  yearlyRevenue?: number;
  pendingPayments?: number;
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    try {
      const [rooms, bookings] = await Promise.all([
        roomsApi.getAll(),
        bookingsApi.getAll(),
      ]);

      const today = new Date().toISOString().split('T')[0];
      
      const totalRooms = rooms.length;
      const occupiedRooms = rooms.filter(r => r.status === 'occupied').length;
      const availableRooms = rooms.filter(r => r.status === 'available').length;
      const cleaningRooms = rooms.filter(r => r.status === 'cleaning').length;
      
      const todayCheckIns = bookings.filter(
        b => b.checkIn === today && (b.status === 'confirmed')
      ).length;
      
      const todayCheckOuts = bookings.filter(
        b => b.checkOut === today && b.status === 'checked_in'
      ).length;

      const occupancyRate = totalRooms > 0 
        ? Math.round((occupiedRooms / totalRooms) * 100) 
        : 0;

      let todayRevenue = 0;
      let monthlyRevenue = 0;

      try {
        const financial = await apiClient.get<ApiFinancialSummary>(API_ENDPOINTS.FINANCIAL.SUMMARY);
        todayRevenue = financial?.todayRevenue || 0;
        monthlyRevenue = financial?.monthlyRevenue || 0;
      } catch {
        console.log('[dashboardApi] Financial summary not available, calculating from bookings');
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        bookings.forEach(booking => {
          const checkInDate = new Date(booking.checkIn);
          if (booking.checkIn === today) {
            todayRevenue += booking.paidAmount;
          }
          if (checkInDate.getMonth() === currentMonth && checkInDate.getFullYear() === currentYear) {
            monthlyRevenue += booking.paidAmount;
          }
        });
      }

      return {
        totalRooms,
        occupiedRooms,
        availableRooms,
        cleaningRooms,
        todayCheckIns,
        todayCheckOuts,
        occupancyRate,
        todayRevenue,
        monthlyRevenue,
      };
    } catch (error) {
      console.error('[dashboardApi.getStats] Error:', error);
      return {
        totalRooms: 0,
        occupiedRooms: 0,
        availableRooms: 0,
        cleaningRooms: 0,
        todayCheckIns: 0,
        todayCheckOuts: 0,
        occupancyRate: 0,
        todayRevenue: 0,
        monthlyRevenue: 0,
      };
    }
  },

  getTodayBookings: async () => {
    try {
      const bookings = await bookingsApi.getAll();
      const today = new Date().toISOString().split('T')[0];
      
      const checkIns = bookings.filter(
        b => b.checkIn === today && b.status === 'confirmed'
      );
      
      const checkOuts = bookings.filter(
        b => b.checkOut === today && b.status === 'checked_in'
      );

      return { checkIns, checkOuts };
    } catch (error) {
      console.error('[dashboardApi.getTodayBookings] Error:', error);
      return { checkIns: [], checkOuts: [] };
    }
  },
};
