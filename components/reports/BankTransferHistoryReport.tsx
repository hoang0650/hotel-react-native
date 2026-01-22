import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { bankTransferService } from '@/services/bank-transfer.service';
import { useAuth } from '@/contexts/AuthContext';

interface BankTransferHistoryReportProps {
  onBack: () => void;
}

export default function BankTransferHistoryReport({ onBack }: BankTransferHistoryReportProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'sepay' | 'paypal' | 'crypto'>('all');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sepayPayments, setSepayPayments] = useState<any[]>([]);
  const [paypalPayments, setPaypalPayments] = useState<any[]>([]);
  const [cryptoPayments, setCryptoPayments] = useState<any[]>([]);

  useEffect(() => {
    loadAllPayments();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshSepayPayments();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const refreshSepayPayments = async () => {
    try {
      const res = await bankTransferService.getPaymentHistory({ userId: user?._id });
      const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setSepayPayments(items);
    } catch (e: any) {
      setErrorMessage(e?.message || 'Không thể tải lịch sử thanh toán SePay');
    }
  };

  const loadAllPayments = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      await Promise.all([
        (async () => {
          const res = await bankTransferService.getPaymentHistory({ userId: user?._id });
          const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
          setSepayPayments(items);
        })(),
        (async () => {
          const res = await bankTransferService.getPayPalPaymentHistory({ userId: user?._id });
          const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
          setPaypalPayments(items);
        })(),
        (async () => {
          const res = await bankTransferService.getCryptoPaymentHistory({ userId: user?._id });
          const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
          setCryptoPayments(items);
        })(),
      ]);
    } catch (e: any) {
      setErrorMessage(e?.message || 'Không thể tải dữ liệu thanh toán');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAllPayments();
  };

  const formatCurrency = (amount?: number, currency?: string) => {
    if (!amount || isNaN(amount)) return currency === 'USD' ? '$0' : '0 đ';
    if (currency === 'USD') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
  };

  const formatDateTime = (value?: string) => {
    if (!value) return 'N/A';
    const d = new Date(value);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'success' || s === 'paid') return '#52c41a';
    if (s === 'pending') return '#1890ff';
    if (s === 'failed' || s === 'cancelled') return '#f5222d';
    return '#d9d9d9';
  };

  const getStatusText = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'success' || s === 'paid') return 'Thành công';
    if (s === 'pending') return 'Đang chờ';
    if (s === 'failed') return 'Thất bại';
    if (s === 'cancelled') return 'Đã hủy';
    return status || 'N/A';
  };

  const normalizeSepay = (item: any) => ({
    id: item?._id || item?.id || Math.random().toString(),
    paymentMethod: 'SePay',
    paymentMethodColor: '#667eea',
    paymentMethodIcon: 'credit-card',
    amount: Number(item?.amount || item?.paymentGatewayResponse?.transferAmount || 0),
    currency: item?.currency || 'VND',
    status: item?.status || item?.paymentStatus,
    createdAt: item?.createdAt || item?.created_at,
    completedAt: item?.completedAt,
    transactionId: item?.transactionId,
  });

  const normalizePaypal = (item: any) => ({
    id: item?._id || item?.id || Math.random().toString(),
    paymentMethod: 'PayPal',
    paymentMethodColor: '#0070ba',
    paymentMethodIcon: 'pay-circle',
    amount: Number(item?.amount || 0),
    currency: item?.currency || 'USD',
    status: item?.status || item?.paymentStatus,
    createdAt: item?.createdAt || item?.created_at,
    paypalOrderId: item?.paypalOrderId || item?.orderId,
  });

  const normalizeCrypto = (item: any) => ({
    id: item?._id || item?.id || Math.random().toString(),
    paymentMethod: 'Crypto USDT',
    paymentMethodColor: '#26a17b',
    paymentMethodIcon: 'dollar-circle',
    amount: Number(item?.amount || 0),
    currency: item?.currency || 'VND',
    cryptoAmount: item?.cryptoAmount,
    cryptoNetwork: item?.cryptoNetwork,
    status: item?.status || item?.paymentStatus,
    createdAt: item?.createdAt || item?.created_at,
    cryptoTransactionHash: item?.cryptoTransactionHash || item?.txHash,
  });

  const allPayments = useMemo(() => {
    const sepay = sepayPayments.map(normalizeSepay);
    const paypal = paypalPayments.map(normalizePaypal);
    const crypto = cryptoPayments.map(normalizeCrypto);
    return [...sepay, ...paypal, ...crypto];
  }, [sepayPayments, paypalPayments, cryptoPayments]);

  const filteredPayments = useMemo(() => {
    const data =
      activeTab === 'all'
        ? allPayments
        : activeTab === 'sepay'
        ? sepayPayments.map(normalizeSepay)
        : activeTab === 'paypal'
        ? paypalPayments.map(normalizePaypal)
        : cryptoPayments.map(normalizeCrypto);
    if (!searchText) return data;
    const s = searchText.toLowerCase();
    return data.filter((item: any) => {
      const label = (item.paymentMethod || '').toLowerCase();
      const tx =
        (item.transactionId || item.paypalOrderId || item.cryptoTransactionHash || '').toLowerCase();
      return label.includes(s) || tx.includes(s);
    });
  }, [activeTab, allPayments, sepayPayments, paypalPayments, cryptoPayments, searchText]);

  const renderPayment = ({ item }: { item: any }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.methodPill}>
            <Text style={[styles.methodText, { color: item.paymentMethodColor }]}>{item.paymentMethod}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.row}>
            <Text style={styles.label}>Số tiền:</Text>
            <Text style={styles.value}>{formatCurrency(item.amount, item.currency)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Ngày:</Text>
            <Text style={styles.value}>{formatDateTime(item.createdAt)}</Text>
          </View>
          {item.transactionId && (
            <View style={styles.row}>
              <Text style={styles.label}>Mã GD:</Text>
              <Text style={styles.code}>{item.transactionId}</Text>
            </View>
          )}
          {item.paypalOrderId && (
            <View style={styles.row}>
              <Text style={styles.label}>Order ID:</Text>
              <Text style={styles.code}>{item.paypalOrderId}</Text>
            </View>
          )}
          {item.cryptoTransactionHash && (
            <View style={styles.row}>
              <Text style={styles.label}>TX Hash:</Text>
              <Text style={styles.code}>{item.cryptoTransactionHash}</Text>
            </View>
          )}
          {item.cryptoNetwork && (
            <View style={styles.row}>
              <Text style={styles.label}>Network:</Text>
              <Text style={styles.value}>{item.cryptoNetwork}</Text>
            </View>
          )}
          {item.cryptoAmount && (
            <View style={styles.row}>
              <Text style={styles.label}>USDT:</Text>
              <Text style={[styles.value, { color: '#26a17b' }]}>{item.cryptoAmount}</Text>
            </View>
          )}
        </View>
      </View>
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
        <Text style={styles.title}>Lịch sử thanh toán và giao dịch</Text>
      </View>

      {errorMessage && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refreshSepayPayments}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.tabBar}>
        {(['all', 'sepay', 'paypal', 'crypto'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'all' ? 'Tất cả' : tab === 'sepay' ? 'SePay' : tab === 'paypal' ? 'PayPal' : 'Crypto'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm theo phương thức hoặc mã giao dịch..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#999"
        />
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Text style={styles.refreshText}>Làm mới</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredPayments}
        renderItem={renderPayment}
        keyExtractor={(item: any) => item.id || Math.random().toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💳</Text>
            <Text style={styles.emptyText}>Chưa có lịch sử thanh toán</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#666' },
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
  backButton: { marginRight: 12 },
  backButtonText: { fontSize: 16, color: '#1890ff' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  errorBox: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff1f0',
    borderWidth: 1,
    borderColor: '#ffa39e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  errorText: { color: '#cf1322', fontSize: 13, flex: 1 },
  retryBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff', borderRadius: 6, borderWidth: 1, borderColor: '#ffa39e' },
  retryText: { color: '#cf1322', fontSize: 12, fontWeight: '600' },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },
  tabBtnActive: { backgroundColor: '#1890ff', borderColor: '#1890ff' },
  tabText: { fontSize: 12, color: '#666' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  searchContainer: { paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', gap: 8 },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },
  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },
  refreshText: { color: '#1890ff', fontSize: 12, fontWeight: '600' },
  listContent: { padding: 16 },
  card: {
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  methodPill: { backgroundColor: '#f0f5ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  methodText: { fontSize: 12, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  cardBody: { marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 13, color: '#666' },
  value: { fontSize: 13, fontWeight: '600', color: '#333' },
  code: { fontSize: 11, color: '#333' },
});

