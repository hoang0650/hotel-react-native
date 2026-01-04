import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useHotel } from '@/contexts/HotelContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { roomsService } from '@/services/rooms.service';
import { hotelsService } from '@/services/hotels.service';
import { bookingsService } from '@/services/bookings.service';
import { revenueService } from '@/services/revenue.service';
import { shiftHandoverService } from '@/services/shift-handover.service';
import HotelSelector from '@/components/HotelSelector';
import NotificationIcon from '@/components/NotificationIcon';
import ChatBot from '@/components/ChatBot';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { format, subDays, subWeeks, subMonths } from '@/utils/dateUtils';

const { width } = Dimensions.get('window');

interface RecentBooking {
  _id: string;
  guestName?: string;
  roomNumber?: string;
  checkInDate: Date | string;
  checkOutDate: Date | string;
  status?: string;
}

interface RoomEvent {
  _id: string;
  type: 'checkin' | 'checkout' | 'maintenance' | 'transfer';
  roomId?: {
    _id: string;
    roomNumber: string;
  };
  guestInfo?: {
    name?: string;
  };
  checkinTime?: Date | string;
  checkoutTime?: Date | string;
  transferredFrom?: {
    _id: string;
    roomNumber: string;
  };
  transferredTo?: {
    _id: string;
    roomNumber: string;
  };
  createdAt: Date | string;
}

interface RecentActivity {
  _id: string;
  type: 'checkin' | 'cleaning' | 'service' | 'checkout';
  message: string;
  timestamp: Date | string;
  roomNumber?: string;
  guestName?: string;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { selectedHotelId, setSelectedHotelId } = useHotel();
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Dashboard stats
  const [vacant, setVacant] = useState(0);
  const [booked, setBooked] = useState(0);
  const [cleaning, setCleaning] = useState(0);
  const [occupied, setOccupied] = useState(0);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [roomEvents, setRoomEvents] = useState<RoomEvent[]>([]);

