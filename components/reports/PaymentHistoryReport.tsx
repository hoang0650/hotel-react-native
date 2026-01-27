import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useHotel } from '@/contexts/HotelContext';
import { roomsService } from '@/services/rooms.service';
import { getUsdRateFromVnd, formatUSDLocal } from '@/utils/formatCurrency';

interface PaymentHistoryItem {
  _id: string;
  roomNumber: string;
  customerName?: string;
  customerPhone?: string;
  guestInfo?: {
    name?: string;
    phone?: string;
    idNumber?: string;
    guestSource?: string;
  };
  guestSource?: string;
  checkInTime?: Date | string;
  checkOutTime?: Date | string;
  checkoutTime?: Date | string;
  checkinTime?: Date | string;
  date?: Date | string;
  totalAmount: number;
  amount?: number;
  roomTotal?: number;
  roomAmount?: number;
  servicesTotal?: number;
  serviceAmount?: number;
  additionalCharges?: number;
  discount?: number;
  advancePayment?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  payment?: {
    status?: string;
    paymentStatus?: string;
  };
  status?: string;
  event?: string;
  type?: string;
  notes?: string;
  invoiceNumber?: string;
  services?: Array<{
    name?: string;
    serviceName?: string;
    price?: number;
    quantity?: number;
  }>;
}

interface PaymentHistoryReportProps {
  onBack: () => void;
}

