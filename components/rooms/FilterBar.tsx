import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type FilterType = 'all' | 'vacant' | 'occupied' | 'cleaning';

interface FilterBarProps {
  selectedFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

export default function FilterBar({
  selectedFilter,
  onFilterChange,
}: FilterBarProps) {
  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'vacant', label: 'Trống' },
    { key: 'occupied', label: 'Đã thuê' },
    { key: 'cleaning', label: 'Đang dọn' },
  ];

  return (
    <View style={styles.container}>
      {filters.map((filter) => (
        <TouchableOpacity
          key={filter.key}
          style={[
            styles.filterButton,
            selectedFilter === filter.key && styles.filterButtonActive,
          ]}
          onPress={() => onFilterChange(filter.key)}
        >
          <Text
            style={[
              styles.filterText,
              selectedFilter === filter.key && styles.filterTextActive,
            ]}
          >
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 12,
    backgroundColor: 'transparent',
    gap: 8,
    flex: 1,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  filterButtonActive: {
    backgroundColor: '#1890ff',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});

