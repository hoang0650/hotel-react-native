import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { useRouter, useFocusEffect, router as expoRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { useTheme } from '@/contexts/ThemeContext';
import AccountModal from '@/components/AccountModal';
import { getImageUrl } from '@/utils/imageUtils';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useTranslation();
  const { themeMode, setThemeMode } = useTheme();
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [versionModalVisible, setVersionModalVisible] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);

  const handleLogout = async () => {
    // Close menu modal first
    setMenuVisible(false);
    
    try {
      // Close all modals
      setThemeModalVisible(false);
      setLanguageModalVisible(false);
      setSupportModalVisible(false);
      setContactModalVisible(false);
      setVersionModalVisible(false);
      setAccountModalVisible(false);
      
      // Perform logout
      await logout();
      
      // Force navigation with multiple attempts
      const navigate = () => {
        try {
          router.replace('/(auth)/login');
        } catch (e1) {
          try {
            router.push('/(auth)/login');
          } catch (e2) {
            console.error('Navigation failed:', e2);
          }
        }
      };
      
      // Navigate immediately and with delays
      navigate();
      setTimeout(navigate, 100);
      setTimeout(navigate, 300);
      setTimeout(navigate, 500);
      
    } catch (error) {
      console.error('Logout error:', error);
      // Even on error, try to navigate
      try {
        router.replace('/(auth)/login');
      } catch (navError) {
        console.error('Navigation error:', navError);
      }
    }
  };

  const handleAccountPress = () => {
    setMenuVisible(false);
    setAccountModalVisible(true);
  };

  const handleSettingsPress = () => {
    setMenuVisible(false);
    router.push('/(tabs)/settings');
  };

  const handleThemePress = () => {
    setMenuVisible(false);
    setThemeModalVisible(true);
  };

  const handleLanguagePress = () => {
    setMenuVisible(false);
    setLanguageModalVisible(true);
  };

  const handleSupportPress = () => {
    setMenuVisible(false);
    setSupportModalVisible(true);
  };

  const handleContactPress = () => {
    setMenuVisible(false);
    setContactModalVisible(true);
  };

  const handleVersionPress = () => {
    setMenuVisible(false);
    setVersionModalVisible(true);
  };

  const handleThemeChange = async (theme: 'light' | 'dark' | 'auto') => {
    try {
      await setThemeMode(theme);
      setThemeModalVisible(false);
      Alert.alert(t('common.ok'), t('profile.theme.changed'));
    } catch (error) {
      console.error('Error changing theme:', error);
      Alert.alert(t('common.ok'), 'Không thể thay đổi theme. Vui lòng thử lại.');
    }
  };

  const handleLanguageChange = async (lang: 'vi' | 'en') => {
    try {
      await setLanguage(lang);
      setLanguageModalVisible(false);
      Alert.alert(
        t('common.ok'),
        t('profile.language.changed') + '\n' + t('profile.language.restart')
      );
    } catch (error) {
      console.error('Error changing language:', error);
      Alert.alert(t('common.ok'), 'Không thể thay đổi ngôn ngữ. Vui lòng thử lại.');
    }
  };

  const handleSupportEmail = () => {
    Linking.openURL('mailto:support@phhotel.com?subject=Yêu cầu hỗ trợ');
  };

  const handleSupportPhone = () => {
    Linking.openURL('tel:+84123456789');
  };

  const handleContactEmail = () => {
    Linking.openURL('mailto:contact@phhotel.com?subject=Liên hệ');
  };

  const handleContactPhone = () => {
    Linking.openURL('tel:+84123456789');
  };

  const handleContactWebsite = () => {
    Linking.openURL('https://phhotel.com');
  };

  // Open menu when screen is focused
  useFocusEffect(
    useCallback(() => {
      setMenuVisible(true);
    }, [])
  );

  const avatarInitial = user?.fullName?.[0]?.toUpperCase() || 
                        user?.username?.[0]?.toUpperCase() || 
                        'U';

  const appVersion = '1.0.0';
  const buildNumber = '1';

  return (
    <View style={styles.container}>
      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            {/* Avatar Section */}
            <View style={styles.avatarSection}>
              {user?.avatar ? (
                <Image source={{ uri: getImageUrl(user.avatar) }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{avatarInitial}</Text>
                </View>
              )}
              <Text style={styles.userName}>
                {user?.fullName || user?.username || 'Người dùng'}
              </Text>
              <Text style={styles.userEmail}>{user?.email || ''}</Text>
            </View>

            {/* Menu Items */}
            <ScrollView style={styles.menuScrollView}>
              <View style={styles.menuItems}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleAccountPress}
                >
                  <Text style={styles.menuItemIcon}>👤</Text>
                  <Text style={styles.menuItemText}>{t('profile.account')}</Text>
                  <Text style={styles.menuItemArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleSettingsPress}
                >
                  <Text style={styles.menuItemIcon}>⚙️</Text>
                  <Text style={styles.menuItemText}>{t('profile.settings')}</Text>
                  <Text style={styles.menuItemArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleThemePress}
                >
                  <Text style={styles.menuItemIcon}>🎨</Text>
                  <Text style={styles.menuItemText}>{t('profile.changeTheme')}</Text>
                  <Text style={styles.menuItemValue}>
                    {themeMode === 'light' ? t('profile.theme.light') : themeMode === 'dark' ? t('profile.theme.dark') : t('profile.theme.auto')}
                  </Text>
                  <Text style={styles.menuItemArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleLanguagePress}
                >
                  <Text style={styles.menuItemIcon}>🌐</Text>
                  <Text style={styles.menuItemText}>{t('profile.changeLanguage')}</Text>
                  <Text style={styles.menuItemValue}>
                    {language === 'vi' ? t('profile.language.vi') : t('profile.language.en')}
                  </Text>
                  <Text style={styles.menuItemArrow}>›</Text>
                </TouchableOpacity>

                <View style={styles.menuDivider} />

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleSupportPress}
                >
                  <Text style={styles.menuItemIcon}>💬</Text>
                  <Text style={styles.menuItemText}>{t('profile.support')}</Text>
                  <Text style={styles.menuItemArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleContactPress}
                >
                  <Text style={styles.menuItemIcon}>📞</Text>
                  <Text style={styles.menuItemText}>{t('profile.contact')}</Text>
                  <Text style={styles.menuItemArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleVersionPress}
                >
                  <Text style={styles.menuItemIcon}>ℹ️</Text>
                  <Text style={styles.menuItemText}>{t('profile.versionInfo')}</Text>
                  <Text style={styles.menuItemArrow}>›</Text>
                </TouchableOpacity>

                <View style={styles.menuDivider} />

                <TouchableOpacity
                  style={[styles.menuItem, styles.menuItemDanger]}
                  onPress={handleLogout}
                >
                  <Text style={styles.menuItemIcon}>🚪</Text>
                  <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>
                    {t('profile.logout')}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Theme Modal */}
      <Modal
        visible={themeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile.changeTheme')}</Text>
              <TouchableOpacity onPress={() => setThemeModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {(['light', 'dark', 'auto'] as const).map((theme) => (
                <TouchableOpacity
                  key={theme}
                  style={[
                    styles.optionItem,
                    themeMode === theme && styles.optionItemActive,
                  ]}
                  onPress={() => handleThemeChange(theme)}
                >
                  <Text style={styles.optionText}>
                    {theme === 'light' ? t('profile.theme.light') : theme === 'dark' ? t('profile.theme.dark') : t('profile.theme.auto')}
                  </Text>
                  {themeMode === theme && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Language Modal */}
      <Modal
        visible={languageModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile.changeLanguage')}</Text>
              <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {(['vi', 'en'] as const).map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.optionItem,
                    language === lang && styles.optionItemActive,
                  ]}
                  onPress={() => handleLanguageChange(lang)}
                >
                  <Text style={styles.optionText}>
                    {lang === 'vi' ? t('profile.language.vi') : t('profile.language.en')}
                  </Text>
                  {language === lang && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Support Modal */}
      <Modal
        visible={supportModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSupportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile.support')}</Text>
              <TouchableOpacity onPress={() => setSupportModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.supportText}>
                {t('profile.support.description')}
              </Text>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={handleSupportEmail}
              >
                <Text style={styles.contactButtonIcon}>📧</Text>
                <View style={styles.contactButtonTextContainer}>
                  <Text style={styles.contactButtonTitle}>{t('profile.support.email')}</Text>
                  <Text style={styles.contactButtonSubtitle}>support@phhotel.com</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={handleSupportPhone}
              >
                <Text style={styles.contactButtonIcon}>📞</Text>
                <View style={styles.contactButtonTextContainer}>
                  <Text style={styles.contactButtonTitle}>{t('profile.support.hotline')}</Text>
                  <Text style={styles.contactButtonSubtitle}>+84 123 456 789</Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.supportNote}>
                {t('profile.support.hours')}
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Contact Modal */}
      <Modal
        visible={contactModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setContactModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile.contact')}</Text>
              <TouchableOpacity onPress={() => setContactModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.supportText}>
                {t('profile.contact.description')}
              </Text>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={handleContactEmail}
              >
                <Text style={styles.contactButtonIcon}>📧</Text>
                <View style={styles.contactButtonTextContainer}>
                  <Text style={styles.contactButtonTitle}>{t('profile.contact.email')}</Text>
                  <Text style={styles.contactButtonSubtitle}>contact@phhotel.com</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={handleContactPhone}
              >
                <Text style={styles.contactButtonIcon}>📞</Text>
                <View style={styles.contactButtonTextContainer}>
                  <Text style={styles.contactButtonTitle}>{t('profile.contact.phone')}</Text>
                  <Text style={styles.contactButtonSubtitle}>+84 123 456 789</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={handleContactWebsite}
              >
                <Text style={styles.contactButtonIcon}>🌐</Text>
                <View style={styles.contactButtonTextContainer}>
                  <Text style={styles.contactButtonTitle}>{t('profile.contact.website')}</Text>
                  <Text style={styles.contactButtonSubtitle}>https://phhotel.com</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Version Modal */}
      <Modal
        visible={versionModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setVersionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile.versionInfo')}</Text>
              <TouchableOpacity onPress={() => setVersionModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.versionInfo}>
                <Text style={styles.versionLabel}>{t('profile.version.app')}</Text>
                <Text style={styles.versionValue}>{appVersion}</Text>
              </View>
              <View style={styles.versionInfo}>
                <Text style={styles.versionLabel}>{t('profile.version.build')}</Text>
                <Text style={styles.versionValue}>{buildNumber}</Text>
              </View>
              <View style={styles.versionInfo}>
                <Text style={styles.versionLabel}>{t('profile.version.platform')}</Text>
                <Text style={styles.versionValue}>React Native / Expo</Text>
              </View>
              <View style={styles.versionDivider} />
              <Text style={styles.versionCopyright}>
                {t('profile.version.copyright')}
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Account Modal */}
      <AccountModal
        visible={accountModalVisible}
        onClose={() => setAccountModalVisible(false)}
      />

      {/* Empty screen - menu will show automatically */}
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Loading...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  menuScrollView: {
    maxHeight: '70%',
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1890ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  menuItems: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemDanger: {
    borderBottomWidth: 0,
  },
  menuItemIcon: {
    fontSize: 24,
    marginRight: 16,
    width: 32,
    textAlign: 'center',
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  menuItemValue: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  menuItemTextDanger: {
    color: '#ff4d4f',
  },
  menuItemArrow: {
    fontSize: 20,
    color: '#999',
  },
  menuDivider: {
    height: 8,
    backgroundColor: '#f5f5f5',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#999',
  },
  modalBody: {
    padding: 20,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    marginBottom: 12,
  },
  optionItemActive: {
    backgroundColor: '#e6f7ff',
    borderWidth: 1,
    borderColor: '#1890ff',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 20,
    color: '#1890ff',
    fontWeight: 'bold',
  },
  supportText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  supportNote: {
    fontSize: 12,
    color: '#999',
    marginTop: 20,
    textAlign: 'center',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    marginBottom: 12,
  },
  contactButtonIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  contactButtonTextContainer: {
    flex: 1,
  },
  contactButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  contactButtonSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  versionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  versionLabel: {
    fontSize: 14,
    color: '#666',
  },
  versionValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  versionDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 20,
  },
  versionCopyright: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
