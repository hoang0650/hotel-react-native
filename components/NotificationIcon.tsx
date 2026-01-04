import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Modal,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useHotel } from '@/contexts/HotelContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { notificationsService } from '@/services/notifications.service';
import { Announcement } from '@/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { format } from '@/utils/dateUtils';

interface NotificationIconProps {
  count?: number;
}

type TabType = 'all' | 'system' | 'hotel';

export default function NotificationIcon({ count: propCount }: NotificationIconProps) {
  const { user } = useAuth();
  const { selectedHotelId } = useHotel();
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const [notifications, setNotifications] = useState<Announcement[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Announcement[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [unreadCounts, setUnreadCounts] = useState({ total: 0, system: 0, hotel: 0 });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const displayCount = propCount !== undefined ? propCount : unreadCounts.total;

  useEffect(() => {
    if (user) {
      loadNotifications();
      loadNotificationSettings();
      // Auto refresh every 5 minutes
      const interval = setInterval(() => {
        loadNotifications();
        loadNotificationSettings();
      }, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user, selectedHotelId]);

  useEffect(() => {
    filterNotificationsByTab();
  }, [notifications, activeTab]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      await notificationsService.loadAnnouncements();
      const allNotifications = notificationsService.getAllNotifications();
      setNotifications(allNotifications);
      const counts = notificationsService.getUnreadCounts();
      setUnreadCounts(counts);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationSettings = async () => {
    try {
      await notificationsService.loadNotificationSettings();
      await loadNotifications();
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const filterNotificationsByTab = () => {
    const filtered = notificationsService.getFilteredNotifications(activeTab);
    setFilteredNotifications(filtered);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    await loadNotificationSettings();
    setRefreshing(false);
  };

  const handleMarkAsRead = async (notification: Announcement) => {
    try {
      await notificationsService.markAsRead(notification.id);
      await loadNotifications();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      await loadNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
  };

  const getNotificationIcon = (type: string): string => {
    return notificationsService.getNotificationIcon(type);
  };

  const getNotificationColor = (type: string): string => {
    return notificationsService.getNotificationColor(type);
  };

  const getNotificationTypeLabel = (type: string): string => {
    const labelMap: { [key: string]: string } = {
      'maintenance': t('notifications.type_maintenance') || 'Bảo trì',
      'update': t('notifications.type_update') || 'Cập nhật',
      'info': t('notifications.type_info') || 'Thông tin',
      'warning': t('notifications.type_warning') || 'Cảnh báo',
      'success': t('notifications.type_success') || 'Thành công',
    };
    return labelMap[type] || t('notifications.type_general') || 'Thông báo';
  };

  const formatDate = (date: Date | string): string => {
    if (!date) return '';
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return format(d, 'dd/MM/yyyy HH:mm');
    } catch {
      return '';
    }
  };

  const getTabTitle = (tab: TabType): string => {
    const baseTitle = tab === 'all' 
      ? t('notifications.all') || 'Tất cả'
      : tab === 'system'
      ? t('notifications.system') || 'Hệ thống'
      : t('notifications.hotel') || 'Khách sạn';
    
    const count = tab === 'all' 
      ? unreadCounts.total 
      : tab === 'system'
      ? unreadCounts.system
      : unreadCounts.hotel;
    
    return count > 0 ? `${baseTitle} (${count})` : baseTitle;
  };

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={() => {
          setModalVisible(true);
          loadNotifications();
        }}
      >
        <IconSymbol name="bell.fill" size={24} color="#fff" />
        {displayCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{displayCount > 99 ? '99+' : displayCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('notifications.title') || 'Thông báo'}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <IconSymbol name="xmark" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'all' && styles.tabActive]}
                onPress={() => switchTab('all')}
              >
                <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
                  {getTabTitle('all')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'system' && styles.tabActive]}
                onPress={() => switchTab('system')}
              >
                <Text style={[styles.tabText, activeTab === 'system' && styles.tabTextActive]}>
                  {getTabTitle('system')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'hotel' && styles.tabActive]}
                onPress={() => switchTab('hotel')}
              >
                <Text style={[styles.tabText, activeTab === 'hotel' && styles.tabTextActive]}>
                  {getTabTitle('hotel')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Actions */}
            {filteredNotifications.length > 0 && (
              <View style={styles.actionsContainer}>
                <TouchableOpacity onPress={handleMarkAllAsRead}>
                  <Text style={styles.actionText}>
                    {t('notifications.mark_all_read') || 'Đánh dấu tất cả đã đọc'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Notifications List */}
            {loading && !refreshing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1890ff" />
              </View>
            ) : (
              <ScrollView
                style={styles.notificationsList}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
              >
                {filteredNotifications.length > 0 ? (
                  filteredNotifications.map((notification) => (
                    <TouchableOpacity
                      key={notification.id}
                      style={[
                        styles.notificationItem,
                        !notification.isRead && styles.notificationItemUnread,
                      ]}
                      onPress={() => handleMarkAsRead(notification)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.notificationHeader}>
                        <View
                          style={[
                            styles.notificationTag,
                            { backgroundColor: getNotificationColor(notification.type) },
                          ]}
                        >
                          <IconSymbol
                            name={getNotificationIcon(notification.type)}
                            size={14}
                            color="#fff"
                          />
                          <Text style={styles.notificationTagText}>
                            {getNotificationTypeLabel(notification.type)}
                          </Text>
                        </View>
                        <Text style={styles.notificationTime}>
                          {formatDate(notification.createdAt)}
                        </Text>
                      </View>
                      <Text style={styles.notificationTitle}>{notification.title}</Text>
                      <Text style={styles.notificationMessage}>{notification.message}</Text>
                      {(notification.priority === 'urgent' || notification.priority === 'high') && (
                        <View style={styles.priorityContainer}>
                          <View style={styles.priorityTag}>
                            <Text style={styles.priorityText}>
                              {t('notifications.high_priority') || 'Ưu tiên cao'}
                            </Text>
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      {t('notifications.no_notifications') || 'Không có thông báo nào'}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ff4d4f',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#1890ff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#e6f7ff',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  tabTextActive: {
    color: '#1890ff',
    fontWeight: '600',
  },
  actionsContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  actionText: {
    fontSize: 14,
    color: '#1890ff',
  },
  notificationsList: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  notificationItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  notificationItemUnread: {
    backgroundColor: '#f6ffed',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  notificationTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  priorityContainer: {
    marginTop: 8,
  },
  priorityTag: {
    backgroundColor: '#ff4d4f',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
