import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  TextInput,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/contexts/TranslationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useHotel } from '@/contexts/HotelContext';
import { debtService } from '@/services/debt.service';
import { hotelsService } from '@/services/hotels.service';
import { Debt, Hotel, DebtStatus, DebtLabel } from '@/types';
import CustomPicker, { PickerItem } from '@/components/ui/CustomPicker';
import { IconSymbol } from '@/components/ui/icon-symbol';

const STATUS_OPTIONS: PickerItem[] = [
  { label: 'Chưa thanh toán', value: 'pending' },
  { label: 'Thanh toán một phần', value: 'partial' },
  { label: 'Đã thanh toán', value: 'settled' },
];

const PAYMENT_METHODS: PickerItem[] = [
  { label: 'Tiền mặt', value: 'cash' },
  { label: 'Chuyển khoản', value: 'bank_transfer' },
  { label: 'Thẻ', value: 'card' },
  { label: 'Khác', value: 'other' },
];

const LABEL_COLORS: PickerItem[] = [
  { label: 'Mặc định', value: 'default' },
  { label: 'Đỏ', value: 'red' },
  { label: 'Cam', value: 'orange' },
  { label: 'Vàng', value: 'gold' },
  { label: 'Xanh lá', value: 'green' },
  { label: 'Xanh dương', value: 'blue' },
  { label: 'Tím', value: 'purple' },
  { label: 'Đỏ cam', value: 'volcano' },
  { label: 'Xanh lơ', value: 'cyan' },
  { label: 'Hồng', value: 'magenta' },
];

const SUGGESTED_LABELS: DebtLabel[] = [
  { name: 'Quan trọng', color: 'red' },
  { name: 'Cần theo dõi', color: 'orange' },
  { name: 'Khách VIP', color: 'purple' },
  { name: 'Quá hạn', color: 'volcano' },
  { name: 'Đã liên hệ', color: 'blue' },
  { name: 'Chờ xác nhận', color: 'gold' },
];

interface SettleFormData {
  amount: number;
  paymentMethod: string;
  notes: string;
}

