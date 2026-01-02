// User Types
export type UserRole = 'superadmin' | 'admin' | 'business' | 'hotel' | 'staff' | 'guest';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'deleted';

export interface User {
  _id: string;
  username: string;
  email: string;
  password?: string;
  phone?: string;
  fullName?: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  lastLogin?: Date;
  lastLoginIp?: string;
  createdAt: Date;
  updatedAt: Date;
  twoFactorEnabled?: boolean;
  businessId?: string;
  hotelId?: string;
  preferences?: {
    language?: string;
    theme?: string;
    notifications?: {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
    };
  };
  permissions?: Array<'view' | 'create' | 'edit' | 'delete' | 'manage_revenue'>;
  features?: string[];
  qrPaymentFeature?: boolean;
  otaManagementFeature?: boolean;
  emailManagementFeature?: boolean;
  electricManagementFeature?: boolean;
  paypalPaymentFeature?: boolean;
  cryptoPaymentFeature?: boolean;
  draftInvoiceFeature?: boolean;
  exportInvoiceFeature?: boolean;
  aiChatboxFeature?: boolean;
  metadata?: any;
  bankAccount?: {
    bankName?: string;
    accountNumber?: string;
    accountHolderName?: string;
    beneficiaryName?: string;
    branch?: string;
    swiftCode?: string;
    iban?: string;
    qrPaymentUrl?: string;
  };
  personalInfo?: {
    dateOfBirth?: Date;
    gender?: string;
    nationality?: string;
    idCard?: string;
    idCardIssueDate?: Date;
    idCardIssuePlace?: string;
    address?: {
      street?: string;
      ward?: string;
      district?: string;
      city?: string;
      country?: string;
      postalCode?: string;
    };
  };
}

// Room Types
export type RoomStatus = 'vacant' | 'occupied' | 'cleaning' | 'dirty' | 'maintenance' | 'booked';
export type GuestStatus = 'in' | 'out';
export type RateType = 'hourly' | 'daily' | 'nightly';

// Service Types
export type ServiceCategory = 'room_service' | 'food' | 'beverage' | 'spa' | 'transport' | 'custom';

export const ALL_SERVICE_CATEGORIES: ServiceCategory[] = [
  'room_service', 'food', 'beverage', 'spa', 'transport', 'custom'
];

