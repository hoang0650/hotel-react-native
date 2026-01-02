import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  Dimensions,
  ScrollView,
  TextInput,
  Switch,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useHotel } from '@/contexts/HotelContext';
import { roomsService } from '@/services/rooms.service';
import { Room, Event, RateType } from '@/types';
import RoomCard from '@/components/rooms/RoomCard';
import ViewToggle from '@/components/rooms/ViewToggle';
import StatusPicker from '@/components/rooms/StatusPicker';
import FloorDropdown from '@/components/rooms/FloorDropdown';
import CustomPicker from '@/components/ui/CustomPicker';
import ChatBot from '@/components/ChatBot';
import OCRScanner from '@/components/OCRScanner';

const { width } = Dimensions.get('window');

type FilterType = 'all' | 'vacant' | 'occupied' | 'cleaning' | 'maintenance' | 'guest_out';

export default function RoomsScreen() {
  const { user } = useAuth();
  const { selectedHotelId } = useHotel();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [floors, setFloors] = useState<string[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [isGridView, setIsGridView] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('vacant');
  const [chatBotVisible, setChatBotVisible] = useState(false);
  
  // Check-in modal state
  const [checkInModalVisible, setCheckInModalVisible] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [rateType, setRateType] = useState<RateType>('hourly');
  const [advancePayment, setAdvancePayment] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  
  // Check-out modal state
  const [checkOutModalVisible, setCheckOutModalVisible] = useState(false);
  const [checkoutRoom, setCheckoutRoom] = useState<Room | null>(null);
  const [lastCheckInEvent, setLastCheckInEvent] = useState<Event | null>(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [roomPriceTotal, setRoomPriceTotal] = useState(0);
  const [servicesTotal, setServicesTotal] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [roomPriceDetails, setRoomPriceDetails] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [serviceQuantity, setServiceQuantity] = useState('1');
  const [checkoutGuestName, setCheckoutGuestName] = useState('');
  const [checkoutGuestIdNumber, setCheckoutGuestIdNumber] = useState('');
  const [checkoutGuestPhone, setCheckoutGuestPhone] = useState('');
  const [checkoutGuestEmail, setCheckoutGuestEmail] = useState('');
  const [checkoutGuestAddress, setCheckoutGuestAddress] = useState('');
  const [checkoutGuestSource, setCheckoutGuestSource] = useState('walkin');
  const [checkoutRateType, setCheckoutRateType] = useState<RateType>('hourly');
  const [checkoutAdditionalCharges, setCheckoutAdditionalCharges] = useState('0');
  const [checkoutDiscount, setCheckoutDiscount] = useState('0');
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState('cash');
  const [checkoutAdvancePayment, setCheckoutAdvancePayment] = useState('0');
  const [checkoutCreateDebt, setCheckoutCreateDebt] = useState(false);
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [initialCharges, setInitialCharges] = useState(0);
  const [initialDiscount, setInitialDiscount] = useState(0);
  const [ocrScannerVisible, setOcrScannerVisible] = useState(false);
  const [checkoutOcrScannerVisible, setCheckoutOcrScannerVisible] = useState(false);
  
  // Transfer room modal state
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [transferSourceRoom, setTransferSourceRoom] = useState<Room | null>(null);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [selectedTargetRoomId, setSelectedTargetRoomId] = useState<string>('');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (selectedHotelId) {
      loadFloors();
      loadRooms();
    }
  }, [selectedHotelId, user]);

  const loadFloors = async () => {
    if (!selectedHotelId) return;
    try {
      const data = await roomsService.getHotelFloors(selectedHotelId);
      const floorStrings = data.floors.map((f) => String(f));
      setFloors(floorStrings);
    } catch (error: any) {
      console.error('Error loading floors:', error);
    }
  };

  const filteredRooms = useMemo(() => {
    let result = rooms;

    // Filter by status
    if (selectedFilter !== 'all') {
      result = result.filter((room) => {
        if (selectedFilter === 'vacant') return room.status === 'vacant';
        if (selectedFilter === 'occupied') return room.status === 'occupied';
        if (selectedFilter === 'cleaning')
          return room.status === 'cleaning' || room.status === 'dirty';
        if (selectedFilter === 'maintenance') return room.status === 'maintenance';
        if (selectedFilter === 'guest_out') return room.status === 'guest_out';
        return true;
      });
    }

    // Filter by floor
    if (selectedFloor !== null) {
      result = result.filter((room) => {
        const roomFloor = room.floor ? String(room.floor) : '0';
        return roomFloor === selectedFloor;
      });
    }

    return result;
  }, [rooms, selectedFilter, selectedFloor]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const hotelId = selectedHotelId || user?.hotelId || user?.businessId;
      if (!hotelId) {
        console.warn('No hotelId found. Please select a hotel from Home screen.');
        setRooms([]);
        return;
      }

      const roomsData = await roomsService.getRooms({ hotelId });
      setRooms(roomsData);
    } catch (error: any) {
      console.error('Error loading rooms:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách phòng');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFloors();
    loadRooms();
  };

  const handleReload = () => {
    loadFloors();
    loadRooms();
  };

  const handleRoomPress = (room: Room) => {
    // Không làm gì hoặc có thể hiển thị thông tin phòng trong modal
  };

  const handleUpdate = (room: Room) => {
    setSelectedRoom(room);
    setNewStatus(room.status);
    setUpdateModalVisible(true);
  };

  const handleCheckIn = (room: Room) => {
    setSelectedRoom(room);
    resetCheckInForm();
    setCheckInModalVisible(true);
  };

  const handleCheckOut = async (room: Room) => {
    setCheckoutRoom(room);
    resetCheckOutForm();
    setCheckOutModalVisible(true);
    await loadCheckoutData(room);
    await loadServices();
  };

  const handleTransfer = async (room: Room) => {
    if (room.status !== 'occupied') {
      Alert.alert('Lỗi', 'Chỉ có thể đổi phòng khi phòng đang có khách');
      return;
    }
    
    setTransferSourceRoom(room);
    setSelectedTargetRoomId('');
    setTransferNotes('');
    setTransferModalVisible(true);
    
    // Load available rooms (vacant rooms only)
    try {
      const allRooms = await roomsService.getRooms({ hotelId: selectedHotelId });
      const vacantRooms = allRooms.filter(
        (r) => r.status === 'vacant' && r._id !== room._id
      );
      setAvailableRooms(vacantRooms);
    } catch (error) {
      console.error('Error loading available rooms:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách phòng trống');
    }
  };

  const handleTransferSubmit = async () => {
    if (!transferSourceRoom || !selectedTargetRoomId) {
      Alert.alert('Lỗi', 'Vui lòng chọn phòng đích');
      return;
    }

    if (!user?._id) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
      return;
    }

    try {
      setTransferring(true);
      
      await roomsService.transferRoom(
        transferSourceRoom._id!,
        selectedTargetRoomId,
        user._id,
        transferNotes || 'Chuyển phòng'
      );

      // Đóng modal ngay lập tức
      setTransferModalVisible(false);
      setTransferSourceRoom(null);
      setSelectedTargetRoomId('');
      setTransferNotes('');
      
      // Reload danh sách phòng
      await loadRooms();
      
      // Hiển thị thông báo thành công
      Alert.alert('Thành công', 'Đổi phòng thành công');
    } catch (error: any) {
      console.error('Error transferring room:', error);
      Alert.alert('Lỗi', error.message || 'Không thể đổi phòng');
    } finally {
      setTransferring(false);
    }
  };

  useEffect(() => {
    if (checkOutModalVisible && lastCheckInEvent && checkoutRoom) {
      calculateCheckoutPrice();
    }
  }, [
    checkoutRateType,
    checkoutAdditionalCharges,
    checkoutDiscount,
    selectedServices,
    checkOutModalVisible,
    lastCheckInEvent,
    checkoutRoom,
    initialCharges,
    initialDiscount,
  ]);

  useEffect(() => {
    const total = selectedServices.reduce((sum, service) => {
      return sum + (service.totalPrice || service.price * (service.quantity || 1));
    }, 0);
    setServicesTotal(total);
  }, [selectedServices]);

  const loadCheckoutData = async (room: Room) => {
    try {
      // Backend getRoomById sẽ lấy events từ RoomEvent collection (không phải từ room.events)
      // và populate vào roomData.events trước khi trả về
      const roomData = await roomsService.getRoomById(room._id!, {
        excludeCheckedOut: true,
        includeOldEvents: true,
      });
      
      // roomData.events đã được populate từ RoomEvent collection bởi backend
      if (!roomData || !roomData.events || roomData.events.length === 0) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin check-in');
        return;
      }

      // Lọc check-in events chưa checkout (từ RoomEvent collection)
      const checkinEvents = roomData.events.filter(
        (e) => e.type === 'checkin' && !e.checkoutTime
      );
      
      if (checkinEvents.length === 0) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin check-in');
        return;
      }

      const lastEvent = checkinEvents[0];
      setLastCheckInEvent(lastEvent);

      const guestInfo = lastEvent.guestInfo || {};
      setCheckoutGuestName(guestInfo.name || 'Khách lẻ');
      setCheckoutGuestIdNumber(guestInfo.idNumber || '');
      setCheckoutGuestPhone(guestInfo.phone || '');
      setCheckoutGuestEmail(guestInfo.email || '');
      setCheckoutGuestAddress(guestInfo.address || '');
      setCheckoutGuestSource(guestInfo.guestSource || 'walkin');
      setCheckoutRateType(lastEvent.rateType || 'hourly');
      setCheckoutAdvancePayment(String(lastEvent.advancePayment || 0));
      setInitialCharges(lastEvent.additionalCharges || 0);
      setInitialDiscount(lastEvent.discount || 0);
      setCheckoutAdditionalCharges('0');
      setCheckoutDiscount('0');
      
      if (lastEvent.selectedServices && Array.isArray(lastEvent.selectedServices)) {
        setSelectedServices([...lastEvent.selectedServices]);
      } else {
        setSelectedServices([]);
      }
      
      // Set checkoutRoom để trigger calculateCheckoutPrice
      setCheckoutRoom(room);
      
      console.log('Checkout data loaded:', {
        roomId: room._id,
        roomNumber: room.roomNumber,
        hasLastEvent: !!lastEvent,
        checkinTime: lastEvent.checkinTime,
        rateType: lastEvent.rateType,
        advancePayment: lastEvent.advancePayment,
        additionalCharges: lastEvent.additionalCharges,
        discount: lastEvent.discount,
        servicesCount: lastEvent.selectedServices?.length || 0,
      });
    } catch (error: any) {
      console.error('Error loading checkout data:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin check-in');
    }
  };

  const loadServices = async () => {
    if (!checkoutRoom?.hotelId) {
      setServices([]);
      return;
    }
    try {
      // TODO: Load services from API
      setServices([]);
    } catch (error: any) {
      console.error('Error loading services:', error);
      setServices([]);
    }
  };

  const handleAddService = () => {
    if (!selectedServiceId) {
      Alert.alert('Lỗi', 'Vui lòng chọn dịch vụ');
      return;
    }

    const service = services.find((s) => s.id === selectedServiceId || s._id === selectedServiceId);
    if (!service) {
      Alert.alert('Lỗi', 'Không tìm thấy dịch vụ đã chọn');
      return;
    }

    const quantity = parseInt(serviceQuantity) || 1;
    const serviceId = service.id || service._id;

    const existingIndex = selectedServices.findIndex(
      (s) => (s.serviceId || s.serviceId) === serviceId
    );

    if (existingIndex !== -1) {
      const updatedServices = [...selectedServices];
      updatedServices[existingIndex].quantity += quantity;
      updatedServices[existingIndex].totalPrice =
        updatedServices[existingIndex].price * updatedServices[existingIndex].quantity;
      setSelectedServices(updatedServices);
    } else {
      const newService = {
        serviceId: serviceId,
        serviceName: service.name,
        price: service.price,
        quantity: quantity,
        totalPrice: service.price * quantity,
        orderTime: new Date(),
      };
      setSelectedServices([...selectedServices, newService]);
    }

    setSelectedServiceId('');
    setServiceQuantity('1');
  };

  const handleRemoveService = (index: number) => {
    if (index < 0 || index >= selectedServices.length) return;
    const updatedServices = selectedServices.filter((_, i) => i !== index);
    setSelectedServices(updatedServices);
  };

  const calculateCheckoutPrice = async () => {
    if (!lastCheckInEvent || !checkoutRoom) {
      console.log('calculateCheckoutPrice: Missing lastCheckInEvent or checkoutRoom', {
        hasLastCheckInEvent: !!lastCheckInEvent,
        hasCheckoutRoom: !!checkoutRoom,
      });
      return;
    }

    try {
      setCalculatingPrice(true);
      const checkInTime = new Date(lastCheckInEvent.checkinTime!);
      const checkOutTime = new Date();

      // Validate checkInTime
      if (isNaN(checkInTime.getTime())) {
        console.error('Invalid checkInTime:', lastCheckInEvent.checkinTime);
        Alert.alert('Lỗi', 'Thời gian check-in không hợp lệ');
        return;
      }

      let roomPrice = 0;
      let finalRateType = checkoutRateType;

      // Gọi API để tính giá phòng chính xác theo priceConfig
      try {
        const priceResponse = await roomsService.calculateRoomPrice(
          checkoutRoom._id!,
          checkInTime,
          checkOutTime,
          checkoutRateType
        );
        
        roomPrice = priceResponse.totalPrice || 0;
        finalRateType = priceResponse.rateType || checkoutRateType;

        console.log('Price calculated from API:', {
          roomPrice,
          finalRateType,
          originalRateType: priceResponse.originalRateType,
          priceDetails: priceResponse.priceDetails,
        });
        
        // Lưu chi tiết từ API nếu có
        if (priceResponse.priceDetails) {
          setRoomPriceDetails(priceResponse.priceDetails);
        }
        
        // KHÔNG tự động chuyển rateType khi user chọn hourly - để user xem cách tính
        // Chỉ cập nhật nếu không phải hourly hoặc nếu API trả về rateType khác
        if (checkoutRateType !== 'hourly' && priceResponse.originalRateType && priceResponse.rateType !== priceResponse.originalRateType) {
          setCheckoutRateType(priceResponse.rateType as RateType);
        }
      } catch (apiError: any) {
        console.warn('API calculate price failed, using fallback calculation:', apiError);
        // Fallback: Tính theo logic từ Angular app
        const pricing = checkoutRoom.pricing || {};
        const priceConfig = (checkoutRoom as any)?.priceConfig;
        const durationMs = checkOutTime.getTime() - checkInTime.getTime();
        const durationInMinutes = Math.floor(durationMs / (1000 * 60));
        const durationInHours = Math.floor(durationInMinutes / 60);
        const remainingMinutes = durationInMinutes % 60;
        
        // Lấy giá từ roomData hoặc priceConfig
        const hourlyRate = pricing.hourly || checkoutRoom.firstHourRate || priceConfig?.hourlyRates?.firstHourPrice || 0;
        const dailyRate = pricing.daily || priceConfig?.dailyRates?.standardPrice || 0;
        const nightlyRate = pricing.nightly || priceConfig?.nightlyRates?.standardPrice || 0;
        const firstHourRate = checkoutRoom.firstHourRate || priceConfig?.hourlyRates?.firstHourPrice || hourlyRate;
        const additionalHourRate = checkoutRoom.additionalHourRate || priceConfig?.hourlyRates?.additionalHourPrice || (firstHourRate * 0.8);
        const gracePeriodMinutes = priceConfig?.hourlyRates?.gracePeriodMinutes || 15;
        const maxHoursBeforeDay = priceConfig?.hourlyRates?.maxHoursBeforeDay || 6;
        const autoDailyHours = priceConfig?.nightlyRates?.autoDailyHours || 24;
        
        // Lấy thời gian quy định từ priceConfig hoặc giá trị mặc định
        const nightlyStartTime = priceConfig?.nightlyRates?.startTime || (checkoutRoom as any)?.priceSettings?.nightlyStartTime || '20:00';
        const nightlyEndTime = priceConfig?.nightlyRates?.endTime || (checkoutRoom as any)?.priceSettings?.nightlyEndTime || '12:00';
        const dailyStartTime = '12:00';
        const dailyCheckOutTime = priceConfig?.dailyRates?.checkOutTime || (checkoutRoom as any)?.priceSettings?.dailyEndTime || '12:00';
        const nightlyEarlyCheckinSurcharge = priceConfig?.nightlyRates?.earlyCheckinSurcharge || (checkoutRoom as any)?.priceSettings?.nightlyEarlyCheckinSurcharge || 0;
        const nightlyLateCheckoutSurcharge = priceConfig?.nightlyRates?.lateCheckoutSurcharge || (checkoutRoom as any)?.priceSettings?.nightlyLateCheckoutSurcharge || 0;
        const dailyEarlyCheckinSurcharge = priceConfig?.dailyRates?.earlyCheckinSurcharge || (checkoutRoom as any)?.priceSettings?.dailyEarlyCheckinSurcharge || 0;
        const dailyLateCheckoutFee = priceConfig?.dailyRates?.latecheckOutFee || (checkoutRoom as any)?.priceSettings?.dailyLateCheckoutFee || 0;
        
        // Helper function để parse time string (HH:mm) thành phút
        const parseTimeToMinutes = (timeStr: string): number => {
          const parts = timeStr.split(':');
          const hour = parseInt(parts[0]) || 0;
          const minute = parseInt(parts[1]) || 0;
          return hour * 60 + minute;
        };
        
        // Helper function để tính số giờ sớm/trễ (làm tròn lên)
        const calculateEarlyHours = (actualTime: Date, standardTime: string): number => {
          const actualMinutes = actualTime.getHours() * 60 + actualTime.getMinutes();
          const standardMinutes = parseTimeToMinutes(standardTime);
          if (actualMinutes < standardMinutes) {
            const earlyMinutes = standardMinutes - actualMinutes;
            return Math.ceil(earlyMinutes / 60); // Làm tròn lên
          }
          return 0;
        };
        
        const calculateLateHours = (actualTime: Date, standardTime: string): number => {
          const actualMinutes = actualTime.getHours() * 60 + actualTime.getMinutes();
          const standardMinutes = parseTimeToMinutes(standardTime);
          if (actualMinutes > standardMinutes) {
            const lateMinutes = actualMinutes - standardMinutes;
            return Math.ceil(lateMinutes / 60); // Làm tròn lên
          }
          return 0;
        };
        
        switch (checkoutRateType) {
          case 'hourly':
            // Tính giá giờ đầu
            roomPrice = firstHourRate;
            let billableHours = 0;
            let additionalPrice = 0;
            
            // Tính giá cho các giờ tiếp theo
            if (durationInHours >= 1) {
              billableHours = durationInHours - 1; // Số giờ tính phí (trừ giờ đầu)
              
              // Nếu có thời gian dư sau giờ thứ 2
              if (durationInHours >= 2 && remainingMinutes > gracePeriodMinutes) {
                billableHours += 1;
              } else if (durationInHours === 1 && remainingMinutes > gracePeriodMinutes) {
                billableHours = 1;
              }
              
              if (billableHours > 0) {
                additionalPrice = billableHours * additionalHourRate;
                roomPrice += additionalPrice;
              }
            }
            
            // Lưu chi tiết tính toán
            setRoomPriceDetails({
              rateType: 'hourly',
              firstHourPrice: firstHourRate,
              additionalHoursCount: billableHours,
              additionalHoursPrice: additionalPrice,
              remainingMinutes: remainingMinutes,
              gracePeriodMinutes: gracePeriodMinutes,
              durationInHours: durationInHours,
              totalHours: durationInHours + (remainingMinutes / 60),
            });
            
            // KHÔNG tự động chuyển sang daily - để user xem cách tính theo giờ
            break;
            
          case 'daily':
            // Tính số ngày dựa trên ngày thực tế (qua đêm), không làm tròn từ giờ
            const checkInDateForDaily = new Date(checkInTime);
            checkInDateForDaily.setHours(0, 0, 0, 0);
            const checkOutDateForDaily = new Date(checkOutTime);
            checkOutDateForDaily.setHours(0, 0, 0, 0);
            const actualDaysForDaily = Math.max(1, Math.ceil((checkOutDateForDaily.getTime() - checkInDateForDaily.getTime()) / (1000 * 60 * 60 * 24)));
            roomPrice = actualDaysForDaily * dailyRate;
            
            let earlyCheckinSurchargeDaily = 0;
            let earlyCheckinHoursDaily = 0;
            let lateCheckoutFeeDaily = 0;
            let lateCheckoutHoursDaily = 0;
            
            // Tính phụ thu check-in sớm CHỈ NẾU check-in TRƯỚC thời gian daily (trước dailyStartTime - 12:00)
            const checkInMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
            const startTimeMinutes = parseTimeToMinutes(dailyStartTime);
            const isInDailyTime = checkInMinutes >= startTimeMinutes;
            
            if (!isInDailyTime && dailyEarlyCheckinSurcharge > 0) {
              earlyCheckinHoursDaily = calculateEarlyHours(checkInTime, dailyStartTime);
              if (earlyCheckinHoursDaily > 0) {
                earlyCheckinSurchargeDaily = earlyCheckinHoursDaily * dailyEarlyCheckinSurcharge;
                roomPrice += earlyCheckinSurchargeDaily;
              }
            }
            
            // Tính phụ thu check-out trễ (nếu check-out sau 12:00 ngày hôm sau)
            const checkOutDateOnly = new Date(checkOutTime);
            checkOutDateOnly.setHours(0, 0, 0, 0);
            const checkInDateOnly = new Date(checkInTime);
            checkInDateOnly.setHours(0, 0, 0, 0);
            const isNextDay = checkOutDateOnly.getTime() > checkInDateOnly.getTime();
            
            const checkOutMinutes = checkOutTime.getHours() * 60 + checkOutTime.getMinutes();
            const checkOutTimeMinutes = parseTimeToMinutes(dailyCheckOutTime);
            
            if (isNextDay && checkOutMinutes > checkOutTimeMinutes && dailyLateCheckoutFee > 0) {
              const lateMinutes = checkOutMinutes - checkOutTimeMinutes;
              lateCheckoutHoursDaily = Math.ceil(lateMinutes / 60); // Làm tròn lên
              lateCheckoutFeeDaily = lateCheckoutHoursDaily * dailyLateCheckoutFee;
              roomPrice += lateCheckoutFeeDaily;
            }
            
            // Lưu chi tiết tính toán
            setRoomPriceDetails({
              rateType: 'daily',
              basePrice: dailyRate,
              days: actualDaysForDaily,
              earlyCheckinHours: earlyCheckinHoursDaily,
              earlyCheckinSurcharge: earlyCheckinSurchargeDaily,
              lateCheckoutHours: lateCheckoutHoursDaily,
              lateCheckoutSurcharge: lateCheckoutFeeDaily,
            });
            break;
            
          case 'nightly':
            // Kiểm tra nếu vượt quá autoDailyHours thì tự động chuyển sang daily rate
            if (durationInHours > autoDailyHours && dailyRate > 0) {
              // Tự động chuyển sang daily rate
              const durationInDays = Math.ceil(durationInHours / 24);
              roomPrice = durationInDays * dailyRate;
              finalRateType = 'daily';
            } else {
              // Tính giá qua đêm - tính số đêm dựa trên đêm thực tế (qua đêm)
              const checkInDateForNightly = new Date(checkInTime);
              checkInDateForNightly.setHours(0, 0, 0, 0);
              const checkOutDateForNightly = new Date(checkOutTime);
              checkOutDateForNightly.setHours(0, 0, 0, 0);
              const actualNightsForNightly = Math.max(1, Math.ceil((checkOutDateForNightly.getTime() - checkInDateForNightly.getTime()) / (1000 * 60 * 60 * 24)));
              roomPrice = actualNightsForNightly * nightlyRate;
              
              let earlyCheckinHours2 = 0;
              let earlyCheckinSurcharge2 = 0;
              let lateCheckoutHours2 = 0;
              let lateCheckoutSurcharge2 = 0;
              
              // Tính phụ thu check-in sớm (nếu check-in trước startTime - 20:00)
              const checkInMinutes2 = checkInTime.getHours() * 60 + checkInTime.getMinutes();
              const startTimeMinutes2 = parseTimeToMinutes(nightlyStartTime);
              
              if (checkInMinutes2 < startTimeMinutes2 && nightlyEarlyCheckinSurcharge > 0) {
                earlyCheckinHours2 = calculateEarlyHours(checkInTime, nightlyStartTime);
                if (earlyCheckinHours2 > 0) {
                  earlyCheckinSurcharge2 = earlyCheckinHours2 * nightlyEarlyCheckinSurcharge;
                  roomPrice += earlyCheckinSurcharge2;
                }
              }
              
              // Tính phụ thu check-out trễ (nếu check-out sau endTime - 12:00 ngày hôm sau)
              const checkOutDateOnly2 = new Date(checkOutTime);
              checkOutDateOnly2.setHours(0, 0, 0, 0);
              const checkInDateOnly2 = new Date(checkInTime);
              checkInDateOnly2.setHours(0, 0, 0, 0);
              const isNextDay2 = checkOutDateOnly2.getTime() > checkInDateOnly2.getTime();
              
              const checkOutMinutes2 = checkOutTime.getHours() * 60 + checkOutTime.getMinutes();
              const endTimeMinutes2 = parseTimeToMinutes(nightlyEndTime);
              
              if (isNextDay2 && checkOutMinutes2 > endTimeMinutes2 && nightlyLateCheckoutSurcharge > 0) {
                const lateMinutes2 = checkOutMinutes2 - endTimeMinutes2;
                lateCheckoutHours2 = Math.ceil(lateMinutes2 / 60); // Làm tròn lên
                lateCheckoutSurcharge2 = lateCheckoutHours2 * nightlyLateCheckoutSurcharge;
                roomPrice += lateCheckoutSurcharge2;
              }
              
              // Lưu chi tiết tính toán
              setRoomPriceDetails({
                rateType: 'nightly',
                basePrice: nightlyRate,
                nights: actualNightsForNightly,
                earlyCheckinHours: earlyCheckinHours2,
                earlyCheckinSurcharge: earlyCheckinSurcharge2,
                lateCheckoutHours: lateCheckoutHours2,
                lateCheckoutSurcharge: lateCheckoutSurcharge2,
              });
            }
            break;
        }
        
        // KHÔNG tự động chuyển rateType khi user chọn hourly - để user xem cách tính
        // Chỉ cập nhật nếu không phải hourly
        if (checkoutRateType !== 'hourly' && finalRateType !== checkoutRateType) {
          setCheckoutRateType(finalRateType as RateType);
        }
        
        console.log('Fallback price calculated:', roomPrice, 'rateType:', finalRateType, 'details:', roomPriceDetails);
      }

      setRoomPriceTotal(roomPrice);

      // Tính tổng tiền dịch vụ từ selectedServices
      const calculatedServicesTotal = selectedServices.reduce((total, service) => {
        // Sử dụng totalPrice nếu có, nếu không thì tính từ price và quantity
        const serviceAmount = service.totalPrice !== undefined 
          ? service.totalPrice 
          : (service.price || 0) * (service.quantity || 1);
        return total + serviceAmount;
      }, 0);
      setServicesTotal(calculatedServicesTotal);
      console.log('Services total calculated:', calculatedServicesTotal, 'from', selectedServices.length, 'services');

      // Lấy giá trị phụ thu và giảm giá từ form checkout (chỉ giá trị người dùng nhập thêm)
      const checkoutCharges = parseFloat(checkoutAdditionalCharges || '0');
      const checkoutDiscountValue = parseFloat(checkoutDiscount || '0');
      
      // Tổng phụ thu = phụ thu từ check-in event + phụ thu người dùng nhập thêm
      const totalAdditionalCharges = initialCharges + checkoutCharges;
      
      // Tổng khuyến mãi = khuyến mãi từ check-in event + khuyến mãi người dùng nhập thêm
      const totalDiscount = initialDiscount + checkoutDiscountValue;
      
      // Lấy tiền đặt trước từ check-in event (KHÔNG lấy từ form checkout)
      const advancePaymentValue = lastCheckInEvent?.advancePayment || 0;

      console.log('Price calculation details:', {
        roomPrice,
        totalAdditionalCharges,
        initialCharges,
        checkoutCharges,
        calculatedServicesTotal,
        totalDiscount,
        initialDiscount,
        checkoutDiscountValue,
        advancePaymentValue,
      });

      // Công thức: Tổng cộng = tiền phòng + phụ thu + tiền dịch vụ (KHÔNG trừ khuyến mãi và đặt trước)
      const total = roomPrice + totalAdditionalCharges + calculatedServicesTotal;
      setTotalPrice(total);

      // Còn lại phải thanh toán = Tổng cộng - đặt trước - khuyến mãi (cho phép số âm)
      const remaining = total - advancePaymentValue - totalDiscount;
      setRemainingAmount(remaining);
      
      console.log('Final totals:', {
        total,
        remaining,
      });
    } catch (error: any) {
      console.error('Error calculating price:', error);
      Alert.alert('Lỗi', 'Không thể tính giá phòng. Vui lòng thử lại.');
    } finally {
      setCalculatingPrice(false);
    }
  };

  const handleCheckInSubmit = async () => {
    if (!selectedRoom || !selectedRoom._id) return;

    try {
      const checkInData = {
        status: 'occupied' as const,
        events: [{
          type: 'checkin' as const,
          checkinTime: new Date().toISOString(),
          guestInfo: {
            name: guestName || 'Khách lẻ',
            phone: guestPhone || undefined,
            email: guestEmail || undefined,
          },
          paymentMethod,
          rateType,
          advancePayment: advancePayment ? parseFloat(advancePayment) : 0,
          notes: notes || undefined,
        }],
      };

      await roomsService.checkInRoom(selectedRoom._id, checkInData);
      Alert.alert('Thành công', 'Check-in thành công');
      setCheckInModalVisible(false);
      resetCheckInForm();
      loadRooms();
    } catch (error: any) {
      console.error('Check-in error:', error);
      Alert.alert('Lỗi', error.message || 'Check-in thất bại');
    }
  };

  const handleSaveCheckoutInfo = async () => {
    if (!checkoutRoom || !checkoutRoom._id) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin phòng');
      return;
    }

    try {
      const checkoutCharges = parseFloat(checkoutAdditionalCharges || '0');
      const checkoutDiscountValue = parseFloat(checkoutDiscount || '0');
      const advancePaymentValue = parseFloat(checkoutAdvancePayment || '0');
      
      // Tính tổng phụ thu và khuyến mãi (bao gồm cả giá trị ban đầu)
      const totalAdditionalCharges = initialCharges + checkoutCharges;
      const totalDiscount = initialDiscount + checkoutDiscountValue;

      const updateData = {
        guestInfo: {
          name: checkoutGuestName || undefined,
          idNumber: checkoutGuestIdNumber || undefined,
          phone: checkoutGuestPhone || undefined,
          email: checkoutGuestEmail || undefined,
          address: checkoutGuestAddress || undefined,
          guestSource: checkoutGuestSource || undefined,
        },
        advancePayment: advancePaymentValue > 0 ? advancePaymentValue : undefined,
        rateType: checkoutRateType || undefined,
        additionalCharges: totalAdditionalCharges > 0 ? totalAdditionalCharges : undefined,
        discount: totalDiscount > 0 ? totalDiscount : undefined,
        selectedServices: selectedServices.length > 0 ? selectedServices.map(service => ({
          serviceId: service.serviceId,
          serviceName: service.serviceName,
          price: service.price,
          quantity: service.quantity,
          totalPrice: service.totalPrice,
          orderTime: service.orderTime || new Date(),
        })) : undefined,
      };

      await roomsService.updateCheckinInfo(checkoutRoom._id, updateData);
      Alert.alert('Thành công', 'Đã lưu thông tin thành công', [
        {
          text: 'OK',
          onPress: () => {
            // Reload lại dữ liệu checkout để cập nhật thông tin mới
            if (checkoutRoom) {
              loadCheckoutData(checkoutRoom);
            }
          },
        },
      ]);
    } catch (error: any) {
      console.error('Save checkout info error:', error);
      Alert.alert('Lỗi', error.message || 'Không thể lưu thông tin');
    }
  };

  const handleCheckOutSubmit = async () => {
    if (!lastCheckInEvent || !checkoutRoom || !checkoutRoom._id) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin check-in');
      return;
    }

    try {
      // Lấy giá trị phụ thu và giảm giá từ form checkout (chỉ giá trị người dùng nhập thêm)
      const checkoutCharges = parseFloat(checkoutAdditionalCharges || '0');
      const checkoutDiscountValue = parseFloat(checkoutDiscount || '0');
      
      // Lấy tiền đặt trước từ check-in event (KHÔNG lấy từ form)
      const advancePaymentValue = lastCheckInEvent?.advancePayment || 0;

      const checkoutData = {
        staffId: user?._id,
        paymentMethod: checkoutPaymentMethod,
        // Gửi chỉ giá trị phụ thu thêm (không bao gồm initialCharges)
        additionalCharges: checkoutCharges,
        // Gửi chỉ giá trị khuyến mãi thêm (không bao gồm initialDiscount)
        discount: checkoutDiscountValue,
        // Gửi roomTotal (tổng tiền phòng) để backend sử dụng
        roomTotal: roomPriceTotal,
        totalAmount: totalPrice,
        remainingAmount: remainingAmount,
        notes: checkoutNotes || undefined,
        checkoutTime: new Date().toISOString(),
        createDebt: checkoutCreateDebt,
        selectedServices: selectedServices,
        guestInfo: {
          name: checkoutGuestName,
          idNumber: checkoutGuestIdNumber,
          phone: checkoutGuestPhone,
          email: checkoutGuestEmail,
          address: checkoutGuestAddress,
          guestSource: checkoutGuestSource,
        },
        rateType: checkoutRateType,
        // Không gửi advancePayment vì backend sẽ lấy từ check-in event
      };

      await roomsService.checkOutRoom(checkoutRoom._id, checkoutData);
      Alert.alert('Thành công', 'Check-out thành công', [
        {
          text: 'OK',
          onPress: () => {
            setCheckOutModalVisible(false);
            resetCheckOutForm();
            loadRooms();
          },
        },
      ]);
    } catch (error: any) {
      console.error('Check-out error:', error);
      Alert.alert('Lỗi', error.message || 'Check-out thất bại');
    }
  };

  const resetCheckInForm = () => {
    setGuestName('');
    setGuestPhone('');
    setGuestEmail('');
    setRateType('hourly');
    setAdvancePayment('');
    setPaymentMethod('cash');
    setNotes('');
  };

  const resetCheckOutForm = () => {
    setCheckoutGuestName('');
    setCheckoutGuestIdNumber('');
    setCheckoutGuestPhone('');
    setCheckoutGuestEmail('');
    setCheckoutGuestAddress('');
    setCheckoutGuestSource('walkin');
    setCheckoutRateType('hourly');
    setCheckoutAdditionalCharges('0');
    setCheckoutDiscount('0');
    setCheckoutPaymentMethod('cash');
    setCheckoutAdvancePayment('0');
    setCheckoutCreateDebt(false);
    setCheckoutNotes('');
    setInitialCharges(0);
    setInitialDiscount(0);
    setLastCheckInEvent(null);
    setRoomPriceTotal(0);
    setServicesTotal(0);
    setTotalPrice(0);
    setRemainingAmount(0);
    setRoomPriceDetails(null);
    setSelectedServices([]);
    setCheckoutRoom(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  const handleUpdateStatus = async () => {
    if (!selectedRoom || !user?._id) return;

    try {
      await roomsService.updateRoomStatus(
        selectedRoom._id!,
        newStatus,
        user._id,
        `Cập nhật trạng thái từ ${selectedRoom.status} sang ${newStatus}`
      );
      Alert.alert('Thành công', 'Đã cập nhật trạng thái phòng');
      setUpdateModalVisible(false);
      loadRooms();
    } catch (error: any) {
      console.error('Error updating room status:', error);
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật trạng thái');
    }
  };

  const renderRoom = ({ item }: { item: Room }) => (
    <RoomCard
      room={item}
      onPress={() => handleRoomPress(item)}
      onUpdate={() => handleUpdate(item)}
      onCheckIn={() => handleCheckIn(item)}
      onCheckOut={() => handleCheckOut(item)}
      onTransfer={() => handleTransfer(item)}
      isGridView={isGridView}
    />
  );

  // Calculate stats
  const stats = useMemo(() => {
    const total = filteredRooms.length;
    const vacant = filteredRooms.filter((r) => r.status === 'vacant').length;
    const occupied = filteredRooms.filter((r) => r.status === 'occupied')
      .length;
    const cleaning = filteredRooms.filter(
      (r) => r.status === 'cleaning' || r.status === 'dirty'
    ).length;
    const booked = filteredRooms.filter((r) => r.status === 'booked').length;
    const maintenance = filteredRooms.filter((r) => r.status === 'maintenance').length;
    const guestOut = filteredRooms.filter((r) => r.status === 'guest_out').length;

    return { total, vacant, occupied, cleaning, booked, maintenance, guestOut };
  }, [filteredRooms]);

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1890ff" />
        <Text style={styles.loadingText}>Đang tải danh sách phòng...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Phòng</Text>
          <TouchableOpacity
            style={styles.reloadButton}
            onPress={handleReload}
            disabled={loading}
          >
            <Text style={styles.reloadIcon}>🔄</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Combined Stats, Filters and Floor Dropdown */}
      <View style={styles.combinedContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.combinedScrollContent}
        >
          {/* Stats */}
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Tổng</Text>
          </View>
          <View style={[styles.statItem, styles.statVacant]}>
            <Text style={styles.statValue}>{stats.vacant}</Text>
            <Text style={styles.statLabel}>Trống</Text>
          </View>
          <View style={[styles.statItem, styles.statOccupied]}>
            <Text style={styles.statValue}>{stats.occupied}</Text>
            <Text style={styles.statLabel}>Đã thuê</Text>
          </View>
          <View style={[styles.statItem, styles.statCleaning]}>
            <Text style={styles.statValue}>{stats.cleaning}</Text>
            <Text style={styles.statLabel}>Đang dọn</Text>
          </View>
          <View style={[styles.statItem, styles.statBooked]}>
            <Text style={styles.statValue}>{stats.booked}</Text>
            <Text style={styles.statLabel}>Đã đặt</Text>
          </View>
          <View style={[styles.statItem, styles.statMaintenance]}>
            <Text style={styles.statValue}>{stats.maintenance}</Text>
            <Text style={styles.statLabel}>Bảo trì</Text>
          </View>
          <View style={[styles.statItem, styles.statGuestOut]}>
            <Text style={styles.statValue}>{stats.guestOut}</Text>
            <Text style={styles.statLabel}>Khách ra ngoài</Text>
          </View>

          {/* Status Filters */}
          <View style={styles.filterSeparator} />
          {['all', 'vacant', 'occupied', 'cleaning', 'maintenance', 'guest_out'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                selectedFilter === filter && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter(filter as FilterType)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === filter && styles.filterTextActive,
                ]}
              >
                {filter === 'all'
                  ? 'Tất cả'
                  : filter === 'vacant'
                  ? 'Trống'
                  : filter === 'occupied'
                  ? 'Đã thuê'
                  : filter === 'cleaning'
                  ? 'Đang dọn'
                  : filter === 'maintenance'
                  ? 'Bảo trì'
                  : 'Khách ra ngoài'}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Floor Dropdown */}
          {floors.length > 0 && (
            <>
              <View style={styles.filterSeparator} />
              <FloorDropdown
                floors={floors}
                selectedFloor={selectedFloor}
                onFloorChange={setSelectedFloor}
              />
            </>
          )}

          {/* View Toggle */}
          <View style={styles.filterSeparator} />
          <ViewToggle
            isGridView={isGridView}
            onToggle={setIsGridView}
          />
        </ScrollView>
      </View>

      {/* Room List/Grid */}
      <FlatList
        data={filteredRooms}
        renderItem={renderRoom}
        keyExtractor={(item) => item._id}
        numColumns={isGridView ? 4 : 1}
        key={isGridView ? 'grid' : 'list'}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏨</Text>
            <Text style={styles.emptyTitle}>Không có phòng nào</Text>
            <Text style={styles.emptySubtitle}>
              {selectedFilter !== 'all' || selectedFloor !== null
                ? 'Thử thay đổi bộ lọc để xem thêm phòng'
                : 'Vui lòng chọn khách sạn từ màn hình Home'}
            </Text>
          </View>
        }
      />


      {/* Chat Bot Modal */}
      <ChatBot
        visible={chatBotVisible}
        onClose={() => setChatBotVisible(false)}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setChatBotVisible(true)}
      >
        <Text style={styles.fabIcon}>💬</Text>
      </TouchableOpacity>

      {/* Update Status Modal */}
      <Modal
        visible={updateModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setUpdateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Cập Nhật Trạng Thái Phòng {selectedRoom?.roomNumber}
            </Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setPickerVisible(true)}
            >
              <Text style={styles.pickerButtonText}>
                {newStatus === 'vacant'
                  ? 'Phòng trống'
                  : newStatus === 'occupied'
                  ? 'Đã thuê'
                  : newStatus === 'cleaning'
                  ? 'Đang dọn'
                  : newStatus === 'dirty'
                  ? 'Bẩn'
                  : newStatus === 'booked'
                  ? 'Đã đặt'
                  : newStatus === 'maintenance'
                  ? 'Bảo trì'
                  : newStatus === 'guest_out'
                  ? 'Khách ra ngoài'
                  : newStatus}
              </Text>
              <Text style={styles.pickerArrow}>▼</Text>
            </TouchableOpacity>
            <StatusPicker
              visible={pickerVisible}
              selectedValue={newStatus}
              onValueChange={setNewStatus}
              onClose={() => setPickerVisible(false)}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setUpdateModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleUpdateStatus}
              >
                <Text style={styles.confirmButtonText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Check-in Modal */}
      <Modal
        visible={checkInModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCheckInModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContentLarge}>
            <Text style={styles.modalTitle}>Nhận phòng {selectedRoom?.roomNumber}</Text>
            
            {/* OCR Scan Button */}
            <TouchableOpacity
              style={styles.ocrButton}
              onPress={() => setOcrScannerVisible(true)}
            >
              <Text style={styles.ocrButtonIcon}>📷</Text>
              <Text style={styles.ocrButtonText}>Quét CMND/CCCD (OCR)</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Tên khách hàng"
              value={guestName}
              onChangeText={setGuestName}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Số điện thoại"
              value={guestPhone}
              onChangeText={setGuestPhone}
              keyboardType="phone-pad"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={guestEmail}
              onChangeText={setGuestEmail}
              keyboardType="email-address"
            />

            <View style={styles.rateTypeContainer}>
              <Text style={styles.inputLabel}>Loại giá:</Text>
              <View style={styles.rateTypeButtons}>
                {(['hourly', 'daily', 'nightly'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.rateTypeButton,
                      rateType === type && styles.rateTypeButtonActive,
                    ]}
                    onPress={() => setRateType(type)}
                  >
                    <Text
                      style={[
                        styles.rateTypeButtonText,
                        rateType === type && styles.rateTypeButtonTextActive,
                      ]}
                    >
                      {type === 'hourly' ? 'Theo giờ' : type === 'daily' ? 'Theo ngày' : 'Qua đêm'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Tiền đặt trước"
              value={advancePayment}
              onChangeText={setAdvancePayment}
              keyboardType="numeric"
            />

            <View style={styles.pickerContainer}>
              <Text style={styles.inputLabel}>Phương thức thanh toán:</Text>
              <CustomPicker
                selectedValue={paymentMethod}
                onValueChange={setPaymentMethod}
                items={[
                  { label: 'Tiền mặt', value: 'cash' },
                  { label: 'Thẻ', value: 'card' },
                  { label: 'Chuyển khoản', value: 'transfer' },
                ]}
              />
            </View>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Ghi chú"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setCheckInModalVisible(false);
                  resetCheckInForm();
                }}
              >
                <Text style={styles.modalButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleCheckInSubmit}
              >
                <Text style={styles.modalButtonText}>Nhận phòng</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          
          {/* OCR Scanner Overlay */}
          <OCRScanner
            visible={ocrScannerVisible}
            onClose={() => setOcrScannerVisible(false)}
            onScanComplete={(data) => {
              // Điền thông tin từ OCR vào form check-in
              if (data.fullName) {
                setGuestName(data.fullName);
              }
              if (data.phone) {
                setGuestPhone(data.phone);
              }
              if (data.address || data.permanentAddress) {
                // Có thể lưu vào notes hoặc field riêng nếu có
                const address = data.address || data.permanentAddress || '';
                if (address && !notes) {
                  setNotes(`Địa chỉ: ${address}`);
                }
              }
            }}
            allowMultiple={true}
          />
        </View>
      </Modal>

      {/* Check-out Modal */}
      <Modal
        visible={checkOutModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCheckOutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContentLarge}>
            <Text style={styles.modalTitle}>Trả phòng {checkoutRoom?.roomNumber}</Text>

            {calculatingPrice && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#1890ff" />
                <Text style={styles.loadingText}>Đang tính toán...</Text>
              </View>
            )}

            {/* Guest Info */}
            <Text style={styles.sectionTitle}>Thông tin khách hàng</Text>
            
            {/* OCR Scan Button */}
            <TouchableOpacity
              style={styles.ocrButton}
              onPress={() => setCheckoutOcrScannerVisible(true)}
            >
              <Text style={styles.ocrButtonIcon}>📷</Text>
              <Text style={styles.ocrButtonText}>Quét CMND/CCCD (OCR)</Text>
            </TouchableOpacity>
            
            <TextInput
              style={styles.input}
              placeholder="Tên khách hàng"
              value={checkoutGuestName}
              onChangeText={setCheckoutGuestName}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Số CMND/CCCD"
              value={checkoutGuestIdNumber}
              onChangeText={setCheckoutGuestIdNumber}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Số điện thoại"
              value={checkoutGuestPhone}
              onChangeText={setCheckoutGuestPhone}
              keyboardType="phone-pad"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={checkoutGuestEmail}
              onChangeText={setCheckoutGuestEmail}
              keyboardType="email-address"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Địa chỉ"
              value={checkoutGuestAddress}
              onChangeText={setCheckoutGuestAddress}
            />

            <View style={styles.pickerContainer}>
              <Text style={styles.inputLabel}>Nguồn khách:</Text>
              <CustomPicker
                selectedValue={checkoutGuestSource}
                onValueChange={setCheckoutGuestSource}
                items={[
                  { label: 'Walk-in', value: 'walkin' },
                  { label: 'Booking', value: 'booking' },
                  { label: 'Agoda', value: 'agoda' },
                  { label: 'Traveloka', value: 'traveloka' },
                  { label: 'Expedia', value: 'expedia' },
                  { label: 'Trip.com', value: 'trip' },
                  { label: 'G2J', value: 'g2j' },
                  { label: 'Khác', value: 'other' },
                ]}
              />
            </View>

            {/* Rate Type */}
            <Text style={styles.sectionTitle}>Cách tính tiền phòng</Text>
            <View style={styles.rateTypeContainer}>
              <View style={styles.rateTypeButtons}>
                {(['hourly', 'daily', 'nightly'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.rateTypeButton,
                      checkoutRateType === type && styles.rateTypeButtonActive,
                    ]}
                    onPress={() => {
                      setCheckoutRateType(type);
                      // Reset price details khi đổi rate type
                      setRoomPriceDetails(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.rateTypeButtonText,
                        checkoutRateType === type && styles.rateTypeButtonTextActive,
                      ]}
                    >
                      {type === 'hourly' ? 'Theo giờ' : type === 'daily' ? 'Theo ngày' : 'Qua đêm'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Room Info */}
            {lastCheckInEvent && (
              <View style={styles.infoCard}>
                <Text style={styles.infoCardTitle}>Thông tin phòng</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Loại phòng:</Text>
                  <Text style={styles.infoValue}>{checkoutRoom?.type}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Thời gian nhận phòng:</Text>
                  <Text style={styles.infoValue}>
                    {new Date(lastCheckInEvent.checkinTime!).toLocaleString('vi-VN')}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Thời gian hiện tại:</Text>
                  <Text style={styles.infoValue}>
                    {new Date().toLocaleString('vi-VN')}
                  </Text>
                </View>
              </View>
            )}

            {/* Services Section */}
            <Text style={styles.sectionTitle}>Dịch vụ sử dụng</Text>
            
            <View style={styles.serviceFormContainer}>
              <View style={styles.serviceFormRow}>
                <View style={styles.serviceSelectContainer}>
                  <Text style={styles.inputLabel}>Chọn dịch vụ:</Text>
                  <CustomPicker
                    selectedValue={selectedServiceId}
                    onValueChange={setSelectedServiceId}
                    items={Array.isArray(services) ? services.map((s) => ({
                      label: `${s.name} - ${formatCurrency(s.price)} đ`,
                      value: s.id || s._id,
                    })) : []}
                    placeholder="Chọn dịch vụ"
                  />
                </View>
                <View style={styles.serviceQuantityContainer}>
                  <Text style={styles.inputLabel}>Số lượng:</Text>
                  <TextInput
                    style={styles.quantityInput}
                    placeholder="1"
                    value={serviceQuantity}
                    onChangeText={setServiceQuantity}
                    keyboardType="numeric"
                  />
                </View>
                <TouchableOpacity
                  style={styles.addServiceButton}
                  onPress={handleAddService}
                  disabled={!selectedServiceId}
                >
                  <Text style={styles.addServiceButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Selected Services List */}
            {selectedServices.length > 0 && (
              <View style={styles.servicesTableContainer}>
                <View style={styles.servicesTableHeader}>
                  <Text style={styles.servicesTableHeaderText}>Dịch vụ</Text>
                  <Text style={styles.servicesTableHeaderText}>SL</Text>
                  <Text style={styles.servicesTableHeaderText}>Đơn giá</Text>
                  <Text style={styles.servicesTableHeaderText}>Thành tiền</Text>
                  <Text style={styles.servicesTableHeaderText}></Text>
                </View>
                {selectedServices.map((service, index) => (
                  <View key={index} style={styles.servicesTableRow}>
                    <Text style={styles.servicesTableCell} numberOfLines={1}>
                      {service.serviceName}
                    </Text>
                    <Text style={styles.servicesTableCell}>{service.quantity}</Text>
                    <Text style={styles.servicesTableCell}>
                      {formatCurrency(service.price)} đ
                    </Text>
                    <Text style={styles.servicesTableCell}>
                      {formatCurrency(service.totalPrice || service.price * service.quantity)} đ
                    </Text>
                    <TouchableOpacity
                      style={styles.deleteServiceButton}
                      onPress={() => handleRemoveService(index)}
                    >
                      <Text style={styles.deleteServiceButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Payment Info */}
            <Text style={styles.sectionTitle}>Thông tin thanh toán</Text>

            {/* Totals Summary */}
            <View style={styles.totalsCard}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tổng tiền phòng:</Text>
                <Text style={styles.totalValue}>{formatCurrency(roomPriceTotal)} đ</Text>
              </View>

              {/* Hiển thị chi tiết diễn giải tính tiền phòng */}
              {roomPriceDetails && (
                <View style={styles.priceDetailsContainer}>
                  {/* Chi tiết theo giờ */}
                  {roomPriceDetails.rateType === 'hourly' && (
                    <>
                      <View style={styles.priceDetailRow}>
                        <Text style={styles.priceDetailLabel}>
                          Giờ đầu tiên:
                        </Text>
                        <Text style={styles.priceDetailValue}>
                          {formatCurrency(roomPriceDetails.firstHourPrice || 0)} đ
                        </Text>
                      </View>
                      {roomPriceDetails.additionalHoursCount > 0 && (
                        <View style={styles.priceDetailRow}>
                          <Text style={styles.priceDetailLabel}>
                            {roomPriceDetails.additionalHoursCount} giờ tiếp theo ({formatCurrency((roomPriceDetails.additionalHoursPrice || 0) / (roomPriceDetails.additionalHoursCount || 1))} đ/giờ):
                          </Text>
                          <Text style={styles.priceDetailValue}>
                            {formatCurrency(roomPriceDetails.additionalHoursPrice || 0)} đ
                          </Text>
                        </View>
                      )}
                      <View style={styles.priceDetailInfo}>
                        <Text style={styles.priceDetailInfoText}>
                          Tổng thời gian: {roomPriceDetails.totalHours?.toFixed(1) || roomPriceDetails.durationInHours || 0} giờ
                          {roomPriceDetails.remainingMinutes > 0 && ` (${roomPriceDetails.remainingMinutes} phút)`}
                        </Text>
                        <Text style={styles.priceDetailInfoText}>
                          Thời gian miễn phí: {roomPriceDetails.gracePeriodMinutes || 15} phút
                        </Text>
                      </View>
                    </>
                  )}

                  {/* Chi tiết theo ngày */}
                  {roomPriceDetails.rateType === 'daily' && (
                    <>
                      <View style={styles.priceDetailRow}>
                        <Text style={styles.priceDetailLabel}>
                          {roomPriceDetails.days} ngày × {formatCurrency(roomPriceDetails.basePrice || 0)} đ/ngày:
                        </Text>
                        <Text style={styles.priceDetailValue}>
                          {formatCurrency((roomPriceDetails.days || 0) * (roomPriceDetails.basePrice || 0))} đ
                        </Text>
                      </View>
                      {roomPriceDetails.earlyCheckinHours > 0 && (
                        <View style={[styles.priceDetailRow, styles.priceDetailSurcharge]}>
                          <Text style={styles.priceDetailLabel}>
                            Phụ thu check-in sớm ({roomPriceDetails.earlyCheckinHours} giờ):
                          </Text>
                          <Text style={[styles.priceDetailValue, styles.priceDetailSurchargeValue]}>
                            + {formatCurrency(roomPriceDetails.earlyCheckinSurcharge || 0)} đ
                          </Text>
                        </View>
                      )}
                      {roomPriceDetails.lateCheckoutHours > 0 && (
                        <View style={[styles.priceDetailRow, styles.priceDetailSurcharge]}>
                          <Text style={styles.priceDetailLabel}>
                            Phụ thu check-out trễ ({roomPriceDetails.lateCheckoutHours} giờ):
                          </Text>
                          <Text style={[styles.priceDetailValue, styles.priceDetailSurchargeValue]}>
                            + {formatCurrency(roomPriceDetails.lateCheckoutSurcharge || 0)} đ
                          </Text>
                        </View>
                      )}
                    </>
                  )}

                  {/* Chi tiết qua đêm */}
                  {roomPriceDetails.rateType === 'nightly' && (
                    <>
                      <View style={styles.priceDetailRow}>
                        <Text style={styles.priceDetailLabel}>
                          {roomPriceDetails.nights} đêm × {formatCurrency(roomPriceDetails.basePrice || 0)} đ/đêm:
                        </Text>
                        <Text style={styles.priceDetailValue}>
                          {formatCurrency((roomPriceDetails.nights || 0) * (roomPriceDetails.basePrice || 0))} đ
                        </Text>
                      </View>
                      {roomPriceDetails.earlyCheckinHours > 0 && (
                        <View style={[styles.priceDetailRow, styles.priceDetailSurcharge]}>
                          <Text style={styles.priceDetailLabel}>
                            Phụ thu check-in sớm ({roomPriceDetails.earlyCheckinHours} giờ):
                          </Text>
                          <Text style={[styles.priceDetailValue, styles.priceDetailSurchargeValue]}>
                            + {formatCurrency(roomPriceDetails.earlyCheckinSurcharge || 0)} đ
                          </Text>
                        </View>
                      )}
                      {roomPriceDetails.lateCheckoutHours > 0 && (
                        <View style={[styles.priceDetailRow, styles.priceDetailSurcharge]}>
                          <Text style={styles.priceDetailLabel}>
                            Phụ thu check-out trễ ({roomPriceDetails.lateCheckoutHours} giờ):
                          </Text>
                          <Text style={[styles.priceDetailValue, styles.priceDetailSurchargeValue]}>
                            + {formatCurrency(roomPriceDetails.lateCheckoutSurcharge || 0)} đ
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}
              
              {initialCharges > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Phụ thu (từ check-in):</Text>
                  <Text style={[styles.totalValue, styles.chargeValue]}>
                    + {formatCurrency(initialCharges)} đ
                  </Text>
                </View>
              )}
              
              {initialDiscount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Khuyến mãi (từ check-in):</Text>
                  <Text style={[styles.totalValue, styles.discountValue]}>
                    - {formatCurrency(initialDiscount)} đ
                  </Text>
                </View>
              )}
              
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tổng tiền dịch vụ:</Text>
                <Text style={styles.totalValue}>{formatCurrency(servicesTotal)} đ</Text>
              </View>
            </View>

            <Text style={styles.inputLabel}>Phụ thu thêm:</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập phụ thu thêm (nếu có)"
              value={checkoutAdditionalCharges}
              onChangeText={setCheckoutAdditionalCharges}
              keyboardType="numeric"
            />
            {initialCharges > 0 && (
              <Text style={styles.helperText}>
                Đã có phụ thu từ check-in: {formatCurrency(initialCharges)} đ
              </Text>
            )}

            <Text style={styles.inputLabel}>Khuyến mãi thêm:</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập khuyến mãi thêm (nếu có)"
              value={checkoutDiscount}
              onChangeText={setCheckoutDiscount}
              keyboardType="numeric"
            />
            {initialDiscount > 0 && (
              <Text style={styles.helperText}>
                Đã có khuyến mãi từ check-in: {formatCurrency(initialDiscount)} đ
              </Text>
            )}

            <View style={styles.pickerContainer}>
              <Text style={styles.inputLabel}>Phương thức thanh toán:</Text>
              <CustomPicker
                selectedValue={checkoutPaymentMethod}
                onValueChange={setCheckoutPaymentMethod}
                items={[
                  { label: 'Tiền mặt', value: 'cash' },
                  { label: 'Thẻ', value: 'card' },
                  { label: 'Chuyển khoản', value: 'transfer' },
                ]}
              />
            </View>

            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Đưa vào công nợ (thanh toán sau)</Text>
              <Switch
                value={checkoutCreateDebt}
                onValueChange={setCheckoutCreateDebt}
              />
            </View>
            <Text style={styles.helperText}>
              Khi chọn tùy chọn này, hóa đơn sẽ được đưa vào công nợ và khách hàng có thể thanh toán sau.
            </Text>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Ghi chú"
              value={checkoutNotes}
              onChangeText={setCheckoutNotes}
              multiline
              numberOfLines={3}
            />

            {/* Totals Summary - Giống Angular app */}
            <View style={styles.totalsSummaryCard}>
              <View style={styles.finalTotalRow}>
                <Text style={styles.finalTotalLabel}>Tổng tiền phòng:</Text>
                <Text style={styles.finalTotalValue}>
                  {formatCurrency(roomPriceTotal)} đ
                </Text>
              </View>
              
              <View style={styles.finalTotalRow}>
                <Text style={styles.finalTotalLabel}>Tổng tiền dịch vụ:</Text>
                <Text style={styles.finalTotalValue}>
                  {formatCurrency(servicesTotal)} đ
                </Text>
              </View>
              
              <View style={[styles.finalTotalRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e0e0e0' }]}>
                <Text style={styles.finalTotalLabel}>Tổng cộng:</Text>
                <Text style={[styles.finalTotalValue, { fontSize: 16, fontWeight: 'bold' }]}>
                  {formatCurrency(totalPrice)} đ
                </Text>
              </View>
              
              {(lastCheckInEvent?.advancePayment || 0) > 0 && (
                <View style={styles.finalTotalRow}>
                  <Text style={styles.finalTotalLabel}>Đã trả trước:</Text>
                  <Text style={[styles.finalTotalValue, styles.advanceValue]}>
                    - {formatCurrency(lastCheckInEvent?.advancePayment || 0)} đ
                  </Text>
                </View>
              )}
              
              {(initialDiscount + parseFloat(checkoutDiscount || '0')) > 0 && (
                <View style={styles.finalTotalRow}>
                  <Text style={styles.finalTotalLabel}>Khuyến mãi:</Text>
                  <Text style={[styles.finalTotalValue, { color: '#52c41a' }]}>
                    - {formatCurrency(initialDiscount + parseFloat(checkoutDiscount || '0'))} đ
                  </Text>
                </View>
              )}
              
              <View style={[styles.finalTotalRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e0e0e0' }]}>
                <Text style={[styles.finalTotalLabel, { fontWeight: 'bold' }]}>Còn lại phải thanh toán:</Text>
                <Text
                  style={[
                    styles.finalTotalValue,
                    styles.remainingValue,
                    remainingAmount < 0 && styles.remainingValueNegative,
                    { fontSize: 18, fontWeight: 'bold' },
                  ]}
                >
                  {formatCurrency(remainingAmount)} đ
                </Text>
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setCheckOutModalVisible(false);
                  resetCheckOutForm();
                }}
              >
                <Text style={styles.modalButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveCheckoutInfo}
                disabled={calculatingPrice}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Lưu</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleCheckOutSubmit}
                disabled={calculatingPrice}
              >
                <Text style={styles.modalButtonText}>Thanh toán và trả phòng</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Transfer Room Modal */}
      <Modal
        visible={transferModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTransferModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Đổi phòng {transferSourceRoom?.roomNumber}
              </Text>
              <TouchableOpacity onPress={() => setTransferModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Source Room Info */}
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Phòng nguồn:</Text>
                <Text style={styles.infoValue}>
                  {transferSourceRoom?.roomNumber} - {transferSourceRoom?.type || 'N/A'}
                </Text>
                <Text style={styles.infoNote}>
                  Trạng thái: {transferSourceRoom?.status === 'occupied' ? 'Đã thuê' : transferSourceRoom?.status}
                </Text>
              </View>

              {/* Info Alert */}
              <View style={styles.alertBox}>
                <Text style={styles.alertTitle}>Lưu ý khi chuyển phòng</Text>
                <Text style={styles.alertText}>
                  Giá phòng sẽ được tính lại theo phòng đích. Thông tin khách, dịch vụ, phụ thu và khuyến mãi sẽ được giữ nguyên.
                </Text>
              </View>

              {/* Target Room Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Chọn phòng đích <Text style={styles.required}>*</Text>
                </Text>
                <CustomPicker
                  items={availableRooms.map((room) => ({
                    label: `${room.roomNumber} - ${room.type || 'N/A'} (Tầng ${room.floor || 'N/A'})`,
                    value: room._id!,
                  }))}
                  selectedValue={selectedTargetRoomId}
                  onValueChange={(value) => setSelectedTargetRoomId(value)}
                  placeholder="-- Chọn phòng --"
                />
              </View>

              {/* Notes */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Ghi chú</Text>
                <TextInput
                  style={styles.textArea}
                  value={transferNotes}
                  onChangeText={setTransferNotes}
                  placeholder="Nhập lý do chuyển phòng (không bắt buộc)..."
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setTransferModalVisible(false);
                    setTransferSourceRoom(null);
                    setSelectedTargetRoomId('');
                    setTransferNotes('');
                  }}
                >
                  <Text style={styles.modalButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleTransferSubmit}
                  disabled={transferring || !selectedTargetRoomId}
                >
                  {transferring ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalButtonText}>Xác nhận chuyển phòng</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
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
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  reloadButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  reloadIcon: {
    fontSize: 20,
  },
  combinedContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  combinedScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 8,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    minWidth: 60,
  },
  statVacant: {
    backgroundColor: '#f6ffed',
  },
  statOccupied: {
    backgroundColor: '#fff1f0',
  },
  statCleaning: {
    backgroundColor: '#fff7e6',
  },
  statBooked: {
    backgroundColor: '#f0f5ff',
  },
  statMaintenance: {
    backgroundColor: '#fff1f0',
  },
  statGuestOut: {
    backgroundColor: '#fff7e6',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
  },
  filterSeparator: {
    width: 1,
    height: 30,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 4,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  filterButtonActive: {
    backgroundColor: '#1890ff',
  },
  filterText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    padding: 8,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1890ff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#333',
  },
  pickerArrow: {
    fontSize: 12,
    color: '#666',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#52c41a',
  },
  confirmButton: {
    backgroundColor: '#1890ff',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContentLarge: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 24,
    width: '90%',
    maxHeight: '90%',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  infoSection: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#1890ff',
    fontWeight: '600',
    marginBottom: 4,
  },
  infoNote: {
    fontSize: 12,
    color: '#666',
  },
  required: {
    color: '#ff4d4f',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  ocrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#1890ff',
    gap: 8,
  },
  ocrButtonIcon: {
    fontSize: 20,
  },
  ocrButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
    color: '#333',
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: -12,
    marginBottom: 16,
  },
  rateTypeContainer: {
    marginBottom: 16,
  },
  rateTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  rateTypeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  rateTypeButtonActive: {
    backgroundColor: '#1890ff',
    borderColor: '#1890ff',
  },
  rateTypeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  rateTypeButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  priceDetailsContainer: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#1890ff',
  },
  priceDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  priceDetailLabel: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  priceDetailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1890ff',
  },
  priceDetailSurcharge: {
    backgroundColor: '#fff9e6',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#ff9800',
  },
  priceDetailSurchargeValue: {
    color: '#ff9800',
  },
  priceDetailInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  priceDetailInfoText: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
    color: '#333',
  },
  infoCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
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
    fontWeight: '600',
    color: '#333',
  },
  totalsCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  chargeValue: {
    color: '#ff9800',
  },
  discountValue: {
    color: '#52c41a',
  },
  finalTotalsCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalsSummaryCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  finalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  finalTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  finalTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1890ff',
  },
  advanceValue: {
    color: '#52c41a',
  },
  remainingValue: {
    fontSize: 18,
    color: '#ff4d4f',
  },
  remainingValueNegative: {
    color: '#52c41a',
  },
  serviceFormContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  serviceFormRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  serviceSelectContainer: {
    flex: 1,
  },
  serviceQuantityContainer: {
    width: 80,
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  addServiceButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#1890ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addServiceButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  servicesTableContainer: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  servicesTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  servicesTableHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
  },
  servicesTableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  servicesTableCell: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  deleteServiceButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ff4d4f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteServiceButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
