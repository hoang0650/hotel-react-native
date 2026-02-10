import { Room, Guest, Booking, DashboardStats } from '@/types/hotel';

export const mockRooms: Room[] = [
  { id: '1', number: '101', floor: 1, type: 'standard', status: 'occupied', price: 800000, capacity: 2, amenities: ['WiFi', 'TV', 'AC'], currentGuest: 'Nguyễn Văn A', checkoutDate: '2026-02-11' },
  { id: '2', number: '102', floor: 1, type: 'standard', status: 'available', price: 800000, capacity: 2, amenities: ['WiFi', 'TV', 'AC'] },
  { id: '3', number: '103', floor: 1, type: 'deluxe', status: 'cleaning', price: 1200000, capacity: 2, amenities: ['WiFi', 'TV', 'AC', 'Minibar'] },
  { id: '4', number: '201', floor: 2, type: 'deluxe', status: 'occupied', price: 1200000, capacity: 3, amenities: ['WiFi', 'TV', 'AC', 'Minibar'], currentGuest: 'Trần Thị B', checkoutDate: '2026-02-12' },
  { id: '5', number: '202', floor: 2, type: 'suite', status: 'available', price: 2000000, capacity: 4, amenities: ['WiFi', 'TV', 'AC', 'Minibar', 'Jacuzzi'] },
  { id: '6', number: '203', floor: 2, type: 'suite', status: 'maintenance', price: 2000000, capacity: 4, amenities: ['WiFi', 'TV', 'AC', 'Minibar', 'Jacuzzi'] },
  { id: '7', number: '301', floor: 3, type: 'presidential', status: 'available', price: 5000000, capacity: 6, amenities: ['WiFi', 'TV', 'AC', 'Minibar', 'Jacuzzi', 'Private Pool'] },
  { id: '8', number: '302', floor: 3, type: 'deluxe', status: 'occupied', price: 1200000, capacity: 3, amenities: ['WiFi', 'TV', 'AC', 'Minibar'], currentGuest: 'Lê Văn C', checkoutDate: '2026-02-10' },
  { id: '9', number: '104', floor: 1, type: 'standard', status: 'available', price: 800000, capacity: 2, amenities: ['WiFi', 'TV', 'AC'] },
  { id: '10', number: '204', floor: 2, type: 'deluxe', status: 'occupied', price: 1200000, capacity: 3, amenities: ['WiFi', 'TV', 'AC', 'Minibar'], currentGuest: 'Phạm Thị D', checkoutDate: '2026-02-13' },
];

export const mockGuests: Guest[] = [
  { id: '1', name: 'Nguyễn Văn A', email: 'nguyenvana@email.com', phone: '0901234567', idNumber: '001234567890', nationality: 'Việt Nam', totalStays: 5, totalSpent: 12000000, vipStatus: true },
  { id: '2', name: 'Trần Thị B', email: 'tranthib@email.com', phone: '0912345678', idNumber: '001234567891', nationality: 'Việt Nam', totalStays: 2, totalSpent: 4000000, vipStatus: false },
  { id: '3', name: 'Lê Văn C', email: 'levanc@email.com', phone: '0923456789', idNumber: '001234567892', nationality: 'Việt Nam', totalStays: 8, totalSpent: 25000000, vipStatus: true },
  { id: '4', name: 'Phạm Thị D', email: 'phamthid@email.com', phone: '0934567890', idNumber: '001234567893', nationality: 'Việt Nam', totalStays: 1, totalSpent: 2400000, vipStatus: false },
  { id: '5', name: 'John Smith', email: 'john@email.com', phone: '+1234567890', idNumber: 'P123456789', nationality: 'USA', totalStays: 3, totalSpent: 15000000, vipStatus: true },
];

export const mockBookings: Booking[] = [
  { id: '1', guestId: '1', guestName: 'Nguyễn Văn A', roomId: '1', roomNumber: '101', checkIn: '2026-02-08', checkOut: '2026-02-11', status: 'checked_in', totalAmount: 2400000, paidAmount: 2400000, adults: 2, children: 0, createdAt: '2026-02-05' },
  { id: '2', guestId: '2', guestName: 'Trần Thị B', roomId: '4', roomNumber: '201', checkIn: '2026-02-09', checkOut: '2026-02-12', status: 'checked_in', totalAmount: 3600000, paidAmount: 1800000, adults: 2, children: 1, createdAt: '2026-02-06' },
  { id: '3', guestId: '3', guestName: 'Lê Văn C', roomId: '8', roomNumber: '302', checkIn: '2026-02-07', checkOut: '2026-02-10', status: 'checked_in', totalAmount: 3600000, paidAmount: 3600000, adults: 1, children: 0, createdAt: '2026-02-04' },
  { id: '4', guestId: '4', guestName: 'Phạm Thị D', roomId: '10', roomNumber: '204', checkIn: '2026-02-10', checkOut: '2026-02-13', status: 'confirmed', totalAmount: 3600000, paidAmount: 0, adults: 2, children: 0, specialRequests: 'Early check-in', createdAt: '2026-02-08' },
  { id: '5', guestId: '5', guestName: 'John Smith', roomId: '7', roomNumber: '301', checkIn: '2026-02-12', checkOut: '2026-02-15', status: 'confirmed', totalAmount: 15000000, paidAmount: 15000000, adults: 2, children: 2, specialRequests: 'Airport pickup', createdAt: '2026-02-01' },
];

export const mockDashboardStats: DashboardStats = {
  totalRooms: 10,
  occupiedRooms: 4,
  availableRooms: 4,
  cleaningRooms: 1,
  todayCheckIns: 2,
  todayCheckOuts: 1,
  occupancyRate: 40,
  todayRevenue: 8400000,
  monthlyRevenue: 156000000,
};
