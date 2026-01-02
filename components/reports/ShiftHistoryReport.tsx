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
  Modal,
  TextInput,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useHotel } from '@/contexts/HotelContext';
import { shiftHandoverService } from '@/services/shift-handover.service';
import { format } from '@/utils/dateUtils';

interface ShiftHandover {
  _id?: string;
  hotelId: string;
  fromStaffId: any;
  toStaffId: any;
  handoverTime: Date | string;
  previousShiftAmount: number;
  cashInShift: number;
  managerHandoverAmount: number;
  handoverAmount: number;
  cashAmount: number;
  bankTransferAmount: number;
  cardPaymentAmount: number;
  expenseAmount: number;
  incomeAmount: number;
  totalRoomRevenue?: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled';
  notes?: string;
  expenses?: Array<{
    _id?: string;
    description: string;
    amount: number;
    category?: string;
    recipient?: string;
    method?: 'cash' | 'bank_transfer' | 'card';
    timestamp: Date | string;
  }>;
  incomes?: Array<{
    _id?: string;
    description: string;
    amount: number;
    category?: string;
    source?: string;
    method?: 'cash' | 'bank_transfer' | 'card';
    timestamp: Date | string;
  }>;
  roomHistory?: Array<{
    roomNumber: string;
    action: string;
    guestName?: string;
    guestSource?: string;
    amount: number;
    paymentMethod: string;
    timestamp: Date | string;
    checkinTime?: Date | string;
    checkInTime?: Date | string;
    roomTotal?: number;
    additionalCharges?: number;
    discount?: number;
    serviceAmount?: number;
    serviceTotal?: number;
    advancePayment?: number;
    notes?: string;
  }>;
}

interface ShiftHistoryReportProps {
  onBack: () => void;
}

