import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useHotel } from '@/contexts/HotelContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { roomsService } from '@/services/rooms.service';
import { Booking } from '@/types';
import ChatBot from '@/components/ChatBot';
import { format } from '@/utils/dateUtils';

const { width } = Dimensions.get('window');
const DAY_WIDTH = (width - 40) / 7; // 7 days, padding 20 each side

export default function CalendarScreen() {
  const { user } = useAuth();
  const { selectedHotelId } = useHotel();
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [chatBotVisible, setChatBotVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fadeAnim = useState(new Animated.Value(0))[0];

  const monthNamesVi = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  const daysOfWeekVi = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  useEffect(() => {
    if (selectedHotelId || user?.hotelId || user?.businessId) {
      loadBookings();
    }
  }, [selectedHotelId, user, currentMonth, currentYear]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [selectedDate]);

  const datesInMonth = useMemo(() => {
    const dates: Date[] = [];
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    // Add previous month's trailing days
    const prevMonth = new Date(currentYear, currentMonth, 0);
    const daysInPrevMonth = prevMonth.getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      dates.push(new Date(currentYear, currentMonth - 1, daysInPrevMonth - i));
    }

    // Add current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      dates.push(new Date(currentYear, currentMonth, i));
    }

    // Add next month's leading days to fill the grid
    const remainingDays = 42 - dates.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      dates.push(new Date(currentYear, currentMonth + 1, i));
    }

    return dates;
  }, [currentMonth, currentYear]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const hotelId = selectedHotelId || user?.hotelId || user?.businessId;
      if (!hotelId) {
        console.warn('No hotelId found');
        setBookings([]);
        return;
      }

      const startDate = new Date(currentYear, currentMonth, 1);
      const endDate = new Date(currentYear, currentMonth + 1, 0);

      const response = await roomsService.getBookings({
        hotelId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });
      setBookings(response.bookings || []);
    } catch (error: any) {
      console.error('Error loading bookings:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải danh sách đặt phòng');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(today);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isCheckInDate = (date: Date) => {
    return bookings.some((booking) => {
      if (!booking.checkInDate) return false;
      const checkIn = new Date(booking.checkInDate);
      return (
        checkIn.getDate() === date.getDate() &&
        checkIn.getMonth() === date.getMonth() &&
        checkIn.getFullYear() === date.getFullYear()
      );
    });
  };

  const isCheckOutDate = (date: Date) => {
    return bookings.some((booking) => {
      if (!booking.checkOutDate) return false;
      const checkOut = new Date(booking.checkOutDate);
      return (
        checkOut.getDate() === date.getDate() &&
        checkOut.getMonth() === date.getMonth() &&
        checkOut.getFullYear() === date.getFullYear()
      );
    });
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  };

  const getBookingsForDate = (date: Date) => {
    return bookings.filter((booking) => {
      if (!booking.checkInDate) return false;
      const checkIn = new Date(booking.checkInDate);
      return (
        checkIn.getDate() === date.getDate() &&
        checkIn.getMonth() === date.getMonth() &&
        checkIn.getFullYear() === date.getFullYear()
      );
    });
  };

  const formatDate = (date: Date) => {
    return format(date, 'dd/MM/yyyy');
  };

  const formatDateTime = (date: Date | string) => {
    const d = new Date(date);
    return format(d, 'dd/MM/yyyy HH:mm');
  };

  const selectedDateBookings = useMemo(() => {
    if (!selectedDate) return [];
    let filtered = getBookingsForDate(selectedDate);
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((booking) => {
        const guestName = booking.guestInfo?.name?.toLowerCase() || '';
        const guestPhone = booking.guestInfo?.phone?.toLowerCase() || '';
        const roomNumber = (booking.roomNumber || booking.roomId || '').toString().toLowerCase();
        return guestName.includes(query) || guestPhone.includes(query) || roomNumber.includes(query);
      });
    }
    
    return filtered;
  }, [selectedDate, bookings, searchQuery]);

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      checked_in: '#52c41a',
      booked: '#1890ff',
      cancelled: '#999',
      pending: '#faad14',
    };
    return colorMap[status] || '#722ed1';
  };

  const getStatusLabel = (status: string) => {
    const labelMap: Record<string, string> = {
      checked_in: 'Đã nhận',
      booked: 'Đã đặt',
      cancelled: 'Đã hủy',
      pending: 'Chờ xác nhận',
    };
    return labelMap[status] || 'Đặt trước';
  };

  const getRateTypeLabel = (rateType?: string) => {
    if (!rateType) return 'N/A';
    const labelMap: Record<string, string> = {
      hourly: 'Theo giờ',
      daily: 'Theo ngày',
      nightly: 'Qua đêm',
    };
    return labelMap[rateType] || rateType;
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1890ff" />
        <Text style={styles.loadingText}>Đang tải lịch đặt phòng...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('calendar.title')}</Text>
        <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
          <Text style={styles.todayButtonText}>{t('calendar.today')}</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar Section */}
      <View style={styles.calendarContainer}>
        {/* Month Navigation */}
        <View style={styles.monthNavigation}>
          <TouchableOpacity onPress={prevMonth} style={styles.monthButton}>
            <Text style={styles.monthButtonIcon}>‹</Text>
          </TouchableOpacity>
          <View style={styles.monthTextContainer}>
            <Text style={styles.monthText}>
              {monthNamesVi[currentMonth]} {currentYear}
            </Text>
          </View>
          <TouchableOpacity onPress={nextMonth} style={styles.monthButton}>
            <Text style={styles.monthButtonIcon}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Days of Week Header */}
        <View style={styles.daysOfWeekContainer}>
          {daysOfWeekVi.map((day, index) => (
            <View key={index} style={styles.dayHeader}>
              <Text style={[
                styles.dayHeaderText,
                index === 0 && styles.dayHeaderTextWeekend
              ]}>
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {datesInMonth.map((date, index) => {
            const isCurrent = isCurrentMonth(date);
            const isSelectedDate = isSelected(date);
            const isTodayDate = isToday(date);
            const isCheckIn = isCheckInDate(date);
            const isCheckOut = isCheckOutDate(date);
            const dateBookings = getBookingsForDate(date);
            const hasBookings = dateBookings.length > 0;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.calendarDay,
                  !isCurrent && styles.calendarDayOtherMonth,
                  isTodayDate && styles.calendarDayToday,
                  isSelectedDate && styles.calendarDaySelected,
                  hasBookings && !isSelectedDate && styles.calendarDayHasBookings,
                ]}
                onPress={() => setSelectedDate(date)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.calendarDayText,
                    !isCurrent && styles.calendarDayTextOtherMonth,
                    isTodayDate && styles.calendarDayTextToday,
                    isSelectedDate && styles.calendarDayTextSelected,
                  ]}
                >
                  {date.getDate()}
                </Text>
                {hasBookings && (
                  <View style={styles.bookingIndicator}>
                    <View style={[
                      styles.bookingDot,
                      isCheckIn && styles.bookingDotCheckIn,
                      isCheckOut && styles.bookingDotCheckOut,
                    ]} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendDotToday]} />
            <Text style={styles.legendText}>{t('calendar.legend.today')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendDotSelected]} />
            <Text style={styles.legendText}>{t('calendar.legend.selected')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendDotCheckIn]} />
            <Text style={styles.legendText}>{t('calendar.legend.checkin')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendDotCheckOut]} />
            <Text style={styles.legendText}>{t('calendar.legend.checkout')}</Text>
          </View>
        </View>
      </View>

      {/* Booking List Section */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1890ff']}
            tintColor="#1890ff"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {selectedDate ? (
          <>
            <View style={styles.selectedDateHeader}>
              <View>
                <Text style={styles.selectedDateTitle}>
                  {formatDate(selectedDate)}
                </Text>
                <Text style={styles.selectedDateSubtitle}>
                  {selectedDateBookings.length} đặt phòng
                </Text>
              </View>
              {isToday(selectedDate) && (
                <View style={styles.todayBadge}>
                  <Text style={styles.todayBadgeText}>{t('calendar.today')}</Text>
                </View>
              )}
            </View>

            {selectedDateBookings.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📅</Text>
                <Text style={styles.emptyText}>
                  {searchQuery.trim() 
                    ? 'Không tìm thấy đặt phòng phù hợp'
                    : t('calendar.noBookings')}
                </Text>
                {searchQuery.trim() && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    style={styles.clearSearchButton}
                  >
                    <Text style={styles.clearSearchText}>Xóa tìm kiếm</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <Animated.View style={{ opacity: fadeAnim }}>
                {selectedDateBookings.map((booking, index) => (
                  <View key={booking._id || booking.bookingId || index} style={styles.bookingCard}>
                    <View style={styles.bookingCardHeader}>
                      <View style={styles.roomInfo}>
                        <Text style={styles.roomNumber}>
                          Phòng {booking.roomNumber || booking.roomId || 'N/A'}
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: getStatusColor(booking.status || 'booked') },
                          ]}
                        >
                          <Text style={styles.statusText}>
                            {getStatusLabel(booking.status || 'booked')}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.bookingCardBody}>
                      {booking.guestInfo?.name && (
                        <View style={styles.bookingInfoRow}>
                          <Text style={styles.infoIcon}>👤</Text>
                          <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Khách hàng</Text>
                            <Text style={styles.infoValue}>{booking.guestInfo.name}</Text>
                          </View>
                        </View>
                      )}

                      {booking.guestInfo?.phone && (
                        <View style={styles.bookingInfoRow}>
                          <Text style={styles.infoIcon}>📞</Text>
                          <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Số điện thoại</Text>
                            <Text style={styles.infoValue}>{booking.guestInfo.phone}</Text>
                          </View>
                        </View>
                      )}

                      {booking.checkInDate && (
                        <View style={styles.bookingInfoRow}>
                          <Text style={styles.infoIcon}>→</Text>
                          <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Check-in</Text>
                            <Text style={styles.infoValue}>
                              {formatDateTime(booking.checkInDate)}
                            </Text>
                          </View>
                        </View>
                      )}

                      {booking.checkOutDate && (
                        <View style={styles.bookingInfoRow}>
                          <Text style={styles.infoIcon}>←</Text>
                          <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Check-out</Text>
                            <Text style={styles.infoValue}>
                              {formatDateTime(booking.checkOutDate)}
                            </Text>
                          </View>
                        </View>
                      )}

                      {booking.rateType && (
                        <View style={styles.bookingInfoRow}>
                          <Text style={styles.infoIcon}>💰</Text>
                          <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Loại giá</Text>
                            <Text style={styles.infoValue}>
                              {getRateTypeLabel(booking.rateType)}
                            </Text>
                          </View>
                        </View>
                      )}

                      {booking.advancePayment && booking.advancePayment > 0 && (
                        <View style={styles.bookingInfoRow}>
                          <Text style={styles.infoIcon}>💵</Text>
                          <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Đặt cọc</Text>
                            <Text style={styles.infoValue}>
                              {booking.advancePayment.toLocaleString('vi-VN')} ₫
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </Animated.View>
            )}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>
              Vui lòng chọn ngày để xem đặt phòng
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Chat Bot Modal */}
      <ChatBot
        visible={chatBotVisible}
        onClose={() => setChatBotVisible(false)}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setChatBotVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>💬</Text>
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1890ff',
    borderRadius: 16,
  },
  todayButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: '#f5f5f5',
  },
  monthButtonIcon: {
    fontSize: 28,
    color: '#1890ff',
    fontWeight: 'bold',
  },
  monthTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  monthText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  daysOfWeekContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dayHeader: {
    width: DAY_WIDTH,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  dayHeaderTextWeekend: {
    color: '#ff4d4f',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  calendarDay: {
    width: DAY_WIDTH,
    height: DAY_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 8,
    position: 'relative',
  },
  calendarDayOtherMonth: {
    opacity: 0.3,
  },
  calendarDayToday: {
    backgroundColor: '#e6f7ff',
    borderWidth: 2,
    borderColor: '#1890ff',
  },
  calendarDaySelected: {
    backgroundColor: '#1890ff',
    borderRadius: DAY_WIDTH / 2,
  },
  calendarDayHasBookings: {
    backgroundColor: '#f0f0f0',
  },
  calendarDayText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  calendarDayTextOtherMonth: {
    color: '#999',
  },
  calendarDayTextToday: {
    color: '#1890ff',
    fontWeight: 'bold',
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  bookingIndicator: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bookingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1890ff',
  },
  bookingDotCheckIn: {
    backgroundColor: '#ff9800',
  },
  bookingDotCheckOut: {
    backgroundColor: '#52c41a',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendDotToday: {
    backgroundColor: '#1890ff',
    borderWidth: 2,
    borderColor: '#1890ff',
  },
  legendDotSelected: {
    backgroundColor: '#1890ff',
  },
  legendDotCheckIn: {
    backgroundColor: '#ff9800',
  },
  legendDotCheckOut: {
    backgroundColor: '#52c41a',
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  content: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  selectedDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  selectedDateSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  todayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#52c41a',
    borderRadius: 12,
  },
  todayBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
    minHeight: 300,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 16,
  },
  clearSearchButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1890ff',
    borderRadius: 8,
  },
  clearSearchText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bookingCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  bookingCardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  roomInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  bookingCardBody: {
    padding: 16,
  },
  bookingInfoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 12,
    marginTop: 2,
    width: 24,
    textAlign: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1890ff',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  fabIcon: {
    fontSize: 24,
  },
});
