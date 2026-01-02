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
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useHotel } from '@/contexts/HotelContext';
import { invoicesService } from '@/services/invoices.service';
import { Invoice } from '@/types';

interface InvoicesReportProps {
  onBack: () => void;
}

export default function InvoicesReport({ onBack }: InvoicesReportProps) {
  const { user } = useAuth();
  const { selectedHotelId } = useHotel();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, [selectedHotelId, user]);

  const loadInvoices = async (pageNum = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      const hotelId = selectedHotelId || user?.hotelId || user?.businessId;
      if (!hotelId) {
        console.warn('No hotelId found');
        setInvoices([]);
        return;
      }

      const response = await invoicesService.getInvoices({
        hotelId,
        page: pageNum,
        limit: 20,
      });
      
      // Xử lý response format: có thể là { invoices: [] } hoặc { data: [] }
      const invoiceList = response.invoices || response.data || [];
      
      if (pageNum === 1) {
        setInvoices(invoiceList);
      } else {
        setInvoices((prev) => [...prev, ...invoiceList]);
      }
      
      // Kiểm tra pagination
      const pagination = response.pagination;
      if (pagination) {
        setHasMore(pageNum < pagination.totalPages);
      } else {
        setHasMore(invoiceList.length === 20);
      }
    } catch (error: any) {
      console.error('Error loading invoices:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải danh sách hóa đơn');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadInvoices(1);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadInvoices(nextPage);
    }
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

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'paid':
        return '#52c41a';
      case 'pending':
        return '#faad14';
      case 'cancelled':
        return '#ff4d4f';
      default:
        return '#d9d9d9';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'paid':
        return 'Đã thanh toán';
      case 'pending':
        return 'Chờ thanh toán';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status || 'N/A';
    }
  };

  const getCustomerName = (item: Invoice) => {
    return (
      item.customerName ||
      item.guestInfo?.name ||
      (item as any).guestDetails?.name ||
      'Khách lẻ'
    );
  };

  const getCustomerPhone = (item: Invoice) => {
    return (
      (item as any).customerPhone ||
      item.guestInfo?.phone ||
      (item as any).guestDetails?.phone ||
      ''
    );
  };

  const renderInvoice = ({ item }: { item: Invoice }) => {
    const customerName = getCustomerName(item);
    const customerPhone = getCustomerPhone(item);
    const paymentStatus = item.paymentStatus || item.status || 'pending';

    return (
      <TouchableOpacity
        style={styles.invoiceCard}
        onPress={() => {
          // TODO: Navigate to invoice detail or show modal
          Alert.alert(
            'Hóa đơn',
            `Hóa đơn #${item.invoiceNumber || item._id}\n` +
              `Khách hàng: ${customerName}\n` +
              `Phòng: ${item.roomNumber || 'N/A'}\n` +
              `Số tiền: ${formatCurrency(item.totalAmount || item.amount)}`
          );
        }}
      >
        <View style={styles.invoiceHeader}>
          <View style={styles.invoiceHeaderLeft}>
            <Text style={styles.invoiceNumber}>
              #{item.invoiceNumber || item._id?.slice(-6) || 'N/A'}
            </Text>
            <Text style={styles.roomNumber}>
              Phòng {item.roomNumber || (item as any).roomId || 'N/A'}
            </Text>
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

        {customerName && customerName !== 'Khách lẻ' && (
          <Text style={styles.guestName}>{customerName}</Text>
        )}

        {customerPhone && (
          <View style={styles.invoiceInfo}>
            <Text style={styles.infoLabel}>SĐT:</Text>
            <Text style={styles.infoValue}>{customerPhone}</Text>
          </View>
        )}

        {(item.checkInTime || item.checkIn) && (
          <View style={styles.invoiceInfo}>
            <Text style={styles.infoLabel}>Check-in:</Text>
            <Text style={styles.infoValue}>
              {formatDate(item.checkInTime || item.checkIn)}
            </Text>
          </View>
        )}

        {(item.checkOutTime || item.checkOut) && (
          <View style={styles.invoiceInfo}>
            <Text style={styles.infoLabel}>Check-out:</Text>
            <Text style={styles.infoValue}>
              {formatDate(item.checkOutTime || item.checkOut)}
            </Text>
          </View>
        )}

        <View style={styles.invoiceInfo}>
          <Text style={styles.infoLabel}>Ngày tạo:</Text>
          <Text style={styles.infoValue}>
            {formatDate(item.date || (item as any).createdAt || (item as any).issuedDate)}
          </Text>
        </View>

        <View style={styles.invoiceInfo}>
          <Text style={styles.infoLabel}>Số tiền:</Text>
          <Text style={styles.amount}>
            {formatCurrency(item.totalAmount || item.amount || 0)}
          </Text>
        </View>

        {item.paymentMethod && (
          <View style={styles.invoiceInfo}>
            <Text style={styles.infoLabel}>Thanh toán:</Text>
            <Text style={styles.infoValue}>
              {item.paymentMethod === 'cash'
                ? 'Tiền mặt'
                : item.paymentMethod === 'card'
                ? 'Thẻ'
                : item.paymentMethod === 'transfer' || item.paymentMethod === 'bank_transfer'
                ? 'Chuyển khoản'
                : item.paymentMethod}
            </Text>
          </View>
        )}

        {(item as any).staffName && (
          <View style={styles.invoiceInfo}>
            <Text style={styles.infoLabel}>Nhân viên:</Text>
            <Text style={styles.infoValue}>{(item as any).staffName}</Text>
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
        <Text style={styles.title}>Hóa đơn</Text>
      </View>

      <FlatList
        data={invoices}
        renderItem={renderInvoice}
        keyExtractor={(item) => item._id || item.id || Math.random().toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📄</Text>
            <Text style={styles.emptyText}>Chưa có hóa đơn nào</Text>
          </View>
        }
        ListFooterComponent={
          hasMore && !loading ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#1890ff" />
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
  listContent: {
    padding: 16,
  },
  invoiceCard: {
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
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  invoiceHeaderLeft: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  roomNumber: {
    fontSize: 14,
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
  guestName: {
    fontSize: 14,
    color: '#1890ff',
    marginBottom: 8,
    fontWeight: '600',
  },
  invoiceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1890ff',
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
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

