import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Room } from '@/types';

interface RoomCardProps {
  room: Room;
  onPress: () => void;
  onUpdate: () => void;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onTransfer?: () => void;
  isGridView?: boolean;
}

export default function RoomCard({
  room,
  onPress,
  onUpdate,
  onCheckIn,
  onCheckOut,
  onTransfer,
  isGridView = true,
}: RoomCardProps) {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'vacant':
        return { label: 'Trống', color: '#52c41a', icon: '✓' };
      case 'occupied':
        return { label: 'Đã thuê', color: '#1890ff', icon: '👤' };
      case 'cleaning':
        return { label: 'Đang dọn', color: '#faad14', icon: '🔄' };
      case 'dirty':
        return { label: 'Bẩn', color: '#ff4d4f', icon: '⚠️' };
      case 'booked':
        return { label: 'Đã đặt', color: '#722ed1', icon: '📅' };
      case 'maintenance':
        return { label: 'Bảo trì', color: '#8b0000', icon: '🔧' };
      case 'guest_out':
        return { label: 'Khách ra ngoài', color: '#ff9800', icon: '🚪' };
      default:
        return { label: status, color: '#d9d9d9', icon: '' };
    }
  };

  const statusInfo = getStatusInfo(room.status);
  const price = room.pricing?.daily || room.pricing?.nightly || 0;
  const floor = room.floor || '0';

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  if (isGridView) {
    return (
      <TouchableOpacity style={styles.gridCard} onPress={onPress}>
        <View style={styles.gridCardHeader}>
          <Text style={styles.gridRoomNumber}>Phòng {room.roomNumber}</Text>
          <View
            style={[
              styles.gridStatusBadge,
              { backgroundColor: statusInfo.color },
            ]}
          >
            <Text style={styles.gridStatusIcon}>{statusInfo.icon}</Text>
            <Text style={styles.gridStatusText}>{statusInfo.label}</Text>
          </View>
        </View>
        <Text style={styles.gridRoomType}>{room.type}</Text>
        <Text style={styles.gridPrice}>
          {formatPrice(price)} VNĐ/đêm
        </Text>
        <Text style={styles.gridFloor}>Tầng {floor === '0' ? 'Trệt' : floor}</Text>
        <View style={styles.gridActions}>
          <TouchableOpacity
            style={styles.gridActionButton}
            onPress={(e) => {
              e.stopPropagation();
              onUpdate();
            }}
          >
            <Text style={styles.gridActionIcon}>✏️</Text>
            <Text style={styles.gridActionText}>Cập nhật</Text>
          </TouchableOpacity>
          {room.status === 'vacant' || room.status === 'booked' ? (
            <TouchableOpacity
              style={styles.gridActionButton}
              onPress={(e) => {
                e.stopPropagation();
                onCheckIn();
              }}
            >
              <Text style={styles.gridActionIcon}>🔑</Text>
              <Text style={styles.gridActionText}>Nhận phòng</Text>
            </TouchableOpacity>
          ) : null}
          {room.status === 'occupied' ? (
            <>
              {onTransfer && (
                <TouchableOpacity
                  style={styles.gridActionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    onTransfer();
                  }}
                >
                  <Text style={styles.gridActionIcon}>🔄</Text>
                  <Text style={styles.gridActionText}>Đổi phòng</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.gridActionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onCheckOut();
                }}
              >
                <Text style={styles.gridActionIcon}>🚪</Text>
                <Text style={styles.gridActionText}>Trả phòng</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  }

  // List view
  return (
    <TouchableOpacity style={styles.listCard} onPress={onPress}>
      <View style={styles.listCardHeader}>
        <View>
          <Text style={styles.listRoomNumber}>Phòng {room.roomNumber}</Text>
          <Text style={styles.listRoomType}>{room.type}</Text>
          <Text style={styles.listPrice}>
            {formatPrice(price)} VNĐ/đêm
          </Text>
          <Text style={styles.listFloor}>Tầng {floor === '0' ? 'Trệt' : floor}</Text>
        </View>
        <View
          style={[
            styles.listStatusBadge,
            { backgroundColor: statusInfo.color },
          ]}
        >
          <Text style={styles.listStatusIcon}>{statusInfo.icon}</Text>
          <Text style={styles.listStatusText}>{statusInfo.label}</Text>
        </View>
      </View>
      <View style={styles.listActions}>
        <TouchableOpacity
          style={styles.listActionButton}
          onPress={(e) => {
            e.stopPropagation();
            onUpdate();
          }}
        >
          <Text style={styles.listActionIcon}>✏️</Text>
          <Text style={styles.listActionText}>Cập nhật</Text>
        </TouchableOpacity>
        {room.status === 'vacant' || room.status === 'booked' ? (
          <TouchableOpacity
            style={styles.listActionButton}
            onPress={(e) => {
              e.stopPropagation();
              onCheckIn();
            }}
          >
            <Text style={styles.listActionIcon}>🔑</Text>
            <Text style={styles.listActionText}>Nhận phòng</Text>
          </TouchableOpacity>
        ) : null}
        {room.status === 'occupied' ? (
          <>
            {onTransfer && (
              <TouchableOpacity
                style={styles.listActionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onTransfer();
                }}
              >
                <Text style={styles.listActionIcon}>🔄</Text>
                <Text style={styles.listActionText}>Đổi phòng</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.listActionButton}
              onPress={(e) => {
                e.stopPropagation();
                onCheckOut();
              }}
            >
              <Text style={styles.listActionIcon}>🚪</Text>
              <Text style={styles.listActionText}>Trả phòng</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gridCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    margin: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flex: 1,
    minWidth: 0,
  },
  gridCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  gridRoomNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  gridStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  gridStatusIcon: {
    fontSize: 10,
  },
  gridStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  gridRoomType: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  gridPrice: {
    fontSize: 12,
    color: '#1890ff',
    fontWeight: '600',
    marginBottom: 3,
  },
  gridFloor: {
    fontSize: 11,
    color: '#999',
    marginBottom: 8,
  },
  gridActions: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  gridActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 5,
    backgroundColor: '#f5f5f5',
    gap: 3,
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  gridActionIcon: {
    fontSize: 10,
  },
  gridActionText: {
    fontSize: 9,
    color: '#666',
  },
  listCard: {
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
  listCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  listRoomNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  listRoomType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  listPrice: {
    fontSize: 14,
    color: '#1890ff',
    fontWeight: '600',
    marginBottom: 4,
  },
  listFloor: {
    fontSize: 12,
    color: '#999',
  },
  listStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  listStatusIcon: {
    fontSize: 14,
  },
  listStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  listActions: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  listActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    gap: 6,
  },
  listActionIcon: {
    fontSize: 14,
  },
  listActionText: {
    fontSize: 12,
    color: '#666',
  },
});

