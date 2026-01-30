import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { tuyaService, TuyaDevice } from '@/services/tuya.service';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { hotelsService } from '@/services/hotels.service';
import { roomsService } from '@/services/rooms.service';
import { Hotel, Room } from '@/types';
import CustomPicker, { PickerItem } from '@/components/ui/CustomPicker';
import * as Haptics from 'expo-haptics';

export default function ElectricSettingScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [devices, setDevices] = useState<TuyaDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [showByRoom, setShowByRoom] = useState(false);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [devicesByRoom, setDevicesByRoom] = useState<Record<string, TuyaDevice[]>>({});
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [deviceIdInput, setDeviceIdInput] = useState('');
  const [deviceNameInput, setDeviceNameInput] = useState('');
  const [hotelIdInput, setHotelIdInput] = useState<string | null>(null);
  const [roomIdInput, setRoomIdInput] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (hotelIdInput) {
      loadRoomsByHotel(hotelIdInput);
    } else {
      setRooms([]);
      setRoomIdInput(null);
    }
  }, [hotelIdInput]);

  const loadInitial = async () => {
    try {
      setLoading(true);
      await Promise.all([loadHotels(), loadDevices()]);
    } finally {
      setLoading(false);
    }
  };

  const loadHotels = async () => {
    try {
      const list = await hotelsService.getHotels();
      setHotels(list || []);
      if (!selectedHotelId && list && list.length > 0) {
        setSelectedHotelId(list[0]._id);
      }
    } catch (e) {
      // ignore
    }
  };

  const loadRoomsByHotel = async (hotelId: string) => {
    try {
      const list = await roomsService.getRooms({ hotelId });
      setRooms(list || []);
    } catch (e) {
      setRooms([]);
    }
  };

  const loadDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await tuyaService.getDevices(undefined, selectedHotelId || undefined);
      const list = Array.isArray(res) ? res : res?.data || [];
      setDevices(list);
      if (showByRoom) {
        groupDevicesByRoom(list);
      } else {
        setDevicesByRoom({});
      }
    } catch (e: any) {
      setError(e?.message || 'Không thể tải danh sách thiết bị');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDevices();
  };

  const handleBack = () => {
    router.replace('/management');
  };

  const toggleDevice = async (deviceId: string) => {
    if (toggling[deviceId]) return;
    setToggling((prev) => ({ ...prev, [deviceId]: true }));
    try {
      const res = await tuyaService.toggle(deviceId);
      if (res.success) {
        Haptics.selectionAsync();
        setDevices((prev) =>
          prev.map((d) =>
            d.id === deviceId ? { ...d, state: res.data?.state ?? !d.state } : d
          )
        );
      }
    } catch (e) {
      // No-op; backend returns message already
    } finally {
      setToggling((prev) => ({ ...prev, [deviceId]: false }));
    }
  };

  const isAnyDeviceToggling = useMemo(() => Object.values(toggling).some(Boolean), [toggling]);

  const groupDevicesByRoom = (list: TuyaDevice[]) => {
    const grouped: Record<string, TuyaDevice[]> = {};
    list.forEach(d => {
      const key = d.roomId || 'no-room';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(d);
    });
    setDevicesByRoom(grouped);
  };

  const turnOnByRoom = async (roomId: string) => {
    try {
      await tuyaService.turnOnByRoom(roomId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onRefresh();
    } catch (e) {
      // ignore
    }
  };

  const turnOffByRoom = async (roomId: string) => {
    try {
      await tuyaService.turnOffByRoom(roomId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onRefresh();
    } catch (e) {
      // ignore
    }
  };

  const openAddDevice = () => {
    setDeviceIdInput('');
    setDeviceNameInput('');
    setHotelIdInput(selectedHotelId);
    setRoomIdInput(null);
    setAddModalVisible(true);
  };

  const submitAddDevice = async () => {
    const deviceId = deviceIdInput.trim();
    const name = deviceNameInput.trim();
    if (!deviceId || !name) {
      setError('Vui lòng nhập mã thiết bị và tên');
      return;
    }
    setSaving(true);
    try {
      const selectedRoom = rooms.find(r => r._id === roomIdInput);
      await tuyaService.addDevice({
        deviceId,
        name,
        hotelId: hotelIdInput || undefined,
        roomId: roomIdInput || undefined,
        roomNumber: selectedRoom?.roomNumber || undefined,
      });
      setAddModalVisible(false);
      await loadDevices();
    } catch (e: any) {
      setError(e?.message || 'Không thể thêm thiết bị');
    } finally {
      setSaving(false);
    }
  };

  const renderDevice = ({ item }: { item: TuyaDevice }) => {
    const online = item.online ?? true;
    const isOn = item.state ?? false;
    const isBusy = toggling[item.id] || false;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <Text style={styles.deviceName}>{item.name || 'Thiết bị'}</Text>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: online ? '#52c41a' : '#f5222d' },
              ]}
            />
            <Text style={[styles.statusText, { color: online ? '#52c41a' : '#f5222d' }]}>
              {online ? 'Online' : 'Offline'}
            </Text>
          </View>
          <View
            style={[
              styles.switchBadge,
              { backgroundColor: isOn ? '#52c41a' : '#d9d9d9' },
            ]}
          >
            <Text style={styles.switchText}>{isOn ? 'Bật' : 'Tắt'}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.row}>
            <Text style={styles.label}>Phòng:</Text>
            <Text style={styles.value}>{item.roomNumber || 'N/A'}</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <TouchableOpacity
            disabled={!online || isBusy}
            onPress={() => toggleDevice(item.id)}
            style={[
              styles.actionBtn,
              { backgroundColor: isOn ? '#52c41a' : '#1890ff' },
              (!online || isBusy) && styles.actionBtnDisabled,
            ]}
          >
            <Text style={styles.actionText}>{isBusy ? 'Đang xử lý...' : isOn ? 'Tắt' : 'Bật'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderRoomSection = (room: Room | { _id?: string; roomNumber?: string }) => {
    const rid = (room as any)._id || 'no-room';
    const rnum = room.roomNumber || 'N/A';
    const items = devicesByRoom[rid] || [];
    return (
      <View key={rid} style={styles.roomSection}>
        <View style={styles.roomHeader}>
          <Text style={styles.roomTitle}>Phòng {rnum}</Text>
          <View style={styles.roomControls}>
            <TouchableOpacity
              style={[styles.roomCtrlBtn, isAnyDeviceToggling && styles.roomCtrlBtnDisabled]}
              disabled={isAnyDeviceToggling || rid === 'no-room'}
              onPress={() => turnOnByRoom(rid)}
            >
              <Text style={styles.roomCtrlText}>Bật tất cả</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roomCtrlBtn, isAnyDeviceToggling && styles.roomCtrlBtnDisabled]}
              disabled={isAnyDeviceToggling || rid === 'no-room'}
              onPress={() => turnOffByRoom(rid)}
            >
              <Text style={styles.roomCtrlText}>Tắt tất cả</Text>
            </TouchableOpacity>
          </View>
        </View>
        {items.map(d => (
          <View key={d.id}>{renderDevice({ item: d })}</View>
        ))}
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
        <View style={styles.headerSide}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.titleCentered}>Cài đặt điện</Text>
        <View style={styles.headerActions}>
          <View style={styles.toggleGroup}>
            <TouchableOpacity
              style={[styles.toggleOption, !showByRoom && styles.toggleOptionActive]}
              onPress={() => {
                setShowByRoom(false);
                setDevicesByRoom({});
              }}
            >
              <Text style={[styles.toggleText, !showByRoom && styles.toggleTextActive]}>Tất cả</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleOption, showByRoom && styles.toggleOptionActive]}
              onPress={() => {
                setShowByRoom(true);
                groupDevicesByRoom(devices);
              }}
            >
              <Text style={[styles.toggleText, showByRoom && styles.toggleTextActive]}>Theo phòng</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
            <Text style={styles.refreshText}>Làm mới</Text>
          </TouchableOpacity>
        </View>
      </View>
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {showByRoom ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listContent}>
          {Object.keys(devicesByRoom).length > 0 ? (
            <>
              {(rooms.length > 0
                ? rooms
                : Object.keys(devicesByRoom).map(key => ({ _id: key, roomNumber: devicesByRoom[key]?.[0]?.roomNumber || 'N/A' }))
              ).map(r => renderRoomSection(r))}
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>⚡</Text>
              <Text style={styles.emptyText}>Chưa có thiết bị Tuya</Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={devices}
          renderItem={renderDevice}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>⚡</Text>
              <Text style={styles.emptyText}>Chưa có thiết bị Tuya</Text>
              <TouchableOpacity style={[styles.refreshBtn, { marginTop: 12 }]} onPress={openAddDevice}>
                <Text style={styles.refreshText}>Thêm thiết bị</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openAddDevice}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm thiết bị Tuya</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Mã thiết bị *</Text>
              <TextInput
                style={styles.input}
                value={deviceIdInput}
                onChangeText={setDeviceIdInput}
                placeholder="Nhập mã thiết bị"
                placeholderTextColor="#999"
              />
              <Text style={styles.inputLabel}>Tên thiết bị *</Text>
              <TextInput
                style={styles.input}
                value={deviceNameInput}
                onChangeText={setDeviceNameInput}
                placeholder="Nhập tên thiết bị"
                placeholderTextColor="#999"
              />
              <Text style={styles.inputLabel}>Khách sạn</Text>
              <CustomPicker
                selectedValue={hotelIdInput || ''}
                onValueChange={(v) => setHotelIdInput((v as string) || null)}
                items={(hotels || []).map(h => ({ label: h.name, value: h._id } as PickerItem))}
                placeholder="Chọn khách sạn"
              />
              <Text style={styles.inputLabel}>Phòng</Text>
              <CustomPicker
                selectedValue={roomIdInput || ''}
                onValueChange={(v) => setRoomIdInput((v as string) || null)}
                items={(rooms || []).map(r => ({ label: `Phòng ${r.roomNumber}`, value: r._id } as PickerItem))}
                placeholder="Chọn phòng (tuỳ chọn)"
                disabled={!hotelIdInput || rooms.length === 0}
              />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.footerButton, styles.cancelButton]}
                onPress={() => setAddModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.footerButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerButton, styles.primaryButton, saving && styles.disabledButton]}
                onPress={submitAddDevice}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.footerButtonText, styles.primaryButtonText]}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#666' },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSide: { width: 48, height: 24, justifyContent: 'center' },
  backButton: { paddingHorizontal: 8, paddingVertical: 4 },
  backButtonText: { fontSize: 18, color: '#1890ff' },
  titleCentered: { fontSize: 20, fontWeight: 'bold', color: '#333', textAlign: 'center', flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 24,
    overflow: 'hidden',
  },
  toggleOption: { paddingHorizontal: 12, paddingVertical: 6 },
  toggleOptionActive: { backgroundColor: '#e6f2ff', borderColor: '#cfe3ff' },
  toggleText: { color: '#666', fontWeight: '600', fontSize: 12 },
  toggleTextActive: { color: '#1890ff' },
  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },
  refreshText: { color: '#1890ff', fontWeight: '600' },
  errorBox: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff1f0',
    borderWidth: 1,
    borderColor: '#ffa39e',
  },
  errorText: { color: '#cf1322', fontSize: 13 },
  listContent: { padding: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 36, marginBottom: 8, color: '#1890ff' },
  emptyText: { fontSize: 14, color: '#666' },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1890ff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 24, fontWeight: '700', lineHeight: 24 },
  roomSection: { marginBottom: 16 },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#1890ff',
  },
  roomTitle: { fontSize: 18, fontWeight: '600', color: '#1890ff' },
  roomControls: { flexDirection: 'row', gap: 8 },
  roomCtrlBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
  },
  roomCtrlBtnDisabled: { opacity: 0.6 },
  roomCtrlText: { color: '#333', fontWeight: '600', fontSize: 12 },
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deviceName: { fontSize: 16, fontWeight: '600', color: '#333' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, marginLeft: 4 },
  switchBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  switchText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  cardBody: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 13, color: '#666' },
  value: { fontSize: 13, fontWeight: '600', color: '#333' },
  cardFooter: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0', flexDirection: 'row', justifyContent: 'flex-end' },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#1890ff', borderRadius: 8 },
  actionBtnDisabled: { backgroundColor: '#d9d9d9' },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 540,
    overflow: 'hidden',
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  closeButton: { fontSize: 18, color: '#999' },
  modalBody: { padding: 16, maxHeight: 420 },
  inputLabel: { fontSize: 13, color: '#666', marginTop: 8, marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    color: '#333',
    height: 44,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  footerButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 96,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },
  primaryButton: { backgroundColor: '#1890ff' },
  disabledButton: { backgroundColor: '#a0c8ff' },
  footerButtonText: { fontSize: 14, fontWeight: '600' },
  primaryButtonText: { color: '#fff' },
});