  // Revenue stats
  const [revenuePeriod, setRevenuePeriod] = useState<'day' | 'week' | 'month'>('day');
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [revenueData, setRevenueData] = useState<number[]>([]);
  const [revenueLabels, setRevenueLabels] = useState<string[]>([]);
  const [expenseData, setExpenseData] = useState<number[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  // Room sales stats
  const [salesPeriod, setSalesPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [salesData, setSalesData] = useState<number[]>([]);
  const [salesLabels, setSalesLabels] = useState<string[]>([]);
  const [totalSales, setTotalSales] = useState(0);
  const [salesLoading, setSalesLoading] = useState(false);

  // OTA Login Modal
  const [otaModalVisible, setOtaModalVisible] = useState(false);
  const [selectedOta, setSelectedOta] = useState<string>('');
  const [otaUsername, setOtaUsername] = useState('');
  const [otaPassword, setOtaPassword] = useState('');
  const [otaProcessing, setOtaProcessing] = useState(false);

  // Chat Bot
  const [chatBotVisible, setChatBotVisible] = useState(false);

  useEffect(() => {
    if (selectedHotelId) {
      loadDashboardData();
    }
  }, [selectedHotelId, user]);

  // Load revenue data riêng khi revenuePeriod thay đổi
  useEffect(() => {
    if (selectedHotelId) {
      loadRevenueData();
    }
  }, [revenuePeriod, selectedHotelId]);

  // Load sales data riêng khi salesPeriod thay đổi
  useEffect(() => {
    if (selectedHotelId) {
      loadSalesData();
    }
  }, [salesPeriod, selectedHotelId]);

  const loadDashboardData = async () => {
    if (!selectedHotelId) return;

    try {
      setLoading(true);

      // Load rooms
      try {
        const rooms = await roomsService.getRooms({ hotelId: selectedHotelId });
        
        // Calculate stats
        const vacantCount = rooms.filter((r) => r.status === 'vacant').length;
        const bookedCount = rooms.filter((r) => r.status === 'booked').length;
        const cleaningCount = rooms.filter(
          (r) => r.status === 'cleaning' || r.status === 'dirty'
        ).length;
        const occupiedCount = rooms.filter((r) => r.status === 'occupied').length;
        
        setVacant(vacantCount);
        setBooked(bookedCount);
        setCleaning(cleaningCount);
        setOccupied(occupiedCount);
      } catch (error) {
        console.error('Error loading rooms:', error);
      }

      // Load recent bookings
      try {
        const bookingsData = await bookingsService.getBookings({
          hotelId: selectedHotelId,
        });
        
        const sortedBookings = bookingsData.bookings
          .sort((a: any, b: any) => {
            const dateA = new Date(a.checkInDate || a.checkinDate || 0).getTime();
            const dateB = new Date(b.checkInDate || b.checkinDate || 0).getTime();
            return dateB - dateA;
          })
          .slice(0, 5);
        
        const transformedBookings: RecentBooking[] = sortedBookings.map((booking: any) => ({
          _id: booking._id,
          guestName: booking.guestInfo?.name || booking.guestName || 'Khách lẻ',
          roomNumber: booking.roomId?.roomNumber || booking.roomNumber || 'N/A',
          checkInDate: booking.checkInDate || booking.checkinDate,
          checkOutDate: booking.checkOutDate || booking.checkoutDate,
          status: booking.status || 'pending',
        }));
        
        setRecentBookings(transformedBookings);
      } catch (error) {
        console.error('Error loading bookings:', error);
      }

      // Load room events
      try {
        const events = await roomsService.getEventsByHotelId(selectedHotelId, {
          limit: 5,
          types: ['checkin', 'checkout', 'maintenance', 'transfer']
        });
        setRoomEvents(events);
      } catch (error) {
        console.error('Error loading room events:', error);
      }

      // Load recent activities (from room events)
      try {
        const rooms = await roomsService.getRooms({ hotelId: selectedHotelId });
        const activities: RecentActivity[] = [];
        
        rooms.forEach((room: any) => {
          if (room.events && Array.isArray(room.events)) {
            room.events.slice(0, 3).forEach((event: any) => {
              if (event.type === 'checkin' || event.type === 'check_in') {
                activities.push({
                  _id: `${room._id}-${event._id}`,
                  type: 'checkin',
                  message: `${event.guestInfo?.name || 'Khách'} đã check-in vào phòng ${room.roomNumber}`,
                  timestamp: event.checkinTime || event.timestamp,
                  roomNumber: room.roomNumber,
                  guestName: event.guestInfo?.name,
                });
              } else if (event.type === 'cleaning' || event.status === 'cleaning') {
                activities.push({
                  _id: `${room._id}-${event._id}`,
                  type: 'cleaning',
                  message: `Phòng ${room.roomNumber} đã được dọn dẹp xong`,
                  timestamp: event.timestamp || new Date(),
                  roomNumber: room.roomNumber,
                });
              }
            });
          }
        });
        
        // Sort by timestamp and take first 3
        activities.sort((a, b) => {
          const dateA = new Date(a.timestamp).getTime();
          const dateB = new Date(b.timestamp).getTime();
          return dateB - dateA;
        });
        
        setRecentActivities(activities.slice(0, 3));
      } catch (error) {
        console.error('Error loading activities:', error);
      }

      // Load revenue data lần đầu
      await loadRevenueData();

      // Load room sales stats sẽ được gọi riêng trong loadSalesData
      await loadSalesData();
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadRevenueData = async () => {
    if (!selectedHotelId) return;

    try {
      setRevenueLoading(true);
      const revenue = await revenueService.getRevenue({
        hotelId: selectedHotelId,
        period: revenuePeriod,
      });
      
      console.log('Revenue loaded for hotel:', selectedHotelId, 'Period:', revenuePeriod, 'Data:', {
        labels: revenue.labels?.length || 0,
        revenueData: revenue.revenueData?.length || 0,
        totalRevenue: revenue.totalRevenue,
        totalExpense: revenue.totalExpense,
      });
      
      setRevenueData(revenue.revenueData || []);
      setRevenueLabels(revenue.labels || []);
      setExpenseData(revenue.expenseData || []);
      setTotalRevenue(revenue.totalRevenue || 0);
      setTotalExpense(revenue.totalExpense || 0);
    } catch (error) {
      console.error('Error loading revenue:', error);
      setRevenueData([]);
      setRevenueLabels([]);
      setExpenseData([]);
      setTotalRevenue(0);
      setTotalExpense(0);
    } finally {
      setRevenueLoading(false);
    }
  };

  const loadSalesData = async () => {
    if (!selectedHotelId) return;

    try {
      setSalesLoading(true);
      const now = new Date();
      let startDate: Date;
      switch (salesPeriod) {
        case 'day':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 6);
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 27);
          break;
        case 'month':
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - 11);
          startDate.setDate(1);
          break;
        default:
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 6);
      }

      const checkinData = await shiftHandoverService.getCheckinCountByPeriod(
        selectedHotelId,
        salesPeriod,
        format(startDate, 'yyyy-MM-dd'),
        format(now, 'yyyy-MM-dd')
      );

      setSalesLabels(checkinData.labels || []);
      setSalesData(checkinData.checkinCountData || []);
      setTotalSales(checkinData.totalCheckins || 0);
    } catch (error) {
      console.error('Error loading checkin count:', error);
      // Set empty data on error
      setSalesLabels([]);
      setSalesData([]);
      setTotalSales(0);
    } finally {
      setSalesLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleSelectHotel = async (hotelId: string) => {
    await setSelectedHotelId(hotelId);
  };

  const formatDate = (date: Date | string): string => {
    try {
      const d = new Date(date);
      return format(d, 'dd/MM/yyyy');
    } catch {
      return '';
    }
  };

  const getTimeAgo = (date: Date | string): string => {
    try {
      const d = new Date(date);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      
      if (diffMins < 60) {
        return `${diffMins} phút trước`;
      } else if (diffHours < 24) {
        return `${diffHours} giờ trước`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} ngày trước`;
      }
    } catch {
      return '';
    }
  };

  const getStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      checked_in: 'Đã check-in',
      pending: 'Sắp đến',
      confirmed: 'Đã xác nhận',
      cancelled: 'Đã hủy',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      checked_in: '#1890ff',
      pending: '#ff9800',
      confirmed: '#52c41a',
      cancelled: '#ff4d4f',
    };
    return colorMap[status] || '#999';
  };

  const getActivityIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
      checkin: '→',
      cleaning: '✓',
      service: '🔔',
      checkout: '←',
    };
    return iconMap[type] || '•';
  };

  const getActivityColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      checkin: '#1890ff',
      cleaning: '#52c41a',
      service: '#ff9800',
      checkout: '#ff4d4f',
    };
    return colorMap[type] || '#999';
  };

  const handleOtaClick = (ota: string) => {
    setSelectedOta(ota);
    setOtaModalVisible(true);
    setOtaUsername('');
    setOtaPassword('');
  };

  const handleOtaLogin = async () => {
    if (!otaUsername || !otaPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin đăng nhập');
      return;
    }

    try {
      setOtaProcessing(true);
      // TODO: Call OTA login API
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate API call
      Alert.alert('Thành công', `Đã đăng nhập thành công vào ${selectedOta}`);
      setOtaModalVisible(false);
      setOtaUsername('');
      setOtaPassword('');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể đăng nhập');
    } finally {
      setOtaProcessing(false);
    }
  };

  const getMaxValue = (data: number[]): number => {
    if (data.length === 0) return 100;
    const max = Math.max(...data);
    return Math.ceil(max / 1000) * 1000; // Round up to nearest 1000
  };

  const renderLineChart = (data: number[], labels: string[], maxValue: number) => {
    const chartHeight = 140; // 180 - 40 paddingBottom = 140
    const chartWidth = width - 64;
    const barWidth = (chartWidth - 20) / labels.length; // Không cần trừ padding cho Y-axis

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartContent}>
          <View style={styles.chartBars}>
            {data.map((value, index) => {
              const height = (value / maxValue) * chartHeight;
              return (
                <View key={index} style={styles.chartBarContainer}>
                  <View
                    style={[
                      styles.chartBar,
                      {
                        height: Math.max(height, 4),
                        backgroundColor: '#1890ff',
                      },
                    ]}
                  />
                  {/* Label ngày tháng (X-axis) */}
                  <Text style={styles.chartXLabel}>{labels[index]}</Text>
                </View>
              );
            })}
          </View>
          {/* Line connecting the bars */}
          <View style={styles.chartLine}>
            {data.map((value, index) => {
              if (index === data.length - 1) return null;
              const currentHeight = (value / maxValue) * chartHeight;
              const nextHeight = (data[index + 1] / maxValue) * chartHeight;
              const x1 = index * barWidth + barWidth / 2;
              const y1 = chartHeight - currentHeight;
              const x2 = (index + 1) * barWidth + barWidth / 2;
              const y2 = chartHeight - nextHeight;
              
              const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
              const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
              
              return (
                <View
                  key={index}
                  style={[
                    styles.chartLineSegment,
                    {
                      left: x1,
                      top: y1,
                      width: length,
                      transform: [{ rotate: `${angle}deg` }],
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  const renderBarChart = (data: number[], labels: string[], maxValue: number) => {
    if (data.length === 0) {
      return (
        <View style={styles.chartEmptyContainer}>
          <Text style={styles.chartEmptyText}>{t('common.no_data')}</Text>
        </View>
      );
    }

    // Chiều cao thực tế của biểu đồ (có paddingBottom cho X-axis labels)
    // chartBars có height: 180 và paddingBottom: 40, nên chiều cao thực tế cho bars là 140
    const chartHeight = 140; // 180 - 40 = 140 (chiều cao thực tế cho bars)
    const chartWidth = width - 64;
    const barSpacing = 24; // Khoảng cách giữa các cột (24px)
    const availableWidth = chartWidth - 20; // Không cần trừ padding cho Y-axis nữa
    const barWidth = Math.max(20, Math.min(40, (availableWidth - (barSpacing * (data.length - 1))) / data.length));

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 10 }}
      >
        <View style={styles.chartContainer}>
          <View style={styles.chartContent}>
            <View style={styles.chartBars}>
              {data.map((value, index) => {
                // Tính chiều cao cột dựa trên giá trị và maxValue
                // Đảm bảo tính toán chính xác và không vượt quá maxValue
                const numericValue = Number(value) || 0;
                const numericMaxValue = Number(maxValue) || 1;
                // Đảm bảo giá trị không vượt quá maxValue
                const clampedValue = Math.min(numericValue, numericMaxValue);
                // Tính chiều cao: (giá trị / maxValue) * chiều cao biểu đồ (140px)
                // chartHeight = 140 là chiều cao thực tế cho bars (không bao gồm paddingBottom)
                const height = numericMaxValue > 0 ? Math.floor((clampedValue / numericMaxValue) * chartHeight) : 0;
                const displayValue = numericValue; // Giữ nguyên giá trị để hiển thị
                // Min height 4 nếu có giá trị, nhưng không được vượt quá chartHeight
                // Đảm bảo barHeight không bao giờ vượt quá chartHeight
                const barHeight = Math.min(Math.max(height, numericValue > 0 ? 4 : 0), chartHeight);
                
                return (
                  <View key={index} style={[styles.chartBarContainer, { marginHorizontal: barSpacing / 2 }]}>
                    <View style={styles.chartBarWrapper}>
                      {/* Cột bar - căn từ bottom, chiều cao chính xác */}
                      <View
                        style={[
                          styles.chartBar,
                          {
                            height: barHeight,
                            width: barWidth,
                            backgroundColor: '#1890ff',
                          },
                        ]}
                      />
                      {/* Hiển thị giá trị trên cột - đảm bảo luôn trong vùng nhìn thấy */}
                      {displayValue > 0 && (
                        <View style={[styles.chartBarValueContainer, { 
                          bottom: barHeight >= chartHeight - 30 
                            ? chartHeight - 30  // Nếu cột quá cao, đặt số lượng ở vị trí cố định để luôn nhìn thấy
                            : barHeight + 4     // Nếu cột thấp, đặt trên đỉnh cột với khoảng cách 4px
                        }]}>
                          <Text style={styles.chartBarValue}>
                            {displayValue >= 1000000 
                              ? `${(displayValue / 1000000).toFixed(1)}M`
                              : displayValue >= 1000
                              ? `${(displayValue / 1000).toFixed(1)}K`
                              : displayValue.toString()}
                          </Text>
                        </View>
                      )}
                    </View>
                    {/* Label ngày tháng (X-axis) */}
                    <Text style={styles.chartXLabel} numberOfLines={1}>
                      {labels[index]}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1890ff" />
      </View>
    );
  }

  const revenueMaxValue = getMaxValue(revenueData);
  
  // Tính maxValue cho sales data với làm tròn đẹp
  const getSalesMaxValue = (data: number[]): number => {
    if (data.length === 0) return 10;
    const max = Math.max(...data);
    if (max === 0) return 10;
    // Làm tròn lên số đẹp (5, 10, 20, 50, 100, ...)
    if (max <= 5) return 5;
    if (max <= 10) return 10;
    if (max <= 20) return 20;
    if (max <= 50) return 50;
    if (max <= 100) return 100;
    // Làm tròn lên bội số của 10
    return Math.ceil(max / 10) * 10;
  };
  
  const salesMaxValue = getSalesMaxValue(salesData);

  return (
    <View style={styles.container}>
      {/* Header with blue background */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <HotelSelector
            selectedHotelId={selectedHotelId}
            onSelectHotel={handleSelectHotel}
          />
          <NotificationIcon />
        </View>
        <Text style={styles.headerTitle}>{t('home.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('home.welcome')}</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{vacant}</Text>
            <Text style={styles.statLabel}>{t('home.room.vacant')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{occupied}</Text>
            <Text style={styles.statLabel}>{t('home.room.occupied')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{booked}</Text>
            <Text style={styles.statLabel}>{t('home.room.booked')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{cleaning}</Text>
            <Text style={styles.statLabel}>{t('home.room.cleaning')}</Text>
          </View>
        </View>

        {/* OTA Booking Synchronization */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.ota.title')}</Text>
          <View style={styles.otaContainer}>
            <TouchableOpacity
              style={styles.otaItem}
              onPress={() => handleOtaClick('Booking.com')}
            >
              <View style={[styles.otaIcon, { backgroundColor: '#1890ff' }]}>
                <Text style={styles.otaIconText}>✓</Text>
              </View>
              <Text style={styles.otaLabel}>Booking.com</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.otaItem}
              onPress={() => handleOtaClick('Agoda')}
            >
              <View style={[styles.otaIcon, { backgroundColor: '#9c27b0' }]}>
                <Text style={styles.otaIconText}>🌐</Text>
              </View>
              <Text style={styles.otaLabel}>Agoda</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.otaItem}
              onPress={() => handleOtaClick('Traveloka')}
            >
              <View style={[styles.otaIcon, { backgroundColor: '#1890ff' }]}>
                <Text style={styles.otaIconText}>✈</Text>
              </View>
              <Text style={styles.otaLabel}>Traveloka</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.otaItem}
              onPress={() => handleOtaClick('Airbnb')}
            >
              <View style={[styles.otaIcon, { backgroundColor: '#ff5a5f' }]}>
                <Text style={styles.otaIconText}>🏠</Text>
              </View>
              <Text style={styles.otaLabel}>Airbnb</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.otaItem}
              onPress={() => handleOtaClick('Expedia')}
            >
              <View style={[styles.otaIcon, { backgroundColor: '#003087' }]}>
                <Text style={styles.otaIconText}>🧳</Text>
              </View>
              <Text style={styles.otaLabel}>Expedia</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Access */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.quickAccess.title')}</Text>
          <View style={styles.quickAccessContainer}>
            {/* Row 1 */}
            <TouchableOpacity
              style={styles.quickAccessItem}
              onPress={() => router.push('/(tabs)/invoices')}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: '#52c41a' }]}>
                <Text style={styles.quickAccessIconText}>📄</Text>
              </View>
              <Text style={styles.quickAccessLabel}>{t('home.quickAccess.invoices')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAccessItem}
              onPress={() => router.push('/(tabs)/management/service')}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: '#ff9800' }]}>
                <Text style={styles.quickAccessIconText}>📋</Text>
              </View>
              <Text style={styles.quickAccessLabel}>{t('home.quickAccess.services')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAccessItem}
              onPress={() => router.push('/(tabs)/management/staff')}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: '#1890ff' }]}>
                <Text style={styles.quickAccessIconText}>👥</Text>
              </View>
              <Text style={styles.quickAccessLabel}>{t('home.quickAccess.staff')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAccessItem, styles.quickAccessItemLastInRow]}
              onPress={() => router.push('/(tabs)/invoices?report=shift-history')}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: '#13c2c2' }]}>
                <Text style={styles.quickAccessIconText}>🔄</Text>
              </View>
              <Text style={styles.quickAccessLabel}>{t('home.quickAccess.shiftHistory')}</Text>
            </TouchableOpacity>
            
            {/* Row 2 */}
            <TouchableOpacity
              style={styles.quickAccessItem}
              onPress={() => router.push('/(tabs)/management/room')}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: '#87ceeb' }]}>
                <Text style={styles.quickAccessIconText}>🛏️</Text>
              </View>
              <Text style={styles.quickAccessLabel}>{t('home.quickAccess.rooms')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAccessItem}
              onPress={() => router.push('/(tabs)/management/guest')}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: '#722ed1' }]}>
                <Text style={styles.quickAccessIconText}>👤</Text>
              </View>
              <Text style={styles.quickAccessLabel}>{t('home.quickAccess.guests')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAccessItem}
              onPress={() => router.push('/(tabs)/management/debt')}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: '#fa8c16' }]}>
                <Text style={styles.quickAccessIconText}>💰</Text>
              </View>
              <Text style={styles.quickAccessLabel}>{t('home.quickAccess.debt')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAccessItem, styles.quickAccessItemLastInRow]}
              onPress={() => router.push('/(tabs)/invoices?report=payment-history')}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: '#eb2f96' }]}>
                <Text style={styles.quickAccessIconText}>💳</Text>
              </View>
              <Text style={styles.quickAccessLabel}>{t('home.quickAccess.paymentHistory')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Bookings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.recentBookings.title')}</Text>
          {recentBookings.length === 0 ? (
            <Text style={styles.emptyText}>{t('home.recentBookings.empty')}</Text>
          ) : (
            recentBookings.map((booking) => (
              <View key={booking._id} style={styles.bookingCard}>
                <View style={styles.bookingInfo}>
                  <Text style={styles.bookingGuestName}>{booking.guestName}</Text>
                  <Text style={styles.bookingDetails}>
                    Phòng {booking.roomNumber} • Ngày {formatDate(booking.checkInDate)} - {formatDate(booking.checkOutDate)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.bookingStatus,
                    { backgroundColor: getStatusColor(booking.status || 'pending') },
                  ]}
                >
                  <Text style={styles.bookingStatusText}>
                    {getStatusLabel(booking.status || 'pending')}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Room Events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sự kiện</Text>
          {roomEvents.length === 0 ? (
            <Text style={styles.emptyText}>Không có sự kiện nào</Text>
          ) : (
            roomEvents.map((event) => {
              const getEventLabel = () => {
                switch (event.type) {
                  case 'checkin':
                    return 'Nhận phòng';
                  case 'checkout':
                    return 'Trả phòng';
                  case 'maintenance':
                    return 'Dọn phòng';
                  case 'transfer':
                    return 'Chuyển phòng';
                  default:
                    return 'Sự kiện';
                }
              };

              const getEventColor = () => {
                switch (event.type) {
                  case 'checkin':
                    return '#52c41a';
                  case 'checkout':
                    return '#1890ff';
                  case 'maintenance':
                    return '#faad14';
                  case 'transfer':
                    return '#722ed1';
                  default:
                    return '#999';
                }
              };

              const getEventDetails = () => {
                const roomNumber = event.roomId?.roomNumber || 'N/A';
                const guestName = event.guestInfo?.name || 'Khách lẻ';
                
                switch (event.type) {
                  case 'checkin':
                    return `Phòng ${roomNumber} • ${guestName}`;
                  case 'checkout':
                    return `Phòng ${roomNumber} • ${guestName}`;
                  case 'maintenance':
                    return `Phòng ${roomNumber}`;
                  case 'transfer':
                    const fromRoom = event.transferredFrom?.roomNumber || 'N/A';
                    const toRoom = event.transferredTo?.roomNumber || event.roomId?.roomNumber || 'N/A';
                    return `Phòng ${fromRoom} → Phòng ${toRoom}`;
                  default:
                    return `Phòng ${roomNumber}`;
                }
              };

              return (
                <View key={event._id} style={styles.bookingCard}>
                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingGuestName}>{getEventLabel()}</Text>
                    <Text style={styles.bookingDetails}>
                      {getEventDetails()} • {formatDate(event.createdAt)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.bookingStatus,
                      { backgroundColor: getEventColor() },
                    ]}
                  >
                    <Text style={styles.bookingStatusText}>
                      {getEventLabel()}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Recent Activities */}
        {recentActivities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('home.recentActivities.title')}</Text>
            {recentActivities.map((activity) => (
              <View key={activity._id} style={styles.activityCard}>
                <View
                  style={[
                    styles.activityIcon,
                    { backgroundColor: getActivityColor(activity.type) },
                  ]}
                >
                  <Text style={styles.activityIconText}>
                    {getActivityIcon(activity.type)}
                  </Text>
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityMessage}>{activity.message}</Text>
                  <Text style={styles.activityTime}>{getTimeAgo(activity.timestamp)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Revenue Statistics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('home.revenue.title')}</Text>
            <TouchableOpacity
              style={styles.reloadButtonSmall}
              onPress={() => {
                if (selectedHotelId) {
                  loadRevenueData();
                }
              }}
              disabled={revenueLoading}
            >
              <IconSymbol name="arrow.clockwise" size={16} color={revenueLoading ? '#999' : '#1890ff'} />
            </TouchableOpacity>
          </View>
          <View style={styles.periodButtons}>
            {(['day', 'week', 'month'] as const).map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  revenuePeriod === period && styles.periodButtonActive,
                ]}
                onPress={() => setRevenuePeriod(period)}
                disabled={revenueLoading}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    revenuePeriod === period && styles.periodButtonTextActive,
                  ]}
                >
                  {period === 'day' ? t('home.revenue.period.day') : period === 'week' ? t('home.revenue.period.week') : t('home.revenue.period.month')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {revenueLoading ? (
            <View style={styles.chartLoadingContainer}>
              <ActivityIndicator size="small" color="#1890ff" />
              <Text style={styles.chartLoadingText}>Đang tải dữ liệu...</Text>
            </View>
          ) : revenueData.length > 0 ? (
            <>
              {renderBarChart(revenueData, revenueLabels, revenueMaxValue)}
              <View style={styles.revenueSummary}>
                <View style={styles.revenueSummaryItem}>
                  <Text style={styles.revenueSummaryLabel}>Tổng doanh thu:</Text>
                  <Text style={[styles.revenueSummaryValue, { color: '#1890ff' }]}>
                    {totalRevenue.toLocaleString('vi-VN')} ₫
                  </Text>
                </View>
                <View style={styles.revenueSummaryItem}>
                  <Text style={styles.revenueSummaryLabel}>Tổng chi phí:</Text>
                  <Text style={[styles.revenueSummaryValue, { color: '#ff4d4f' }]}>
                    {totalExpense.toLocaleString('vi-VN')} ₫
                  </Text>
                </View>
                <View style={styles.revenueSummaryItem}>
                  <Text style={styles.revenueSummaryLabel}>Lợi nhuận:</Text>
                  <Text style={[
                    styles.revenueSummaryValue,
                    { color: (totalRevenue - totalExpense) >= 0 ? '#52c41a' : '#ff4d4f' }
                  ]}>
                    {(totalRevenue - totalExpense).toLocaleString('vi-VN')} ₫
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.chartEmptyContainer}>
              <IconSymbol name="chart.bar" size={48} color="#d9d9d9" />
              <Text style={styles.chartEmptyText}>Không có dữ liệu doanh thu</Text>
            </View>
          )}
        </View>

        {/* Room Sales Statistics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('home.sales.title')}</Text>
            <TouchableOpacity
              style={styles.reloadButtonSmall}
              onPress={() => {
                if (selectedHotelId) {
                  loadSalesData();
                }
              }}
              disabled={salesLoading}
            >
              <IconSymbol name="arrow.clockwise" size={16} color={salesLoading ? "#999" : "#1890ff"} />
            </TouchableOpacity>
          </View>
          <View style={styles.periodButtons}>
            {(['day', 'week', 'month'] as const).map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  salesPeriod === period && styles.periodButtonActive,
                ]}
                onPress={() => setSalesPeriod(period)}
                disabled={salesLoading}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    salesPeriod === period && styles.periodButtonTextActive,
                  ]}
                >
                  {period === 'day' ? t('home.sales.period.day') : period === 'week' ? t('home.sales.period.week') : t('home.sales.period.month')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {salesLoading ? (
            <View style={styles.chartLoadingContainer}>
              <ActivityIndicator size="small" color="#1890ff" />
              <Text style={styles.chartLoadingText}>{t('common.loading')}</Text>
            </View>
          ) : salesData.length > 0 ? (
            renderBarChart(salesData, salesLabels, salesMaxValue)
          ) : (
            <View style={styles.chartEmptyContainer}>
              <IconSymbol name="doc.text.fill" size={40} color="#999" style={{ marginBottom: 10 }} />
              <Text style={styles.chartEmptyText}>{t('common.no_data')}</Text>
            </View>
          )}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>{t('home.sales.total')}</Text>
            <Text style={[styles.totalValue, { color: '#52c41a' }]} numberOfLines={1}>
              {totalSales.toLocaleString('vi-VN')} lượt
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* OTA Login Modal */}
      <Modal
        visible={otaModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setOtaModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.otaModalContent}>
            <View style={styles.otaModalHeader}>
              <View style={styles.otaModalHeaderLeft}>
                <View style={[styles.otaIcon, { backgroundColor: '#1890ff' }]}>
                  <Text style={styles.otaIconText}>✓</Text>
                </View>
                <Text style={styles.otaModalTitle}>Đăng nhập {selectedOta}</Text>
              </View>
              <TouchableOpacity onPress={() => setOtaModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.otaModalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tài khoản</Text>
                <TextInput
                  style={styles.input}
                  value={otaUsername}
                  onChangeText={setOtaUsername}
                  placeholder="Nhập tài khoản"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mật khẩu</Text>
                <TextInput
                  style={styles.input}
                  value={otaPassword}
                  onChangeText={setOtaPassword}
                  placeholder="Nhập mật khẩu"
                  secureTextEntry
                />
              </View>
              <TouchableOpacity
                style={[styles.otaLoginButton, otaProcessing && styles.otaLoginButtonProcessing]}
                onPress={handleOtaLogin}
                disabled={otaProcessing}
              >
                {otaProcessing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.otaLoginButtonText}>Đăng nhập</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.otaNote}>
                Lưu ý: Dữ liệu sẽ được đồng bộ hàng ngày từ hệ thống OTA
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Chat Bot Modal */}
      <ChatBot
        visible={chatBotVisible}
        onClose={() => setChatBotVisible(false)}
      />

      {/* Floating Chat Button */}
      <TouchableOpacity
        style={styles.chatButton}
        onPress={() => setChatBotVisible(true)}
      >
        <Text style={styles.chatIcon}>💬</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#1890ff',
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1890ff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  reloadButtonSmall: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  otaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  otaItem: {
    alignItems: 'center',
    width: (width - 64) / 5,
    marginBottom: 12,
  },
  otaIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  otaIconText: {
    fontSize: 24,
    color: '#fff',
  },
  otaLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  quickAccessContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quickAccessItem: {
    alignItems: 'center',
    width: `${((100 - (3 * 2.5)) / 4)}%`, // 4 columns with 2.5% gap between each (3 gaps total)
    marginRight: '2.5%',
    marginBottom: 12,
  },
  quickAccessItemLastInRow: {
    marginRight: 0, // Remove margin for last item in each row (4th and 8th items)
  },
  quickAccessIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickAccessIconText: {
    fontSize: 24,
  },
  quickAccessLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  bookingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingGuestName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  bookingDetails: {
    fontSize: 12,
    color: '#666',
  },
  bookingStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  bookingStatusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityIconText: {
    fontSize: 20,
    color: '#fff',
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
  periodButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#1890ff',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  chartContainer: {
    flexDirection: 'row',
    height: 180, // Chiều cao của biểu đồ (không cần Y-axis nữa)
    marginBottom: 8,
    minWidth: width - 64,
  },
  chartContent: {
    flex: 1,
    position: 'relative',
    height: 180, // Cùng chiều cao với chartBars
    paddingBottom: 0, // Không cần paddingBottom ở đây
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 180,
    paddingBottom: 40, // PaddingBottom để có chỗ cho X-axis labels
    paddingHorizontal: 4,
  },
  chartBarContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  chartBarWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 180, // Chiều cao cố định để căn đúng với chartBars
    position: 'relative',
    marginBottom: 0, // Không cần marginBottom vì đã có paddingBottom trong chartBars
  },
  chartBar: {
    borderRadius: 4,
    minHeight: 4,
    alignSelf: 'flex-end', // Căn từ bottom
  },
  chartBarValueContainer: {
    position: 'absolute',
    alignItems: 'center',
    width: '100%',
    bottom: 0, // Sẽ được override bởi inline style
  },
  chartBarValue: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 3,
    minWidth: 20,
    textAlign: 'center',
    overflow: 'hidden',
  },
  chartXLabelContainer: {
    alignItems: 'center',
    marginTop: 4,
    minHeight: 32,
  },
  chartXValue: {
    fontSize: 12,
    color: '#1890ff',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  chartXLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    maxWidth: 60,
  },
  chartEmptyContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  chartEmptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  chartLoadingContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  chartLoadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  chartLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  chartLineSegment: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#1890ff',
    transformOrigin: 'left center',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
  revenueSummary: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 8,
  },
  revenueSummaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  revenueSummaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  revenueSummaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otaModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: width - 64,
    maxWidth: 400,
  },
  otaModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  otaModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  otaModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#999',
  },
  otaModalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  otaLoginButton: {
    backgroundColor: '#1890ff',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  otaLoginButtonProcessing: {
    opacity: 0.7,
  },
  otaLoginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  otaNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  chatButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1890ff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  chatIcon: {
    fontSize: 24,
  },
});
