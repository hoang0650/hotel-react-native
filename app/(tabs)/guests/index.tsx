import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  User,
  Phone,
  Mail,
  Crown,
  ChevronRight,
  Plus,
  Globe,
  AlertCircle,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { guestsApi } from '@/services/api';
import { Guest } from '@/types/hotel';

export default function GuestsScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [showVipOnly, setShowVipOnly] = useState(false);

  const { data: guests = [], isLoading, refetch } = useQuery({
    queryKey: ['guests'],
    queryFn: () => guestsApi.getAll(),
  });

  const filteredGuests = useMemo(() => {
    return guests.filter((guest) => {
      const matchesSearch =
        guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guest.phone.includes(searchQuery) ||
        guest.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesVip = !showVipOnly || guest.vipStatus;
      return matchesSearch && matchesVip;
    });
  }, [guests, searchQuery, showVipOnly]);

  const vipCount = useMemo(() => guests.filter((g) => g.vipStatus).length, [guests]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(-2)
      .join('')
      .toUpperCase();
  };

  const renderGuestCard = (guest: Guest) => {
    return (
      <TouchableOpacity key={guest.id} style={styles.guestCard} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, guest.vipStatus && styles.avatarVip]}>
              <Text style={styles.avatarText}>{getInitials(guest.name)}</Text>
            </View>
            {guest.vipStatus && (
              <View style={styles.vipBadge}>
                <Crown size={10} color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.guestInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.guestName}>{guest.name}</Text>
              {guest.vipStatus && (
                <View style={styles.vipTag}>
                  <Text style={styles.vipTagText}>VIP</Text>
                </View>
              )}
            </View>
            <View style={styles.nationalityRow}>
              <Globe size={12} color={Colors.light.textSecondary} />
              <Text style={styles.nationalityText}>{guest.nationality || 'Việt Nam'}</Text>
            </View>
          </View>
          <ChevronRight size={20} color={Colors.light.textSecondary} />
        </View>

        <View style={styles.contactRow}>
          {guest.phone && (
            <View style={styles.contactItem}>
              <Phone size={14} color={Colors.light.tint} />
              <Text style={styles.contactText}>{guest.phone}</Text>
            </View>
          )}
          {guest.email && (
            <View style={styles.contactItem}>
              <Mail size={14} color={Colors.light.tint} />
              <Text style={styles.contactText} numberOfLines={1}>{guest.email}</Text>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{guest.totalStays}</Text>
            <Text style={styles.statLabel}>Lượt ở</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatCurrency(guest.totalSpent)}</Text>
            <Text style={styles.statLabel}>Tổng chi tiêu</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading && guests.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Đang tải danh sách khách hàng...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Khách hàng</Text>
          <Text style={styles.subtitle}>{guests.length} khách</Text>
        </View>
        <TouchableOpacity style={styles.addButton}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={18} color={Colors.light.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm tên, SĐT hoặc email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.light.textSecondary}
          />
        </View>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, !showVipOnly && styles.filterChipActive]}
          onPress={() => setShowVipOnly(false)}
        >
          <Text style={[styles.filterChipText, !showVipOnly && styles.filterChipTextActive]}>
            Tất cả ({guests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, showVipOnly && styles.filterChipActiveVip]}
          onPress={() => setShowVipOnly(true)}
        >
          <Crown size={14} color={showVipOnly ? '#fff' : '#f59e0b'} />
          <Text style={[styles.filterChipText, showVipOnly && styles.filterChipTextActive]}>
            VIP ({vipCount})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.guestsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.guestsListContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        {filteredGuests.map(renderGuestCard)}
        {filteredGuests.length === 0 && (
          <View style={styles.emptyState}>
            {guests.length === 0 ? (
              <>
                <AlertCircle size={48} color={Colors.light.textSecondary} />
                <Text style={styles.emptyText}>Chưa có dữ liệu khách hàng</Text>
                <Text style={styles.emptySubtext}>Kiểm tra kết nối API</Text>
              </>
            ) : (
              <>
                <User size={48} color={Colors.light.textSecondary} />
                <Text style={styles.emptyText}>Không tìm thấy khách hàng</Text>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  addButton: {
    backgroundColor: Colors.light.tint,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.light.text,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterChipActive: {
    backgroundColor: Colors.light.tint,
  },
  filterChipActiveVip: {
    backgroundColor: '#f59e0b',
  },
  filterChipText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: '500' as const,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  guestsList: {
    flex: 1,
  },
  guestsListContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  guestCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarVip: {
    backgroundColor: '#f59e0b',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  vipBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  guestInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guestName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  vipTag: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vipTagText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#f59e0b',
  },
  nationalityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  nationalityText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 14,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  contactText: {
    fontSize: 13,
    color: Colors.light.text,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.light.background,
    borderRadius: 10,
    padding: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.light.border,
    marginHorizontal: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
});
