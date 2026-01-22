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
import { guestsService } from '@/services/guests.service';
import { hotelsService } from '@/services/hotels.service';
import { roomsService } from '@/services/rooms.service';
import {
  Guest,
  Hotel,
  Room,
  GuestType,
  GuestPersonalInfo,
  GuestContactInfo,
  GuestPreferences,
} from '@/types';
import CustomPicker, { PickerItem } from '@/components/ui/CustomPicker';
import { IconSymbol } from '@/components/ui/icon-symbol';
// Date picker: Sử dụng TextInput với format dd/MM/yyyy
// Có thể cài đặt @react-native-community/datetimepicker hoặc expo-date-picker để có date picker tốt hơn

const GUEST_TYPE_OPTIONS: PickerItem[] = [
  { label: 'Khách lưu', value: 'regular' },
  { label: 'Khách quen', value: 'frequent' },
  { label: 'Khách đoàn', value: 'group' },
];

const GENDER_OPTIONS: PickerItem[] = [
  { label: 'Nam', value: 'male' },
  { label: 'Nữ', value: 'female' },
  { label: 'Khác', value: 'other' },
];

const ID_TYPE_OPTIONS: PickerItem[] = [
  { label: 'CMND/CCCD', value: 'id_card' },
  { label: 'Hộ chiếu', value: 'passport' },
  { label: 'Bằng lái xe', value: 'driver_license' },
];

const RATE_TYPE_OPTIONS: PickerItem[] = [
  { label: 'Theo giờ', value: 'hourly' },
  { label: 'Theo ngày', value: 'daily' },
  { label: 'Qua đêm', value: 'nightly' },
];

interface GuestFormData {
  hotelId: string;
  guestType: GuestType;
  personalInfo: GuestPersonalInfo;
  contactInfo: GuestContactInfo;
  preferences: GuestPreferences;
  notes: string;
  isGroupLeader: boolean;
  groupSize: number;
}

interface BookingFormData {
  roomId: string;
  checkInDate: Date | null;
  checkOutDate: Date | null;
  rateType: 'hourly' | 'daily' | 'nightly';
  advancePayment: number;
  notes: string;
  adults: number;
  children: number;
}

