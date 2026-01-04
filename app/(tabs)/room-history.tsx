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
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { roomsService } from '@/services/rooms.service';
import { BookingHistory } from '@/types';

export default function RoomHistoryScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<BookingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    setCurrentPage(1); // Reset về trang 1 khi filter thay đổi
  }, [selectedRoomId]);

  useEffect(() => {
    loadHistory();
  }, [user, selectedRoomId, currentPage]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const hotelId = user?.hotelId || user?.businessId;
      if (!hotelId) {
        console.warn('No hotelId or businessId found');
        return;
      }

      const params: any = { hotelId };
      if (selectedRoomId) params.roomId = selectedRoomId;

      const response = await roomsService.getRoomHistory(hotelId, 'all', currentPage, pageSize);
      setHistory(response.history || []);
      
      // Cập nhật pagination info
      if (response.totalItems !== undefined) {
        setTotalItems(response.totalItems);
      }
      if (response.totalPages !== undefined) {
        setTotalPages(response.totalPages);
      } else if (response.history && response.history.length > 0) {
        // Tính totalPages nếu backend chưa trả về
        setTotalPages(Math.ceil((response.totalItems || response.history.length) / pageSize));
      }
    } catch (error: any) {
      console.error('Error loading history:', error);
      Alert.alert('Error', error.message || 'Failed to load history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return '0 đ';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const getEventColor = (event: string) => {
    switch (event) {
      case 'check-in':
        return '#52c41a';
      case 'check-out':
        return '#1890ff';
      case 'booking':
        return '#722ed1';
      case 'transfer':
        return '#faad14';
      default:
        return '#d9d9d9';
    }
  };

  const renderHistoryItem = ({ item }: { item: BookingHistory }) => (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <View
          style={[
            styles.eventBadge,
            { backgroundColor: getEventColor(item.event) },
          ]}
        >
          <Text style={styles.eventText}>
            {item.event?.toUpperCase() || 'N/A'}
          </Text>
        </View>
        {item.totalAmount && (
          <Text style={styles.amount}>{formatCurrency(item.totalAmount)}</Text>
        )}
      </View>

      {item.guestInfo?.name && (
        <Text style={styles.guestName}>{item.guestInfo.name}</Text>
      )}

      {item.checkInTime && (
        <View style={styles.historyInfo}>
          <Text style={styles.infoLabel}>Check-in:</Text>
          <Text style={styles.infoValue}>{formatDate(item.checkInTime)}</Text>
        </View>
      )}

      {item.checkOutTime && (
        <View style={styles.historyInfo}>
          <Text style={styles.infoLabel}>Check-out:</Text>
          <Text style={styles.infoValue}>{formatDate(item.checkOutTime)}</Text>
        </View>
      )}

      {item.rateType && (
        <View style={styles.historyInfo}>
          <Text style={styles.infoLabel}>Rate:</Text>
          <Text style={styles.infoValue}>{item.rateType}</Text>
        </View>
      )}

      {item.createdAt && (
        <Text style={styles.createdAt}>
          {formatDate(item.createdAt)}
        </Text>
      )}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1890ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Room History</Text>
      </View>

      <FlatList
        data={history}
        renderItem={renderHistoryItem}
        keyExtractor={(item, index) =>
          item._id || `history-${index}`
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No history found</Text>
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
                <Text style={styles.pageButtonText}>Previous</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>
                Page {currentPage} / {totalPages}
              </Text>
              <TouchableOpacity
                onPress={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
              >
                <Text style={styles.pageButtonText}>Next</Text>
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
  header: {
    backgroundColor: '#1890ff',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  eventText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1890ff',
  },
  guestName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  historyInfo: {
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
  createdAt: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
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