export interface Service {
  _id?: string;
  name: string;
  description?: string;
  price: number;
  category: ServiceCategory;
  hotelId: string;
  image?: string;
  isActive: boolean;
  currency?: string;
  isCustom?: boolean;
  costPrice?: number;
  importQuantity?: number;
  salesQuantity?: number;
  inventory?: number;
  metadata?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RoomCapacity {
  adults?: number;
  children?: number;
}

export interface RoomPricing {
  hourly?: number;
  daily?: number;
  nightly?: number;
  weekly?: number;
  monthly?: number;
  currency?: string;
}

export interface SpecialPrice {
  startDate: Date;
  endDate: Date;
  hourly?: number;
  daily?: number;
  nightly?: number;
  weekly?: number;
  monthly?: number;
  reason?: 'season' | 'holiday' | 'promotion' | 'other';
}

export interface GuestInfo {
  name?: string;
  phone?: string;
  email?: string;
  idNumber?: string;
  address?: string;
  nationality?: string;
  guestSource?: 'walkin' | 'booking' | 'ota' | 'phone' | 'other';
}

export interface Event {
  _id?: string;
  type: 'checkin' | 'checkout' | 'booking' | 'cancel_booking' | 'guest_out' | 'guest_in' | 'cleaning' | 'maintenance' | 'checked_in';
  guestInfo?: GuestInfo;
  checkinTime?: Date | string;
  checkoutTime?: Date | string;
  expectedCheckoutTime?: Date | string;
  rateType?: RateType;
  advancePayment?: number;
  additionalCharges?: number;
  discount?: number;
  notes?: string;
  createdAt?: Date | string;
  cancelledAt?: Date | string;
  cancelReason?: string;
  bookingId?: string;
  staffId?: string;
  paymentMethod?: string;
  services?: any[];
  selectedServices?: any[];
}

export interface BookingHistory {
  _id?: string;
  event: 'check-in' | 'check-out' | 'booking' | 'transfer';
  guestInfo?: GuestInfo;
  checkInTime?: Date;
  checkOutTime?: Date;
  rateType?: RateType;
  totalAmount?: number;
  paidAmount?: number;
  invoiceId?: string;
  createdAt?: Date;
}

export interface Room {
  _id: string;
  hotelId: string;
  roomNumber: string;
  floor: string;
  type: string;
  capacity?: RoomCapacity;
  amenities?: string[];
  images?: string[];
  status: RoomStatus;
  guestStatus?: GuestStatus;
  pricing?: RoomPricing;
  firstHourRate?: number;
  additionalHourRate?: number;
  priceConfigId?: string;
  priceSettings?: {
    nightlyStartTime?: string;
    nightlyEndTime?: string;
    dailyStartTime?: string;
    dailyEndTime?: string;
    autoNightlyHours?: number;
    gracePeriodMinutes?: number;
    timezone?: string;
    dailyEarlyCheckinSurcharge?: number;
    dailyLateCheckoutFee?: number;
    nightlyEarlyCheckinSurcharge?: number;
    nightlyLateCheckoutSurcharge?: number;
  };
  specialPricing?: SpecialPrice[];
  lastCleaned?: Date;
  lastMaintenance?: Date;
  description?: string;
  notes?: string;
  services?: string[];
  events?: Event[];
  bookingHistory?: BookingHistory[];
  currentBooking?: {
    guestInfo?: GuestInfo;
    checkInDate?: Date;
    checkOutDate?: Date;
    rateType?: RateType;
    advancePayment?: number;
    notes?: string;
    transferredFrom?: string;
    transferredTo?: string;
    transferredAt?: Date;
    transferredBy?: string;
    transferHistory?: any[];
  };
  revenue?: {
    total?: number;
    history?: Array<{
      date: Date;
      amount: number;
      bookingId?: string;
    }>;
  };
  createdAt?: Date;
  updatedAt?: Date;
  metadata?: any;
}

// Booking Types
export interface Booking {
  _id?: string;
  bookingId?: string;
  roomId?: string;
  roomNumber?: string;
  hotelId?: string;
  guestInfo?: GuestInfo;
  checkInDate?: Date | string;
  checkOutDate?: Date | string;
  rateType?: RateType;
  status?: 'booked' | 'checked_in' | 'cancelled' | 'checked_out';
  advancePayment?: number;
  notes?: string;
  createdAt?: Date | string;
  userName?: string;
  startTime?: string;
  endTime?: string;
  date?: Date;
}

// Hotel Types
export interface Hotel {
  _id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  businessId?: string;
  status?: 'active' | 'inactive';
  createdAt?: Date;
  updatedAt?: Date;
}

// Auth Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  message: string;
  error?: string;
  statusCode?: number;
}

// Invoice Types
export interface Invoice {
  _id?: string;
  id?: string;
  invoiceNumber?: string;
  date?: Date | string;
  customerName?: string;
  staffName?: string;
  roomId?: string;
  roomNumber?: string;
  checkInTime?: Date | string;
  checkOutTime?: Date | string;
  checkIn?: Date | string;
  checkOut?: Date | string;
  products?: any[];
  amount?: number;
  totalAmount?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  hotelId?: string;
  businessName?: string;
  business_address?: string;
  phoneNumber?: string;
  notes?: string;
  bookingId?: string;
  guestInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  status?: 'pending' | 'paid' | 'cancelled';
  items?: {
    name: string;
    price: number;
    quantity: number;
  }[];
  [key: string]: any;
}

