import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';

interface FloorFilterProps {
  floors: string[];
  selectedFloor: string | null;
  onFloorChange: (floor: string | null) => void;
}

export default function FloorFilter({
  floors,
  selectedFloor,
  onFloorChange,
}: FloorFilterProps) {
  const sortedFloors = [...floors].sort((a, b) => {
    const numA = parseInt(a) || 0;
    const numB = parseInt(b) || 0;
    return numA - numB;
  });

  const getFloorLabel = (floor: string) => {
    if (floor === '0' || floor === '') {
      return 'Trệt';
    }
    return `Tầng ${floor}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity
          style={[
            styles.floorButton,
            selectedFloor === null && styles.floorButtonActive,
          ]}
          onPress={() => onFloorChange(null)}
        >
          <Text
            style={[
              styles.floorButtonText,
              selectedFloor === null && styles.floorButtonTextActive,
            ]}
          >
            Tất cả
          </Text>
        </TouchableOpacity>
        {sortedFloors.map((floor) => (
          <TouchableOpacity
            key={floor}
            style={[
              styles.floorButton,
              selectedFloor === floor && styles.floorButtonActive,
            ]}
            onPress={() => onFloorChange(floor)}
          >
            <Text
              style={[
                styles.floorButtonText,
                selectedFloor === floor && styles.floorButtonTextActive,
              ]}
            >
              {getFloorLabel(floor)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  floorButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  floorButtonActive: {
    backgroundColor: '#1890ff',
  },
  floorButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  floorButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});

