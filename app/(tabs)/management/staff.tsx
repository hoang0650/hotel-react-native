import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useHotel } from '@/contexts/HotelContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { hotelsService } from '@/services/hotels.service';
import { staffService } from '@/services/staff.service';
import { userService } from '@/services/user.service';
import {
  Staff,
  StaffPersonalInfo,
  StaffContactInfo,
  StaffEmploymentInfo,
  StaffSchedule,
  StaffPermission,
  Hotel,
  User,
  getStaffFullName,
  getPositionLabel,
  getStatusLabel,
  getShiftLabel,
} from '@/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import CustomPicker from '@/components/ui/CustomPicker';
import { exportSalaryPDF, SalarySlipData } from '@/utils/pdfUtils';
import { getImageUrl } from '@/utils/imageUtils';

// Format currency helper
const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0';
  }
  return new Intl.NumberFormat('vi-VN').format(value);
};

type Position = 'manager' | 'receptionist' | 'housekeeper' | 'maintenance' | 'other';
type Status = 'active' | 'on_leave' | 'terminated';
type Shift = 'morning' | 'afternoon' | 'night' | 'full-day';
type Gender = 'male' | 'female' | 'other';

export default function StaffManagementScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedHotelId, setSelectedHotelId } = useHotel();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedHotelIdFilter, setSelectedHotelIdFilter] = useState<string | null>(selectedHotelId);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isSalaryModalVisible, setIsSalaryModalVisible] = useState(false);
  const [selectedStaffForSalary, setSelectedStaffForSalary] = useState<Staff | null>(null);
  const [businessInfo, setBusinessInfo] = useState<any>(null);
  const [businessLogo, setBusinessLogo] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    userId: '',
    hotelId: '',
    personalInfo: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: 'male' as Gender,
      nationality: '',
      idType: 'CMND',
      idNumber: '',
      idExpiryDate: '',
    },
    contactInfo: {
      email: '',
      phone: '',
      emergencyContact: {
        name: '',
        relationship: '',
        phone: '',
      },
      address: {
        street: '',
        city: '',
        state: '',
        country: 'Việt Nam',
        postalCode: '',
      },
    },
    employmentInfo: {
      position: 'receptionist' as Position,
      department: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      status: 'active' as Status,
      salary: '0',
      allowance: '0',
      insurance: '0',
      penalty: '0',
      bonus: '0',
      bankAccount: {
        bankName: '',
        accountNumber: '',
        accountName: '',
      },
      taxId: '',
    },
    schedule: [] as StaffSchedule[],
    permissions: ['view'] as StaffPermission[],
    notes: '',
  });

  // Salary calculation form
  const [salaryFormData, setSalaryFormData] = useState({
    calculationDate: new Date().toISOString().split('T')[0],
    allowance: '0',
    insurance: '0',
    penalty: '0',
    bonus: '0',
    advancePayment: '0',
  });

  const [salaryCalculationResult, setSalaryCalculationResult] = useState<any>(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isBusiness = user?.role === 'business';
  const isHotelManager = user?.role === 'hotel';

  const positionOptions = [
    { label: 'Quản lý', value: 'manager' },
    { label: 'Lễ tân', value: 'receptionist' },
    { label: 'Housekeeping', value: 'housekeeper' },
    { label: 'Bảo trì', value: 'maintenance' },
    { label: 'Khác', value: 'other' },
  ];

  const statusOptions = [
    { label: 'Đang làm việc', value: 'active' },
    { label: 'Nghỉ phép', value: 'on_leave' },
    { label: 'Đã nghỉ việc', value: 'terminated' },
  ];

  const shiftOptions = [
    { label: 'Ca sáng', value: 'morning' },
    { label: 'Ca chiều', value: 'afternoon' },
    { label: 'Ca đêm', value: 'night' },
    { label: 'Cả ngày', value: 'full-day' },
  ];

  const genderOptions = [
    { label: 'Nam', value: 'male' },
    { label: 'Nữ', value: 'female' },
    { label: 'Khác', value: 'other' },
  ];

  const idTypeOptions = [
    { label: 'CMND', value: 'CMND' },
    { label: 'CCCD', value: 'CCCD' },
    { label: 'Hộ chiếu', value: 'Passport' },
  ];

  const permissionOptions = [
    { label: 'Xem', value: 'view' },
    { label: 'Tạo', value: 'create' },
    { label: 'Sửa', value: 'edit' },
    { label: 'Xóa', value: 'delete' },
    { label: 'Quản lý phòng', value: 'manage_rooms' },
    { label: 'Quản lý đặt phòng', value: 'manage_bookings' },
  ];

  useEffect(() => {
    loadHotels();
    if (selectedHotelId || user?.hotelId) {
      const hotelId = selectedHotelId || user?.hotelId;
      if (hotelId) {
        setSelectedHotelIdFilter(hotelId);
        loadStaffs(hotelId);
        loadUsers(hotelId);
      }
    }
  }, [selectedHotelId, user]);

  const loadHotels = async () => {
    try {
      const data = await hotelsService.getHotels();
      let filteredHotels = data;

      if (isAdmin) {
        filteredHotels = data.filter(h => h.status === 'active');
      } else if (isBusiness && user?.businessId) {
        filteredHotels = data.filter(h => {
          const hotelBusinessId = typeof h.businessId === 'string'
            ? h.businessId
            : (h.businessId as any)?._id?.toString() || (h.businessId as any)?.toString();
          return hotelBusinessId === user.businessId && h.status === 'active';
        });
      } else if (isHotelManager && user?.hotelId) {
        filteredHotels = data.filter(h => h._id === user.hotelId);
        if (filteredHotels.length === 1) {
          setSelectedHotelIdFilter(filteredHotels[0]._id);
          setFormData(prev => ({ ...prev, hotelId: filteredHotels[0]._id }));
        }
      }
      setHotels(filteredHotels);
    } catch (error) {
      console.error('Error loading hotels:', error);
      Alert.alert(t('common.error'), 'Không thể tải danh sách khách sạn');
    }
  };

  const loadStaffs = async (hotelId: string) => {
    setLoading(true);
    try {
      const data = await staffService.getStaffs(hotelId);
      setStaffs(data);
    } catch (error) {
      console.error('Error loading staffs:', error);
      Alert.alert(t('common.error'), 'Không thể tải danh sách nhân viên');
    } finally {
      setLoading(false);
    }
  };

  const loadBusinessInfo = async (hotelId: string) => {
    try {
      const hotel = await hotelsService.getHotelById(hotelId);
      if (hotel && hotel.businessId) {
        // Extract businessId
        const businessId = typeof hotel.businessId === 'string'
          ? hotel.businessId
          : (hotel.businessId as any)?._id?.toString() || (hotel.businessId as any)?.toString();
        
        if (businessId) {
          try {
            // Try to get business info from API
            const { apiService } = await import('@/services/api');
            const business = await apiService.get(`/businesses/${businessId}`);
            setBusinessInfo(business);
            const logoId = (business as any).logoId;
            setBusinessLogo(logoId ? logoId : (business.logo || ''));
          } catch (error) {
            console.error('Error loading business info:', error);
            // Fallback: use hotel info
            setBusinessInfo({ name: hotel.name || 'Khách sạn' });
            setBusinessLogo('');
          }
        } else {
          // Fallback: use hotel info
          setBusinessInfo({ name: hotel.name || 'Khách sạn' });
          setBusinessLogo('');
        }
      } else {
        // Fallback: use hotel info
        setBusinessInfo({ name: hotel?.name || 'Khách sạn' });
        setBusinessLogo('');
      }
    } catch (error) {
      console.error('Error loading business info:', error);
      setBusinessInfo({ name: 'Khách sạn' });
      setBusinessLogo('');
    }
  };

  const loadUsers = async (hotelId: string) => {
    try {
      const assignedUserIds = staffs.map(s => s.userId);
      const allUsers = await userService.getAllUsers();
      const filteredUsers = allUsers.filter(u => {
        const isNotAssigned = !assignedUserIds.includes(u._id);
        const canBeAssigned = !u.hotelId || u.hotelId === hotelId;
        const isValidRole = ['staff', 'hotel', 'receptionist'].includes(u.role || '') || !u.role;
        return isNotAssigned && (canBeAssigned || isValidRole);
      });
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      try {
        const hotelUsers = await userService.getUsersByHotel(hotelId);
        const assignedUserIds = staffs.map(s => s.userId);
        setUsers(hotelUsers.filter(u => !assignedUserIds.includes(u._id)));
      } catch (err) {
        console.error('Error loading hotel users:', err);
        setUsers([]);
      }
    }
  };

  const onHotelChange = (hotelId: string | null) => {
    if (hotelId === selectedHotelIdFilter) return;
    setSelectedHotelIdFilter(hotelId);
    setStaffs([]);
    if (hotelId) {
      setFormData(prev => ({ ...prev, hotelId }));
      loadStaffs(hotelId);
      loadUsers(hotelId);
    }
  };

  const showAddForm = () => {
    setEditId(null);
    setSelectedStaff(null);
    resetForm();
    setFormData(prev => ({ ...prev, hotelId: selectedHotelIdFilter || '' }));
    setIsFormVisible(true);
  };

  const startEdit = (staff: Staff) => {
    setEditId(staff._id || null);
    setSelectedStaff({ ...staff });
    setIsFormVisible(true);

    setFormData({
      userId: staff.userId,
      hotelId: staff.hotelId,
      personalInfo: {
        firstName: staff.personalInfo?.firstName || '',
        lastName: staff.personalInfo?.lastName || '',
        dateOfBirth: staff.personalInfo?.dateOfBirth
          ? (typeof staff.personalInfo.dateOfBirth === 'string'
              ? staff.personalInfo.dateOfBirth.split('T')[0]
              : new Date(staff.personalInfo.dateOfBirth).toISOString().split('T')[0])
          : '',
        gender: staff.personalInfo?.gender || 'male',
        nationality: staff.personalInfo?.nationality || '',
        idType: staff.personalInfo?.idType || 'CMND',
        idNumber: staff.personalInfo?.idNumber || '',
        idExpiryDate: staff.personalInfo?.idExpiryDate
          ? (typeof staff.personalInfo.idExpiryDate === 'string'
              ? staff.personalInfo.idExpiryDate.split('T')[0]
              : new Date(staff.personalInfo.idExpiryDate).toISOString().split('T')[0])
          : '',
      },
      contactInfo: {
        email: staff.contactInfo?.email || '',
        phone: staff.contactInfo?.phone || '',
        emergencyContact: {
          name: staff.contactInfo?.emergencyContact?.name || '',
          relationship: staff.contactInfo?.emergencyContact?.relationship || '',
          phone: staff.contactInfo?.emergencyContact?.phone || '',
        },
        address: {
          street: staff.contactInfo?.address?.street || '',
          city: staff.contactInfo?.address?.city || '',
          state: staff.contactInfo?.address?.state || '',
          country: staff.contactInfo?.address?.country || 'Việt Nam',
          postalCode: staff.contactInfo?.address?.postalCode || '',
        },
      },
      employmentInfo: {
        position: staff.employmentInfo?.position || 'receptionist',
        department: staff.employmentInfo?.department || '',
        startDate: staff.employmentInfo?.startDate
          ? (typeof staff.employmentInfo.startDate === 'string'
              ? staff.employmentInfo.startDate.split('T')[0]
              : new Date(staff.employmentInfo.startDate).toISOString().split('T')[0])
          : new Date().toISOString().split('T')[0],
        endDate: staff.employmentInfo?.endDate
          ? (typeof staff.employmentInfo.endDate === 'string'
              ? staff.employmentInfo.endDate.split('T')[0]
              : new Date(staff.employmentInfo.endDate).toISOString().split('T')[0])
          : '',
        status: staff.employmentInfo?.status || 'active',
        salary: (staff.employmentInfo?.salary || 0).toString(),
        allowance: (staff.employmentInfo?.allowance || 0).toString(),
        insurance: (staff.employmentInfo?.insurance || 0).toString(),
        penalty: (staff.employmentInfo?.penalty || 0).toString(),
        bonus: (staff.employmentInfo?.bonus || 0).toString(),
        bankAccount: {
          bankName: staff.employmentInfo?.bankAccount?.bankName || '',
          accountNumber: staff.employmentInfo?.bankAccount?.accountNumber || '',
          accountName: staff.employmentInfo?.bankAccount?.accountName || '',
        },
        taxId: staff.employmentInfo?.taxId || '',
      },
      schedule: staff.schedule || [],
      permissions: staff.permissions || ['view'],
      notes: staff.notes || '',
    });

    // Add current user to users list if not present
    if (staff.userId) {
      const existingUser = users.find(u => u._id === staff.userId);
      if (!existingUser) {
        userService.getAllUsers().then(allUsers => {
          const user = allUsers.find(u => u._id === staff.userId);
          if (user && !users.find(u => u._id === user._id)) {
            setUsers([user, ...users]);
          }
        });
      }
    }
  };

  const stopEdit = () => {
    setEditId(null);
    setSelectedStaff(null);
    setIsFormVisible(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      userId: '',
      hotelId: selectedHotelIdFilter || '',
      personalInfo: {
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'male',
        nationality: '',
        idType: 'CMND',
        idNumber: '',
        idExpiryDate: '',
      },
      contactInfo: {
        email: '',
        phone: '',
        emergencyContact: {
          name: '',
          relationship: '',
          phone: '',
        },
        address: {
          street: '',
          city: '',
          state: '',
          country: 'Việt Nam',
          postalCode: '',
        },
      },
      employmentInfo: {
        position: 'receptionist',
        department: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        status: 'active',
        salary: '0',
        allowance: '0',
        insurance: '0',
        penalty: '0',
        bonus: '0',
        bankAccount: {
          bankName: '',
          accountNumber: '',
          accountName: '',
        },
        taxId: '',
      },
      schedule: [],
      permissions: ['view'],
      notes: '',
    });
  };

  const submitForm = async () => {
    if (!formData.hotelId) {
      Alert.alert(t('common.error'), 'Vui lòng chọn khách sạn');
      return;
    }
    if (!formData.userId) {
      Alert.alert(t('common.error'), 'Vui lòng chọn tài khoản người dùng');
      return;
    }
    if (!formData.personalInfo.firstName || !formData.personalInfo.lastName) {
      Alert.alert(t('common.error'), 'Vui lòng nhập họ và tên');
      return;
    }
    if (!formData.contactInfo.phone) {
      Alert.alert(t('common.error'), 'Vui lòng nhập số điện thoại');
      return;
    }

    setLoading(true);
    try {
      const staffData: Partial<Staff> = {
        userId: formData.userId,
        hotelId: formData.hotelId,
        personalInfo: {
          firstName: formData.personalInfo.firstName,
          lastName: formData.personalInfo.lastName,
          dateOfBirth: formData.personalInfo.dateOfBirth ? new Date(formData.personalInfo.dateOfBirth) : undefined,
          gender: formData.personalInfo.gender,
          nationality: formData.personalInfo.nationality,
          idType: formData.personalInfo.idType,
          idNumber: formData.personalInfo.idNumber,
          idExpiryDate: formData.personalInfo.idExpiryDate ? new Date(formData.personalInfo.idExpiryDate) : undefined,
        },
        contactInfo: {
          email: formData.contactInfo.email,
          phone: formData.contactInfo.phone,
          emergencyContact: formData.contactInfo.emergencyContact,
          address: formData.contactInfo.address,
        },
        employmentInfo: {
          position: formData.employmentInfo.position,
          department: formData.employmentInfo.department,
          startDate: formData.employmentInfo.startDate ? new Date(formData.employmentInfo.startDate) : undefined,
          endDate: formData.employmentInfo.endDate ? new Date(formData.employmentInfo.endDate) : undefined,
          status: formData.employmentInfo.status,
          salary: parseFloat(formData.employmentInfo.salary) || 0,
          allowance: parseFloat(formData.employmentInfo.allowance) || 0,
          insurance: parseFloat(formData.employmentInfo.insurance) || 0,
          penalty: parseFloat(formData.employmentInfo.penalty) || 0,
          bonus: parseFloat(formData.employmentInfo.bonus) || 0,
          bankAccount: formData.employmentInfo.bankAccount,
          taxId: formData.employmentInfo.taxId,
        },
        schedule: formData.schedule,
        permissions: formData.permissions,
        notes: formData.notes,
      };

      if (editId && selectedStaff) {
        await staffService.updateStaff(editId, staffData);
        Alert.alert(t('common.success'), 'Cập nhật nhân viên thành công');
        loadStaffs(formData.hotelId);
      } else {
        await staffService.createStaff(staffData);
        Alert.alert(t('common.success'), 'Thêm nhân viên thành công');
        loadStaffs(formData.hotelId);
        loadUsers(formData.hotelId);
      }
      stopEdit();
    } catch (error: any) {
      console.error('Error submitting staff form:', error);
      Alert.alert(t('common.error'), error.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const deleteStaff = async (staff: Staff) => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa nhân viên ${getStaffFullName(staff)}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await staffService.deleteStaff(staff._id!);
              Alert.alert(t('common.success'), 'Xóa nhân viên thành công');
              setStaffs(prev => prev.filter(s => s._id !== staff._id));
            } catch (error: any) {
              console.error('Error deleting staff:', error);
              Alert.alert(t('common.error'), error.message || 'Có lỗi xảy ra');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const openSalaryModal = (staff: Staff) => {
    setSelectedStaffForSalary(staff);
    setSalaryCalculationResult(null);
    setSalaryFormData({
      calculationDate: new Date().toISOString().split('T')[0],
      allowance: (staff.employmentInfo?.allowance || 0).toString(),
      insurance: (staff.employmentInfo?.insurance || 0).toString(),
      penalty: (staff.employmentInfo?.penalty || 0).toString(),
      bonus: (staff.employmentInfo?.bonus || 0).toString(),
      advancePayment: (staff.employmentInfo?.advancePayment || 0).toString(),
    });
    setIsSalaryModalVisible(true);
  };

  const closeSalaryModal = () => {
    setIsSalaryModalVisible(false);
    setSelectedStaffForSalary(null);
    setSalaryCalculationResult(null);
  };

  const calculateSalary = async () => {
    if (!selectedStaffForSalary) return;

    setLoading(true);
    try {
      const calculationData = {
        calculationDate: new Date(salaryFormData.calculationDate),
        allowance: parseFloat(salaryFormData.allowance) || 0,
        insurance: parseFloat(salaryFormData.insurance) || 0,
        penalty: parseFloat(salaryFormData.penalty) || 0,
        bonus: parseFloat(salaryFormData.bonus) || 0,
        advancePayment: parseFloat(salaryFormData.advancePayment) || 0,
      };

      const response = await staffService.calculateSalary(selectedStaffForSalary._id!, calculationData);
      
      if (response.data && response.data.breakdown) {
        setSalaryCalculationResult(response.data);
        // Kết quả sẽ được hiển thị trong modal
      } else {
        Alert.alert(t('common.error'), 'Không nhận được dữ liệu từ server');
      }
    } catch (error: any) {
      console.error('Error calculating salary:', error);
      Alert.alert(t('common.error'), error.message || 'Có lỗi xảy ra khi tính lương');
    } finally {
      setLoading(false);
    }
  };

  const paySalary = async () => {
    if (!selectedStaffForSalary || !salaryCalculationResult || !salaryCalculationResult.breakdown) {
      Alert.alert(t('common.error'), 'Vui lòng tính lương trước khi thanh toán');
      return;
    }

    Alert.alert(
      'Xác nhận thanh toán',
      `Bạn có chắc chắn muốn thanh toán lương cho ${getStaffFullName(selectedStaffForSalary)}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            setLoading(true);
            try {
              const breakdown = salaryCalculationResult.breakdown;
              const payData = {
                calculationDate: breakdown.calculationDate,
                baseDate: breakdown.baseDate,
                allowance: breakdown.allowance,
                insurance: breakdown.insurance,
                penalty: breakdown.penalty,
                bonus: breakdown.bonus,
                advancePayment: breakdown.advancePayment || 0,
                paymentDate: new Date(),
                paymentReference: '',
              };

              await staffService.paySalary(selectedStaffForSalary._id!, payData);
              Alert.alert(t('common.success'), 'Thanh toán lương thành công');
              closeSalaryModal();
              loadStaffs(selectedStaffForSalary.hotelId);
            } catch (error: any) {
              console.error('Error paying salary:', error);
              Alert.alert(t('common.error'), error.message || 'Có lỗi xảy ra khi thanh toán');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const exportSalaryPDFHandler = async () => {
    if (!selectedStaffForSalary || !salaryCalculationResult || !salaryCalculationResult.breakdown) {
      Alert.alert(t('common.warning'), 'Vui lòng tính lương trước khi xuất PDF');
      return;
    }

    setLoading(true);
    try {
      const pdfData: SalarySlipData = {
        breakdown: salaryCalculationResult.breakdown,
        staff: {
          personalInfo: {
            firstName: selectedStaffForSalary.personalInfo?.firstName || '',
            lastName: selectedStaffForSalary.personalInfo?.lastName || '',
          },
          employmentInfo: {
            position: selectedStaffForSalary.employmentInfo?.position || 'other',
            salary: selectedStaffForSalary.employmentInfo?.salary || 0,
            startDate: selectedStaffForSalary.employmentInfo?.startDate,
          },
        },
        businessInfo: businessInfo,
        businessLogo: businessLogo,
      };

      await exportSalaryPDF(pdfData);
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      Alert.alert(t('common.error'), error.message || 'Có lỗi xảy ra khi xuất PDF');
    } finally {
      setLoading(false);
    }
  };

  const addScheduleItem = () => {
    setFormData(prev => ({
      ...prev,
      schedule: [
        ...prev.schedule,
        {
          date: new Date(),
          shift: 'morning',
          startTime: '08:00',
          endTime: '16:00',
          status: 'scheduled',
        },
      ],
    }));
  };

  const removeScheduleItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      schedule: prev.schedule.filter((_, i) => i !== index),
    }));
  };

  if (loading && staffs.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1890ff" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý nhân viên</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Filter Section */}
        <View style={styles.filterSection}>
          <Text style={styles.inputLabel}>Khách sạn</Text>
          <CustomPicker
            selectedValue={selectedHotelIdFilter}
            onValueChange={onHotelChange}
            items={hotels.map(h => ({ label: h.name, value: h._id }))}
            placeholder="Chọn khách sạn"
            disabled={isHotelManager}
          />
        </View>

        {!selectedHotelIdFilter && (
          <View style={styles.alertContainer}>
            <Text style={styles.alertText}>Vui lòng chọn khách sạn để xem danh sách nhân viên</Text>
          </View>
        )}

        {/* Staff List */}
        {selectedHotelIdFilter && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Danh sách nhân viên</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={showAddForm}
                disabled={!selectedHotelIdFilter}
              >
                <IconSymbol name="plus.circle.fill" size={20} color="#fff" />
                <Text style={styles.addButtonText}>Thêm nhân viên</Text>
              </TouchableOpacity>
            </View>

            {staffs.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Chưa có nhân viên nào</Text>
              </View>
            ) : (
              staffs.map((staff) => (
                <View key={staff._id} style={styles.staffCard}>
                  <View style={styles.staffHeader}>
                    <View style={styles.staffAvatar}>
                      <Text style={styles.avatarText}>
                        {staff.personalInfo?.firstName?.charAt(0) || '?'}
                      </Text>
                    </View>
                    <View style={styles.staffInfo}>
                      <Text style={styles.staffName}>{getStaffFullName(staff)}</Text>
                      <Text style={styles.staffIdNumber}>
                        {staff.personalInfo?.idNumber || '-'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.staffDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Chức vụ:</Text>
                      <Text style={styles.detailValue}>
                        {getPositionLabel(staff.employmentInfo?.position || 'other')}
                      </Text>
                    </View>
                    {staff.employmentInfo?.department && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Phòng ban:</Text>
                        <Text style={styles.detailValue}>{staff.employmentInfo.department}</Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Liên hệ:</Text>
                      <Text style={styles.detailValue}>
                        {staff.contactInfo?.phone || '-'}
                        {staff.contactInfo?.email && ` | ${staff.contactInfo.email}`}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Trạng thái:</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              staff.employmentInfo?.status === 'active'
                                ? '#52c41a'
                                : staff.employmentInfo?.status === 'on_leave'
                                ? '#faad14'
                                : '#ff4d4f',
                          },
                        ]}
                      >
                        <Text style={styles.statusText}>
                          {getStatusLabel(staff.employmentInfo?.status || 'active')}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Lương:</Text>
                      <Text style={styles.detailValue}>
                        {formatCurrency(staff.employmentInfo?.salary || 0)} đ
                      </Text>
                    </View>
                  </View>

                  <View style={styles.staffActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => startEdit(staff)}
                    >
                      <IconSymbol name="pencil" size={16} color="#1890ff" />
                      <Text style={styles.actionButtonText}>Sửa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => openSalaryModal(staff)}
                    >
                      <IconSymbol name="dollarsign.circle.fill" size={16} color="#52c41a" />
                      <Text style={styles.actionButtonText}>Tính lương</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => deleteStaff(staff)}
                    >
                      <IconSymbol name="trash" size={16} color="#ff4d4f" />
                      <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Xóa</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Form Modal */}
      <Modal
        visible={isFormVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={stopEdit}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editId ? 'Cập nhật nhân viên' : 'Thêm nhân viên mới'}
            </Text>
            <TouchableOpacity onPress={stopEdit} style={styles.closeButton}>
              <IconSymbol name="xmark" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* User Selection */}
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Tài khoản người dùng *</Text>
              <CustomPicker
                selectedValue={formData.userId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, userId: value }))}
                items={users.map(u => ({
                  label: `${u.fullName || u.username || u.email} (${u.role || 'user'})`,
                  value: u._id,
                }))}
                placeholder="Chọn tài khoản"
                disabled={!!editId}
              />
              {users.length === 0 && !editId && (
                <Text style={styles.formHint}>
                  Không có tài khoản nào khả dụng. Vui lòng tạo tài khoản người dùng mới trước.
                </Text>
              )}
            </View>

            {/* Personal Info */}
            <Text style={styles.sectionDivider}>Thông tin cá nhân</Text>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Họ *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.personalInfo.firstName}
                onChangeText={(text) =>
                  setFormData(prev => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, firstName: text },
                  }))
                }
                placeholder="Họ"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Tên *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.personalInfo.lastName}
                onChangeText={(text) =>
                  setFormData(prev => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, lastName: text },
                  }))
                }
                placeholder="Tên"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Ngày sinh</Text>
              <TextInput
                style={styles.formInput}
                value={formData.personalInfo.dateOfBirth}
                onChangeText={(text) =>
                  setFormData(prev => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, dateOfBirth: text },
                  }))
                }
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Giới tính</Text>
              <CustomPicker
                selectedValue={formData.personalInfo.gender}
                onValueChange={(value) =>
                  setFormData(prev => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, gender: value as Gender },
                  }))
                }
                items={genderOptions}
                placeholder="Chọn giới tính"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Quốc tịch</Text>
              <TextInput
                style={styles.formInput}
                value={formData.personalInfo.nationality}
                onChangeText={(text) =>
                  setFormData(prev => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, nationality: text },
                  }))
                }
                placeholder="Quốc tịch"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Loại giấy tờ</Text>
              <CustomPicker
                selectedValue={formData.personalInfo.idType}
                onValueChange={(value) =>
                  setFormData(prev => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, idType: value },
                  }))
                }
                items={idTypeOptions}
                placeholder="Chọn loại giấy tờ"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Số giấy tờ</Text>
              <TextInput
                style={styles.formInput}
                value={formData.personalInfo.idNumber}
                onChangeText={(text) =>
                  setFormData(prev => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, idNumber: text },
                  }))
                }
                placeholder="Số CMND/CCCD"
              />
            </View>

            {/* Contact Info */}
            <Text style={styles.sectionDivider}>Thông tin liên hệ</Text>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Số điện thoại *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.contactInfo.phone}
                onChangeText={(text) =>
                  setFormData(prev => ({
                    ...prev,
                    contactInfo: { ...prev.contactInfo, phone: text },
                  }))
                }
                placeholder="Số điện thoại"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Email</Text>
              <TextInput
                style={styles.formInput}
                value={formData.contactInfo.email}
                onChangeText={(text) =>
                  setFormData(prev => ({
                    ...prev,
                    contactInfo: { ...prev.contactInfo, email: text },
                  }))
                }
                placeholder="Email"
                keyboardType="email-address"
              />
            </View>

            {/* Employment Info */}
            <Text style={styles.sectionDivider}>Thông tin công việc</Text>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Chức vụ *</Text>
              <CustomPicker
                selectedValue={formData.employmentInfo.position}
                onValueChange={(value) =>
                  setFormData(prev => ({
                    ...prev,
                    employmentInfo: { ...prev.employmentInfo, position: value as Position },
                  }))
                }
                items={positionOptions}
                placeholder="Chọn chức vụ"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Phòng ban</Text>
              <TextInput
                style={styles.formInput}
                value={formData.employmentInfo.department}
                onChangeText={(text) =>
                  setFormData(prev => ({
                    ...prev,
                    employmentInfo: { ...prev.employmentInfo, department: text },
                  }))
                }
                placeholder="Phòng ban"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Trạng thái *</Text>
              <CustomPicker
                selectedValue={formData.employmentInfo.status}
                onValueChange={(value) =>
                  setFormData(prev => ({
                    ...prev,
                    employmentInfo: { ...prev.employmentInfo, status: value as Status },
                  }))
                }
                items={statusOptions}
                placeholder="Chọn trạng thái"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Ngày bắt đầu</Text>
              <TextInput
                style={styles.formInput}
                value={formData.employmentInfo.startDate}
                onChangeText={(text) =>
                  setFormData(prev => ({
                    ...prev,
                    employmentInfo: { ...prev.employmentInfo, startDate: text },
                  }))
                }
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Lương cơ bản</Text>
              <TextInput
                style={styles.formInput}
                value={formData.employmentInfo.salary}
                onChangeText={(text) =>
                  setFormData(prev => ({
                    ...prev,
                    employmentInfo: { ...prev.employmentInfo, salary: text },
                  }))
                }
                placeholder="0"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Ghi chú</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                placeholder="Ghi chú..."
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.submitButton, styles.primaryButton]}
                onPress={submitForm}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {editId ? 'Cập nhật' : 'Thêm mới'}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={stopEdit}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Salary Calculation Modal */}
      <Modal
        visible={isSalaryModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeSalaryModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Tính lương</Text>
            <TouchableOpacity onPress={closeSalaryModal} style={styles.closeButton}>
              <IconSymbol name="xmark" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedStaffForSalary && (
              <>
                <View style={styles.staffInfoHeader}>
                  <Text style={styles.staffInfoName}>
                    {getStaffFullName(selectedStaffForSalary)}
                  </Text>
                  <Text style={styles.staffInfoDetails}>
                    {getPositionLabel(selectedStaffForSalary.employmentInfo?.position || 'other')} |{' '}
                    Lương cơ bản: {formatCurrency(selectedStaffForSalary.employmentInfo?.salary || 0)} đ
                  </Text>
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Ngày tính lương</Text>
                  <TextInput
                    style={styles.formInput}
                    value={salaryFormData.calculationDate}
                    onChangeText={(text) =>
                      setSalaryFormData(prev => ({ ...prev, calculationDate: text }))
                    }
                    placeholder="YYYY-MM-DD"
                  />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Phụ cấp</Text>
                  <TextInput
                    style={styles.formInput}
                    value={salaryFormData.allowance}
                    onChangeText={(text) =>
                      setSalaryFormData(prev => ({ ...prev, allowance: text }))
                    }
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Bảo hiểm</Text>
                  <TextInput
                    style={styles.formInput}
                    value={salaryFormData.insurance}
                    onChangeText={(text) =>
                      setSalaryFormData(prev => ({ ...prev, insurance: text }))
                    }
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Phạt</Text>
                  <TextInput
                    style={styles.formInput}
                    value={salaryFormData.penalty}
                    onChangeText={(text) =>
                      setSalaryFormData(prev => ({ ...prev, penalty: text }))
                    }
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Thưởng</Text>
                  <TextInput
                    style={styles.formInput}
                    value={salaryFormData.bonus}
                    onChangeText={(text) =>
                      setSalaryFormData(prev => ({ ...prev, bonus: text }))
                    }
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Ứng lương</Text>
                  <TextInput
                    style={styles.formInput}
                    value={salaryFormData.advancePayment}
                    onChangeText={(text) =>
                      setSalaryFormData(prev => ({ ...prev, advancePayment: text }))
                    }
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>

                {/* Kết quả tính lương */}
                {salaryCalculationResult && salaryCalculationResult.breakdown && (
                  <View style={styles.salaryResultContainer}>
                    <Text style={styles.salaryResultTitle}>Kết quả tính lương</Text>
                    <View style={styles.salaryResultRow}>
                      <Text style={styles.salaryResultLabel}>Lương cơ bản:</Text>
                      <Text style={styles.salaryResultValue}>
                        {formatCurrency(salaryCalculationResult.breakdown.baseSalary)} đ
                      </Text>
                    </View>
                    <View style={styles.salaryResultRow}>
                      <Text style={styles.salaryResultLabel}>Số ngày làm việc:</Text>
                      <Text style={styles.salaryResultValue}>
                        {salaryCalculationResult.breakdown.daysWorked}
                      </Text>
                    </View>
                    <View style={styles.salaryResultRow}>
                      <Text style={styles.salaryResultLabel}>Phụ cấp:</Text>
                      <Text style={styles.salaryResultValue}>
                        {formatCurrency(salaryCalculationResult.breakdown.allowance)} đ
                      </Text>
                    </View>
                    <View style={styles.salaryResultRow}>
                      <Text style={styles.salaryResultLabel}>Bảo hiểm:</Text>
                      <Text style={styles.salaryResultValue}>
                        {formatCurrency(salaryCalculationResult.breakdown.insurance)} đ
                      </Text>
                    </View>
                    <View style={styles.salaryResultRow}>
                      <Text style={styles.salaryResultLabel}>Phạt:</Text>
                      <Text style={styles.salaryResultValue}>
                        {formatCurrency(salaryCalculationResult.breakdown.penalty)} đ
                      </Text>
                    </View>
                    <View style={styles.salaryResultRow}>
                      <Text style={styles.salaryResultLabel}>Thưởng:</Text>
                      <Text style={styles.salaryResultValue}>
                        {formatCurrency(salaryCalculationResult.breakdown.bonus)} đ
                      </Text>
                    </View>
                    <View style={styles.salaryResultRow}>
                      <Text style={styles.salaryResultLabel}>Ứng lương:</Text>
                      <Text style={styles.salaryResultValue}>
                        {formatCurrency(salaryCalculationResult.breakdown.advancePayment)} đ
                      </Text>
                    </View>
                    <View style={[styles.salaryResultRow, styles.salaryResultTotal]}>
                      <Text style={[styles.salaryResultLabel, styles.salaryResultTotalLabel]}>
                        Lương thực nhận:
                      </Text>
                      <Text style={[styles.salaryResultValue, styles.salaryResultTotalValue]}>
                        {formatCurrency(salaryCalculationResult.breakdown.netSalary)} đ
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={[styles.submitButton, styles.primaryButton]}
                    onPress={calculateSalary}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitButtonText}>Tính lương</Text>
                    )}
                  </TouchableOpacity>
                  {salaryCalculationResult && (
                    <>
                      <TouchableOpacity
                        style={[styles.submitButton, styles.pdfButton]}
                        onPress={exportSalaryPDFHandler}
                        disabled={loading}
                      >
                        <IconSymbol name="file-pdf" size={16} color="#fff" />
                        <Text style={styles.submitButtonText}> Xuất PDF</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.submitButton, styles.successButton]}
                        onPress={paySalary}
                        disabled={loading}
                      >
                        {loading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.submitButtonText}>Thanh toán</Text>
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={closeSalaryModal}
                    disabled={loading}
                  >
                    <Text style={styles.cancelButtonText}>Đóng</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
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
    padding: 16,
  },
  filterSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputLabel: {
    fontSize: 13,
    color: '#555',
    marginBottom: 8,
    fontWeight: '500',
  },
  alertContainer: {
    backgroundColor: '#e6f7ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderColor: '#1890ff',
  },
  alertText: {
    fontSize: 13,
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#1890ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
  staffCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  staffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  staffAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1890ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  staffIdNumber: {
    fontSize: 12,
    color: '#666',
  },
  staffDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
    width: 100,
  },
  detailValue: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  staffActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    gap: 6,
  },
  deleteButton: {
    backgroundColor: '#fff5f5',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#333',
  },
  deleteButtonText: {
    color: '#ff4d4f',
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
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formRow: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    color: '#555',
    marginBottom: 8,
    fontWeight: '500',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sectionDivider: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 24,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  formHint: {
    fontSize: 12,
    color: '#faad14',
    marginTop: 4,
  },
  formActions: {
    flexDirection: 'row',
    marginTop: 24,
    marginBottom: 32,
    gap: 12,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#1890ff',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  staffInfoHeader: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  staffInfoName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  staffInfoDetails: {
    fontSize: 14,
    color: '#666',
  },
  salaryResultContainer: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 16,
  },
  salaryResultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  salaryResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  salaryResultLabel: {
    fontSize: 14,
    color: '#666',
  },
  salaryResultValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  salaryResultTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  salaryResultTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  salaryResultTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1890ff',
  },
  successButton: {
    backgroundColor: '#52c41a',
  },
  pdfButton: {
    backgroundColor: '#ff4d4f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
