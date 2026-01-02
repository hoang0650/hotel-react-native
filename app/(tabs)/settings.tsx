import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { hotelsService } from '@/services/hotels.service';
import { Hotel } from '@/types';

export default function SettingsScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<string>('');

  // General settings
  const [language, setLanguage] = useState('vi');
  const [theme, setTheme] = useState('light');
  const [notifications, setNotifications] = useState(true);

  // Email settings
  const [emailProvider, setEmailProvider] = useState('resend');
  const [emailApiKey, setEmailApiKey] = useState('');
  const [emailFrom, setEmailFrom] = useState('');

  useEffect(() => {
    loadHotels();
    if (user?.hotelId) {
      setSelectedHotelId(user.hotelId);
    }
  }, [user]);

  const loadHotels = async () => {
    try {
      setLoading(true);
      const hotelsData = await hotelsService.getHotels();
      setHotels(hotelsData);
    } catch (error: any) {
      console.error('Error loading hotels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGeneral = async () => {
    try {
      setSaving(true);
      // TODO: Implement save general settings API
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmail = async () => {
    try {
      setSaving(true);
      // TODO: Implement save email settings API
      Alert.alert('Success', 'Email settings saved successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save email settings');
    } finally {
      setSaving(false);
    }
  };

  const tabs = ['General', 'Email', 'Notifications', 'Payment'];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.tab, activeTab === index && styles.tabActive]}
            onPress={() => setActiveTab(index)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === index && styles.tabTextActive,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>General Settings</Text>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Language</Text>
              <View style={styles.languageButtons}>
                {['vi', 'en', 'de'].map((lang) => (
                  <TouchableOpacity
                    key={lang}
                    style={[
                      styles.languageButton,
                      language === lang && styles.languageButtonActive,
                    ]}
                    onPress={() => setLanguage(lang)}
                  >
                    <Text
                      style={[
                        styles.languageButtonText,
                        language === lang && styles.languageButtonTextActive,
                      ]}
                    >
                      {lang.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Theme</Text>
              <View style={styles.themeButtons}>
                {['light', 'dark'].map((th) => (
                  <TouchableOpacity
                    key={th}
                    style={[
                      styles.themeButton,
                      theme === th && styles.themeButtonActive,
                    ]}
                    onPress={() => setTheme(th)}
                  >
                    <Text
                      style={[
                        styles.themeButtonText,
                        theme === th && styles.themeButtonTextActive,
                      ]}
                    >
                      {th.charAt(0).toUpperCase() + th.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Notifications</Text>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSaveGeneral}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Email Settings</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Provider</Text>
              <View style={styles.providerButtons}>
                {['resend', 'sendgrid', 'mailgun', 'nodemailer'].map(
                  (provider) => (
                    <TouchableOpacity
                      key={provider}
                      style={[
                        styles.providerButton,
                        emailProvider === provider &&
                          styles.providerButtonActive,
                      ]}
                      onPress={() => setEmailProvider(provider)}
                    >
                      <Text
                        style={[
                          styles.providerButtonText,
                          emailProvider === provider &&
                            styles.providerButtonTextActive,
                        ]}
                      >
                        {provider.charAt(0).toUpperCase() + provider.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>API Key</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter API key"
                value={emailApiKey}
                onChangeText={setEmailApiKey}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>From Email</Text>
              <TextInput
                style={styles.input}
                placeholder="noreply@example.com"
                value={emailFrom}
                onChangeText={setEmailFrom}
                keyboardType="email-address"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSaveEmail}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 2 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <Text style={styles.comingSoon}>Coming soon...</Text>
          </View>
        )}

        {activeTab === 3 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Settings</Text>
            <Text style={styles.comingSoon}>Coming soon...</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1890ff',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  tab: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#1890ff',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  tabTextActive: {
    color: '#1890ff',
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  settingRow: {
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  languageButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  languageButtonActive: {
    backgroundColor: '#1890ff',
    borderColor: '#1890ff',
  },
  languageButtonText: {
    fontSize: 14,
    color: '#666',
  },
  languageButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  themeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  themeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  themeButtonActive: {
    backgroundColor: '#1890ff',
    borderColor: '#1890ff',
  },
  themeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  themeButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  providerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  providerButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  providerButtonActive: {
    backgroundColor: '#1890ff',
    borderColor: '#1890ff',
  },
  providerButtonText: {
    fontSize: 14,
    color: '#666',
  },
  providerButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#1890ff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  comingSoon: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    padding: 40,
  },
});

