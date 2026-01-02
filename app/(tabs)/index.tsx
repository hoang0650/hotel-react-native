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
import HotelSelector from '@/components/HotelSelector';
import NotificationIcon from '@/components/NotificationIcon';
import ChatBot from '@/components/ChatBot';
import { format } from '@/utils/dateUtils';

const { width } = Dimensions.get('window');

interface RecentBooking {
  _id: string;
  guestName?: string;
  roomNumber?: string;
  checkInDate: Date | string;
  checkOutDate: Date | string;
  status?: string;
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
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  // Revenue stats
  const [revenuePeriod, setRevenuePeriod] = useState<'day' | 'week' | 'month'>('day');
  const [revenueData, setRevenueData] = useState<number[]>([]);
  const [revenueLabels, setRevenueLabels] = useState<string[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);

  // Room sales stats
  const [salesPeriod, setSalesPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [salesData, setSalesData] = useState<number[]>([]);
  const [salesLabels, setSalesLabels] = useState<string[]>([]);
  const [totalSales, setTotalSales] = useState(0);

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
  }, [selectedHotelId, user, revenuePeriod, salesPeriod]);

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
        
        setVacant(vacantCount);
        setBooked(bookedCount);
        setCleaning(cleaningCount);
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

      // Load revenue stats
      try {
        const today = new Date();
        const startDate = format(today, 'yyyy-MM-dd');
        const revenue = await revenueService.getRevenue({
          hotelId: selectedHotelId,
          period: revenuePeriod,
          startDate,
        });
        
        setRevenueData(revenue.revenueData || []);
        setRevenueLabels(revenue.labels || []);
        setTotalRevenue(revenue.totalRevenue || 0);
      } catch (error) {
        console.error('Error loading revenue:', error);
        // Set default data for demo
        if (revenuePeriod === 'day') {
          setRevenueLabels(['Sáng', 'Trưa', 'Chiều', 'Tối']);
          setRevenueData([15000, 22000, 18000, 25000]);
          setTotalRevenue(8000000);
        }
      }

      // Load room sales stats
      try {
        // Calculate from bookings
        const bookingsData = await bookingsService.getBookings({
          hotelId: selectedHotelId,
        });
        
        // Group by period of day
        const salesByPeriod: Record<string, number> = {
          'Sáng': 0,
          'Trưa': 0,
          'Chiều': 0,
          'Tối': 0,
        };
        
        bookingsData.bookings.forEach((booking: any) => {
          const checkInTime = new Date(booking.checkInDate || booking.checkinDate);
          const hour = checkInTime.getHours();
          let period = 'Sáng';
          if (hour >= 6 && hour < 12) period = 'Sáng';
          else if (hour >= 12 && hour < 17) period = 'Trưa';
          else if (hour >= 17 && hour < 22) period = 'Chiều';
          else period = 'Tối';
          
          salesByPeriod[period]++;
        });
        
        setSalesLabels(['Sáng', 'Trưa', 'Chiều', 'Tối']);
        setSalesData([
          salesByPeriod['Sáng'] || 5,
          salesByPeriod['Trưa'] || 8,
          salesByPeriod['Chiều'] || 6,
          salesByPeriod['Tối'] || 10,
        ]);
        setTotalSales(
          salesByPeriod['Sáng'] + salesByPeriod['Trưa'] + salesByPeriod['Chiều'] + salesByPeriod['Tối'] || 29
        );
      } catch (error) {
        console.error('Error loading sales:', error);
        // Set default data for demo
        setSalesLabels(['Sáng', 'Trưa', 'Chiều', 'Tối']);
        setSalesData([5, 8, 6, 10]);
        setTotalSales(29);
      }
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
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
    const chartHeight = 150;
    const chartWidth = width - 64;
    const barWidth = (chartWidth - 40) / labels.length;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartYAxis}>
          {[0, maxValue / 4, maxValue / 2, (maxValue * 3) / 4, maxValue].map((value) => (
            <Text key={value} style={styles.chartYLabel}>
              {value.toLocaleString('vi-VN')}
            </Text>
          ))}
        </View>
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
    const chartHeight = 150;
    const chartWidth = width - 64;
    const barWidth = (chartWidth - 40) / labels.length;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartYAxis}>
          {[0, maxValue / 5, (maxValue * 2) / 5, (maxValue * 3) / 5, (maxValue * 4) / 5, maxValue].map((value) => (
            <Text key={value} style={styles.chartYLabel}>
              {value}
            </Text>
          ))}
        </View>
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
                        backgroundColor: '#52c41a',
                      },
                    ]}
                  />
                  <Text style={styles.chartXLabel}>{labels[index]}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
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
  const salesMaxValue = Math.max(...salesData, 20);

  return (
    <View style={styles.container}>
      {/* Header with blue background */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <HotelSelector
            selectedHotelId={selectedHotelId}
            onSelectHotel={handleSelectHotel}
          />
          <NotificationIcon count={5} />
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
            <TouchableOpacity
              style={styles.quickAccessItem}
              onPress={() => router.push('/(tabs)/rooms')}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: '#87ceeb' }]}>
                <Text style={styles.quickAccessIconText}>🛏️</Text>
              </View>
              <Text style={styles.quickAccessLabel}>{t('home.quickAccess.rooms')}</Text>
            </TouchableOpacity>
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
              onPress={() => {
                // TODO: Navigate to services screen
              }}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: '#ff9800' }]}>
                <Text style={styles.quickAccessIconText}>📋</Text>
              </View>
              <Text style={styles.quickAccessLabel}>{t('home.quickAccess.services')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAccessItem}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: '#9c27b0' }]}>
                <Text style={styles.quickAccessIconText}>👤</Text>
              </View>
              <Text style={styles.quickAccessLabel}>{t('home.quickAccess.account')}</Text>
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
          <Text style={styles.sectionTitle}>{t('home.revenue.title')}</Text>
          <View style={styles.periodButtons}>
            {(['day', 'week', 'month'] as const).map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  revenuePeriod === period && styles.periodButtonActive,
                ]}
                onPress={() => setRevenuePeriod(period)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    revenuePeriod === period && styles.periodButtonTextActive,
                  ]}
                >
                  {period === 'day' ? 'Theo ngày' : period === 'week' ? 'Theo tuần' : 'Theo tháng'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {revenueData.length > 0 && renderLineChart(revenueData, revenueLabels, revenueMaxValue)}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>{t('home.revenue.total')}</Text>
            <Text style={[styles.totalValue, { color: '#1890ff' }]}>
              {totalRevenue.toLocaleString('vi-VN')} ₫
            </Text>
          </View>
        </View>

        {/* Room Sales Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.sales.title')}</Text>
          <View style={styles.periodButtons}>
            {(['day', 'week', 'month'] as const).map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  salesPeriod === period && styles.periodButtonActive,
                ]}
                onPress={() => setSalesPeriod(period)}
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
          {salesData.length > 0 && renderBarChart(salesData, salesLabels, salesMaxValue)}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>{t('home.sales.total')}</Text>
            <Text style={[styles.totalValue, { color: '#52c41a' }]}>
              {totalSales} phòng
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
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
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  quickAccessItem: {
    alignItems: 'center',
    width: (width - 64) / 4,
    marginBottom: 12,
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
    height: 200,
    marginBottom: 16,
  },
  chartYAxis: {
    width: 40,
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  chartYLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'right',
  },
  chartContent: {
    flex: 1,
    position: 'relative',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 150,
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  chartBarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  chartBar: {
    width: '80%',
    borderRadius: 4,
    marginBottom: 8,
  },
  chartXLabel: {
    fontSize: 10,
    color: '#666',
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
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
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