// Staff Types
export interface StaffPersonalInfo {
  firstName: string;
  lastName: string;
  dateOfBirth?: Date | string;
  gender?: 'male' | 'female' | 'other';
  nationality?: string;
  idType?: string;
  idNumber?: string;
  idExpiryDate?: Date | string;
  idScanUrl?: string;
}

export interface EmergencyContact {
  name?: string;
  relationship?: string;
  phone?: string;
}

export interface StaffAddress {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface StaffContactInfo {
  email?: string;
  phone?: string;
  emergencyContact?: EmergencyContact;
  address?: StaffAddress;
}

export interface StaffBankAccount {
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
}

export interface StaffEmploymentInfo {
  position: 'manager' | 'receptionist' | 'housekeeper' | 'maintenance' | 'other';
  department?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  status: 'active' | 'on_leave' | 'terminated';
  salary?: number;
  allowance?: number; // Phụ cấp
  insurance?: number; // Bảo hiểm
  penalty?: number; // Phạt
  bonus?: number; // Thưởng
  advancePayment?: number; // Ứng lương
  bankAccount?: StaffBankAccount;
  taxId?: string;
}

export interface StaffSchedule {
  date: Date | string;
  shift: 'morning' | 'afternoon' | 'night' | 'full-day';
  startTime?: string;
  endTime?: string;
  status?: 'scheduled' | 'completed' | 'absent' | 'late';
}

export interface StaffAttendance {
  date: Date | string;
  checkIn?: Date | string;
  checkOut?: Date | string;
  hoursWorked?: number;
  overtime?: number;
  status: 'present' | 'absent' | 'late' | 'leave';
}

export interface StaffLeave {
  startDate: Date | string;
  endDate: Date | string;
  type: 'annual' | 'sick' | 'personal' | 'unpaid';
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  approvedBy?: string;
}

export interface StaffPayroll {
  period: {
    startDate: Date | string;
    endDate: Date | string;
  };
  baseSalary: number;
  daysWorked?: number;
  allowance?: number;
  insurance?: number;
  penalty?: number;
  bonus?: number;
  advancePayment?: number;
  overtime?: number;
  bonuses?: number;
  deductions?: number;
  netSalary: number;
  paymentDate?: Date | string;
  paymentStatus: 'pending' | 'paid';
  paymentReference?: string;
  calculatedAt?: Date | string;
}

export type StaffPermission = 'view' | 'create' | 'edit' | 'delete' | 'manage_rooms' | 'manage_bookings';

export interface Staff {
  _id?: string;
  userId: string;
  hotelId: string;
  personalInfo: StaffPersonalInfo;
  contactInfo?: StaffContactInfo;
  employmentInfo: StaffEmploymentInfo;
  schedule?: StaffSchedule[];
  attendance?: StaffAttendance[];
  leaves?: StaffLeave[];
  payroll?: StaffPayroll[];
  permissions?: StaffPermission[];
  notes?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  metadata?: any;
}

// Helper functions
export function getStaffFullName(staff: Staff): string {
  if (!staff.personalInfo) return 'N/A';
  return `${staff.personalInfo.firstName || ''} ${staff.personalInfo.lastName || ''}`.trim() || 'N/A';
}

export function getPositionLabel(position: string): string {
  const labels: Record<string, string> = {
    'manager': 'Quản lý',
    'receptionist': 'Lễ tân',
    'housekeeper': 'Housekeeping',
    'maintenance': 'Bảo trì',
    'other': 'Khác'
  };
  return labels[position] || position;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'active': 'Đang làm việc',
    'on_leave': 'Nghỉ phép',
    'terminated': 'Đã nghỉ việc'
  };
  return labels[status] || status;
}

export function getShiftLabel(shift: string): string {
  const labels: Record<string, string> = {
    'morning': 'Ca sáng',
    'afternoon': 'Ca chiều',
    'night': 'Ca đêm',
    'full-day': 'Cả ngày'
  };
  return labels[shift] || shift;
}