export default function PaymentHistoryReport({ onBack }: PaymentHistoryReportProps) {
  const { user } = useAuth();
  const { selectedHotelId } = useHotel();
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [allPayments, setAllPayments] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'paid' | 'pending' | 'unpaid'>('all');
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [usdRate, setUsdRate] = useState(0);

  useEffect(() => {
    setCurrentPage(1); // Reset về trang 1 khi filter thay đổi
  }, [filterType, selectedHotelId]);

  useEffect(() => {
    loadPaymentHistory();
  }, [selectedHotelId]);

  useEffect(() => {
    let mounted = true;
    getUsdRateFromVnd()
      .then((rate) => {
        if (mounted) setUsdRate(rate || 0);
      })
      .catch(() => {
        if (mounted) setUsdRate(0);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    filterPayments();
  }, [allPayments, filterType, searchText, currentPage]);

  const loadPaymentHistory = async () => {
    try {
      setLoading(true);
      const hotelId = selectedHotelId || user?.hotelId || user?.businessId;
      if (!hotelId) {
        console.warn('No hotelId found');
        setAllPayments([]);
        return;
      }

      // Lấy lịch sử phòng với filterType = 'checkout' và phân trang
      // Lưu ý: Cần load tất cả dữ liệu để filter đúng, sau đó paginate ở frontend
      // Hoặc backend cần filter đúng trước khi paginate
      // Tạm thời load tất cả để filter đúng
      const response = await roomsService.getRoomHistory(hotelId, 'checkout', 1, 1000);
      const history = response.history || [];
      
      // Filter các bản ghi checkout giống như Angular component
      const filtered = history.filter((item: any) => {
        // Loại trừ các event không liên quan đến thanh toán
        const excludedEvents = [
          'cleaning', 'clean', 'maintenance', 'check-in', 'checkin',
          'service', 'transfer', 'booking', 'checked_in', 'cancel_booking'
        ];

        const eventType = (item.event || item.type || '').toLowerCase();

        // Nếu là event bị loại trừ thì không hiển thị
        if (excludedEvents.includes(eventType)) return false;

        // Loại trừ các booking (đặt trước)
        if (item.status === 'booked' || item.status === 'pending' ||
            item.bookingStatus === 'booked' || item.bookingStatus === 'pending') {
          return false;
        }

        // Loại trừ nếu không có checkOutTime (chưa checkout)
        if (!item.checkOutTime && !item.checkoutTime) return false;

        // Kiểm tra event checkout
        const isCheckout = eventType === 'check-out' || eventType === 'checkout';
        if (!isCheckout) return false;

        // Tính lại totalAmount nếu cần
        const roomAmount = item.roomAmount || item.roomTotal || 0;
        const serviceAmount = item.serviceAmount || item.servicesTotal || 0;
        const additionalCharges = item.additionalCharges || 0;
        const discount = item.discount || 0;

        if (roomAmount > 0 || serviceAmount > 0 || additionalCharges > 0 || discount > 0) {
          const calculatedTotal = roomAmount + serviceAmount + additionalCharges - discount;
          if (!item.totalAmount || Math.abs(item.totalAmount - calculatedTotal) > 0.01) {
            item.totalAmount = calculatedTotal;
          }
        }

        // Đảm bảo có roomTotal và servicesTotal
        if (!item.roomTotal && item.roomAmount) {
          item.roomTotal = item.roomAmount;
        }
        if (!item.servicesTotal && item.serviceAmount) {
          item.servicesTotal = item.serviceAmount;
        }

        return true;
      });

      // Lưu tất cả filtered data để tính stats và filter payment status
      setAllPayments(filtered);
      
      // filterPayments() sẽ tính lại totalItems và totalPages sau khi filter payment status và search
    } catch (error: any) {
      console.error('Error loading payment history:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải lịch sử thanh toán');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterPayments = () => {
    if (allPayments.length === 0) {
      setPayments([]);
      setTotalItems(0);
      setTotalPages(0);
      return;
    }

    // Bước 1: Filter theo payment status trên toàn bộ allPayments
    let filteredByStatus = allPayments;
    if (filterType !== 'all') {
      filteredByStatus = allPayments.filter((item) => {
        const paymentStatus = item.paymentStatus ||
          item.payment?.status ||
          item.payment?.paymentStatus ||
          item.status ||
          'unpaid';

        // Chuẩn hóa: 'completed' từ SePay = 'paid'
        const normalizedStatus = paymentStatus === 'completed' ? 'paid' : paymentStatus;

        if (filterType === 'paid') {
          return normalizedStatus === 'paid';
        } else if (filterType === 'pending') {
          return normalizedStatus === 'pending';
        } else if (filterType === 'unpaid') {
          return normalizedStatus !== 'paid' && normalizedStatus !== 'pending';
        }
        return true;
      });
    }

    // Bước 2: Filter theo search text trên dữ liệu đã filter payment status
    let filteredBySearch = filteredByStatus;
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filteredBySearch = filteredByStatus.filter((item) => {
        const roomNumber = item.roomNumber?.toLowerCase() || '';
        const customerName = (item.customerName ||
          item.guestInfo?.name ||
          '').toLowerCase();
        return roomNumber.includes(searchLower) || customerName.includes(searchLower);
      });
    }

    // Bước 3: Cập nhật totalItems và totalPages dựa trên dữ liệu đã filter
    const finalFilteredItems = filteredBySearch.length;
    const finalTotalPages = Math.ceil(finalFilteredItems / pageSize);
    setTotalItems(finalFilteredItems);
    setTotalPages(finalTotalPages);

    // Bước 4: Paginate dữ liệu cuối cùng
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = filteredBySearch.slice(startIndex, endIndex);

    setPayments(paginatedData);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPaymentHistory();
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return '0 đ';
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
  };

  const calculateDuration = (checkIn: Date | string | undefined, checkOut: Date | string | undefined) => {
    if (!checkIn || !checkOut) return 'N/A';
    const checkInTime = typeof checkIn === 'string' ? new Date(checkIn) : checkIn;
    const checkOutTime = typeof checkOut === 'string' ? new Date(checkOut) : checkOut;

    if (isNaN(checkInTime.getTime()) || isNaN(checkOutTime.getTime())) return 'N/A';

    const diffMs = checkOutTime.getTime() - checkInTime.getTime();
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days} ngày`);
    if (hours > 0) parts.push(`${hours} giờ`);
    if (minutes > 0 || (days === 0 && hours === 0)) parts.push(`${minutes} phút`);

    return parts.join(' ') || '0 phút';
  };

  const getStatusColor = (status?: string) => {
    const normalizedStatus = status === 'completed' ? 'paid' : status;
    switch (normalizedStatus) {
      case 'paid':
        return '#52c41a';
      case 'pending':
        return '#1890ff';
      case 'unpaid':
        return '#faad14';
      default:
        return '#d9d9d9';
    }
  };

  const getStatusLabel = (status?: string) => {
    const normalizedStatus = status === 'completed' ? 'paid' : status;
    switch (normalizedStatus) {
      case 'paid':
        return 'Đã thanh toán';
      case 'pending':
        return 'Chờ thanh toán';
      case 'unpaid':
        return 'Chưa thanh toán';
      default:
        return status || 'N/A';
    }
  };

  const getPaymentMethodLabel = (method?: string) => {
    switch (method) {
      case 'cash':
        return 'Tiền mặt';
      case 'card':
        return 'Thẻ';
      case 'transfer':
      case 'bank_transfer':
        return 'Chuyển khoản';
      case 'qr':
        return 'QR Code';
      default:
        return method || 'N/A';
    }
  };

  const getPaymentMethodColor = (method?: string) => {
    switch (method) {
      case 'cash':
        return '#52c41a';
      case 'card':
        return '#1890ff';
      case 'transfer':
      case 'bank_transfer':
        return '#722ed1';
      case 'qr':
        return '#13c2c2';
      default:
        return '#d9d9d9';
    }
  };

  const getGuestSourceLabel = (source?: string) => {
    switch (source) {
      case 'walkin':
        return 'Khách lẻ';
      case 'booking':
        return 'Đặt phòng';
      case 'agoda':
        return 'Agoda';
      case 'booking.com':
        return 'Booking.com';
      default:
        return source || 'Khách lẻ';
    }
  };

  const getGuestSourceColor = (source?: string) => {
    switch (source) {
      case 'walkin':
        return 'default';
      case 'booking':
        return 'blue';
      case 'agoda':
        return 'orange';
      case 'booking.com':
        return 'cyan';
      default:
        return 'default';
    }
  };

  // Tính toán thống kê
  const paidCount = allPayments.filter((item) => {
    const status = item.paymentStatus || item.payment?.status || item.payment?.paymentStatus || item.status || 'unpaid';
    return status === 'paid' || status === 'completed';
  }).length;

  const pendingCount = allPayments.filter((item) => {
    const status = item.paymentStatus || item.payment?.status || item.payment?.paymentStatus || item.status || 'unpaid';
    return status === 'pending';
  }).length;

  const unpaidCount = allPayments.filter((item) => {
    const status = item.paymentStatus || item.payment?.status || item.payment?.paymentStatus || item.status || 'unpaid';
    const normalizedStatus = status === 'completed' ? 'paid' : status;
    return normalizedStatus !== 'paid' && normalizedStatus !== 'pending';
  }).length;

  const totalPayment = allPayments.reduce((sum, item) => {
    return sum + (item.totalAmount || item.amount || 0);
  }, 0);

  const renderPayment = ({ item }: { item: PaymentHistoryItem }) => {
    const customerName = item.customerName || item.guestInfo?.name || 'Khách lẻ';
    const customerPhone = item.customerPhone || item.guestInfo?.phone || '';
    const checkInTime = item.checkInTime || item.checkinTime;
    const checkOutTime = item.checkOutTime || item.checkoutTime || item.date;
    const paymentStatus = item.paymentStatus ||
      item.payment?.status ||
      item.payment?.paymentStatus ||
      item.status ||
      'unpaid';

    return (
      <TouchableOpacity style={styles.paymentCard}>
        <View style={styles.paymentHeader}>
          <View style={styles.paymentHeaderLeft}>
            <Text style={styles.roomNumber}>Phòng {item.roomNumber}</Text>
            <Text style={styles.customerName}>{customerName}</Text>
            {customerPhone && (
              <Text style={styles.customerPhone}>{customerPhone}</Text>
            )}
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(paymentStatus) },
            ]}
          >
            <Text style={styles.statusText}>
              {getStatusLabel(paymentStatus)}
            </Text>
          </View>
        </View>

        <View style={styles.timeInfo}>
          {checkInTime && (
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>Nhận phòng:</Text>
              <Text style={styles.timeValue}>{formatDate(checkInTime)}</Text>
            </View>
          )}
          {checkOutTime && (
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>Trả phòng:</Text>
              <Text style={styles.timeValue}>{formatDate(checkOutTime)}</Text>
            </View>
          )}
          {checkInTime && checkOutTime && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>
                {calculateDuration(checkInTime, checkOutTime)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.amountBreakdown}>
          {item.roomTotal && item.roomTotal > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Tiền phòng:</Text>
              <Text style={styles.breakdownValue}>
                {formatCurrency(item.roomTotal)}
                {usdRate > 0 && (
                  <Text style={styles.breakdownUsd}> (≈ {formatUSDLocal(item.roomTotal, usdRate)})</Text>
                )}
              </Text>
            </View>
          )}
          {item.servicesTotal && item.servicesTotal > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Tiền dịch vụ:</Text>
              <Text style={styles.breakdownValue}>
                {formatCurrency(item.servicesTotal)}
                {usdRate > 0 && (
                  <Text style={styles.breakdownUsd}> (≈ {formatUSDLocal(item.servicesTotal, usdRate)})</Text>
                )}
              </Text>
            </View>
          )}
          {item.additionalCharges && item.additionalCharges > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: '#fa8c16' }]}>
                Phụ thu:
              </Text>
              <Text style={[styles.breakdownValue, { color: '#fa8c16' }]}>
                {formatCurrency(item.additionalCharges)}
                {usdRate > 0 && (
                  <Text style={styles.breakdownUsd}> (≈ {formatUSDLocal(item.additionalCharges, usdRate)})</Text>
                )}
              </Text>
            </View>
          )}
          {item.discount && item.discount > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: '#52c41a' }]}>
                Khuyến mãi:
              </Text>
              <Text style={[styles.breakdownValue, { color: '#52c41a' }]}>
                -{formatCurrency(item.discount)}
                {usdRate > 0 && (
                  <Text style={styles.breakdownUsd}> (≈ {formatUSDLocal(item.discount, usdRate)})</Text>
                )}
              </Text>
            </View>
          )}
          {item.advancePayment && item.advancePayment > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: '#1890ff' }]}>
                Đã trả trước:
              </Text>
              <Text style={[styles.breakdownValue, { color: '#1890ff' }]}>
                -{formatCurrency(item.advancePayment)}
                {usdRate > 0 && (
                  <Text style={styles.breakdownUsd}> (≈ {formatUSDLocal(item.advancePayment, usdRate)})</Text>
                )}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.paymentFooter}>
          <View style={styles.paymentMethodContainer}>
            {item.paymentMethod && (
              <View
                style={[
                  styles.paymentMethodBadge,
                  { backgroundColor: getPaymentMethodColor(item.paymentMethod) },
                ]}
              >
                <Text style={styles.paymentMethodText}>
                  {getPaymentMethodLabel(item.paymentMethod)}
                </Text>
              </View>
            )}
            {(item.guestSource || item.guestInfo?.guestSource) && (
              <View style={styles.guestSourceBadge}>
                <Text style={styles.guestSourceText}>
                  {getGuestSourceLabel(item.guestSource || item.guestInfo?.guestSource)}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.totalAmount}>
            {formatCurrency(item.totalAmount || item.amount)}
            {usdRate > 0 && (
              <Text style={styles.totalAmountUsd}> (≈ {formatUSDLocal(item.totalAmount || item.amount || 0, usdRate)})</Text>
            )}
          </Text>
        </View>

        {item.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Ghi chú:</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1890ff" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Lịch sử thanh toán</Text>
      </View>

      {/* Statistics Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#52c41a' }]}>
            {paidCount}
          </Text>
          <Text style={styles.statLabel}>Đã thanh toán</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#1890ff' }]}>
            {pendingCount}
          </Text>
          <Text style={styles.statLabel}>Chờ thanh toán</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#faad14' }]}>
            {unpaidCount}
          </Text>
          <Text style={styles.statLabel}>Chưa thanh toán</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#722ed1' }]}>
            {formatCurrency(totalPayment)}
          </Text>
          <Text style={styles.statLabel}>Tổng thanh toán</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm theo phòng hoặc tên khách..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#999"
        />
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        {(['all', 'paid', 'pending', 'unpaid'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.filterButton,
              filterType === type && styles.filterButtonActive,
            ]}
            onPress={() => setFilterType(type)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterType === type && styles.filterButtonTextActive,
              ]}
            >
              {type === 'all'
                ? 'Tất cả'
                : type === 'paid'
                ? 'Đã thanh toán'
                : type === 'pending'
                ? 'Chờ thanh toán'
                : 'Chưa thanh toán'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={payments}
        renderItem={renderPayment}
        keyExtractor={(item) => item._id || Math.random().toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💳</Text>
            <Text style={styles.emptyText}>Chưa có lịch sử thanh toán</Text>
          </View>
        }
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={styles.pagination}>
              <TouchableOpacity
                onPress={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
              >
                <Text style={styles.pageButtonText}>Trước</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>
                Trang {currentPage} / {totalPages}
              </Text>
              <TouchableOpacity
                onPress={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
              >
                <Text style={styles.pageButtonText}>Sau</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#1890ff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },
  filterButtonActive: {
    backgroundColor: '#1890ff',
    borderColor: '#1890ff',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  paymentHeaderLeft: {
    flex: 1,
  },
  roomNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  customerName: {
    fontSize: 14,
    color: '#1890ff',
    marginBottom: 2,
    fontWeight: '600',
  },
  customerPhone: {
    fontSize: 13,
    color: '#666',
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
  timeInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  timeRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timeLabel: {
    fontSize: 13,
    color: '#666',
    marginRight: 8,
    minWidth: 80,
  },
  timeValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  durationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e6f7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  durationText: {
    fontSize: 12,
    color: '#1890ff',
    fontWeight: '600',
  },
  amountBreakdown: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#666',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  breakdownUsd: {
    fontSize: 13,
    color: '#999',
    fontWeight: '400',
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#f0f0f0',
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  paymentMethodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  paymentMethodText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  guestSourceBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  guestSourceText: {
    color: '#666',
    fontSize: 11,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#722ed1',
  },
  totalAmountUsd: {
    fontSize: 16,
    color: '#999',
    fontWeight: '400',
  },
  notesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  notesLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 12,
    borderRadius: 8,
  },
  pageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1890ff',
    borderRadius: 4,
  },
  pageButtonDisabled: {
    backgroundColor: '#d9d9d9',
    opacity: 0.5,
  },
  pageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pageInfo: {
    fontSize: 14,
    color: '#666',
  },
});
