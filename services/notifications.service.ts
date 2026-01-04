import { apiService } from './api';
import { API_ENDPOINTS } from '@/constants/api';
import { Announcement, NotificationResponse, UnreadCountResponse, NotificationSettings } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class NotificationsService {
  private announcements: Announcement[] = [];
  private unreadCounts = { total: 0, system: 0, hotel: 0 };
  private notificationSettings: NotificationSettings | null = null;
  private areNotificationsEnabled = true;

  async loadAnnouncements(): Promise<void> {
    try {
      const response = await apiService.get<NotificationResponse>(API_ENDPOINTS.NOTIFICATIONS.BASE);
      if (response.success && response.data) {
        this.announcements = response.data;
        await this.loadUnreadCounts();
      }
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  }

  async getAnnouncements(): Promise<Announcement[]> {
    await this.loadAnnouncements();
    return this.getAllNotifications();
  }

  getAllNotifications(): Announcement[] {
    const maintenanceNotification = this.getMaintenanceNotification();
    if (maintenanceNotification) {
      return [maintenanceNotification, ...this.announcements];
    }
    return this.announcements;
  }

  async loadUnreadCounts(): Promise<void> {
    try {
      const response = await apiService.get<UnreadCountResponse>(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
      if (response.success && response.data) {
        this.unreadCounts = response.data;
      }
    } catch (error) {
      console.error('Error loading unread counts:', error);
    }
  }

  getUnreadCounts(): { total: number; system: number; hotel: number } {
    return this.unreadCounts;
  }

  async markAsRead(announcementId: string): Promise<void> {
    try {
      await apiService.post(API_ENDPOINTS.NOTIFICATIONS.MARK_AS_READ(announcementId), {});
      // Update local state
      const announcement = this.announcements.find(n => n.id === announcementId);
      if (announcement) {
        announcement.isRead = true;
      }
      await this.loadUnreadCounts();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }

  async markAllAsRead(): Promise<void> {
    try {
      await apiService.post(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_AS_READ, {});
      // Update local state
      this.announcements.forEach(n => n.isRead = true);
      await this.loadUnreadCounts();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }

  async loadNotificationSettings(): Promise<void> {
    try {
      const response = await apiService.get<{ success: boolean; data: NotificationSettings }>(
        API_ENDPOINTS.SETTINGS.NOTIFICATION
      );
      if (response.success && response.data) {
        this.notificationSettings = response.data;
        this.updateNotificationsEnabled();
      } else {
        // Default settings
        this.notificationSettings = {
          enableEmailNotifications: true,
          enableSMSNotifications: false,
          enablePushNotifications: true,
          notifyOnBooking: true,
          notifyOnCheckin: true,
          notifyOnCheckout: true,
          notifyOnPayment: true,
          notifyOnCancellation: true,
          notifyOnLowInventory: true,
          notifyOnSystemError: true,
          notifyOnMaintenance: true,
          notifyOnTransfer: true,
          notificationEmail: '',
        };
        this.updateNotificationsEnabled();
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
      // Default settings on error
      this.notificationSettings = {
          enableEmailNotifications: true,
          enableSMSNotifications: false,
          enablePushNotifications: true,
          notifyOnBooking: true,
          notifyOnCheckin: true,
          notifyOnCheckout: true,
          notifyOnPayment: true,
          notifyOnCancellation: true,
          notifyOnLowInventory: true,
          notifyOnSystemError: true,
          notifyOnMaintenance: true,
          notifyOnTransfer: true,
          notificationEmail: '',
        };
      this.updateNotificationsEnabled();
    }
  }

  private updateNotificationsEnabled(): void {
    if (!this.notificationSettings) {
      this.areNotificationsEnabled = true;
      return;
    }
    this.areNotificationsEnabled =
      this.notificationSettings.enableEmailNotifications ||
      this.notificationSettings.enableSMSNotifications ||
      this.notificationSettings.enablePushNotifications;
  }

  getNotificationSettings(): NotificationSettings | null {
    return this.notificationSettings;
  }

  isNotificationsEnabled(): boolean {
    return this.areNotificationsEnabled;
  }

  getFilteredNotifications(activeTab: 'all' | 'system' | 'hotel'): Announcement[] {
    if (!this.areNotificationsEnabled) {
      return [];
    }

    let filtered = this.getAllNotifications();

    // Note: Backend đã xử lý việc lọc thông báo khách sạn dựa trên:
    // 1. System notification settings
    // 2. Hotel notification settings  
    // 3. Package feature (hotelNotificationFeature)
    // Frontend chỉ cần filter theo tab và notification settings của user

    // Filter by notification settings (user preferences)
    if (this.notificationSettings) {
      filtered = filtered.filter(notification => {
        if (!notification.notificationType || notification.notificationType === 'general') {
          return true;
        }

        const notificationTypeMap: { [key: string]: keyof NotificationSettings } = {
          'booking': 'notifyOnBooking',
          'checkin': 'notifyOnCheckin',
          'checkout': 'notifyOnCheckout',
          'payment': 'notifyOnPayment',
          'cancellation': 'notifyOnCancellation',
          'lowInventory': 'notifyOnLowInventory',
          'systemError': 'notifyOnSystemError',
          'maintenance': 'notifyOnMaintenance',
          'transfer': 'notifyOnTransfer',
        };

        const notifyOnKey = notificationTypeMap[notification.notificationType];
        if (notifyOnKey && this.notificationSettings) {
          // Chỉ filter nếu user đã tắt notification type này
          // Mặc định true nếu không có trong settings
          return this.notificationSettings[notifyOnKey] !== false;
        }

        return true;
      });
    }

    // Filter by tab
    if (activeTab === 'all') {
      return filtered;
    } else if (activeTab === 'system') {
      return filtered.filter(n => !n.targetType || n.targetType === 'system');
    } else if (activeTab === 'hotel') {
      // Backend đã lọc thông báo khách sạn dựa trên quyền (system settings, hotel settings, package feature)
      // Frontend chỉ cần filter theo targetType
      return filtered.filter(n => n.targetType === 'hotel');
    }

    return filtered;
  }

  private getMaintenanceNotification(): Announcement | null {
    // Check AsyncStorage for maintenance mode
    // Note: This is a simplified version. In a real app, you might want to check this from settings
    return null;
  }

  getNotificationIcon(type: string): string {
    const iconMap: { [key: string]: string } = {
      'maintenance': 'build',
      'update': 'sync',
      'info': 'info',
      'warning': 'warning',
      'success': 'check-circle',
    };
    return iconMap[type] || 'notifications';
  }

  getNotificationColor(type: string): string {
    const colorMap: { [key: string]: string } = {
      'maintenance': '#ff9800',
      'update': '#2196f3',
      'info': '#00bcd4',
      'warning': '#ffc107',
      'success': '#4caf50',
    };
    return colorMap[type] || '#666';
  }
}

export const notificationsService = new NotificationsService();

