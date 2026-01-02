export const API_CONFIG = {
  BASE_URL: 'https://nest-production-8106.up.railway.app',
  API_PREFIX: '/api',
  TIMEOUT: 30000, // 30 seconds
};

// Note: Rooms endpoints không có /api prefix
// Users endpoints có /api prefix

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/users/login',
    REGISTER: '/users/register',
    LOGOUT: '/users/logout',
    REFRESH: '/users/refresh',
    PROFILE: '/users/profile',
  },
  ROOMS: {
    BASE: '/rooms',
    BY_ID: (id: string) => `/rooms/${id}`,
    EVENTS: (id: string) => `/rooms/${id}/events`,
    AVAILABLE: '/rooms/available',
    CHECKIN: (id: string) => `/rooms/checkin/${id}`,
    CHECKOUT: (id: string) => `/rooms/checkout/${id}`,
    BOOKING: '/rooms/booking',
    CANCEL_BOOKING: (id: string) => `/rooms/booking/cancel/${id}`,
    BOOKINGS: '/rooms/bookings',
  },
  HOTELS: {
    BASE: '/hotels',
    BY_ID: (id: string) => `/hotels/${id}`,
  },
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/users/${id}`,
  },
  BOOKINGS: {
    BASE: '/bookings',
    BY_ID: (id: string) => `/bookings/${id}`,
  },
  FINANCIAL: {
    SUMMARY: '/financial-summary',
    EXPORT_EXCEL: '/financial-summary/export-excel',
  },
  SERVICES: {
    BASE: '/services',
    BY_ID: (id: string) => `/services/${id}`,
    CATEGORIES: '/services/categories',
    ORDERS: '/services/orders',
    ORDER_BY_ID: (id: string) => `/services/orders/${id}`,
    ORDERS_BY_ROOM: (roomId: string) => `/services/orders/room/${roomId}`,
    ORDERS_BY_HOTEL: '/services/orders/hotel',
    AVAILABLE: '/services/available',
    CHECKOUT: (bookingId: string) => `/services/checkout/${bookingId}`,
    CALCULATE_TOTAL: '/services/calculate-total',
    ASSIGN: '/services/assign',
    BULK_ASSIGN: '/services/bulk-assign',
  },
  STAFFS: {
    BASE: '/staffs',
    BY_ID: (id: string) => `/staffs/${id}`,
    BY_HOTEL: (hotelId: string) => `/staffs/hotel/${hotelId}`,
    CALCULATE_SALARY: (staffId: string) => `/staffs/${staffId}/calculate-salary`,
    PAY_SALARY: (staffId: string) => `/staffs/${staffId}/pay-salary`,
  },
};

