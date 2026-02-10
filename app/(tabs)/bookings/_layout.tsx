import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  Calendar,
  User,
  BedDouble,
  Clock,
  CreditCard,
  ChevronRight,
  Plus,
  CheckCircle,
  LogIn,
  LogOut,
  XCircle,
  AlertCircle,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { bookingsApi } from '@/services/api';
import { Booking, BookingStatus } from '@/types/hotel';

const statusConfig: Record<BookingStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  confirmed: { label: 'Đã xác nhận', color: Colors.booking.confirmed, icon: CheckCircle },
  checked_in: { label: 'Đã nhận phòng', color: Colors.booking.checked_in, icon: LogIn },
  checked_out: { label: 'Đã trả phòng', color: Colors.booking.checked_out, icon: LogOut },
  cancelled: { label: 'Đã hủy', color: Colors.booking.cancelled, icon: XCircle },
};

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<BookingStatus | 'all'>('all');

  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingsApi.getAll(),
  });

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const matchesSearch =
        booking.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.roomNumber.includes(searchQuery);
      const matchesFilter = selectedFilter === 'all' || booking.status === selectedFilter;
      return matchesSearch && matchesFilter;
    });
  }, [bookings, searchQuery, selectedFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateNights = (checkIn: string, checkOut: string) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 1;
  };

  const renderBookingCard = (booking: Booking) => {
    const status = statusConfig[booking.status];
    const StatusIcon = status.icon;
    const nights = calculateNights(booking.checkIn, booking.checkOut);
    const isPaid = booking.paidAmount >= booking.totalAmount;

    return (
      <TouchableOpacity key={booking.id} style={styles.bookingCard} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View style={styles.bookingIdContainer}>
            <Text style={styles.bookingId}>#{booking.id.slice(-6).toUpperCase()}</Text>
            <View style={[styles.statusBadge, { backgroundColor: status.color + '15' }]}>
              <StatusIcon size={12} color={status.color} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
          <ChevronRight size={20} color={Colors.light.textSecondary} />
        </View>

        <View style={styles.guestRow}>
          <View style={styles.guestAvatar}>
            <User size={18} color="#fff" />
          </View>
          <View style={styles.guestInfo}>
            <Text style={styles.guestName}>{booking.guestName}</Text>
            <Text style={styles.guestMeta}>
              {booking.adults} người lớn{booking.children > 0 ? ` • ${booking.children} trẻ em` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          {booking.roomNumber && (
            <View style={styles.detailItem}>
              <BedDouble size={16} color={Colors.light.tint} />
              <Text style={styles.detailText}>Phòng {booking.roomNumber}</Text>
            </View>
          )}
          <View style={styles.detailItem}>
            <Clock size={16} color={Colors.light.textSecondary} />
            <Text style={styles.detailText}>{nights} đêm</Text>
          </View>
        </View>

        <View style={styles.dateRow}>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Nhận phòng</Text>
            <Text style={styles.dateValue}>{booking.checkIn}</Text>
          </View>
          <View style={styles.dateArrow}>
            <ChevronRight size={16} color={Colors.light.textSecondary} />
          </View>
          <View style={[styles.dateItem, { alignItems: 'flex-end' }]}>
            <Text style={styles.dateLabel}>Trả phòng</Text>
            <Text style={styles.dateValue}>{booking.checkOut}</Text>
          </View>
        </View>

        <View style={styles.paymentRow}>
          <View style={styles.paymentInfo}>
            <CreditCard size={16} color={Colors.light.textSecondary} />
            <Text style={styles.totalAmount}>{formatCurrency(booking.totalAmount)}</Text>
          </View>
          <View style={[styles.paymentBadge, { backgroundColor: isPaid ? '#dcfce7' : '#fef3c7' }]}>
            <Text style={[styles.paymentStatus, { color: isPaid ? Colors.status.available : Colors.status.cleaning }]}>
              {isPaid ? 'Đã thanh toán' : `Còn nợ ${formatCurrency(booking.totalAmount - booking.paidAmount)}`}
            </Text>
          </View>
        </View>

        {booking.specialRequests && (
          <View style={styles.specialRequest}>
            <Text style={styles.specialRequestLabel}>Yêu cầu đặc biệt:</Text>
            <Text style={styles.specialRequestText}>{booking.specialRequests}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading && bookings.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Đang tải danh sách đặt phòng...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Đặt phòng</Text>
          <Text style={styles.subtitle}>{bookings.length} booking</Text>
        </View>
        <TouchableOpacity style={styles.addButton}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={18} color={Colors.light.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm khách hoặc phòng..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.light.textSecondary}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('all')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'all' && styles.filterChipTextActive]}>
            Tất cả
          </Text>
        </TouchableOpacity>
        {(Object.keys(statusConfig) as BookingStatus[]).map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterChip,
              selectedFilter === status && styles.filterChipActive,
              selectedFilter === status && { backgroundColor: statusConfig[status].color },
            ]}
            onPress={() => setSelectedFilter(status)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === status && styles.filterChipTextActive,
              ]}
            >
              {statusConfig[status].label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.bookingsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.bookingsListContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        {filteredBookings.map(renderBookingCard)}
        {filteredBookings.length === 0 && (
          <View style={styles.emptyState}>
            {bookings.length === 0 ? (
              <>
                <AlertCircle size={48} color={Colors.light.textSecondary} />
                <Text style={styles.emptyText}>Chưa có dữ liệu đặt phòng</Text>
                <Text style={styles.emptySubtext}>Kiểm tra kết nối API</Text>
              </>
            ) : (
              <>
                <Calendar size={48} color={Colors.light.textSecondary} />
                <Text style={styles.emptyText}>Không tìm thấy booking</Text>
              </>
            )}
          </View>
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  addButton: {
    backgroundColor: Colors.light.tint,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.light.text,
  },
  filterContainer: {
    maxHeight: 50,
    marginBottom: 12,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterChipActive: {
    backgroundColor: Colors.light.tint,
  },
  filterChipText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: '500' as const,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  bookingsList: {
    flex: 1,
  },
  bookingsListContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  bookingIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bookingId: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  guestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestInfo: {
    flex: 1,
  },
  guestName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  guestMeta: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 14,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: Colors.light.text,
    fontWeight: '500' as const,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  dateArrow: {
    paddingHorizontal: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paymentStatus: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  specialRequest: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  specialRequestLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  specialRequestText: {
    fontSize: 13,
    color: Colors.light.text,
    fontStyle: 'italic' as const,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
});
