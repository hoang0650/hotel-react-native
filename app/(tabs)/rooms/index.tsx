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
  BedDouble,
  User,
  Calendar,
  Sparkles,
  Wrench,
  CheckCircle,
  AlertCircle,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { roomsApi } from '@/services/api';
import { Room, RoomStatus } from '@/types/hotel';

const statusConfig: Record<RoomStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  available: { label: 'Trống', color: Colors.status.available, icon: CheckCircle },
  occupied: { label: 'Đang ở', color: Colors.status.occupied, icon: User },
  cleaning: { label: 'Dọn dẹp', color: Colors.status.cleaning, icon: Sparkles },
  maintenance: { label: 'Bảo trì', color: Colors.status.maintenance, icon: Wrench },
};

const roomTypeLabels: Record<string, string> = {
  standard: 'Standard',
  deluxe: 'Deluxe',
  suite: 'Suite',
  presidential: 'Presidential',
};

export default function RoomsScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<RoomStatus | 'all'>('all');

  const { data: rooms = [], isLoading, refetch } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomsApi.getAll(),
  });

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchesSearch = room.number.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = selectedFilter === 'all' || room.status === selectedFilter;
      return matchesSearch && matchesFilter;
    });
  }, [rooms, searchQuery, selectedFilter]);

  const statusCounts = useMemo(() => ({
    all: rooms.length,
    available: rooms.filter((r) => r.status === 'available').length,
    occupied: rooms.filter((r) => r.status === 'occupied').length,
    cleaning: rooms.filter((r) => r.status === 'cleaning').length,
    maintenance: rooms.filter((r) => r.status === 'maintenance').length,
  }), [rooms]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderRoomCard = (room: Room) => {
    const status = statusConfig[room.status];
    const StatusIcon = status.icon;

    return (
      <TouchableOpacity key={room.id} style={styles.roomCard} activeOpacity={0.7}>
        <View style={styles.roomHeader}>
          <View style={styles.roomNumberContainer}>
            <BedDouble size={18} color={Colors.light.tint} />
            <Text style={styles.roomNumber}>{room.number}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
            <StatusIcon size={12} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.roomInfo}>
          <View style={styles.roomType}>
            <Text style={styles.roomTypeText}>{roomTypeLabels[room.type] || room.type}</Text>
            <Text style={styles.floorText}>Tầng {room.floor}</Text>
          </View>
          <Text style={styles.priceText}>{formatCurrency(room.price)}/đêm</Text>
        </View>

        {room.status === 'occupied' && room.currentGuest && (
          <View style={styles.guestInfo}>
            <User size={14} color={Colors.light.textSecondary} />
            <Text style={styles.guestName}>{room.currentGuest}</Text>
            {room.checkoutDate && (
              <View style={styles.checkoutInfo}>
                <Calendar size={12} color={Colors.light.textSecondary} />
                <Text style={styles.checkoutText}>Out: {room.checkoutDate}</Text>
              </View>
            )}
          </View>
        )}

        {room.amenities && room.amenities.length > 0 && (
          <View style={styles.amenitiesContainer}>
            {room.amenities.slice(0, 3).map((amenity, index) => (
              <View key={index} style={styles.amenityBadge}>
                <Text style={styles.amenityText}>{amenity}</Text>
              </View>
            ))}
            {room.amenities.length > 3 && (
              <View style={styles.amenityBadge}>
                <Text style={styles.amenityText}>+{room.amenities.length - 3}</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading && rooms.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Đang tải danh sách phòng...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Quản lý phòng</Text>
        <Text style={styles.subtitle}>{rooms.length} phòng</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={18} color={Colors.light.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm số phòng..."
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
            Tất cả ({statusCounts.all})
          </Text>
        </TouchableOpacity>
        {(Object.keys(statusConfig) as RoomStatus[]).map((status) => (
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
              {statusConfig[status].label} ({statusCounts[status]})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.roomsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.roomsListContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        {filteredRooms.map(renderRoomCard)}
        {filteredRooms.length === 0 && (
          <View style={styles.emptyState}>
            {rooms.length === 0 ? (
              <>
                <AlertCircle size={48} color={Colors.light.textSecondary} />
                <Text style={styles.emptyText}>Chưa có dữ liệu phòng</Text>
                <Text style={styles.emptySubtext}>Kiểm tra kết nối API</Text>
              </>
            ) : (
              <>
                <BedDouble size={48} color={Colors.light.textSecondary} />
                <Text style={styles.emptyText}>Không tìm thấy phòng</Text>
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
  roomsList: {
    flex: 1,
  },
  roomsListContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  roomCard: {
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
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roomNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomNumber: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  roomInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roomType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomTypeText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500' as const,
  },
  floorText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priceText: {
    fontSize: 14,
    color: Colors.light.tint,
    fontWeight: '600' as const,
  },
  guestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
  },
  guestName: {
    fontSize: 13,
    color: Colors.light.text,
    fontWeight: '500' as const,
    flex: 1,
  },
  checkoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  checkoutText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  amenityBadge: {
    backgroundColor: Colors.light.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  amenityText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
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
