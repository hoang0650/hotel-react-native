import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { hotelsService } from '@/services/hotels.service';
import { Hotel } from '@/types';

interface HotelSelectorProps {
  selectedHotelId: string | null;
  onSelectHotel: (hotelId: string) => void;
}

export default function HotelSelector({
  selectedHotelId,
  onSelectHotel,
}: HotelSelectorProps) {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);

  useEffect(() => {
    loadHotels();
  }, []);

  useEffect(() => {
    if (selectedHotelId && hotels.length > 0) {
      const hotel = hotels.find((h) => h._id === selectedHotelId);
      setSelectedHotel(hotel || null);
    }
  }, [selectedHotelId, hotels]);

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

  const handleSelectHotel = (hotel: Hotel) => {
    setSelectedHotel(hotel);
    onSelectHotel(hotel._id);
    setModalVisible(false);
  };

  const getDisplayName = (name: string) => {
    if (name.length > 20) {
      return name.substring(0, 20) + '...';
    }
    return name;
  };

  return (
    <>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.selectorText} numberOfLines={1}>
          {selectedHotel
            ? getDisplayName(selectedHotel.name)
            : 'Select Hotel'}
        </Text>
        <Text style={styles.chevron}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Hotel</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1890ff" />
              </View>
            ) : (
              <FlatList
                data={hotels}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.hotelItem,
                      selectedHotelId === item._id && styles.hotelItemSelected,
                    ]}
                    onPress={() => handleSelectHotel(item)}
                  >
                    <Text
                      style={[
                        styles.hotelItemText,
                        selectedHotelId === item._id &&
                          styles.hotelItemTextSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                    {selectedHotelId === item._id && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No hotels found</Text>
                  </View>
                }
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    maxWidth: 200,
  },
  selectorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  chevron: {
    color: '#fff',
    fontSize: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '85%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  hotelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  hotelItemSelected: {
    backgroundColor: '#e6f7ff',
  },
  hotelItemText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  hotelItemTextSelected: {
    color: '#1890ff',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: '#1890ff',
    fontWeight: 'bold',
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

