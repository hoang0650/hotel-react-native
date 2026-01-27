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
  FlatList,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/contexts/TranslationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useHotel } from '@/contexts/HotelContext';
import { roomsService } from '@/services/rooms.service';
import { hotelsService } from '@/services/hotels.service';
import { Room, Hotel, RoomStatus } from '@/types';
import CustomPicker, { PickerItem } from '@/components/ui/CustomPicker';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { apiService } from '@/services/api';
import { getExchangeRate, roundAmount } from '@/utils/formatCurrency';

const ROOM_STATUS_OPTIONS: { label: string; value: RoomStatus }[] = [
  { label: 'Trống', value: 'vacant' },
  { label: 'Đã thuê', value: 'occupied' },
  { label: 'Đang dọn', value: 'cleaning' },
  { label: 'Bẩn', value: 'dirty' },
  { label: 'Bảo trì', value: 'maintenance' },
];

const TIMEZONE_OPTIONS: PickerItem[] = [
  { label: 'UTC+7 (Việt Nam)', value: 'UTC+7' },
  { label: 'UTC+8', value: 'UTC+8' },
  { label: 'UTC+9', value: 'UTC+9' },
  { label: 'UTC+0', value: 'UTC+0' },
  { label: 'UTC-5', value: 'UTC-5' },
  { label: 'UTC-8', value: 'UTC-8' },
];

interface RoomFormData {
  hotelId: string;
  roomNumber: string;
  floor: string;
  type: string;
  status: RoomStatus;
  capacity: {
    adults: number;
    children: number;
  };
  amenities: string[];
  images: string[];
  pricing: {
    hourly: number;
    daily: number;
    nightly: number;
    weekly: number;
    monthly: number;
    currency: string;
  };
  firstHourRate: number | null;
  additionalHourRate: number | null;
  priceConfigId: string | null;
  priceSettings: {
    nightlyStartTime: string;
    nightlyEndTime: string;
    dailyStartTime: string;
    dailyEndTime: string;
    autoNightlyHours: number;
    autoDailyHours: number;
    gracePeriodMinutes: number;
    timezone: string;
    dailyEarlyCheckinSurcharge: number;
    dailyLateCheckoutFee: number;
    nightlyEarlyCheckinSurcharge: number;
    nightlyLateCheckoutSurcharge: number;
  };
  description: string;
  notes: string;
}

