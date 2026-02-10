import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BedDouble,
  CalendarCheck,
  CalendarX,
  TrendingUp,
  Sparkles,
  Wrench,
  ChevronRight,
  AlertCircle,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { dashboardApi } from '@/services/api';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardApi.getStats(),
  });

  const { data: todayData, isLoading: todayLoading, refetch: refetchToday } = useQuery({
    queryKey: ['dashboard', 'today-bookings'],
    queryFn: () => dashboardApi.getTodayBookings(),
  });

  const isLoading = statsLoading || todayLoading;
  const todayCheckIns = todayData?.checkIns || [];
  const todayCheckOuts = todayData?.checkOuts || [];

  const handleRefresh = async () => {
    await Promise.all([refetchStats(), refetchToday()]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString('vi-VN');
  const dayNames = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayStr = dayNames[today.getDay()];

  if (isLoading && !stats) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  const displayStats = stats || {
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

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f766e', '#14b8a6']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Xin chào!</Text>
            <Text style={styles.hotelName}>PHHotel PMS</Text>
          </View>
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{dateStr}</Text>
            <Text style={styles.dayText}>{dayStr}</Text>
          </View>
        </View>

        <View style={styles.occupancyCard}>
          <View style={styles.occupancyHeader}>
            <Text style={styles.occupancyLabel}>Tỷ lệ lấp đầy</Text>
            <Text style={styles.occupancyValue}>{displayStats.occupancyRate}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${displayStats.occupancyRate}%` }]}
            />
          </View>
          <View style={styles.occupancyStats}>
            <View style={styles.occupancyStat}>
              <View style={[styles.statusDot, { backgroundColor: Colors.status.occupied }]} />
              <Text style={styles.occupancyStatText}>
                {displayStats.occupiedRooms} đang ở
              </Text>
            </View>
            <View style={styles.occupancyStat}>
              <View style={[styles.statusDot, { backgroundColor: Colors.status.available }]} />
              <Text style={styles.occupancyStatText}>
                {displayStats.availableRooms} trống
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.quickStats}>
          <View style={[styles.statCard, { backgroundColor: '#ecfdf5' }]}>
            <View style={[styles.statIcon, { backgroundColor: '#d1fae5' }]}>
              <CalendarCheck size={20} color={Colors.status.available} />
            </View>
            <Text style={styles.statValue}>{displayStats.todayCheckIns}</Text>
            <Text style={styles.statLabel}>Check-in hôm nay</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
            <View style={[styles.statIcon, { backgroundColor: '#fde68a' }]}>
              <CalendarX size={20} color={Colors.status.cleaning} />
            </View>
            <Text style={styles.statValue}>{displayStats.todayCheckOuts}</Text>
            <Text style={styles.statLabel}>Check-out hôm nay</Text>
          </View>
        </View>

        <View style={styles.quickStats}>
          <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}>
            <View style={[styles.statIcon, { backgroundColor: '#dbeafe' }]}>
              <Sparkles size={20} color={Colors.status.occupied} />
            </View>
            <Text style={styles.statValue}>{displayStats.cleaningRooms}</Text>
            <Text style={styles.statLabel}>Đang dọn dẹp</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fef2f2' }]}>
            <View style={[styles.statIcon, { backgroundColor: '#fee2e2' }]}>
              <Wrench size={20} color={Colors.status.maintenance} />
            </View>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Bảo trì</Text>
          </View>
        </View>

        <View style={styles.revenueSection}>
          <Text style={styles.sectionTitle}>Doanh thu</Text>
          <View style={styles.revenueCard}>
            <LinearGradient
              colors={['#0f766e', '#0d9488']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.revenueGradient}
            >
              <View style={styles.revenueRow}>
                <View>
                  <Text style={styles.revenueLabel}>Hôm nay</Text>
                  <Text style={styles.revenueValue}>
                    {formatCurrency(displayStats.todayRevenue)}
                  </Text>
                </View>
                <View style={styles.revenueDivider} />
                <View>
                  <Text style={styles.revenueLabel}>Tháng này</Text>
                  <Text style={styles.revenueValue}>
                    {formatCurrency(displayStats.monthlyRevenue)}
                  </Text>
                </View>
              </View>
              <View style={styles.trendRow}>
                <TrendingUp size={16} color="#a7f3d0" />
                <Text style={styles.trendText}>Dữ liệu realtime từ API</Text>
              </View>
            </LinearGradient>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Check-in hôm nay</Text>
            <TouchableOpacity style={styles.seeAllBtn}>
              <Text style={styles.seeAllText}>Xem tất cả</Text>
              <ChevronRight size={16} color={Colors.light.tint} />
            </TouchableOpacity>
          </View>
          {todayCheckIns.length > 0 ? (
            todayCheckIns.map((booking) => (
              <View key={booking.id} style={styles.bookingCard}>
                <View style={styles.bookingInfo}>
                  <View style={styles.roomBadge}>
                    <BedDouble size={14} color="#fff" />
                    <Text style={styles.roomBadgeText}>{booking.roomNumber}</Text>
                  </View>
                  <View style={styles.bookingDetails}>
                    <Text style={styles.guestName}>{booking.guestName}</Text>
                    <Text style={styles.bookingMeta}>
                      {booking.adults} người lớn • {booking.checkIn} - {booking.checkOut}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.checkInBtn}>
                  <Text style={styles.checkInBtnText}>Check-in</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <AlertCircle size={20} color={Colors.light.textSecondary} />
              <Text style={styles.emptyText}>Không có check-in hôm nay</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Check-out hôm nay</Text>
            <TouchableOpacity style={styles.seeAllBtn}>
              <Text style={styles.seeAllText}>Xem tất cả</Text>
              <ChevronRight size={16} color={Colors.light.tint} />
            </TouchableOpacity>
          </View>
          {todayCheckOuts.length > 0 ? (
            todayCheckOuts.map((booking) => (
              <View key={booking.id} style={styles.bookingCard}>
                <View style={styles.bookingInfo}>
                  <View style={[styles.roomBadge, { backgroundColor: Colors.status.cleaning }]}>
                    <BedDouble size={14} color="#fff" />
                    <Text style={styles.roomBadgeText}>{booking.roomNumber}</Text>
                  </View>
                  <View style={styles.bookingDetails}>
                    <Text style={styles.guestName}>{booking.guestName}</Text>
                    <Text style={styles.bookingMeta}>
                      Còn nợ: {formatCurrency(booking.totalAmount - booking.paidAmount)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={[styles.checkInBtn, { backgroundColor: Colors.status.cleaning }]}>
                  <Text style={styles.checkInBtnText}>Check-out</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <AlertCircle size={20} color={Colors.light.textSecondary} />
              <Text style={styles.emptyText}>Không có check-out hôm nay</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 80,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  hotelName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
    marginTop: 2,
  },
  dateContainer: {
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  dayText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  occupancyCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
  },
  occupancyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  occupancyLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  occupancyValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#fff',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  occupancyStats: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  occupancyStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  occupancyStatText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  content: {
    flex: 1,
    marginTop: -50,
    paddingHorizontal: 16,
  },
  quickStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    minHeight: 100,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  revenueSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 12,
  },
  revenueCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  revenueGradient: {
    padding: 20,
  },
  revenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  revenueLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  revenueValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  revenueDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 6,
  },
  trendText: {
    fontSize: 12,
    color: '#a7f3d0',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.light.tint,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bookingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  roomBadge: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roomBadgeText: {
    color: '#fff',
    fontWeight: '600' as const,
    fontSize: 14,
  },
  bookingDetails: {
    flex: 1,
  },
  guestName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  bookingMeta: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  checkInBtn: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  checkInBtnText: {
    color: '#fff',
    fontWeight: '600' as const,
    fontSize: 13,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
});
