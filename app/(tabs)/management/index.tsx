import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/contexts/TranslationContext';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface ManagementItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
}

export default function ManagementScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const managementItems: ManagementItem[] = [
    {
      id: 'service',
      title: 'Service Management',
      description: 'Quản lý dịch vụ khách sạn',
      icon: 'wrench.and.screwdriver.fill',
      route: 'service',
    },
    {
      id: 'staff',
      title: 'Staff Management',
      description: 'Quản lý nhân viên và ca làm việc',
      icon: 'person.2.fill',
      route: 'staff',
    },
    {
      id: 'room',
      title: 'Room Management',
      description: 'Quản lý phòng và giá phòng',
      icon: 'house.fill',
      route: 'room',
    },
    {
      id: 'guest',
      title: 'Guest Management',
      description: 'Quản lý thông tin khách hàng',
      icon: 'person.fill',
      route: 'guest',
    },
    {
      id: 'debt',
      title: 'Debt Management',
      description: 'Quản lý công nợ khách hàng',
      icon: 'receipt.fill',
      route: 'debt',
    },
    {
      id: 'electric',
      title: 'Electric Setting',
      description: 'Điều khiển công tắc Tuya',
      icon: 'bolt.fill',
      route: 'electric',
    },
  ];

  const handleItemPress = (item: ManagementItem) => {
    router.push(`/management/${item.route}` as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {managementItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.itemCard}
            onPress={() => handleItemPress(item)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <IconSymbol name={item.icon} size={32} color="#1890ff" />
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDescription}>{item.description}</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color="#999" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
  },
});