export default function RoomManagementScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { selectedHotelId, setSelectedHotelId } = useHotel();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [floors, setFloors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [pageIndex, setPageIndex] = useState(1);
  const pageSize = 10;

  const [formData, setFormData] = useState<RoomFormData>({
    hotelId: selectedHotelId || '',
    roomNumber: '',
    floor: '1',
    type: '',
    status: 'vacant',
    capacity: { adults: 2, children: 0 },
    amenities: [],
    images: [],
    pricing: {
      hourly: 0,
      daily: 0,
      nightly: 0,
      weekly: 0,
      monthly: 0,
      currency: 'VND',
    },
    firstHourRate: null,
    additionalHourRate: null,
    priceConfigId: null,
    priceSettings: {
      nightlyStartTime: '22:00',
      nightlyEndTime: '12:00',
      dailyStartTime: '06:00',
      dailyEndTime: '22:00',
      autoNightlyHours: 8,
      autoDailyHours: 24,
      gracePeriodMinutes: 15,
      timezone: 'UTC+7',
      dailyEarlyCheckinSurcharge: 0,
      dailyLateCheckoutFee: 0,
      nightlyEarlyCheckinSurcharge: 0,
      nightlyLateCheckoutSurcharge: 0,
    },
    description: '',
    notes: '',
  });

  const [hasPriceConfig, setHasPriceConfig] = useState(false);
  // Removed income/expense modal states
  const [selectedCurrency, setSelectedCurrency] = useState<string>('VND');
  const [exchangeRateToUSD, setExchangeRateToUSD] = useState<number>(1);
  const [maxRooms, setMaxRooms] = useState<number | null>(null);

  // Phân quyền
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isBusiness = user?.role === 'business';
  const isHotelManager = user?.role === 'hotel';
  const canCreateRoom = isAdmin || isHotelManager;
  const canEditRoom = isAdmin || isHotelManager;

  const canManage = (roomId?: string): boolean => {
    if (!roomId || !user) return false;
    if (isAdmin) return true;
    if (isBusiness) return false;
    if (isHotelManager) {
      const room = rooms.find((r) => r._id === roomId);
      return !!room && room.hotelId === user.hotelId;
    }
    return false;
  };

  // Phân trang
  const paginatedRooms = useMemo(() => {
    const startIndex = (pageIndex - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return rooms.slice(startIndex, endIndex);
  }, [rooms, pageIndex]);

  const totalPages = Math.ceil(rooms.length / pageSize);

  useEffect(() => {
    loadHotels();
  }, []);

  useEffect(() => {
    if (selectedHotelId) {
      loadRooms(selectedHotelId);
      loadFloors(selectedHotelId);
    }
  }, [selectedHotelId]);

  useEffect(() => {
    if (formData.priceConfigId && formData.priceConfigId !== '') {
      setHasPriceConfig(true);
    } else {
      setHasPriceConfig(false);
    }
  }, [formData.priceConfigId]);
  useEffect(() => {
    setSelectedCurrency(String(formData.pricing.currency || 'VND').toUpperCase());
  }, [formData.pricing.currency]);
  useEffect(() => {
    let mounted = true;
    const updateRate = async () => {
      try {
        if (!selectedCurrency || selectedCurrency === 'USD') {
          if (mounted) setExchangeRateToUSD(1);
          return;
        }
        const rate = await getExchangeRate(selectedCurrency, 'USD');
        if (mounted) setExchangeRateToUSD(rate || 1);
      } catch {
        if (mounted) setExchangeRateToUSD(1);
      }
    };
    updateRate();
    return () => {
      mounted = false;
    };
  }, [selectedCurrency]);
  useEffect(() => {
    const fetchPackage = async () => {
      try {
        if (user?._id) {
          const data: any = await apiService.get(`/pricing-packages/user/${user._id}`, undefined, true);
          const m = data?.maxRooms ?? null;
          setMaxRooms(typeof m === 'number' ? m : (m === 0 ? 0 : null));
        }
      } catch {
        setMaxRooms(null);
      }
    };
    fetchPackage();
  }, [user]);

  const loadHotels = async () => {
    try {
      const data = await hotelsService.getHotels();
      let filteredHotels: Hotel[] = [];

      if (isAdmin) {
        filteredHotels = data;
      } else if (isBusiness && user?.businessId) {
        const userBusinessId = typeof user.businessId === 'string' 
          ? user.businessId 
          : (user.businessId as any)?._id || user.businessId;
        filteredHotels = data.filter((hotel) => {
          const hotelBusinessId = typeof hotel.businessId === 'string'
            ? hotel.businessId
            : (hotel.businessId as any)?._id || hotel.businessId;
          return hotelBusinessId && userBusinessId && hotelBusinessId.toString() === userBusinessId.toString();
        });
      } else if (isHotelManager && user?.hotelId) {
        filteredHotels = data.filter((hotel) => hotel._id === user.hotelId);
      }

      setHotels(filteredHotels);

      // Auto-select hotel nếu chỉ có 1
      if (filteredHotels.length === 1 && !selectedHotelId) {
        await setSelectedHotelId(filteredHotels[0]._id!);
      } else if (filteredHotels.length > 0 && !selectedHotelId) {
        await setSelectedHotelId(filteredHotels[0]._id!);
      }
    } catch (error: any) {
      console.error('Lỗi khi tải danh sách khách sạn:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách khách sạn');
    }
  };

  const loadRooms = async (hotelId: string) => {
    try {
      setLoading(true);
      const data = await roomsService.getRooms({ hotelId });
      setRooms(data);
      setPageIndex(1);
    } catch (error: any) {
      console.error('Lỗi khi tải danh sách phòng:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách phòng');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadFloors = async (hotelId: string) => {
    try {
      const data = await roomsService.getHotelFloors(hotelId);
      setFloors(data.floors.map((f) => String(f)));
    } catch (error) {
      console.error('Lỗi khi tải danh sách tầng:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (selectedHotelId) {
      loadRooms(selectedHotelId);
      loadFloors(selectedHotelId);
    }
  };

  // Removed income/expense modal open handlers

  // Removed submit handlers for income/expense

  const onHotelChange = async (hotelId: string | null) => {
    await setSelectedHotelId(hotelId);
    setFloors([]);
    setRooms([]);
    setPageIndex(1);
    setSelectedFloor(null);
    if (hotelId) {
      loadRooms(hotelId);
      loadFloors(hotelId);
    }
  };

  const filterRoomsByFloor = async (floor: string | null) => {
    setSelectedFloor(floor);
    setPageIndex(1);
    if (!selectedHotelId) {
      Alert.alert('Thông báo', 'Vui lòng chọn khách sạn trước');
      return;
    }
    try {
      if (floor !== null && floor !== '') {
        const data = await roomsService.getRoomsByFloor(selectedHotelId, Number(floor));
        setRooms(data);
      } else {
        loadRooms(selectedHotelId);
      }
    } catch (error: any) {
      console.error('Lỗi khi lọc phòng theo tầng:', error);
      Alert.alert('Lỗi', 'Không thể lọc phòng theo tầng');
    }
  };

  const startEdit = async (id: string) => {
    if (!canManage(id)) {
      Alert.alert('Thông báo', 'Bạn không có quyền chỉnh sửa phòng này');
      return;
    }

    setEditId(id);
    const roomToEdit = rooms.find((r) => r._id === id);
    if (roomToEdit) {
      setSelectedRoom(roomToEdit);
      await setSelectedHotelId(roomToEdit.hotelId);

      try {
        const fullRoom = await roomsService.getRoomById(id, { limit: 1000 });
        setSelectedRoom(fullRoom);

        setFormData({
          hotelId: fullRoom.hotelId,
          roomNumber: fullRoom.roomNumber,
          floor: String(fullRoom.floor) || '1',
          type: fullRoom.type,
          status: fullRoom.status,
          capacity: {
            adults: fullRoom.capacity?.adults || 2,
            children: fullRoom.capacity?.children || 0,
          },
          amenities: fullRoom.amenities || [],
          images: fullRoom.images || [],
          pricing: {
            hourly: fullRoom.pricing?.hourly || fullRoom.firstHourRate || 0,
            daily: fullRoom.pricing?.daily || 0,
            nightly: fullRoom.pricing?.nightly || 0,
            weekly: fullRoom.pricing?.weekly || 0,
            monthly: fullRoom.pricing?.monthly || 0,
            currency: fullRoom.pricing?.currency || 'VND',
          },
          firstHourRate:
            fullRoom.firstHourRate !== undefined && fullRoom.firstHourRate !== null
              ? fullRoom.firstHourRate
              : fullRoom.pricing?.hourly || null,
          additionalHourRate:
            fullRoom.additionalHourRate !== undefined &&
            fullRoom.additionalHourRate !== null &&
            fullRoom.additionalHourRate !== 0
              ? fullRoom.additionalHourRate
              : null,
          priceConfigId: fullRoom.priceConfigId || null,
          priceSettings: {
            nightlyStartTime: fullRoom.priceSettings?.nightlyStartTime || '22:00',
            nightlyEndTime: fullRoom.priceSettings?.nightlyEndTime || '12:00',
            dailyStartTime: fullRoom.priceSettings?.dailyStartTime || '06:00',
            dailyEndTime: fullRoom.priceSettings?.dailyEndTime || '22:00',
            autoNightlyHours: fullRoom.priceSettings?.autoNightlyHours || 8,
            autoDailyHours: fullRoom.priceSettings?.autoDailyHours || 24,
            gracePeriodMinutes: fullRoom.priceSettings?.gracePeriodMinutes || 15,
            timezone: fullRoom.priceSettings?.timezone || 'UTC+7',
            dailyEarlyCheckinSurcharge: fullRoom.priceSettings?.dailyEarlyCheckinSurcharge || 0,
            dailyLateCheckoutFee: fullRoom.priceSettings?.dailyLateCheckoutFee || 0,
            nightlyEarlyCheckinSurcharge: fullRoom.priceSettings?.nightlyEarlyCheckinSurcharge || 0,
            nightlyLateCheckoutSurcharge: fullRoom.priceSettings?.nightlyLateCheckoutSurcharge || 0,
          },
          description: fullRoom.description || '',
          notes: fullRoom.notes || '',
        });

        setFormVisible(true);
      } catch (error: any) {
        console.error('Error loading room details:', error);
        Alert.alert('Lỗi', 'Không thể tải thông tin phòng');
      }
    }
  };

  const stopEdit = () => {
    setEditId(null);
    setSelectedRoom(null);
    setFormVisible(false);
    setFormData({
      hotelId: selectedHotelId || '',
      roomNumber: '',
      floor: '1',
      type: '',
      status: 'vacant',
      capacity: { adults: 2, children: 0 },
      amenities: [],
      images: [],
      pricing: {
        hourly: 0,
        daily: 0,
        nightly: 0,
        weekly: 0,
        monthly: 0,
        currency: 'VND',
      },
      firstHourRate: null,
      additionalHourRate: null,
      priceConfigId: null,
      priceSettings: {
        nightlyStartTime: '22:00',
        nightlyEndTime: '12:00',
        dailyStartTime: '06:00',
        dailyEndTime: '22:00',
        autoNightlyHours: 8,
        autoDailyHours: 24,
        gracePeriodMinutes: 15,
        timezone: 'UTC+7',
        dailyEarlyCheckinSurcharge: 0,
        dailyLateCheckoutFee: 0,
        nightlyEarlyCheckinSurcharge: 0,
        nightlyLateCheckoutSurcharge: 0,
      },
      description: '',
      notes: '',
    });
  };

  const submitForm = async () => {
    // Kiểm tra quyền
    if (editId && editId !== 'new') {
      if (!canEditRoom || !canManage(editId)) {
        Alert.alert('Thông báo', 'Bạn không có quyền cập nhật phòng này');
        return;
      }
    } else {
      if (!canCreateRoom) {
        Alert.alert('Thông báo', 'Bạn không có quyền tạo phòng');
        return;
      }
    }

    // Validation
    if (!formData.hotelId || !formData.roomNumber || !formData.type) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ các trường bắt buộc');
      return;
    }

    const hasPriceConfig = formData.priceConfigId && formData.priceConfigId !== '';

    const roomData: any = {
      hotelId: formData.hotelId,
      roomNumber: String(formData.roomNumber),
      floor: String(formData.floor),
      type: formData.type,
      status: formData.status,
      capacity: {
        adults: Number(formData.capacity.adults),
        children: Number(formData.capacity.children),
      },
      amenities: formData.amenities || [],
      images: formData.images || [],
      priceConfigId: hasPriceConfig ? formData.priceConfigId : null,
      priceSettings: {
        nightlyStartTime: formData.priceSettings.nightlyStartTime || '22:00',
        nightlyEndTime: formData.priceSettings.nightlyEndTime || '12:00',
        dailyStartTime: formData.priceSettings.dailyStartTime || '06:00',
        dailyEndTime: formData.priceSettings.dailyEndTime || '22:00',
        autoNightlyHours: Number(formData.priceSettings.autoNightlyHours) || 8,
        autoDailyHours: Number(formData.priceSettings.autoDailyHours) || 24,
        gracePeriodMinutes: Number(formData.priceSettings.gracePeriodMinutes) || 15,
        timezone: formData.priceSettings.timezone || 'UTC+7',
        dailyEarlyCheckinSurcharge: Number(formData.priceSettings.dailyEarlyCheckinSurcharge) || 0,
        dailyLateCheckoutFee: Number(formData.priceSettings.dailyLateCheckoutFee) || 0,
        nightlyEarlyCheckinSurcharge: Number(formData.priceSettings.nightlyEarlyCheckinSurcharge) || 0,
        nightlyLateCheckoutSurcharge: Number(formData.priceSettings.nightlyLateCheckoutSurcharge) || 0,
      },
      description: formData.description,
      notes: formData.notes,
    };

    if (!hasPriceConfig) {
      roomData.pricing = {
        hourly: Number(formData.pricing.hourly) || 0,
        daily: Number(formData.pricing.daily) || 0,
        nightly: Number(formData.pricing.nightly) || 0,
        weekly: Number(formData.pricing.weekly) || 0,
        monthly: Number(formData.pricing.monthly) || 0,
        currency: formData.pricing.currency || 'VND',
      };

      if (formData.firstHourRate !== null && formData.firstHourRate !== undefined && formData.firstHourRate !== '') {
        roomData.firstHourRate = Number(formData.firstHourRate) || 0;
      }

      if (formData.additionalHourRate !== null && formData.additionalHourRate !== undefined && formData.additionalHourRate !== '') {
        const value = Number(formData.additionalHourRate);
        if (!isNaN(value)) {
          roomData.additionalHourRate = value;
        }
      }
    }

    try {
      if (editId && selectedRoom) {
        const updatedRoom = await roomsService.updateRoom(editId, roomData);
        const index = rooms.findIndex((r) => r._id === editId);
        if (index !== -1) {
          const newRooms = [...rooms];
          newRooms[index] = updatedRoom;
          setRooms(newRooms);
        }
        Alert.alert('Thành công', 'Cập nhật phòng thành công');
        stopEdit();
      } else {
        if (user?.role !== 'superadmin') {
          const max = typeof maxRooms === 'number' ? maxRooms : 0;
          if (max && max > 0) {
            const currentHotelId = selectedHotelId || roomData.hotelId;
            const currentCount = rooms.filter((r) => r.hotelId === currentHotelId).length;
            if (currentCount >= max) {
              Alert.alert('Thông báo', `Gói hiện tại chỉ cho phép tạo tối đa ${max} phòng. Vui lòng nâng cấp gói để tạo thêm phòng.`);
              return;
            }
          }
        }
        const newRoom = await roomsService.createRoom(roomData);
        setRooms([...rooms, newRoom]);
        const totalPages = Math.ceil((rooms.length + 1) / pageSize);
        if (totalPages > 0) {
          setPageIndex(totalPages);
        }
        Alert.alert('Thành công', 'Tạo phòng thành công');
        stopEdit();
        if (selectedHotelId) {
          loadFloors(selectedHotelId);
        }
      }
    } catch (error: any) {
      console.error('Lỗi khi lưu phòng:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể lưu phòng');
    }
  };

  const deleteRoom = async (id: string) => {
    if (!canManage(id)) {
      Alert.alert('Thông báo', 'Bạn không có quyền xóa phòng này');
      return;
    }

    Alert.alert(
      'Xác nhận',
      'Bạn có chắc chắn muốn xóa phòng này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await roomsService.deleteRoom(id);
              setRooms(rooms.filter((r) => r._id !== id));
              const totalPages = Math.ceil((rooms.length - 1) / pageSize);
              if (pageIndex > totalPages && totalPages > 0) {
                setPageIndex(totalPages);
              } else if (totalPages === 0) {
                setPageIndex(1);
              }
              Alert.alert('Thành công', 'Xóa phòng thành công');
              if (editId === id) {
                stopEdit();
              }
            } catch (error: any) {
              console.error('Lỗi khi xóa phòng:', error);
              Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xóa phòng');
            }
          },
        },
      ]
    );
  };

  const getRoomStatusLabel = (status: RoomStatus | undefined): string => {
    if (!status) return 'Không xác định';
    const option = ROOM_STATUS_OPTIONS.find((opt) => opt.value === status);
    return option ? option.label : status;
  };

  const getStatusColor = (status: RoomStatus): string => {
    switch (status) {
      case 'vacant':
        return '#52c41a';
      case 'occupied':
        return '#ff4d4f';
      case 'cleaning':
        return '#1890ff';
      case 'dirty':
        return '#fa8c16';
      case 'maintenance':
        return '#722ed1';
      default:
        return '#d9d9d9';
    }
  };

  const formatCurrency = (amount: number | undefined): string => {
    if (!amount) return '0';
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
  };
  const formatUSD = (amount: number | undefined): string => {
    const value = Number(amount || 0) * (exchangeRateToUSD || 1);
    const rounded = roundAmount(value, 'USD');
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rounded);
  };

  const hotelOptions: PickerItem[] = hotels.map((hotel) => ({
    label: hotel.name,
    value: hotel._id!,
  }));

  const floorOptions: PickerItem[] = floors.map((floor) => ({
    label: `Tầng ${floor}`,
    value: floor,
  }));

  const statusOptions: PickerItem[] = ROOM_STATUS_OPTIONS.map((opt) => ({
    label: opt.label,
    value: opt.value,
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý phòng</Text>
        <View style={styles.headerRight}>
          {canCreateRoom && (
            <TouchableOpacity
              onPress={() => {
                setEditId('new');
                setFormVisible(true);
                setFormData({
                  ...formData,
                  hotelId: selectedHotelId || '',
                });
              }}
              style={styles.addButton}
            >
              <IconSymbol name="plus" size={20} color="#1890ff" />
            </TouchableOpacity>
          )}
        </View>
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
                disabled={hotels.length === 0}
              />
            </View>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Tầng</Text>
              <CustomPicker
                selectedValue={selectedFloor || ''}
                onValueChange={(value) => filterRoomsByFloor(value)}
                items={floorOptions}
                placeholder="Tất cả tầng"
                disabled={!selectedHotelId || floors.length === 0}
              />
            </View>
          </View>
          {/* Actions removed */}
        </View>

        {/* Rooms List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1890ff" />
          </View>
        ) : paginatedRooms.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol name="house.fill" size={64} color="#999" />
            <Text style={styles.emptyText}>Chưa có phòng nào</Text>
          </View>
        ) : (
          <>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Số phòng</Text>
              <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>Tầng</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Loại</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Trạng thái</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>Giá/đêm</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Thao tác</Text>
            </View>
            {paginatedRooms.map((room) => (
              <View key={room._id} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1 }]}>{room.roomNumber}</Text>
                <Text style={[styles.tableCell, { flex: 0.8 }]}>{room.floor}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{room.type}</Text>
                <View style={[styles.tableCell, { flex: 1 }]}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(room.status) + '20' },
                    ]}
                  >
                    <Text
                      style={[styles.statusText, { color: getStatusColor(room.status) }]}
                    >
                      {getRoomStatusLabel(room.status)}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.tableCell, { flex: 1.2 }]}>
                  {formatCurrency(room.pricing?.nightly || room.firstHourRate)}
                </Text>
                <View style={[styles.tableCell, { flex: 1, flexDirection: 'row', gap: 8 }]}>
                  {editId !== room._id && canEditRoom && canManage(room._id) && (
                    <TouchableOpacity
                      onPress={() => startEdit(room._id!)}
                      style={styles.actionButton}
                    >
                      <IconSymbol name="pencil" size={16} color="#1890ff" />
                    </TouchableOpacity>
                  )}
                  {editId !== room._id && canManage(room._id) && (
                    <TouchableOpacity
                      onPress={() => deleteRoom(room._id!)}
                      style={[styles.actionButton, { backgroundColor: '#ff4d4f20' }]}
                    >
                      <IconSymbol name="trash" size={16} color="#ff4d4f" />
                    </TouchableOpacity>
                  )}
                  {editId === room._id && (
                    <TouchableOpacity onPress={stopEdit} style={styles.actionButton}>
                      <IconSymbol name="xmark" size={16} color="#666" />
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

      {/* Removed income/expense modals */}

      {/* Form Modal */}
      <Modal
        visible={formVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={stopEdit}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editId && editId !== 'new' ? 'Cập nhật phòng' : 'Thêm phòng mới'}
            </Text>
            <TouchableOpacity onPress={stopEdit}>
              <IconSymbol name="xmark" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
            {/* Hotel */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Khách sạn <Text style={styles.required}>*</Text>
              </Text>
              <CustomPicker
                selectedValue={formData.hotelId}
                onValueChange={(value) => {
                  setFormData({ ...formData, hotelId: value });
                  onHotelChange(value);
                }}
                items={hotelOptions}
                placeholder="Chọn khách sạn"
                disabled={hotels.length === 0}
              />
            </View>

            {/* Room Number */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Số phòng <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.roomNumber}
                onChangeText={(text) => setFormData({ ...formData, roomNumber: text })}
                placeholder="Nhập số phòng"
              />
            </View>

            {/* Floor */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Tầng <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.floor}
                onChangeText={(text) => setFormData({ ...formData, floor: text })}
                placeholder="Nhập tầng"
                keyboardType="numeric"
              />
              {floors.length > 0 && (
                <Text style={styles.hintText}>
                  Tầng hiện có: {floors.join(', ')}
                </Text>
              )}
            </View>

            {/* Type */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Loại phòng <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.type}
                onChangeText={(text) => setFormData({ ...formData, type: text })}
                placeholder="Nhập loại phòng"
              />
            </View>

            {/* Status */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Trạng thái <Text style={styles.required}>*</Text>
              </Text>
              <CustomPicker
                selectedValue={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value as RoomStatus })
                }
                items={statusOptions}
                placeholder="Chọn trạng thái"
              />
            </View>

            {/* Capacity */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Sức chứa <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.capacityRow}>
                <View style={styles.capacityItem}>
                  <Text style={styles.capacityLabel}>Người lớn</Text>
                  <TextInput
                    style={styles.input}
                    value={String(formData.capacity.adults)}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        capacity: { ...formData.capacity, adults: Number(text) || 0 },
                      })
                    }
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.capacityItem}>
                  <Text style={styles.capacityLabel}>Trẻ em</Text>
                  <TextInput
                    style={styles.input}
                    value={String(formData.capacity.children)}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        capacity: { ...formData.capacity, children: Number(text) || 0 },
                      })
                    }
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Hourly Pricing */}
            <View style={styles.formGroup}>
              <Text style={styles.sectionTitle}>Giá theo giờ</Text>
              <View style={styles.priceRow}>
                <View style={styles.priceItem}>
                  <Text style={styles.formLabel}>Giá giờ đầu</Text>
                  <TextInput
                    style={[styles.input, hasPriceConfig && styles.inputDisabled]}
                    value={formData.firstHourRate !== null ? String(formData.firstHourRate) : ''}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        firstHourRate: text === '' ? null : Number(text) || null,
                      })
                    }
                    placeholder="0"
                    keyboardType="numeric"
                    editable={!hasPriceConfig}
                  />
                </View>
                <View style={styles.priceItem}>
                  <Text style={styles.formLabel}>Giá giờ tiếp theo</Text>
                  <TextInput
                    style={[styles.input, hasPriceConfig && styles.inputDisabled]}
                    value={
                      formData.additionalHourRate !== null
                        ? String(formData.additionalHourRate)
                        : ''
                    }
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        additionalHourRate: text === '' ? null : Number(text) || null,
                      })
                    }
                    placeholder="0"
                    keyboardType="numeric"
                    editable={!hasPriceConfig}
                  />
                </View>
              </View>
            </View>

            {/* Pricing */}
            <View style={styles.formGroup}>
              <Text style={styles.sectionTitle}>
                Giá phòng ({formData.pricing.currency})
                {hasPriceConfig && (
                  <Text style={styles.priceConfigNote}> (Đang dùng Price Config)</Text>
                )}
              </Text>
              <View style={styles.priceRow}>
                <View style={styles.priceItem}>
                  <Text style={styles.formLabel}>Giá theo giờ</Text>
                  <TextInput
                    style={[styles.input, hasPriceConfig && styles.inputDisabled]}
                    value={String(formData.pricing.hourly)}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        pricing: { ...formData.pricing, hourly: Number(text) || 0 },
                      })
                    }
                    keyboardType="numeric"
                    editable={!hasPriceConfig}
                  />
                {exchangeRateToUSD > 0 && (
                  <Text style={styles.hintText}>≈ {formatUSD(formData.pricing.hourly)}</Text>
                )}
                </View>
                <View style={styles.priceItem}>
                  <Text style={styles.formLabel}>
                    Giá theo ngày <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, hasPriceConfig && styles.inputDisabled]}
                    value={String(formData.pricing.daily)}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        pricing: { ...formData.pricing, daily: Number(text) || 0 },
                      })
                    }
                    keyboardType="numeric"
                    editable={!hasPriceConfig}
                  />
                {exchangeRateToUSD > 0 && (
                  <Text style={styles.hintText}>≈ {formatUSD(formData.pricing.daily)}</Text>
                )}
                </View>
              </View>
              <View style={styles.priceRow}>
                <View style={styles.priceItem}>
                  <Text style={styles.formLabel}>
                    Giá qua đêm <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, hasPriceConfig && styles.inputDisabled]}
                    value={String(formData.pricing.nightly)}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        pricing: { ...formData.pricing, nightly: Number(text) || 0 },
                      })
                    }
                    keyboardType="numeric"
                    editable={!hasPriceConfig}
                  />
                {exchangeRateToUSD > 0 && (
                  <Text style={styles.hintText}>≈ {formatUSD(formData.pricing.nightly)}</Text>
                )}
                </View>
                <View style={styles.priceItem}>
                  <Text style={styles.formLabel}>Giá theo tuần</Text>
                  <TextInput
                    style={[styles.input, hasPriceConfig && styles.inputDisabled]}
                    value={String(formData.pricing.weekly)}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        pricing: { ...formData.pricing, weekly: Number(text) || 0 },
                      })
                    }
                    keyboardType="numeric"
                    editable={!hasPriceConfig}
                  />
                {exchangeRateToUSD > 0 && (
                  <Text style={styles.hintText}>≈ {formatUSD(formData.pricing.weekly)}</Text>
                )}
                </View>
              </View>
              <View style={styles.priceRow}>
                <View style={styles.priceItem}>
                  <Text style={styles.formLabel}>Giá theo tháng</Text>
                  <TextInput
                    style={[styles.input, hasPriceConfig && styles.inputDisabled]}
                    value={String(formData.pricing.monthly)}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        pricing: { ...formData.pricing, monthly: Number(text) || 0 },
                      })
                    }
                    keyboardType="numeric"
                    editable={!hasPriceConfig}
                  />
                {exchangeRateToUSD > 0 && (
                  <Text style={styles.hintText}>≈ {formatUSD(formData.pricing.monthly)}</Text>
                )}
                </View>
                <View style={styles.priceItem}>
                  <Text style={styles.formLabel}>Tiền tệ</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.pricing.currency}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        pricing: { ...formData.pricing, currency: text },
                      })
                    }
                    placeholder="VND"
                  />
                </View>
              </View>
            </View>

            {/* Price Config ID */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Price Config ID</Text>
              <TextInput
                style={styles.input}
                value={formData.priceConfigId || ''}
                onChangeText={(text) =>
                  setFormData({ ...formData, priceConfigId: text || null })
                }
                placeholder="Nhập Price Config ID (tùy chọn)"
              />
              <Text style={styles.hintText}>
                <Text style={styles.warningText}>Cảnh báo:</Text> Nếu có Price Config ID, các giá
                phòng trên sẽ bị vô hiệu hóa và hệ thống sẽ tự động lấy giá từ Price Config.
              </Text>
              {hasPriceConfig && (
                <Text style={[styles.hintText, { color: '#1890ff' }]}>
                  Đang sử dụng Price Config. Các giá phòng sẽ được lấy tự động từ Price Config.
                </Text>
              )}
            </View>

            {/* Price Settings */}
            <View style={styles.formGroup}>
              <Text style={styles.sectionTitle}>Cấu hình tính giá</Text>
              <View style={styles.priceRow}>
                <View style={styles.priceItem}>
                  <Text style={styles.formLabel}>Giờ bắt đầu qua đêm</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.priceSettings.nightlyStartTime}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        priceSettings: {
                          ...formData.priceSettings,
                          nightlyStartTime: text,
                        },
                      })
                    }
                    placeholder="22:00"
                  />
                </View>
                <View style={styles.priceItem}>
                  <Text style={styles.formLabel}>Giờ kết thúc qua đêm</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.priceSettings.nightlyEndTime}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        priceSettings: {
                          ...formData.priceSettings,
                          nightlyEndTime: text,
                        },
                      })
                    }
                    placeholder="12:00"
                  />
                </View>
              </View>
              <View style={styles.priceRow}>
                <View style={styles.priceItem}>
                  <Text style={styles.formLabel}>Giờ bắt đầu theo ngày</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.priceSettings.dailyStartTime}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        priceSettings: {
                          ...formData.priceSettings,
                          dailyStartTime: text,
                        },
                      })
                    }
                    placeholder="06:00"
                  />
                </View>
                <View style={styles.priceItem}>
                  <Text style={styles.formLabel}>Giờ kết thúc theo ngày</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.priceSettings.dailyEndTime}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        priceSettings: {
                          ...formData.priceSettings,
                          dailyEndTime: text,
                        },
                      })
                    }
                    placeholder="22:00"
                  />
                </View>
              </View>
              <View style={styles.priceRow}>
                <View style={styles.priceItem}>
                  <Text style={styles.formLabel}>Tự động chuyển qua đêm (giờ)</Text>
                  <TextInput
                    style={styles.input}
                    value={String(formData.priceSettings.autoNightlyHours)}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        priceSettings: {
                          ...formData.priceSettings,
                          autoNightlyHours: Number(text) || 8,
                        },
                      })
                    }
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.priceItem}>
                  <Text style={styles.formLabel}>Tự động chuyển theo ngày (giờ)</Text>
                  <TextInput
                    style={styles.input}
                    value={String(formData.priceSettings.autoDailyHours)}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        priceSettings: {
                          ...formData.priceSettings,
                          autoDailyHours: Number(text) || 24,
                        },
                      })
                    }
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={styles.priceRow}>
                <View style={styles.priceItem}>
                  <Text style={styles.formLabel}>Thời gian miễn phí (phút)</Text>
                  <TextInput
                    style={styles.input}
                    value={String(formData.priceSettings.gracePeriodMinutes)}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        priceSettings: {
                          ...formData.priceSettings,
                          gracePeriodMinutes: Number(text) || 15,
                        },
                      })
                    }
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.priceItem}>
                  <Text style={styles.formLabel}>Múi giờ</Text>
                  <CustomPicker
                    selectedValue={formData.priceSettings.timezone}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        priceSettings: {
                          ...formData.priceSettings,
                          timezone: value,
                        },
                      })
                    }
                    items={TIMEZONE_OPTIONS}
                    placeholder="Chọn múi giờ"
                  />
                </View>
              </View>
            </View>

            {/* Surcharges */}
            <View style={styles.formGroup}>
              <Text style={styles.sectionTitle}>Phụ thu</Text>
              <Text style={styles.subsectionTitle}>Thuê theo ngày</Text>
              <View style={styles.priceRow}>
                <View style={styles.priceItem}>
                  <Text style={styles.formLabel}>Phụ thu check-in sớm</Text>
                  <TextInput
                    style={styles.input}
                    value={String(formData.priceSettings.dailyEarlyCheckinSurcharge)}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        priceSettings: {
                          ...formData.priceSettings,
                          dailyEarlyCheckinSurcharge: Number(text) || 0,
                        },
                      })
                    }
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.priceItem}>
                  <Text style={styles.formLabel}>Phí trả phòng muộn</Text>
                  <TextInput
                    style={styles.input}
                    value={String(formData.priceSettings.dailyLateCheckoutFee)}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        priceSettings: {
                          ...formData.priceSettings,
                          dailyLateCheckoutFee: Number(text) || 0,
                        },
                      })
                    }
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <Text style={styles.subsectionTitle}>Thuê qua đêm</Text>
              <View style={styles.priceRow}>
                <View style={styles.priceItem}>
                  <Text style={styles.formLabel}>Phụ thu check-in sớm</Text>
                  <TextInput
                    style={styles.input}
                    value={String(formData.priceSettings.nightlyEarlyCheckinSurcharge)}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        priceSettings: {
                          ...formData.priceSettings,
                          nightlyEarlyCheckinSurcharge: Number(text) || 0,
                        },
                      })
                    }
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.priceItem}>
                  <Text style={styles.formLabel}>Phụ thu check-out trễ</Text>
                  <TextInput
                    style={styles.input}
                    value={String(formData.priceSettings.nightlyLateCheckoutSurcharge)}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        priceSettings: {
                          ...formData.priceSettings,
                          nightlyLateCheckoutSurcharge: Number(text) || 0,
                        },
                      })
                    }
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Mô tả</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Nhập mô tả phòng"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Notes */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Ghi chú nội bộ</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholder="Nhập ghi chú nội bộ"
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Submit Button */}
            <View style={styles.formActions}>
              <TouchableOpacity style={styles.submitButton} onPress={submitForm}>
                <Text style={styles.submitButtonText}>
                  {editId && editId !== 'new' ? 'Cập nhật' : 'Tạo mới'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={stopEdit}>
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
    alignItems: 'flex-end',
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
  reloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  reloadButtonText: {
    color: '#1890ff',
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 14,
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
    fontSize: 14,
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1890ff20',
    borderRadius: 4,
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 50,
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hintText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    lineHeight: 18,
  },
  warningText: {
    fontWeight: '600',
    color: '#fa8c16',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1890ff',
    marginBottom: 8,
    marginTop: 8,
  },
  priceConfigNote: {
    fontSize: 12,
    color: '#1890ff',
    fontWeight: 'normal',
  },
  capacityRow: {
    flexDirection: 'row',
    gap: 12,
  },
  capacityItem: {
    flex: 1,
  },
  capacityLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  priceItem: {
    flex: 1,
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
 
});
