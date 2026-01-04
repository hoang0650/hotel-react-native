import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'vi' | 'en';

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// Translation data
const translations: Record<Language, Record<string, string>> = {
  vi: {
    // Profile
    'profile.account': 'Tài khoản',
    'profile.settings': 'Cài đặt',
    'profile.logout': 'Đăng xuất',
    'profile.changeTheme': 'Đổi theme',
    'profile.changeLanguage': 'Đổi ngôn ngữ',
    'profile.support': 'Hỗ trợ',
    'profile.contact': 'Liên hệ',
    'profile.versionInfo': 'Thông tin phiên bản',
    'profile.theme.light': 'Sáng',
    'profile.theme.dark': 'Tối',
    'profile.theme.auto': 'Tự động',
    'profile.language.vi': 'Tiếng Việt',
    'profile.language.en': 'English',
    'profile.support.email': 'Email hỗ trợ',
    'profile.support.hotline': 'Hotline',
    'profile.contact.email': 'Email',
    'profile.contact.phone': 'Điện thoại',
    'profile.contact.website': 'Website',
    'profile.version.app': 'Phiên bản ứng dụng',
    'profile.version.build': 'Số build',
    'profile.version.platform': 'Nền tảng',
    'profile.version.copyright': '© 2024 PHHotel. All rights reserved.',
    'profile.language.changed': 'Ngôn ngữ đã được thay đổi thành công.',
    'profile.language.restart': 'Vui lòng khởi động lại ứng dụng để áp dụng thay đổi.',
    'profile.theme.changed': 'Theme đã được thay đổi thành công.',
    'profile.support.description': 'Chúng tôi luôn sẵn sàng hỗ trợ bạn. Vui lòng liên hệ với chúng tôi qua:',
    'profile.support.hours': 'Thời gian hỗ trợ: 24/7',
    'profile.contact.description': 'Liên hệ với chúng tôi qua các kênh sau:',
    // Navigation
    'nav.overview': 'Tổng quan',
    'nav.rooms': 'Sơ đồ',
    'nav.calendar': 'Lịch phòng',
    'nav.management': 'Quản lý',
    'nav.reports': 'Báo cáo',
    'nav.profile': 'Cá nhân',
    // Home Screen
    'home.title': 'Phần mềm Quản lý Khách sạn',
    'home.welcome': 'Chào mừng bạn trở lại!',
    'home.room.vacant': 'Phòng Trống',
    'home.room.booked': 'Phòng Đã đặt',
    'home.room.occupied': 'Phòng Đang ở',
    'home.room.cleaning': 'Đang dọn dẹp',
    'home.ota.title': 'Đồng bộ đặt phòng OTA',
    'home.ota.description': 'Kết nối với các nền tảng đặt phòng trực tuyến',
    'home.ota.connect': 'Kết nối',
    'home.quickAccess.title': 'Truy cập nhanh',
    'home.quickAccess.invoices': 'Hóa đơn',
    'home.quickAccess.services': 'Dịch vụ',
    'home.quickAccess.staff': 'Nhân viên',
    'home.quickAccess.rooms': 'Phòng',
    'home.quickAccess.guests': 'Khách hàng',
    'home.quickAccess.debt': 'Công nợ',
    'home.quickAccess.shiftHistory': 'Lịch sử giao ca',
    'home.quickAccess.paymentHistory': 'Lịch sử thanh toán',
    'home.recentActivities.title': 'Hoạt động gần đây',
    'home.revenue.title': 'Thống kê doanh thu',
    'home.revenue.day': 'Ngày',
    'home.revenue.week': 'Tuần',
    'home.revenue.month': 'Tháng',
    'home.sales.title': 'Thống kê lượt bán phòng',
    'home.ota.login.title': 'Đăng nhập {{ota}}',
    'home.ota.login.username': 'Tên đăng nhập',
    'home.ota.login.password': 'Mật khẩu',
    'home.ota.login.connect': 'Kết nối',
    'home.ota.login.cancel': 'Hủy',
    'home.recentBookings.title': 'Đặt phòng gần đây',
    'home.recentBookings.empty': 'Không có đặt phòng gần đây',
    'home.recentBookings.room': 'Phòng',
    'home.recentActivities.title': 'Hoạt động gần đây',
    'home.revenue.total': 'Tổng doanh thu:',
    'home.revenue.period.day': 'Theo ngày',
    'home.revenue.period.week': 'Theo tuần',
    'home.revenue.period.month': 'Theo tháng',
    'home.sales.total': 'Tổng lượt bán:',
    'home.sales.period.day': 'Theo ngày',
    'home.sales.period.week': 'Theo tuần',
    'home.sales.period.month': 'Theo tháng',
    'home.quickAccess.account': 'Tài khoản',
    // Rooms Screen
    'rooms.title': 'Sơ đồ phòng',
    'rooms.filter.all': 'Tất cả',
    'rooms.filter.vacant': 'Trống',
    'rooms.filter.occupied': 'Có khách',
    'rooms.filter.cleaning': 'Đang dọn',
    'rooms.filter.maintenance': 'Bảo trì',
    'rooms.filter.guestOut': 'Khách ra ngoài',
    'rooms.stats.total': 'Tổng',
    'rooms.stats.vacant': 'Trống',
    'rooms.stats.occupied': 'Có khách',
    'rooms.stats.cleaning': 'Đang dọn',
    'rooms.stats.maintenance': 'Bảo trì',
    'rooms.stats.guestOut': 'Ra ngoài',
    'rooms.view.list': 'Danh sách',
    'rooms.view.grid': 'Lưới',
    'rooms.floor.all': 'Tất cả tầng',
    // Calendar Screen
    'calendar.title': 'Lịch phòng',
    'calendar.today': 'Hôm nay',
    'calendar.legend.today': 'Hôm nay',
    'calendar.legend.checkin': 'Nhận phòng',
    'calendar.legend.checkout': 'Trả phòng',
    'calendar.legend.booking': 'Có đặt phòng',
    'calendar.noBookings': 'Không có đặt phòng nào',
    // Reports Screen
    'reports.title': 'Báo cáo',
    'reports.invoices': 'Hóa đơn',
    'reports.invoices.description': 'Xem và quản lý hóa đơn',
    'reports.revenue': 'Doanh thu',
    'reports.revenue.description': 'Thống kê doanh thu theo thời gian',
    'reports.paymentHistory': 'Lịch sử thanh toán',
    'reports.paymentHistory.description': 'Xem lịch sử thanh toán',
    'reports.shiftHistory': 'Lịch sử giao ca',
    'reports.shiftHistory.description': 'Xem lịch sử giao ca',
    'reports.financialSummary': 'Báo cáo tài chính tổng hợp',
    'reports.financialSummary.description': 'Báo cáo tài chính chi tiết',
    'reports.bankTransfer': 'Lịch sử chuyển khoản',
    'reports.bankTransfer.description': 'Xem lịch sử chuyển khoản ngân hàng',
    // Common
    'common.ok': 'OK',
    'common.cancel': 'Hủy',
    'common.save': 'Lưu',
    'common.close': 'Đóng',
    'common.loading': 'Đang tải...',
    'common.error': 'Lỗi',
    'common.success': 'Thành công',
    'common.back': 'Quay lại',
    'common.reload': 'Tải lại',
    // Notifications
    'notifications.title': 'Thông báo',
    'notifications.all': 'Tất cả',
    'notifications.system': 'Hệ thống',
    'notifications.hotel': 'Khách sạn',
    'notifications.no_notifications': 'Không có thông báo nào',
    'notifications.mark_all_read': 'Đánh dấu tất cả đã đọc',
    'notifications.high_priority': 'Ưu tiên cao',
    'notifications.type_maintenance': 'Bảo trì',
    'notifications.type_update': 'Cập nhật',
    'notifications.type_info': 'Thông tin',
    'notifications.type_warning': 'Cảnh báo',
    'notifications.type_success': 'Thành công',
    'notifications.type_general': 'Thông báo',
  },
  en: {
    // Profile
    'profile.account': 'Account',
    'profile.settings': 'Settings',
    'profile.logout': 'Logout',
    'profile.changeTheme': 'Change Theme',
    'profile.changeLanguage': 'Change Language',
    'profile.support': 'Support',
    'profile.contact': 'Contact',
    'profile.versionInfo': 'Version Info',
    'profile.theme.light': 'Light',
    'profile.theme.dark': 'Dark',
    'profile.theme.auto': 'Auto',
    'profile.language.vi': 'Vietnamese',
    'profile.language.en': 'English',
    'profile.support.email': 'Support Email',
    'profile.support.hotline': 'Hotline',
    'profile.contact.email': 'Email',
    'profile.contact.phone': 'Phone',
    'profile.contact.website': 'Website',
    'profile.version.app': 'App Version',
    'profile.version.build': 'Build Number',
    'profile.version.platform': 'Platform',
    'profile.version.copyright': '© 2024 PHHotel. All rights reserved.',
    'profile.language.changed': 'Language changed successfully.',
    'profile.language.restart': 'Please restart the app to apply changes.',
    'profile.theme.changed': 'Theme changed successfully.',
    'profile.support.description': 'We are always ready to support you. Please contact us via:',
    'profile.support.hours': 'Support hours: 24/7',
    'profile.contact.description': 'Contact us through the following channels:',
    // Navigation
    'nav.overview': 'Overview',
    'nav.rooms': 'Rooms',
    'nav.calendar': 'Calendar',
    'nav.management': 'Management',
    'nav.reports': 'Reports',
    'nav.profile': 'Profile',
    // Home Screen
    'home.title': 'Hotel Management Software',
    'home.welcome': 'Welcome back!',
    'home.room.vacant': 'Vacant',
    'home.room.booked': 'Booked',
    'home.room.occupied': 'Occupied',
    'home.room.cleaning': 'Cleaning',
    'home.ota.title': 'OTA Booking Synchronization',
    'home.ota.description': 'Connect with online booking platforms',
    'home.ota.connect': 'Connect',
    'home.quickAccess.title': 'Quick Access',
    'home.quickAccess.invoices': 'Invoices',
    'home.quickAccess.services': 'Services',
    'home.quickAccess.staff': 'Staff',
    'home.quickAccess.rooms': 'Room',
    'home.quickAccess.guests': 'Guest',
    'home.quickAccess.debt': 'Debt',
    'home.quickAccess.shiftHistory': 'Shift History',
    'home.quickAccess.paymentHistory': 'Payment History',
    'home.recentActivities.title': 'Recent Activities',
    'home.revenue.title': 'Revenue Statistics',
    'home.revenue.day': 'Day',
    'home.revenue.week': 'Week',
    'home.revenue.month': 'Month',
    'home.sales.title': 'Room Sales Statistics',
    'home.ota.login.title': 'Login to {{ota}}',
    'home.ota.login.username': 'Username',
    'home.ota.login.password': 'Password',
    'home.ota.login.connect': 'Connect',
    'home.ota.login.cancel': 'Cancel',
    'home.recentBookings.title': 'Recent Bookings',
    'home.recentBookings.empty': 'No recent bookings',
    'home.recentBookings.room': 'Room',
    'home.recentActivities.title': 'Recent Activities',
    'home.revenue.total': 'Total Revenue:',
    'home.revenue.period.day': 'By Day',
    'home.revenue.period.week': 'By Week',
    'home.revenue.period.month': 'By Month',
    'home.sales.total': 'Total Sales:',
    'home.sales.period.day': 'By Day',
    'home.sales.period.week': 'By Week',
    'home.sales.period.month': 'By Month',
    'home.quickAccess.account': 'Account',
    // Rooms Screen
    'rooms.title': 'Room Diagram',
    'rooms.filter.all': 'All',
    'rooms.filter.vacant': 'Vacant',
    'rooms.filter.occupied': 'Occupied',
    'rooms.filter.cleaning': 'Cleaning',
    'rooms.filter.maintenance': 'Maintenance',
    'rooms.filter.guestOut': 'Guest Out',
    'rooms.stats.total': 'Total',
    'rooms.stats.vacant': 'Vacant',
    'rooms.stats.occupied': 'Occupied',
    'rooms.stats.cleaning': 'Cleaning',
    'rooms.stats.maintenance': 'Maintenance',
    'rooms.stats.guestOut': 'Out',
    'rooms.view.list': 'List',
    'rooms.view.grid': 'Grid',
    'rooms.floor.all': 'All Floors',
    // Calendar Screen
    'calendar.title': 'Room Calendar',
    'calendar.today': 'Today',
    'calendar.legend.today': 'Today',
    'calendar.legend.checkin': 'Check-in',
    'calendar.legend.checkout': 'Check-out',
    'calendar.legend.booking': 'Has Booking',
    'calendar.noBookings': 'No bookings',
    // Reports Screen
    'reports.title': 'Reports',
    'reports.invoices': 'Invoices',
    'reports.invoices.description': 'View and manage invoices',
    'reports.revenue': 'Revenue',
    'reports.revenue.description': 'Revenue statistics over time',
    'reports.paymentHistory': 'Payment History',
    'reports.paymentHistory.description': 'View payment history',
    'reports.shiftHistory': 'Shift Handover History',
    'reports.shiftHistory.description': 'View shift handover history',
    'reports.financialSummary': 'Financial Summary Report',
    'reports.financialSummary.description': 'Detailed financial report',
    'reports.bankTransfer': 'Bank Transfer History',
    'reports.bankTransfer.description': 'View bank transfer history',
    // Common
    'common.ok': 'OK',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.close': 'Close',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.back': 'Back',
    'common.reload': 'Reload',
    // Notifications
    'notifications.title': 'Notifications',
    'notifications.all': 'All',
    'notifications.system': 'System',
    'notifications.hotel': 'Hotel',
    'notifications.no_notifications': 'No notifications',
    'notifications.mark_all_read': 'Mark all as read',
    'notifications.high_priority': 'High priority',
    'notifications.type_maintenance': 'Maintenance',
    'notifications.type_update': 'Update',
    'notifications.type_info': 'Info',
    'notifications.type_warning': 'Warning',
    'notifications.type_success': 'Success',
    'notifications.type_general': 'Notification',
  },
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within TranslationProvider');
  }
  return context;
};

interface TranslationProviderProps {
  children: ReactNode;
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('vi');

  useEffect(() => {
    // Load saved language
    AsyncStorage.getItem('language').then((lang) => {
      if (lang === 'vi' || lang === 'en') {
        setLanguageState(lang);
      }
    });
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    try {
      await AsyncStorage.setItem('language', lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const translation = translations[language]?.[key] || key;
    
    if (params) {
      return Object.entries(params).reduce((text, [paramKey, paramValue]) => {
        return text.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
      }, translation);
    }
    
    return translation;
  }, [language]);

  const value: TranslationContextType = {
    language,
    setLanguage,
    t,
  };

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
};