export default function GuestManagementScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { selectedHotelId, setSelectedHotelId } = useHotel();

  const [guests, setGuests] = useState<Guest[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [selectedGuestType, setSelectedGuestType] = useState<GuestType | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [pageIndex, setPageIndex] = useState(1);
  const pageSize = 20;
  const [total, setTotal] = useState(0);

  // Modal states
  const [formVisible, setFormVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const [formData, setFormData] = useState<GuestFormData>({
    hotelId: selectedHotelId || '',
    guestType: 'regular',
    personalInfo: {
      fullName: '',
      dateOfBirth: undefined,
      gender: undefined,
      nationality: '',
      idType: 'id_card',
      idNumber: '',
      idExpiryDate: undefined,
    },
    contactInfo: {
      email: '',
      phone: '',
      alternativePhone: '',
      address: {
        street: '',
        city: '',
        state: '',
        country: '',
        postalCode: '',
      },
    },
    preferences: {
      roomType: '',
      floor: '',
      specialRequests: [],
      dietaryRestrictions: [],
    },
    notes: '',
    isGroupLeader: false,
    groupSize: 1,
  });

  const [bookingFormData, setBookingFormData] = useState<BookingFormData>({
    roomId: '',
    checkInDate: null,
    checkOutDate: null,
    rateType: 'hourly',
    advancePayment: 0,
    notes: '',
    adults: 1,
    children: 0,
  });

  // Phân quyền
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isBusiness = user?.role === 'business';
  const isHotelManager = user?.role === 'hotel';
  const isStaff = user?.role === 'staff';
  const canCreateGuest = isAdmin || isBusiness || isHotelManager || isStaff;

  const canManage = (guest: Guest): boolean => {
    if (!user) return false;
    if (isAdmin) return true;

    if (isBusiness) {
      const hotelId =
        typeof guest.hotelId === 'string' ? guest.hotelId : guest.hotelId?._id;
      const hotel = hotels.find((h) => h._id === hotelId);
      if (!hotel) return false;
      const hotelBusinessId =
        typeof hotel.businessId === 'string'
          ? hotel.businessId
          : (hotel.businessId as any)?._id;
      const userBusinessId =
        typeof user.businessId === 'string'
          ? user.businessId
          : (user.businessId as any)?._id;
      return hotelBusinessId && userBusinessId && hotelBusinessId.toString() === userBusinessId.toString();
    }

    if (isHotelManager) {
      const hotelId =
        typeof guest.hotelId === 'string' ? guest.hotelId : guest.hotelId?._id;
      return hotelId === user.hotelId;
    }

    return false;
  };

  const canEdit = (guest: Guest): boolean => {
    if (isStaff) return false;
    return canManage(guest);
  };

  const canDelete = (guest: Guest): boolean => {
    if (isStaff) return false;
    return canManage(guest);
  };

  const canAssign = (guest: Guest): boolean => {
    return canCreateGuest;
  };

  useEffect(() => {
    loadHotels();
  }, []);

  useEffect(() => {
    // Reset page về 1 khi filter thay đổi
    if (selectedHotelId !== null || (isBusiness && !isAdmin)) {
      setPageIndex(1);
    }
  }, [selectedHotelId, selectedGuestType, searchValue]);

  useEffect(() => {
    // Load guests khi pageIndex thay đổi hoặc khi đã có selectedHotelId
    if (selectedHotelId || (isBusiness && !isAdmin)) {
      loadGuests();
      if (selectedHotelId) {
        loadRooms();
      }
    } else {
      // Nếu không có selectedHotelId và không phải business, clear danh sách
      setGuests([]);
      setTotal(0);
    }
  }, [selectedHotelId, selectedGuestType, searchValue, pageIndex]);

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
      } else if ((isHotelManager || isStaff) && user?.hotelId) {
        filteredHotels = data.filter(
          (h) => h._id === user.hotelId && h.status === 'active'
        );
      }

      setHotels(filteredHotels);

      if ((isHotelManager || isStaff) && user?.hotelId && filteredHotels.length > 0) {
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

  const loadGuests = async () => {
    try {
      setLoading(true);
      const query: any = {
        page: pageIndex,
        limit: pageSize,
      };

      // Chỉ thêm hotelId nếu có selectedHotelId
      // Nếu là business và không có selectedHotelId, không filter theo hotel (lấy tất cả khách của business)
      if (selectedHotelId) {
        query.hotelId = selectedHotelId;
      }

      if (searchValue && searchValue.trim()) {
        query.search = searchValue.trim();
      }

      if (selectedGuestType) {
        query.guestType = selectedGuestType;
      }

      console.log('Loading guests with query:', query);
      const response = await guestsService.getGuests(query);
      console.log('Guests response:', response);
      setGuests(response.guests || []);
      setTotal(response.total || 0);
    } catch (error: any) {
      console.error('Error fetching guests:', error);
      console.error('Error details:', error.response || error.message);
      Alert.alert('Lỗi', error.response?.data?.message || error.message || 'Không thể tải danh sách khách');
      setGuests([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadRooms = async () => {
    if (!selectedHotelId) {
      setRooms([]);
      return;
    }

    try {
      const data = await roomsService.getRooms({ hotelId: selectedHotelId });
      setRooms(data.filter((room) => room.status === 'vacant'));
    } catch (error: any) {
      console.error('Error fetching rooms:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadGuests();
    if (selectedHotelId) {
      loadRooms();
    }
  };

  const onHotelChange = async (hotelId: string | null) => {
    await setSelectedHotelId(hotelId);
    setPageIndex(1);
    if (hotelId) {
      loadRooms();
    }
  };

  const onGuestTypeChange = (guestType: GuestType | null) => {
    // PageIndex sẽ được reset trong useEffect khi selectedGuestType thay đổi
    setSelectedGuestType(guestType);
  };

  const onSearch = () => {
    // PageIndex sẽ được reset trong useEffect khi searchValue thay đổi
    // loadGuests sẽ được gọi tự động trong useEffect
  };

  const openCreateModal = () => {
    setEditId(null);
    setSelectedGuest(null);
    setFormData({
      hotelId: selectedHotelId || '',
      guestType: 'regular',
      personalInfo: {
        fullName: '',
        dateOfBirth: undefined,
        gender: undefined,
        nationality: '',
        idType: 'id_card',
        idNumber: '',
        idExpiryDate: undefined,
      },
      contactInfo: {
        email: '',
        phone: '',
        alternativePhone: '',
        address: {
          street: '',
          city: '',
          state: '',
          country: '',
          postalCode: '',
        },
      },
      preferences: {
        roomType: '',
        floor: '',
        specialRequests: [],
        dietaryRestrictions: [],
      },
      notes: '',
      isGroupLeader: false,
      groupSize: 1,
    });
    setFormVisible(true);
  };

  const openEditModal = (guest: Guest) => {
    if (!canEdit(guest)) {
      Alert.alert('Thông báo', 'Bạn không có quyền chỉnh sửa khách này');
      return;
    }

    setEditId(guest._id!);
    setSelectedGuest(guest);

    const hotelId =
      typeof guest.hotelId === 'string' ? guest.hotelId : guest.hotelId?._id;

    const fullName =
      guest.personalInfo?.fullName ||
      (guest.personalInfo?.firstName && guest.personalInfo?.lastName
        ? `${guest.personalInfo.firstName} ${guest.personalInfo.lastName}`.trim()
        : guest.personalInfo?.firstName || guest.personalInfo?.lastName || '');

    setFormData({
      hotelId: hotelId || selectedHotelId || '',
      guestType: guest.guestType || 'regular',
      personalInfo: {
        fullName: fullName,
        dateOfBirth: guest.personalInfo?.dateOfBirth
          ? new Date(guest.personalInfo.dateOfBirth)
          : undefined,
        gender: guest.personalInfo?.gender,
        nationality: guest.personalInfo?.nationality || '',
        idType: guest.personalInfo?.idType || 'id_card',
        idNumber: guest.personalInfo?.idNumber || '',
        idExpiryDate: guest.personalInfo?.idExpiryDate
          ? new Date(guest.personalInfo.idExpiryDate)
          : undefined,
      },
      contactInfo: {
        email: guest.contactInfo?.email || '',
        phone: guest.contactInfo?.phone || '',
        alternativePhone: guest.contactInfo?.alternativePhone || '',
        address: {
          street: guest.contactInfo?.address?.street || '',
          city: guest.contactInfo?.address?.city || '',
          state: guest.contactInfo?.address?.state || '',
          country: guest.contactInfo?.address?.country || '',
          postalCode: guest.contactInfo?.address?.postalCode || '',
        },
      },
      preferences: {
        roomType: guest.preferences?.roomType || '',
        floor: guest.preferences?.floor || '',
        specialRequests: guest.preferences?.specialRequests || [],
        dietaryRestrictions: guest.preferences?.dietaryRestrictions || [],
      },
      notes: guest.notes || '',
      isGroupLeader: guest.isGroupLeader || false,
      groupSize: guest.groupSize || 1,
    });

    setFormVisible(true);
  };

  const handleCancel = () => {
    setFormVisible(false);
    setEditId(null);
    setSelectedGuest(null);
  };

  const handleOk = async () => {
    if (!formData.hotelId || !formData.personalInfo.fullName) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ các trường bắt buộc');
      return;
    }

    if (formData.contactInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactInfo.email)) {
      Alert.alert('Lỗi', 'Email không hợp lệ');
      return;
    }

    try {
      setLoading(true);
      const guestData: Partial<Guest> = {
        hotelId: formData.hotelId,
        guestType: formData.guestType || 'regular',
        personalInfo: {
          fullName: formData.personalInfo.fullName || '',
          dateOfBirth: formData.personalInfo.dateOfBirth,
          gender: formData.personalInfo.gender,
          nationality: formData.personalInfo.nationality || '',
          idType: formData.personalInfo.idType || 'id_card',
          idNumber: formData.personalInfo.idNumber || '',
          idExpiryDate: formData.personalInfo.idExpiryDate,
        },
        contactInfo: {
          email: formData.contactInfo.email || '',
          phone: formData.contactInfo.phone || '',
          alternativePhone: formData.contactInfo.alternativePhone || '',
          address: formData.contactInfo.address || {},
        },
        preferences: formData.preferences || {},
        notes: formData.notes || '',
      };

      if (formData.guestType === 'group') {
        guestData.isGroupLeader = true;
        guestData.groupSize = formData.groupSize || 1;
      }

      if (editId) {
        await guestsService.updateGuest(editId, guestData);
        Alert.alert('Thành công', 'Cập nhật khách thành công');
      } else {
        await guestsService.createGuest(guestData);
        Alert.alert('Thành công', 'Tạo khách thành công');
      }

      handleCancel();
      loadGuests();
    } catch (error: any) {
      console.error('Error saving guest:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể lưu khách');
    } finally {
      setLoading(false);
    }
  };

  const deleteGuest = async (guest: Guest) => {
    if (!canDelete(guest)) {
      Alert.alert('Thông báo', 'Bạn không có quyền xóa khách này');
      return;
    }

    Alert.alert(
      'Xác nhận',
      `Bạn có chắc chắn muốn xóa khách ${getGuestName(guest)}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await guestsService.deleteGuest(guest._id!);
              Alert.alert('Thành công', 'Xóa khách thành công');
              loadGuests();
            } catch (error: any) {
              console.error('Error deleting guest:', error);
              Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xóa khách');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const openAssignModal = (guest: Guest) => {
    if (!canAssign(guest)) {
      Alert.alert('Thông báo', 'Bạn không có quyền gán phòng cho khách này');
      return;
    }

    setSelectedGuest(guest);
    setSelectedRoomId(null);
    loadRooms();
    setAssignModalVisible(true);
  };

  const handleAssignCancel = () => {
    setAssignModalVisible(false);
    setSelectedGuest(null);
    setSelectedRoomId(null);
  };

  const handleAssignOk = async () => {
    if (!selectedGuest || !selectedRoomId) {
      Alert.alert('Lỗi', 'Vui lòng chọn phòng');
      return;
    }

    try {
      setLoading(true);
      const guestInfo = {
        name: getGuestName(selectedGuest),
        phone: selectedGuest.contactInfo?.phone || '',
        email: selectedGuest.contactInfo?.email || '',
        idNumber: selectedGuest.personalInfo?.idNumber || '',
        address:
          selectedGuest.contactInfo?.address?.street ||
          (selectedGuest.contactInfo?.address
            ? `${selectedGuest.contactInfo.address.street || ''}, ${selectedGuest.contactInfo.address.city || ''}, ${selectedGuest.contactInfo.address.state || ''}`.replace(
                /^,\s*|,\s*$/g,
                ''
              )
            : ''),
        guestSource: 'walkin',
      };

      await roomsService.checkInRoom(selectedRoomId, {
        status: 'occupied',
        events: [
          {
            type: 'checkin',
            checkinTime: new Date(),
            guestInfo: guestInfo,
            rateType: 'hourly',
          },
        ],
      });

      Alert.alert('Thành công', `Đã gán khách ${getGuestName(selectedGuest)} vào phòng`);
      handleAssignCancel();
      loadRooms();
    } catch (error: any) {
      console.error('Error assigning guest to room:', error);
      const errorMessage =
        error.response?.data?.message || error.response?.data?.error || 'Không thể gán phòng';
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const openBookingModal = (guest: Guest) => {
    if (!canAssign(guest)) {
      Alert.alert('Thông báo', 'Bạn không có quyền đặt phòng cho khách này');
      return;
    }

    setSelectedGuest(guest);
    loadRooms();
    setBookingFormData({
      roomId: '',
      checkInDate: null,
      checkOutDate: null,
      rateType: 'hourly',
      advancePayment: 0,
      notes: '',
      adults: guest.guestType === 'group' ? guest.groupSize || 1 : 1,
      children: 0,
    });
    setBookingModalVisible(true);
  };

  const handleBookingCancel = () => {
    setBookingModalVisible(false);
    setSelectedGuest(null);
    setBookingFormData({
      roomId: '',
      checkInDate: null,
      checkOutDate: null,
      rateType: 'hourly',
      advancePayment: 0,
      notes: '',
      adults: 1,
      children: 0,
    });
  };

  const handleBookingOk = async () => {
    if (!selectedGuest) {
      Alert.alert('Lỗi', 'Không tìm thấy khách');
      return;
    }

    if (!bookingFormData.roomId || !bookingFormData.checkInDate) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      setLoading(true);
      await guestsService.createBookingForGuest(selectedGuest._id!, {
        roomId: bookingFormData.roomId,
        checkInDate: bookingFormData.checkInDate!,
        checkOutDate: bookingFormData.checkOutDate || undefined,
        rateType: bookingFormData.rateType,
        advancePayment: bookingFormData.advancePayment || 0,
        notes: bookingFormData.notes || '',
        adults: bookingFormData.adults || 1,
        children: bookingFormData.children || 0,
      });

      Alert.alert('Thành công', 'Đặt phòng thành công');
      handleBookingCancel();
    } catch (error: any) {
      console.error('Error creating booking:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể đặt phòng');
    } finally {
      setLoading(false);
    }
  };

  const getGuestName = (guest: Guest): string => {
    if (guest.personalInfo?.fullName) {
      return guest.personalInfo.fullName;
    }
    if (guest.personalInfo?.firstName && guest.personalInfo?.lastName) {
      return `${guest.personalInfo.firstName} ${guest.personalInfo.lastName}`;
    }
    return 'Không có tên';
  };

  const getGuestTypeLabel = (guestType?: GuestType): string => {
    switch (guestType) {
      case 'regular':
        return 'Khách lưu';
      case 'frequent':
        return 'Khách quen';
      case 'group':
        return 'Khách đoàn';
      default:
        return 'Khách lưu';
    }
  };

  const getGenderLabel = (gender?: string): string => {
    switch (gender) {
      case 'male':
        return 'Nam';
      case 'female':
        return 'Nữ';
      case 'other':
        return 'Khác';
      default:
        return '-';
    }
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

  const getAddress = (guest: Guest): string => {
    const address = guest.contactInfo?.address;
    if (!address) return '-';

    const parts: string[] = [];
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.country) parts.push(address.country);

    return parts.length > 0 ? parts.join(', ') : '-';
  };

  const getHotelName = (guest: Guest): string => {
    if (typeof guest.hotelId === 'object' && guest.hotelId?.name) {
      return guest.hotelId.name;
    }
    const hotel = hotels.find(
      (h) => h._id === (typeof guest.hotelId === 'string' ? guest.hotelId : guest.hotelId?._id)
    );
    return hotel?.name || 'N/A';
  };

  const totalPages = Math.ceil(total / pageSize);

  const hotelOptions: PickerItem[] = hotels.map((hotel) => ({
    label: hotel.name,
    value: hotel._id!,
  }));

  const roomOptions: PickerItem[] = rooms.map((room) => ({
    label: room.roomNumber,
    value: room._id!,
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý khách hàng</Text>
        <View style={styles.headerRight}>
          {canCreateGuest && (
            <TouchableOpacity onPress={openCreateModal} style={styles.addButton}>
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
                disabled={(isHotelManager || isStaff) && hotels.length > 0}
              />
            </View>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Loại khách</Text>
              <CustomPicker
                selectedValue={selectedGuestType || ''}
                onValueChange={(value) => onGuestTypeChange(value as GuestType | null)}
                items={GUEST_TYPE_OPTIONS}
                placeholder="Tất cả"
              />
            </View>
          </View>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={searchValue}
              onChangeText={setSearchValue}
              placeholder="Tìm kiếm theo tên, số điện thoại, email..."
              onSubmitEditing={onSearch}
            />
            <TouchableOpacity onPress={onSearch} style={styles.searchButton}>
              <IconSymbol name="magnifyingglass" size={20} color="#1890ff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Buttons */}
        {canCreateGuest && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.exportButton} onPress={() => Alert.alert('Thông báo', 'Tính năng xuất Excel đang được phát triển')}>
              <IconSymbol name="square.and.arrow.up" size={16} color="#52c41a" />
              <Text style={styles.exportButtonText}>Xuất Excel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Guests List */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1890ff" />
          </View>
        ) : guests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol name="person.fill" size={64} color="#999" />
            <Text style={styles.emptyText}>Chưa có khách nào</Text>
          </View>
        ) : (
          <>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Tên khách</Text>
              <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>Giới tính</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Loại</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>CCCD</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>Ngày sinh</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>SĐT</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Email</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Thao tác</Text>
            </View>
            {guests.map((guest) => (
              <View key={guest._id} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1.5 }]} numberOfLines={1}>
                  {getGuestName(guest)}
                </Text>
                <Text style={[styles.tableCell, { flex: 0.8 }]}>
                  {getGenderLabel(guest.personalInfo?.gender)}
                </Text>
                <View style={[styles.tableCell, { flex: 1 }]}>
                  <View
                    style={[
                      styles.typeBadge,
                      {
                        backgroundColor:
                          guest.guestType === 'frequent' ? '#1890ff20' : '#f0f0f0',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        {
                          color: guest.guestType === 'frequent' ? '#1890ff' : '#666',
                        },
                      ]}
                    >
                      {getGuestTypeLabel(guest.guestType)}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.tableCell, { flex: 1.2 }]} numberOfLines={1}>
                  {guest.personalInfo?.idNumber || '-'}
                </Text>
                <Text style={[styles.tableCell, { flex: 1.2 }]} numberOfLines={1}>
                  {formatDate(guest.personalInfo?.dateOfBirth)}
                </Text>
                <Text style={[styles.tableCell, { flex: 1.2 }]} numberOfLines={1}>
                  {guest.contactInfo?.phone || '-'}
                </Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]} numberOfLines={1}>
                  {guest.contactInfo?.email || '-'}
                </Text>
                <View style={[styles.tableCell, { flex: 1, flexDirection: 'row', gap: 4 }]}>
                  {canEdit(guest) && (
                    <TouchableOpacity
                      onPress={() => openEditModal(guest)}
                      style={styles.actionButton}
                    >
                      <IconSymbol name="pencil" size={14} color="#1890ff" />
                    </TouchableOpacity>
                  )}
                  {canAssign(guest) && (
                    <>
                      <TouchableOpacity
                        onPress={() => openBookingModal(guest)}
                        style={styles.actionButton}
                      >
                        <IconSymbol name="calendar" size={14} color="#52c41a" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => openAssignModal(guest)}
                        style={styles.actionButton}
                      >
                        <IconSymbol name="house.fill" size={14} color="#fa8c16" />
                      </TouchableOpacity>
                    </>
                  )}
                  {canDelete(guest) && (
                    <TouchableOpacity
                      onPress={() => deleteGuest(guest)}
                      style={[styles.actionButton, { backgroundColor: '#ff4d4f20' }]}
                    >
                      <IconSymbol name="trash" size={14} color="#ff4d4f" />
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

      {/* Form Modal */}
      <Modal
        visible={formVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editId ? 'Cập nhật khách' : 'Thêm khách mới'}
            </Text>
            <TouchableOpacity onPress={handleCancel}>
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
                onValueChange={(value) => setFormData({ ...formData, hotelId: value })}
                items={hotelOptions}
                placeholder="Chọn khách sạn"
                disabled={(isHotelManager || isStaff) && hotels.length > 0}
              />
            </View>

            {/* Guest Type */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Loại khách <Text style={styles.required}>*</Text>
              </Text>
              <CustomPicker
                selectedValue={formData.guestType}
                onValueChange={(value) =>
                  setFormData({ ...formData, guestType: value as GuestType })
                }
                items={GUEST_TYPE_OPTIONS}
                placeholder="Chọn loại khách"
              />
            </View>

            {/* Group Size */}
            {formData.guestType === 'group' && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Số lượng người trong đoàn</Text>
                <TextInput
                  style={styles.input}
                  value={String(formData.groupSize)}
                  onChangeText={(text) =>
                    setFormData({ ...formData, groupSize: Number(text) || 1 })
                  }
                  keyboardType="numeric"
                  placeholder="1"
                />
              </View>
            )}

            {/* Personal Info */}
            <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Họ và tên <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.personalInfo.fullName}
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    personalInfo: { ...formData.personalInfo, fullName: text },
                  })
                }
                placeholder="Nhập họ và tên"
              />
            </View>

            <View style={styles.formRow}>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>Ngày sinh (dd/MM/yyyy)</Text>
                <TextInput
                  style={styles.input}
                  value={
                    formData.personalInfo.dateOfBirth
                      ? formatDate(formData.personalInfo.dateOfBirth)
                      : ''
                  }
                  onChangeText={(text) => {
                    // Parse dd/MM/yyyy format
                    const parts = text.split('/');
                    if (parts.length === 3) {
                      const day = parseInt(parts[0], 10);
                      const month = parseInt(parts[1], 10) - 1;
                      const year = parseInt(parts[2], 10);
                      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                        const date = new Date(year, month, day);
                        if (!isNaN(date.getTime())) {
                          setFormData({
                            ...formData,
                            personalInfo: { ...formData.personalInfo, dateOfBirth: date },
                          });
                        }
                      }
                    }
                  }}
                  placeholder="dd/MM/yyyy"
                />
              </View>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>Giới tính</Text>
                <CustomPicker
                  selectedValue={formData.personalInfo.gender || ''}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      personalInfo: { ...formData.personalInfo, gender: value as any },
                    })
                  }
                  items={GENDER_OPTIONS}
                  placeholder="Chọn giới tính"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>Quốc tịch</Text>
                <TextInput
                  style={styles.input}
                  value={formData.personalInfo.nationality}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      personalInfo: { ...formData.personalInfo, nationality: text },
                    })
                  }
                  placeholder="Nhập quốc tịch"
                />
              </View>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>Loại giấy tờ</Text>
                <CustomPicker
                  selectedValue={formData.personalInfo.idType || 'id_card'}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      personalInfo: { ...formData.personalInfo, idType: value as any },
                    })
                  }
                  items={ID_TYPE_OPTIONS}
                  placeholder="Chọn loại giấy tờ"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>Số CMND/CCCD/Hộ chiếu</Text>
                <TextInput
                  style={styles.input}
                  value={formData.personalInfo.idNumber}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      personalInfo: { ...formData.personalInfo, idNumber: text },
                    })
                  }
                  placeholder="Nhập số giấy tờ"
                />
              </View>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>Ngày hết hạn (dd/MM/yyyy)</Text>
                <TextInput
                  style={styles.input}
                  value={
                    formData.personalInfo.idExpiryDate
                      ? formatDate(formData.personalInfo.idExpiryDate)
                      : ''
                  }
                  onChangeText={(text) => {
                    const parts = text.split('/');
                    if (parts.length === 3) {
                      const day = parseInt(parts[0], 10);
                      const month = parseInt(parts[1], 10) - 1;
                      const year = parseInt(parts[2], 10);
                      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                        const date = new Date(year, month, day);
                        if (!isNaN(date.getTime())) {
                          setFormData({
                            ...formData,
                            personalInfo: { ...formData.personalInfo, idExpiryDate: date },
                          });
                        }
                      }
                    }
                  }}
                  placeholder="dd/MM/yyyy"
                />
              </View>
            </View>

            {/* Contact Info */}
            <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>

            <View style={styles.formRow}>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>Số điện thoại</Text>
                <TextInput
                  style={styles.input}
                  value={formData.contactInfo.phone}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      contactInfo: { ...formData.contactInfo, phone: text },
                    })
                  }
                  placeholder="Nhập số điện thoại"
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>Số điện thoại dự phòng</Text>
                <TextInput
                  style={styles.input}
                  value={formData.contactInfo.alternativePhone}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      contactInfo: { ...formData.contactInfo, alternativePhone: text },
                    })
                  }
                  placeholder="Nhập số điện thoại dự phòng"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={formData.contactInfo.email}
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    contactInfo: { ...formData.contactInfo, email: text },
                  })
                }
                placeholder="Nhập email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Address */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Địa chỉ</Text>
              <TextInput
                style={styles.input}
                value={formData.contactInfo.address.street}
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    contactInfo: {
                      ...formData.contactInfo,
                      address: { ...formData.contactInfo.address, street: text },
                    },
                  })
                }
                placeholder="Số nhà, tên đường"
              />
            </View>

            <View style={styles.formRow}>
              <View style={styles.formGroupThird}>
                <Text style={styles.formLabel}>Thành phố</Text>
                <TextInput
                  style={styles.input}
                  value={formData.contactInfo.address.city}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      contactInfo: {
                        ...formData.contactInfo,
                        address: { ...formData.contactInfo.address, city: text },
                      },
                    })
                  }
                  placeholder="Thành phố"
                />
              </View>
              <View style={styles.formGroupThird}>
                <Text style={styles.formLabel}>Tỉnh/Thành</Text>
                <TextInput
                  style={styles.input}
                  value={formData.contactInfo.address.state}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      contactInfo: {
                        ...formData.contactInfo,
                        address: { ...formData.contactInfo.address, state: text },
                      },
                    })
                  }
                  placeholder="Tỉnh/Thành"
                />
              </View>
              <View style={styles.formGroupThird}>
                <Text style={styles.formLabel}>Quốc gia</Text>
                <TextInput
                  style={styles.input}
                  value={formData.contactInfo.address.country}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      contactInfo: {
                        ...formData.contactInfo,
                        address: { ...formData.contactInfo.address, country: text },
                      },
                    })
                  }
                  placeholder="Quốc gia"
                />
              </View>
            </View>

            {/* Notes */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Ghi chú</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholder="Nhập ghi chú"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Submit Button */}
            <View style={styles.formActions}>
              <TouchableOpacity style={styles.submitButton} onPress={handleOk}>
                <Text style={styles.submitButtonText}>
                  {editId ? 'Cập nhật' : 'Tạo mới'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Assign Room Modal */}
      <Modal
        visible={assignModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleAssignCancel}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Gán khách vào phòng</Text>
            <TouchableOpacity onPress={handleAssignCancel}>
              <IconSymbol name="xmark" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Khách: <Text style={styles.boldText}>{selectedGuest ? getGuestName(selectedGuest) : ''}</Text>
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Chọn phòng <Text style={styles.required}>*</Text>
              </Text>
              <CustomPicker
                selectedValue={selectedRoomId || ''}
                onValueChange={(value) => setSelectedRoomId(value)}
                items={roomOptions}
                placeholder="Chọn phòng"
              />
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.submitButton} onPress={handleAssignOk}>
                <Text style={styles.submitButtonText}>Gán phòng</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={handleAssignCancel}>
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Booking Modal */}
      <Modal
        visible={bookingModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleBookingCancel}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Đặt phòng trước</Text>
            <TouchableOpacity onPress={handleBookingCancel}>
              <IconSymbol name="xmark" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Khách: <Text style={styles.boldText}>{selectedGuest ? getGuestName(selectedGuest) : ''}</Text>
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Chọn phòng <Text style={styles.required}>*</Text>
              </Text>
              <CustomPicker
                selectedValue={bookingFormData.roomId}
                onValueChange={(value) =>
                  setBookingFormData({ ...bookingFormData, roomId: value })
                }
                items={roomOptions}
                placeholder="Chọn phòng"
              />
            </View>

            <View style={styles.formRow}>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>
                  Ngày check-in (dd/MM/yyyy) <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={
                    bookingFormData.checkInDate
                      ? formatDate(bookingFormData.checkInDate)
                      : ''
                  }
                  onChangeText={(text) => {
                    const parts = text.split('/');
                    if (parts.length === 3) {
                      const day = parseInt(parts[0], 10);
                      const month = parseInt(parts[1], 10) - 1;
                      const year = parseInt(parts[2], 10);
                      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                        const date = new Date(year, month, day);
                        if (!isNaN(date.getTime())) {
                          setBookingFormData({ ...bookingFormData, checkInDate: date });
                        }
                      }
                    }
                  }}
                  placeholder="dd/MM/yyyy"
                />
              </View>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>Ngày check-out (dd/MM/yyyy)</Text>
                <TextInput
                  style={styles.input}
                  value={
                    bookingFormData.checkOutDate
                      ? formatDate(bookingFormData.checkOutDate)
                      : ''
                  }
                  onChangeText={(text) => {
                    const parts = text.split('/');
                    if (parts.length === 3) {
                      const day = parseInt(parts[0], 10);
                      const month = parseInt(parts[1], 10) - 1;
                      const year = parseInt(parts[2], 10);
                      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                        const date = new Date(year, month, day);
                        if (!isNaN(date.getTime())) {
                          setBookingFormData({ ...bookingFormData, checkOutDate: date });
                        }
                      }
                    }
                  }}
                  placeholder="dd/MM/yyyy"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>
                  Loại giá <Text style={styles.required}>*</Text>
                </Text>
                <CustomPicker
                  selectedValue={bookingFormData.rateType}
                  onValueChange={(value) =>
                    setBookingFormData({
                      ...bookingFormData,
                      rateType: value as 'hourly' | 'daily' | 'nightly',
                    })
                  }
                  items={RATE_TYPE_OPTIONS}
                  placeholder="Chọn loại giá"
                />
              </View>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>Tiền cọc</Text>
                <TextInput
                  style={styles.input}
                  value={String(bookingFormData.advancePayment)}
                  onChangeText={(text) =>
                    setBookingFormData({
                      ...bookingFormData,
                      advancePayment: Number(text) || 0,
                    })
                  }
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>Người lớn</Text>
                <TextInput
                  style={styles.input}
                  value={String(bookingFormData.adults)}
                  onChangeText={(text) =>
                    setBookingFormData({
                      ...bookingFormData,
                      adults: Number(text) || 1,
                    })
                  }
                  keyboardType="numeric"
                  placeholder="1"
                />
              </View>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>Trẻ em</Text>
                <TextInput
                  style={styles.input}
                  value={String(bookingFormData.children)}
                  onChangeText={(text) =>
                    setBookingFormData({
                      ...bookingFormData,
                      children: Number(text) || 0,
                    })
                  }
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Ghi chú</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bookingFormData.notes}
                onChangeText={(text) =>
                  setBookingFormData({ ...bookingFormData, notes: text })
                }
                placeholder="Nhập ghi chú"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.submitButton} onPress={handleBookingOk}>
                <Text style={styles.submitButtonText}>Đặt phòng</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={handleBookingCancel}>
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Date Picker - Cần cài đặt @react-native-community/datetimepicker hoặc sử dụng expo-date-picker */}
      {/* Tạm thời sử dụng TextInput với keyboardType="numeric" và format dd/MM/yyyy */}
      {/* Hoặc có thể tạo một custom date picker modal */}
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
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  searchButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1890ff20',
    borderRadius: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#52c41a20',
    borderRadius: 8,
  },
  exportButtonText: {
    color: '#52c41a',
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
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionButton: {
    width: 28,
    height: 28,
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
  formGroupHalf: {
    flex: 1,
    marginRight: 8,
  },
  formGroupThird: {
    flex: 1,
    marginRight: 8,
  },
  formRow: {
    flexDirection: 'row',
    gap: 8,
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
  boldText: {
    fontWeight: 'bold',
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
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
