import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native';

interface StatusOption {
  label: string;
  value: string;
  color: string;
}

interface StatusPickerProps {
  selectedValue: string;
  onValueChange: (value: string) => void;
  visible: boolean;
  onClose: () => void;
}

const statusOptions: StatusOption[] = [
  { label: 'Phòng trống', value: 'vacant', color: '#52c41a' },
  { label: 'Đã thuê', value: 'occupied', color: '#1890ff' },
  { label: 'Đang dọn', value: 'cleaning', color: '#faad14' },
  { label: 'Bẩn', value: 'dirty', color: '#ff4d4f' },
  { label: 'Đã đặt', value: 'booked', color: '#722ed1' },
  { label: 'Bảo trì', value: 'maintenance', color: '#8b0000' },
  { label: 'Khách ra ngoài', value: 'guest_out', color: '#ff9800' },
];

export default function StatusPicker({
  selectedValue,
  onValueChange,
  visible,
  onClose,
}: StatusPickerProps) {
  const handleSelect = (value: string) => {
    onValueChange(value);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Chọn trạng thái</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={statusOptions}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.option,
                  selectedValue === item.value && styles.optionSelected,
                ]}
                onPress={() => handleSelect(item.value)}
              >
                <View
                  style={[
                    styles.colorIndicator,
                    { backgroundColor: item.color },
                  ]}
                />
                <Text
                  style={[
                    styles.optionText,
                    selectedValue === item.value && styles.optionTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
                {selectedValue === item.value && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionSelected: {
    backgroundColor: '#e6f7ff',
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  optionTextSelected: {
    color: '#1890ff',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: '#1890ff',
    fontWeight: 'bold',
  },
});