export default function ShiftHistoryReport({ onBack }: ShiftHistoryReportProps) {
  const { user } = useAuth();
  const { selectedHotelId } = useHotel();
  const [shiftHistory, setShiftHistory] = useState<ShiftHandover[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedRecord, setSelectedRecord] = useState<ShiftHandover | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const pageSize = 20;

  useEffect(() => {
    if (selectedHotelId) {
      loadShiftHistory();
    }
  }, [selectedHotelId, currentPage]);

  const loadShiftHistory = async () => {
    if (!selectedHotelId) {
      Alert.alert('Thông báo', 'Vui lòng chọn khách sạn');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params: any = {
        hotelId: selectedHotelId,
        page: currentPage,
        limit: pageSize,
      };

      if (startDate) {
        params.startDate = startDate;
      }

      if (endDate) {
        params.endDate = endDate;
      }

      const response = await shiftHandoverService.getShiftHandoverHistory(params);
      setShiftHistory(response.data || []);
      setTotalItems(response.pagination?.totalItems || 0);
    } catch (error: any) {
      console.error('Error loading shift history:', error);
      Alert.alert('Lỗi', 'Không thể tải lịch sử giao ca');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    loadShiftHistory();
  };

  const handleFilter = () => {
    setCurrentPage(1);
    loadShiftHistory();
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
    loadShiftHistory();
  };

  const viewDetail = (record: ShiftHandover) => {
    setSelectedRecord(record);
    setDetailModalVisible(true);
  };

  const closeDetailModal = () => {
    setDetailModalVisible(false);
    setSelectedRecord(null);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount || 0);
  };

  const formatDateTime = (date: Date | string | undefined): string => {
    if (!date) return 'N/A';
    try {
      const d = new Date(date);
      return format(d, 'dd/MM/yyyy HH:mm');
    } catch {
      return 'N/A';
    }
  };

  const getStaffName = (staff: any): string => {
    if (!staff) return 'N/A';
    if (typeof staff === 'string') return staff;
    const firstName = staff.personalInfo?.firstName || '';
    const lastName = staff.personalInfo?.lastName || '';
    return `${firstName} ${lastName}`.trim() || staff.username || 'N/A';
  };

  const getStatusColor = (status: string): string => {
    const statusMap: Record<string, string> = {
      pending: '#ff9800',
      confirmed: '#4caf50',
      rejected: '#f44336',
      cancelled: '#9e9e9e',
    };
    return statusMap[status] || '#9e9e9e';
  };

  const getStatusLabel = (status: string): string => {
    const labelMap: Record<string, string> = {
      pending: 'Chờ xác nhận',
      confirmed: 'Đã xác nhận',
      rejected: 'Đã từ chối',
      cancelled: 'Đã hủy',
    };
    return labelMap[status] || status;
  };

  const getTotalRevenue = (record: ShiftHandover): number => {
    const totalRoomRevenue = record.totalRoomRevenue || 0;
    const incomeAmount = record.incomeAmount || 0;
    return totalRoomRevenue + incomeAmount;
  };

  const getExpenseCategoryLabel = (category: string | undefined): string => {
    if (!category) return 'Khác';
    const labelMap: Record<string, string> = {
      supplies: 'Vật tư',
      utilities: 'Tiện ích',
      salary: 'Lương',
      maintenance: 'Bảo trì',
      marketing: 'Marketing',
      other: 'Khác',
    };
    return labelMap[category] || category || 'Khác';
  };

  const getExpenseCategoryColor = (category: string | undefined): string => {
    if (!category) return '#9e9e9e';
    const colorMap: Record<string, string> = {
      supplies: '#ff9800',
      utilities: '#2196f3',
      salary: '#9c27b0',
      maintenance: '#00bcd4',
      marketing: '#4caf50',
      other: '#9e9e9e',
    };
    return colorMap[category] || '#9e9e9e';
  };

  const getIncomeCategoryLabel = (category: string | undefined): string => {
    if (!category) return 'Khác';
    const labelMap: Record<string, string> = {
      room_rental: 'Thuê phòng',
      service: 'Dịch vụ',
      deposit: 'Đặt cọc',
      other: 'Khác',
    };
    return labelMap[category] || category || 'Khác';
  };

  const getIncomeCategoryColor = (category: string | undefined): string => {
    if (!category) return '#9e9e9e';
    const colorMap: Record<string, string> = {
      room_rental: '#2196f3',
      service: '#4caf50',
      deposit: '#ff9800',
      other: '#9e9e9e',
    };
    return colorMap[category] || '#9e9e9e';
  };

  const getGuestSourceLabel = (room: any): string => {
    const source = room.guestSource || 'walkin';
    const sourceMap: Record<string, string> = {
      walkin: 'Khách lẻ',
      booking: 'Đặt phòng',
      agoda: 'Agoda',
      traveloka: 'Traveloka',
      expedia: 'Expedia',
      trip: 'Trip',
      g2j: 'G2J',
      other: 'Khác',
    };
    return sourceMap[source] || source || 'Khác';
  };

  const getGuestSourceColor = (room: any): string => {
    const source = room.guestSource || 'walkin';
    const colorMap: Record<string, string> = {
      walkin: '#9e9e9e',
      booking: '#2196f3',
      agoda: '#ff9800',
      traveloka: '#4caf50',
      expedia: '#9c27b0',
      trip: '#00bcd4',
      g2j: '#e91e63',
      other: '#607d8b',
    };
    return colorMap[source] || '#9e9e9e';
  };

  const getGuestName = (room: any): string => {
    if (room.guestName) {
      return room.guestName;
    }
    return 'Khách lẻ';
  };

  const getRoomTotal = (room: any): number => {
    return room.roomTotal || 0;
  };

  const getAdditionalCharges = (room: any): number => {
    return room.additionalCharges || 0;
  };

  const getDiscount = (room: any): number => {
    return room.discount || 0;
  };

  const getServiceAmount = (room: any): number => {
    return room.serviceAmount || room.serviceTotal || 0;
  };

  const getAdvancePayment = (room: any): number => {
    return room.advancePayment || 0;
  };

  const getCheckinTime = (room: any): Date | null => {
    const checkinTime = room.checkinTime || room.checkInTime;
    return checkinTime ? new Date(checkinTime) : null;
  };

  const getPaymentMethodLabel = (method: string): string => {
    const methodMap: Record<string, string> = {
      cash: 'Tiền mặt',
      bank_transfer: 'Chuyển khoản',
      card: 'Thẻ',
    };
    return methodMap[method] || method;
  };

  const renderShiftItem = ({ item }: { item: ShiftHandover }) => {
    return (
      <TouchableOpacity
        style={styles.shiftItem}
        onPress={() => viewDetail(item)}
      >
        <View style={styles.shiftItemHeader}>
          <Text style={styles.shiftItemTime}>{formatDateTime(item.handoverTime)}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>
        <View style={styles.shiftItemRow}>
          <Text style={styles.shiftItemLabel}>Từ:</Text>
          <Text style={styles.shiftItemValue}>{getStaffName(item.fromStaffId)}</Text>
        </View>
        <View style={styles.shiftItemRow}>
          <Text style={styles.shiftItemLabel}>Đến:</Text>
          <Text style={styles.shiftItemValue}>{getStaffName(item.toStaffId)}</Text>
        </View>
        <View style={styles.shiftItemRow}>
          <Text style={styles.shiftItemLabel}>Số tiền giao ca:</Text>
          <Text style={[styles.shiftItemValue, styles.amountText]}>
            {formatCurrency(item.handoverAmount)}
          </Text>
        </View>
        <View style={styles.shiftItemRow}>
          <Text style={styles.shiftItemLabel}>Tổng doanh thu:</Text>
          <Text style={[styles.shiftItemValue, styles.revenueText]}>
            {formatCurrency(getTotalRevenue(item))}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedRecord) return null;

    return (
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeDetailModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết giao ca</Text>
              <TouchableOpacity onPress={closeDetailModal}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Thông tin cơ bản */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Thông tin giao ca</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Thời gian:</Text>
                  <Text style={styles.detailValue}>{formatDateTime(selectedRecord.handoverTime)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Từ nhân viên:</Text>
                  <Text style={styles.detailValue}>{getStaffName(selectedRecord.fromStaffId)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Đến nhân viên:</Text>
                  <Text style={styles.detailValue}>{getStaffName(selectedRecord.toStaffId)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Trạng thái:</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(selectedRecord.status) },
                    ]}
                  >
                    <Text style={styles.statusText}>{getStatusLabel(selectedRecord.status)}</Text>
                  </View>
                </View>
              </View>

              {/* Thông tin tiền */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Thông tin tiền</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Số tiền ca trước:</Text>
                  <Text style={[styles.detailValue, styles.amountText]}>
                    {formatCurrency(selectedRecord.previousShiftAmount || 0)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tiền mặt trong ca:</Text>
                  <Text style={[styles.detailValue, styles.amountText]}>
                    {formatCurrency(selectedRecord.cashInShift || 0)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tiền giao quản lý:</Text>
                  <Text style={[styles.detailValue, styles.amountText]}>
                    {formatCurrency(selectedRecord.managerHandoverAmount || 0)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Số tiền giao ca:</Text>
                  <Text style={[styles.detailValue, styles.amountText, styles.highlightText]}>
                    {formatCurrency(selectedRecord.handoverAmount || 0)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tiền mặt:</Text>
                  <Text style={[styles.detailValue, styles.amountText]}>
                    {formatCurrency(selectedRecord.cashAmount || 0)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Chuyển khoản:</Text>
                  <Text style={[styles.detailValue, styles.amountText]}>
                    {formatCurrency(selectedRecord.bankTransferAmount || 0)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Cà thẻ:</Text>
                  <Text style={[styles.detailValue, styles.amountText]}>
                    {formatCurrency(selectedRecord.cardPaymentAmount || 0)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tổng tiền chi:</Text>
                  <Text style={[styles.detailValue, styles.amountText]}>
                    {formatCurrency(selectedRecord.expenseAmount || 0)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tổng tiền thu:</Text>
                  <Text style={[styles.detailValue, styles.amountText]}>
                    {formatCurrency(selectedRecord.incomeAmount || 0)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tổng doanh thu:</Text>
                  <Text style={[styles.detailValue, styles.revenueText, styles.highlightText]}>
                    {formatCurrency(getTotalRevenue(selectedRecord))}
                  </Text>
                </View>
              </View>

              {/* Phiếu chi */}
              {selectedRecord.expenses && selectedRecord.expenses.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Phiếu chi ({selectedRecord.expenses.length})</Text>
                  {selectedRecord.expenses.map((expense, index) => (
                    <View key={index} style={styles.expenseItem}>
                      <View style={styles.expenseRow}>
                        <Text style={styles.expenseDescription}>{expense.description || 'Phiếu chi'}</Text>
                        <Text style={[styles.expenseAmount, { color: '#f44336' }]}>
                          {formatCurrency(expense.amount || 0)}
                        </Text>
                      </View>
                      <View style={styles.expenseDetails}>
                        <View
                          style={[
                            styles.categoryBadge,
                            { backgroundColor: getExpenseCategoryColor(expense.category) },
                          ]}
                        >
                          <Text style={styles.categoryText}>
                            {getExpenseCategoryLabel(expense.category)}
                          </Text>
                        </View>
                        <Text style={styles.expenseDetailText}>
                          {expense.recipient || 'N/A'} • {getPaymentMethodLabel(expense.method || 'cash')} •{' '}
                          {formatDateTime(expense.timestamp)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Phiếu thu */}
              {selectedRecord.incomes && selectedRecord.incomes.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Phiếu thu ({selectedRecord.incomes.length})</Text>
                  {selectedRecord.incomes.map((income, index) => (
                    <View key={index} style={styles.expenseItem}>
                      <View style={styles.expenseRow}>
                        <Text style={styles.expenseDescription}>{income.description || 'Phiếu thu'}</Text>
                        <Text style={[styles.expenseAmount, { color: '#4caf50' }]}>
                          {formatCurrency(income.amount || 0)}
                        </Text>
                      </View>
                      <View style={styles.expenseDetails}>
                        <View
                          style={[
                            styles.categoryBadge,
                            { backgroundColor: getIncomeCategoryColor(income.category) },
                          ]}
                        >
                          <Text style={styles.categoryText}>
                            {getIncomeCategoryLabel(income.category)}
                          </Text>
                        </View>
                        <Text style={styles.expenseDetailText}>
                          {income.source || 'N/A'} • {getPaymentMethodLabel(income.method || 'cash')} •{' '}
                          {formatDateTime(income.timestamp)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Lịch sử phòng */}
              {selectedRecord.roomHistory && selectedRecord.roomHistory.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>
                    Lịch sử phòng ({selectedRecord.roomHistory.length})
                  </Text>
                  {selectedRecord.roomHistory.map((room, index) => (
                    <View key={index} style={styles.roomItem}>
                      <View style={styles.roomHeader}>
                        <Text style={styles.roomNumber}>Phòng {room.roomNumber}</Text>
                        <Text style={[styles.roomAmount, { color: '#2196f3' }]}>
                          {formatCurrency(room.amount || 0)}
                        </Text>
                      </View>
                      <View style={styles.roomDetails}>
                        <Text style={styles.roomDetailText}>
                          {room.action} • {getGuestName(room)} • {getGuestSourceLabel(room)}
                        </Text>
                        <View style={styles.roomBreakdown}>
                          <Text style={styles.roomBreakdownText}>
                            Phòng: {formatCurrency(getRoomTotal(room))} • Dịch vụ:{' '}
                            {formatCurrency(getServiceAmount(room))} • Phụ thu:{' '}
                            {formatCurrency(getAdditionalCharges(room))} • Giảm:{' '}
                            {formatCurrency(getDiscount(room))} • Đặt trước:{' '}
                            {formatCurrency(getAdvancePayment(room))}
                          </Text>
                        </View>
                        <Text style={styles.roomDetailText}>
                          {getPaymentMethodLabel(room.paymentMethod)} • Check-in:{' '}
                          {getCheckinTime(room) ? formatDateTime(getCheckinTime(room)!) : 'N/A'} • Check-out:{' '}
                          {formatDateTime(room.timestamp)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Ghi chú */}
              {selectedRecord.notes && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Ghi chú</Text>
                  <Text style={styles.notesText}>{selectedRecord.notes}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Lịch sử giao ca</Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <TextInput
            style={styles.dateInput}
            placeholder="Từ ngày (YYYY-MM-DD)"
            value={startDate}
            onChangeText={setStartDate}
            placeholderTextColor="#999"
          />
          <TextInput
            style={styles.dateInput}
            placeholder="Đến ngày (YYYY-MM-DD)"
            value={endDate}
            onChangeText={setEndDate}
            placeholderTextColor="#999"
          />
        </View>
        <View style={styles.filterButtons}>
          <TouchableOpacity style={styles.filterButton} onPress={handleFilter}>
            <Text style={styles.filterButtonText}>Tìm kiếm</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterButton, styles.resetButton]} onPress={resetFilters}>
            <Text style={styles.filterButtonText}>Làm mới</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1890ff" />
        </View>
      ) : (
        <FlatList
          data={shiftHistory}
          renderItem={renderShiftItem}
          keyExtractor={(item) => item._id || Math.random().toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Không có dữ liệu</Text>
            </View>
          }
          ListFooterComponent={
            totalItems > pageSize * currentPage ? (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() => {
                  setCurrentPage(currentPage + 1);
                }}
              >
                <Text style={styles.loadMoreText}>Tải thêm</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}

      {renderDetailModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  dateInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    backgroundColor: '#1890ff',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  shiftItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  shiftItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shiftItemTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  shiftItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  shiftItemLabel: {
    fontSize: 14,
    color: '#666',
  },
  shiftItemValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  amountText: {
    color: '#2196f3',
    fontWeight: '600',
  },
  revenueText: {
    color: '#4caf50',
    fontWeight: '600',
  },
  loadMoreButton: {
    padding: 16,
    alignItems: 'center',
  },
  loadMoreText: {
    color: '#1890ff',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#999',
  },
  modalBody: {
    padding: 16,
  },
  detailSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  highlightText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  expenseItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseDescription: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  expenseDetails: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  expenseDetailText: {
    fontSize: 12,
    color: '#666',
  },
  roomItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  roomAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  roomDetails: {
    marginTop: 8,
  },
  roomDetailText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  roomBreakdown: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  roomBreakdownText: {
    fontSize: 12,
    color: '#666',
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