export default function DebtManagementScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { selectedHotelId, setSelectedHotelId } = useHotel();

  const [debts, setDebts] = useState<Debt[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [pageIndex, setPageIndex] = useState(1);
  const pageSize = 20;
  const [total, setTotal] = useState(0);

  // Modal states
  const [settleModalVisible, setSettleModalVisible] = useState(false);
  const [labelModalVisible, setLabelModalVisible] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [isSettling, setIsSettling] = useState(false);
  const [isUpdatingLabels, setIsUpdatingLabels] = useState(false);

  // Settle form
  const [settleFormData, setSettleFormData] = useState<SettleFormData>({
    amount: 0,
    paymentMethod: 'cash',
    notes: '',
  });

  // Label management
  const [currentLabels, setCurrentLabels] = useState<DebtLabel[]>([]);
  const [newLabelInput, setNewLabelInput] = useState('');
  const [selectedLabelColor, setSelectedLabelColor] = useState('default');

  // Phân quyền
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isBusiness = user?.role === 'business';
  const isHotelManager = user?.role === 'hotel';
  const isStaff = user?.role === 'staff';
  const isGuest = user?.role === 'guest';

  useEffect(() => {
    loadHotels();
  }, []);

  useEffect(() => {
    // Reset page về 1 khi filter thay đổi
    setPageIndex(1);
  }, [selectedHotelId, selectedStatus, startDate, endDate]);

  useEffect(() => {
    if (selectedHotelId || (isBusiness && !isAdmin)) {
      loadDebts();
    } else {
      setDebts([]);
      setTotal(0);
    }
  }, [selectedHotelId, selectedStatus, startDate, endDate, pageIndex]);

  const loadHotels = async () => {
    try {
      setLoading(true);
      const data = await hotelsService.getHotels();
      let filteredHotels: Hotel[] = [];

      if (isAdmin) {
        filteredHotels = data.filter((h) => h.status === 'active');
      } else if (isBusiness && user?.businessId) {
        const userBusinessId =
          typeof user.businessId === 'string'
            ? user.businessId
            : (user.businessId as any)?._id || user.businessId;
        filteredHotels = data.filter((h) => {
          const hotelBusinessId =
            typeof h.businessId === 'string'
              ? h.businessId
              : (h.businessId as any)?._id || h.businessId;
          return (
            hotelBusinessId &&
            userBusinessId &&
            hotelBusinessId.toString() === userBusinessId.toString() &&
            h.status === 'active'
          );
        });
      } else if (isHotelManager && user?.hotelId) {
        filteredHotels = data.filter((h) => h._id === user.hotelId);
        if (filteredHotels.length === 1) {
          await setSelectedHotelId(user.hotelId);
        }
      }

      setHotels(filteredHotels);

      if (isHotelManager && user?.hotelId && filteredHotels.length > 0) {
        await setSelectedHotelId(user.hotelId);
      } else if (filteredHotels.length > 0 && !selectedHotelId) {
        await setSelectedHotelId(filteredHotels[0]._id!);
      }
    } catch (error: any) {
      console.error('Error fetching hotels:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách khách sạn');
    } finally {
      setLoading(false);
    }
  };

  const loadDebts = async () => {
    try {
      setLoading(true);
      const query: any = {
        page: pageIndex,
        pageSize: pageSize,
      };

      if (selectedHotelId) {
        query.hotelId = selectedHotelId;
      }

      if (selectedStatus) {
        query.status = selectedStatus;
      }

      if (startDate && startDate.trim()) {
        // Parse dd/MM/yyyy format
        const startParts = startDate.trim().split('/');
        if (startParts.length === 3) {
          const day = parseInt(startParts[0], 10);
          const month = parseInt(startParts[1], 10) - 1;
          const year = parseInt(startParts[2], 10);
          if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            const date = new Date(year, month, day);
            if (!isNaN(date.getTime())) {
              query.startDate = date.toISOString();
            }
          }
        }
      }

      if (endDate && endDate.trim()) {
        // Parse dd/MM/yyyy format
        const endParts = endDate.trim().split('/');
        if (endParts.length === 3) {
          const day = parseInt(endParts[0], 10);
          const month = parseInt(endParts[1], 10) - 1;
          const year = parseInt(endParts[2], 10);
          if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            const date = new Date(year, month, day);
            if (!isNaN(date.getTime())) {
              query.endDate = date.toISOString();
            }
          }
        }
      }

      console.log('Loading debts with query:', query);
      const response = await debtService.getDebts(query);
      console.log('Debts response:', response);
      setDebts(response.debts || []);
      setTotal(response.total || 0);
    } catch (error: any) {
      console.error('Error fetching debts:', error);
      Alert.alert('Lỗi', error.response?.data?.message || error.message || 'Không thể tải danh sách công nợ');
      setDebts([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDebts();
  };

  const onHotelChange = async (hotelId: string | null) => {
    await setSelectedHotelId(hotelId);
  };

  const onStatusChange = (status: string | null) => {
    setSelectedStatus(status);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return '-';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '-';
      return dateObj.toLocaleDateString('vi-VN');
    } catch (e) {
      return '-';
    }
  };

  const getStatusLabel = (status: DebtStatus): string => {
    const labels: Record<string, string> = {
      pending: 'Chưa thanh toán',
      partial: 'Thanh toán một phần',
      settled: 'Đã thanh toán',
      cancelled: 'Đã hủy',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: DebtStatus): string => {
    const colors: Record<string, string> = {
      pending: '#ff4d4f',
      partial: '#fa8c16',
      settled: '#52c41a',
      cancelled: '#d9d9d9',
    };
    return colors[status] || '#d9d9d9';
  };

  const getLabelName = (label: string | DebtLabel): string => {
    if (typeof label === 'string') {
      return label;
    }
    return label.name || '';
  };

  const getLabelColor = (label: string | DebtLabel): string => {
    if (typeof label === 'string') {
      return 'default';
    }
    return label.color || 'default';
  };

  const canDelete = (debt: Debt): boolean => {
    return (isAdmin || isBusiness) && debt.paidAmount === 0;
  };

  const canSettle = (debt: Debt): boolean => {
    if (isStaff || isGuest) {
      return false;
    }
    return debt.status !== 'settled' && debt.status !== 'cancelled';
  };

  const canManageLabels = (debt: Debt): boolean => {
    return true;
  };

  const openSettleModal = (debt: Debt) => {
    if (!canSettle(debt)) {
      Alert.alert('Thông báo', 'Bạn không có quyền thanh toán công nợ này');
      return;
    }

    setSelectedDebt(debt);
    setSettleFormData({
      amount: debt.remainingAmount,
      paymentMethod: 'cash',
      notes: '',
    });
    setSettleModalVisible(true);
  };

  const closeSettleModal = () => {
    setSettleModalVisible(false);
    setSelectedDebt(null);
    setSettleFormData({
      amount: 0,
      paymentMethod: 'cash',
      notes: '',
    });
  };

  const handleSettle = async () => {
    if (!selectedDebt) return;

    if (settleFormData.amount <= 0) {
      Alert.alert('Lỗi', 'Số tiền phải lớn hơn 0');
      return;
    }

    if (settleFormData.amount > selectedDebt.remainingAmount) {
      Alert.alert('Lỗi', 'Số tiền vượt quá số tiền còn lại');
      return;
    }

    try {
      setIsSettling(true);
      await debtService.settleDebt(selectedDebt._id!, {
        amount: settleFormData.amount,
        paymentMethod: settleFormData.paymentMethod,
        notes: settleFormData.notes || '',
      });

      Alert.alert('Thành công', 'Thanh toán công nợ thành công');
      closeSettleModal();
      loadDebts();
    } catch (error: any) {
      console.error('Error settling debt:', error);
      Alert.alert('Lỗi', error.response?.data?.message || error.message || 'Không thể thanh toán công nợ');
    } finally {
      setIsSettling(false);
    }
  };

  const deleteDebt = async (debt: Debt) => {
    if (!canDelete(debt)) {
      Alert.alert('Thông báo', 'Bạn không có quyền xóa công nợ này');
      return;
    }

    if (debt.paidAmount > 0) {
      Alert.alert('Cảnh báo', 'Không thể xóa công nợ đã có thanh toán');
      return;
    }

    Alert.alert(
      'Xác nhận',
      `Bạn có chắc chắn muốn xóa công nợ của ${debt.customerName}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await debtService.deleteDebt(debt._id!);
              Alert.alert('Thành công', 'Xóa công nợ thành công');
              loadDebts();
            } catch (error: any) {
              console.error('Error deleting debt:', error);
              Alert.alert('Lỗi', error.response?.data?.message || error.message || 'Không thể xóa công nợ');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const openLabelModal = (debt: Debt) => {
    setSelectedDebt(debt);
    // Chuyển đổi labels từ format cũ (string) sang format mới (object)
    const labels = (debt.labels || []).map((label) => {
      if (typeof label === 'string') {
        return { name: label, color: 'default' };
      }
      return { name: label.name, color: label.color || 'default' };
    });
    setCurrentLabels(labels);
    setNewLabelInput('');
    setSelectedLabelColor('default');
    setLabelModalVisible(true);
  };

  const closeLabelModal = () => {
    setLabelModalVisible(false);
    setSelectedDebt(null);
    setCurrentLabels([]);
    setNewLabelInput('');
    setSelectedLabelColor('default');
  };

  const addNewLabel = () => {
    if (newLabelInput.trim() && !currentLabels.some((l) => l.name === newLabelInput.trim())) {
      setCurrentLabels([
        ...currentLabels,
        { name: newLabelInput.trim(), color: selectedLabelColor },
      ]);
      setNewLabelInput('');
    }
  };

  const addSuggestedLabel = (label: DebtLabel) => {
    if (!currentLabels.some((l) => l.name === label.name)) {
      setCurrentLabels([...currentLabels, { ...label }]);
    }
  };

  const removeLabel = (label: DebtLabel) => {
    setCurrentLabels(currentLabels.filter((l) => l.name !== label.name));
  };

  const updateLabelColor = (label: DebtLabel, newColor: string) => {
    setCurrentLabels(
      currentLabels.map((l) => (l.name === label.name ? { ...l, color: newColor } : l))
    );
  };

  const saveLabels = async () => {
    if (!selectedDebt) return;

    try {
      setIsUpdatingLabels(true);
      await debtService.updateDebtLabels(selectedDebt._id!, currentLabels);
      Alert.alert('Thành công', 'Cập nhật nhãn thành công');
      closeLabelModal();
      loadDebts();
    } catch (error: any) {
      console.error('Error updating labels:', error);
      Alert.alert('Lỗi', error.response?.data?.message || error.message || 'Không thể cập nhật nhãn');
    } finally {
      setIsUpdatingLabels(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const hotelOptions: PickerItem[] = hotels.map((hotel) => ({
    label: hotel.name,
    value: hotel._id!,
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý công nợ</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Filter Section */}
        <View style={styles.filterSection}>
          <View style={styles.filterRow}>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Khách sạn</Text>
              <CustomPicker
                selectedValue={selectedHotelId || ''}
                onValueChange={(value) => onHotelChange(value)}
                items={hotelOptions}
                placeholder="Chọn khách sạn"
                disabled={isHotelManager && hotels.length > 0}
              />
            </View>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Trạng thái</Text>
              <CustomPicker
                selectedValue={selectedStatus || ''}
                onValueChange={(value) => onStatusChange(value)}
                items={STATUS_OPTIONS}
                placeholder="Tất cả"
              />
            </View>
          </View>
          <View style={styles.filterRow}>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Từ ngày (dd/MM/yyyy)</Text>
              <TextInput
                style={styles.input}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="dd/MM/yyyy"
              />
            </View>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Đến ngày (dd/MM/yyyy)</Text>
              <TextInput
                style={styles.input}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="dd/MM/yyyy"
              />
            </View>
          </View>
        </View>

        {/* Debts List */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1890ff" />
          </View>
        ) : debts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol name="receipt.fill" size={64} color="#999" />
            <Text style={styles.emptyText}>Chưa có công nợ nào</Text>
          </View>
        ) : (
          <>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>Số HĐ</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>Khách hàng</Text>
              <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>Phòng</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Ngày</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>Còn lại</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Trạng thái</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>Thao tác</Text>
            </View>
            {debts.map((debt) => (
              <View key={debt._id} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1.2 }]} numberOfLines={1}>
                  {debt.invoiceNumber}
                </Text>
                <View style={[styles.tableCell, { flex: 1.2 }]}>
                  <Text numberOfLines={1}>{debt.customerName}</Text>
                  {debt.customerPhone && (
                    <Text style={styles.customerPhone} numberOfLines={1}>
                      {debt.customerPhone}
                    </Text>
                  )}
                </View>
                <Text style={[styles.tableCell, { flex: 0.8 }]}>{debt.roomNumber}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>
                  {formatDate(debt.debtDate)}
                </Text>
                <Text style={[styles.tableCell, { flex: 1.2, fontWeight: 'bold' }]}>
                  {formatCurrency(debt.remainingAmount)}
                </Text>
                <View style={[styles.tableCell, { flex: 1 }]}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(debt.status) + '20' },
                    ]}
                  >
                    <Text
                      style={[styles.statusText, { color: getStatusColor(debt.status) }]}
                    >
                      {getStatusLabel(debt.status)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.tableCell, { flex: 1.2, flexDirection: 'row', gap: 6 }]}>
                  {canManageLabels(debt) && (
                    <TouchableOpacity
                      onPress={() => openLabelModal(debt)}
                      style={[styles.actionButton, { backgroundColor: '#1890ff20' }]}
                    >
                      <IconSymbol name="tag" size={16} color="#1890ff" />
                    </TouchableOpacity>
                  )}
                  {canSettle(debt) && (
                    <TouchableOpacity
                      onPress={() => openSettleModal(debt)}
                      style={[styles.actionButton, { backgroundColor: '#52c41a20' }]}
                    >
                      <IconSymbol name="dollarsign.circle.fill" size={16} color="#52c41a" />
                    </TouchableOpacity>
                  )}
                  {canDelete(debt) && (
                    <TouchableOpacity
                      onPress={() => deleteDebt(debt)}
                      style={[styles.actionButton, { backgroundColor: '#ff4d4f20' }]}
                    >
                      <IconSymbol name="trash" size={16} color="#ff4d4f" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <View style={styles.pagination}>
                <TouchableOpacity
                  onPress={() => setPageIndex(Math.max(1, pageIndex - 1))}
                  disabled={pageIndex === 1}
                  style={[styles.pageButton, pageIndex === 1 && styles.pageButtonDisabled]}
                >
                  <Text style={styles.pageButtonText}>Trước</Text>
                </TouchableOpacity>
                <Text style={styles.pageInfo}>
                  Trang {pageIndex} / {totalPages}
                </Text>
                <TouchableOpacity
                  onPress={() => setPageIndex(Math.min(totalPages, pageIndex + 1))}
                  disabled={pageIndex === totalPages}
                  style={[
                    styles.pageButton,
                    pageIndex === totalPages && styles.pageButtonDisabled,
                  ]}
                >
                  <Text style={styles.pageButtonText}>Sau</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Settle Debt Modal */}
      <Modal
        visible={settleModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeSettleModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Thanh toán công nợ</Text>
            <TouchableOpacity onPress={closeSettleModal}>
              <IconSymbol name="xmark" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContent}>
            {selectedDebt && (
              <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Khách hàng:</Text>
                  <Text style={styles.infoValue}>{selectedDebt.customerName}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phòng:</Text>
                  <Text style={styles.infoValue}>{selectedDebt.roomNumber}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Số HĐ:</Text>
                  <Text style={styles.infoValue}>{selectedDebt.invoiceNumber}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tổng công nợ:</Text>
                  <Text style={styles.infoValue}>{formatCurrency(selectedDebt.debtAmount)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Đã thanh toán:</Text>
                  <Text style={styles.infoValue}>{formatCurrency(selectedDebt.paidAmount)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { fontWeight: 'bold' }]}>Còn lại:</Text>
                  <Text style={[styles.infoValue, { fontWeight: 'bold', color: '#ff4d4f' }]}>
                    {formatCurrency(selectedDebt.remainingAmount)}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Số tiền thanh toán <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={String(settleFormData.amount)}
                onChangeText={(text) =>
                  setSettleFormData({
                    ...settleFormData,
                    amount: Number(text) || 0,
                  })
                }
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Phương thức thanh toán <Text style={styles.required}>*</Text>
              </Text>
              <CustomPicker
                selectedValue={settleFormData.paymentMethod}
                onValueChange={(value) =>
                  setSettleFormData({ ...settleFormData, paymentMethod: value })
                }
                items={PAYMENT_METHODS}
                placeholder="Chọn phương thức"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Ghi chú</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={settleFormData.notes}
                onChangeText={(text) => setSettleFormData({ ...settleFormData, notes: text })}
                placeholder="Nhập ghi chú"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.submitButton} onPress={handleSettle}>
                <Text style={styles.submitButtonText}>Xác nhận thanh toán</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={closeSettleModal}>
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Label Management Modal */}
      <Modal
        visible={labelModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeLabelModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Quản lý nhãn</Text>
            <TouchableOpacity onPress={closeLabelModal}>
              <IconSymbol name="xmark" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContent}>
            {selectedDebt && (
              <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Khách hàng:</Text>
                  <Text style={styles.infoValue}>{selectedDebt.customerName}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Số HĐ:</Text>
                  <Text style={styles.infoValue}>{selectedDebt.invoiceNumber}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Còn lại:</Text>
                  <Text style={[styles.infoValue, { fontWeight: 'bold', color: '#ff4d4f' }]}>
                    {formatCurrency(selectedDebt.remainingAmount)}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nhãn hiện tại</Text>
              <View style={styles.labelsContainer}>
                {currentLabels.length === 0 ? (
                  <Text style={styles.emptyLabelsText}>Chưa có nhãn nào</Text>
                ) : (
                  currentLabels.map((label, index) => (
                    <View key={index} style={styles.labelItem}>
                      <View
                        style={[
                          styles.labelBadge,
                          { backgroundColor: getLabelColorValue(label.color || 'default') + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.labelText,
                            { color: getLabelColorValue(label.color || 'default') },
                          ]}
                        >
                          {label.name}
                        </Text>
                      </View>
                      <CustomPicker
                        selectedValue={label.color || 'default'}
                        onValueChange={(value) => updateLabelColor(label, value)}
                        items={LABEL_COLORS}
                        style={{ width: 100 }}
                      />
                      <TouchableOpacity
                        onPress={() => removeLabel(label)}
                        style={styles.removeLabelButton}
                      >
                        <IconSymbol name="xmark" size={16} color="#ff4d4f" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Thêm nhãn mới</Text>
              <View style={styles.addLabelRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 8 }]}
                  value={newLabelInput}
                  onChangeText={setNewLabelInput}
                  placeholder="Nhập tên nhãn"
                  onSubmitEditing={addNewLabel}
                />
                <CustomPicker
                  selectedValue={selectedLabelColor}
                  onValueChange={setSelectedLabelColor}
                  items={LABEL_COLORS}
                  style={{ width: 120 }}
                />
                <TouchableOpacity onPress={addNewLabel} style={styles.addLabelButton}>
                  <IconSymbol name="plus" size={20} color="#1890ff" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nhãn gợi ý</Text>
              <View style={styles.suggestedLabelsContainer}>
                {SUGGESTED_LABELS.map((label, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => addSuggestedLabel(label)}
                    style={[
                      styles.suggestedLabelBadge,
                      {
                        backgroundColor:
                          getLabelColorValue(label.color || 'default') + '20',
                        borderColor: getLabelColorValue(label.color || 'default'),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.suggestedLabelText,
                        { color: getLabelColorValue(label.color || 'default') },
                      ]}
                    >
                      + {label.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.submitButton} onPress={saveLabels}>
                <Text style={styles.submitButtonText}>Lưu nhãn</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={closeLabelModal}>
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// Helper function để convert color name sang hex
const getLabelColorValue = (color: string): string => {
  const colorMap: Record<string, string> = {
    default: '#d9d9d9',
    red: '#ff4d4f',
    orange: '#fa8c16',
    gold: '#faad14',
    green: '#52c41a',
    blue: '#1890ff',
    purple: '#722ed1',
    volcano: '#fa541c',
    cyan: '#13c2c2',
    magenta: '#eb2f96',
  };
  return colorMap[color] || colorMap.default;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  filterSection: {
    backgroundColor: '#fafafa',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  filterItem: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 50,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#fafafa',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 13,
    color: '#333',
  },
  customerPhone: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  formContent: {
    flex: 1,
    padding: 16,
  },
  infoSection: {
    backgroundColor: '#fafafa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#ff4d4f',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#1890ff',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  labelsContainer: {
    minHeight: 60,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  emptyLabelsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  labelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  labelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    flex: 1,
  },
  labelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  removeLabelButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addLabelButton: {
    width: 40,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1890ff20',
    borderRadius: 8,
  },
  suggestedLabelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestedLabelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
  },
  suggestedLabelText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

