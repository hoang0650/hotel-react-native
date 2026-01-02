import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Switch,
  Modal,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useHotel } from '@/contexts/HotelContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { hotelsService } from '@/services/hotels.service';
import { serviceService } from '@/services/service.service';
import { Service, ServiceCategory, ALL_SERVICE_CATEGORIES, Hotel } from '@/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import CustomPicker from '@/components/ui/CustomPicker';

export default function ServiceManagementScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedHotelId } = useHotel();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedHotelIdFilter, setSelectedHotelIdFilter] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    hotelId: '',
    name: '',
    description: '',
    price: '0',
    category: 'custom' as ServiceCategory,
    image: '',
    isActive: true,
    currency: 'VND',
    isCustom: false,
    costPrice: '0',
    importQuantity: '0',
    salesQuantity: '0',
  });

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isBusiness = user?.role === 'business';
  const isHotelManager = user?.role === 'hotel';

  const canCreateService = isAdmin || isBusiness || isHotelManager;

  const getCategoryLabel = (category: ServiceCategory): string => {
    const labels: Record<ServiceCategory, string> = {
      room_service: 'Dịch vụ phòng',
      food: 'Đồ ăn',
      beverage: 'Đồ uống',
      spa: 'Spa & Massage',
      transport: 'Vận chuyển',
      custom: 'Tùy chỉnh',
    };
    return labels[category] || category;
  };

  const serviceCategoryOptions = ALL_SERVICE_CATEGORIES.map(cat => ({
    label: getCategoryLabel(cat),
    value: cat,
  }));

  useEffect(() => {
    loadHotels();
    if (selectedHotelId || user?.hotelId) {
      const hotelId = selectedHotelId || user?.hotelId;
      if (hotelId) {
        setSelectedHotelIdFilter(hotelId);
        loadServices(hotelId);
      }
    } else if (isBusiness && !isAdmin) {
      loadServices(); // Load all services for business
    }
  }, [selectedHotelId, user]);

  const loadHotels = async () => {
    try {
      const data = await hotelsService.getHotels();
      let filteredHotels = data;
      
      if (isAdmin) {
        filteredHotels = data.filter(h => h.status === 'active');
      } else if (isBusiness && user?.businessId) {
        filteredHotels = data.filter(h => {
          const hotelBusinessId = typeof h.businessId === 'string' 
            ? h.businessId 
            : (h.businessId as any)?._id?.toString() || (h.businessId as any)?.toString();
          return hotelBusinessId === user.businessId && h.status === 'active';
        });
      } else if (isHotelManager && user?.hotelId) {
        filteredHotels = data.filter(h => h._id === user.hotelId);
        if (filteredHotels.length === 1) {
          setSelectedHotelIdFilter(filteredHotels[0]._id);
          setFormData(prev => ({ ...prev, hotelId: filteredHotels[0]._id }));
        }
      } else {
        filteredHotels = [];
      }
      
      setHotels(filteredHotels);
    } catch (error: any) {
      console.error('Error loading hotels:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách khách sạn');
    }
  };

  const loadServices = async (hotelId?: string) => {
    try {
      setLoading(true);
      const data = await serviceService.getServices(hotelId);
      setServices(data);
    } catch (error: any) {
      console.error('Error loading services:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải danh sách dịch vụ');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadServices(selectedHotelIdFilter || undefined);
  };

  const onHotelChange = (hotelId: string | null) => {
    if (hotelId === selectedHotelIdFilter) return;
    
    setSelectedHotelIdFilter(hotelId);
    setServices([]);
    
    if (hotelId) {
      setFormData(prev => ({ ...prev, hotelId }));
      loadServices(hotelId);
    } else if (isBusiness && !isAdmin) {
      loadServices();
    }
  };

  const canManage = (service: Service): boolean => {
    if (!user) return false;
    if (isAdmin) return true;
    
    if (isBusiness) {
      const hotel = hotels.find(h => h._id === service.hotelId);
      if (!hotel) return false;
      const hotelBusinessId = typeof hotel.businessId === 'string' 
        ? hotel.businessId 
        : (hotel.businessId as any)?._id?.toString() || (hotel.businessId as any)?.toString();
      return hotelBusinessId === user.businessId;
    }
    
    if (isHotelManager) {
      return service.hotelId === user.hotelId;
    }
    
    return false;
  };

  const startEdit = (id: string) => {
    setEditId(id);
    const serviceToEdit = services.find(s => s._id === id);
    if (serviceToEdit) {
      setSelectedService({ ...serviceToEdit });
      setSelectedHotelIdFilter(serviceToEdit.hotelId);
      setFormData({
        hotelId: serviceToEdit.hotelId,
        name: serviceToEdit.name,
        description: serviceToEdit.description || '',
        price: serviceToEdit.price.toString(),
        category: serviceToEdit.category,
        image: serviceToEdit.image || '',
        isActive: serviceToEdit.isActive,
        currency: serviceToEdit.currency || 'VND',
        isCustom: serviceToEdit.isCustom || false,
        costPrice: (serviceToEdit.costPrice || 0).toString(),
        importQuantity: (serviceToEdit.importQuantity || 0).toString(),
        salesQuantity: (serviceToEdit.salesQuantity || 0).toString(),
      });
    }
  };

  const stopEdit = () => {
    setEditId(null);
    setSelectedService(null);
    setFormData({
      hotelId: selectedHotelIdFilter || '',
      name: '',
      description: '',
      price: '0',
      category: 'custom',
      image: '',
      isActive: true,
      currency: 'VND',
      isCustom: false,
      costPrice: '0',
      importQuantity: '0',
      salesQuantity: '0',
    });
  };

  const submitForm = async () => {
    if (!formData.hotelId || !formData.name || !formData.price) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    try {
      setLoading(true);
      const serviceData: Partial<Service> = {
        hotelId: formData.hotelId,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price) || 0,
        category: formData.category,
        image: formData.image,
        isActive: formData.isActive,
        currency: formData.currency,
        isCustom: formData.isCustom,
        costPrice: parseFloat(formData.costPrice) || 0,
        importQuantity: parseFloat(formData.importQuantity) || 0,
        salesQuantity: parseFloat(formData.salesQuantity) || 0,
      };

      if (editId && selectedService) {
        const updated = await serviceService.updateService(editId, serviceData);
        const index = services.findIndex(s => s._id === editId);
        if (index !== -1) {
          const newServices = [...services];
          newServices[index] = updated;
          setServices(newServices);
        }
        Alert.alert('Thành công', 'Đã cập nhật dịch vụ');
      } else {
        const newService = await serviceService.createService(serviceData);
        setServices([...services, newService]);
        Alert.alert('Thành công', 'Đã tạo dịch vụ mới');
      }
      
      stopEdit();
    } catch (error: any) {
      console.error('Error saving service:', error);
      Alert.alert('Lỗi', error.message || 'Không thể lưu dịch vụ');
    } finally {
      setLoading(false);
    }
  };

  const deleteService = (id: string) => {
    Alert.alert(
      'Xác nhận',
      'Bạn có chắc muốn xóa dịch vụ này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await serviceService.deleteService(id);
              setServices(services.filter(s => s._id !== id));
              if (editId === id) {
                stopEdit();
              }
              Alert.alert('Thành công', 'Đã xóa dịch vụ');
            } catch (error: any) {
              console.error('Error deleting service:', error);
              Alert.alert('Lỗi', error.message || 'Không thể xóa dịch vụ');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const updateImportQuantity = async (serviceId: string, quantity: number) => {
    const service = services.find(s => s._id === serviceId);
    if (!service) return;

    const newImportQuantity = (service.importQuantity || 0) + quantity;
    if (newImportQuantity < 0) {
      Alert.alert('Cảnh báo', 'Số lượng nhập không thể âm');
      return;
    }

    try {
      setLoading(true);
      const updated = await serviceService.updateService(serviceId, {
        importQuantity: newImportQuantity,
      });
      const index = services.findIndex(s => s._id === serviceId);
      if (index !== -1) {
        const newServices = [...services];
        newServices[index] = updated;
        setServices(newServices);
      }
      Alert.alert('Thành công', 'Đã cập nhật số lượng nhập');
    } catch (error: any) {
      console.error('Error updating import quantity:', error);
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật số lượng nhập');
    } finally {
      setLoading(false);
    }
  };

  const calculateInventory = (service: Service): number => {
    return Math.max(0, (service.importQuantity || 0) - (service.salesQuantity || 0));
  };

  const getGroupedCategories = (): ServiceCategory[] => {
    const categories = new Set<ServiceCategory>();
    services.forEach(service => {
      if (service.category) {
        categories.add(service.category);
      }
    });
    return Array.from(categories).sort();
  };

  const getServicesByCategory = (category: ServiceCategory): Service[] => {
    return services.filter(s => s.category === category).sort((a, b) => {
      return (a.name || '').localeCompare(b.name || '');
    });
  };

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('vi-VN');
  };

  const getHotelName = (hotelId: string): string => {
    const hotel = hotels.find(h => h._id === hotelId);
    return hotel ? hotel.name : 'N/A';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý dịch vụ</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Filter Section */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Khách sạn</Text>
          <CustomPicker
            selectedValue={selectedHotelIdFilter || ''}
            onValueChange={(value) => onHotelChange(value || null)}
            items={hotels.map(h => ({
              label: h.name,
              value: h._id,
            }))}
            placeholder="Chọn khách sạn"
          />
        </View>

        {/* Services List */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1890ff" />
            <Text style={styles.loadingText}>Đang tải...</Text>
          </View>
        ) : services.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol name="wrench.and.screwdriver.fill" size={64} color="#999" />
            <Text style={styles.emptyText}>Chưa có dịch vụ nào</Text>
          </View>
        ) : (
          <View style={styles.servicesList}>
            {getGroupedCategories().map((category) => (
              <View key={category} style={styles.categoryGroup}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryDot} />
                  <Text style={styles.categoryTitle}>{getCategoryLabel(category)}</Text>
                </View>
                {getServicesByCategory(category).map((service) => (
                  <View key={service._id} style={styles.serviceCard}>
                    <View style={styles.serviceHeader}>
                      <Text style={styles.serviceName}>{service.name}</Text>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: service.isActive ? '#52c41a' : '#ff4d4f' }
                      ]}>
                        <Text style={styles.statusText}>
                          {service.isActive ? 'Hoạt động' : 'Ngừng'}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.serviceDetails}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Giá bán:</Text>
                        <Text style={styles.detailValue}>
                          {formatCurrency(service.price)} {service.currency || 'VND'}
                        </Text>
                      </View>
                      {service.costPrice && service.costPrice > 0 && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Giá vốn:</Text>
                          <Text style={styles.detailValue}>
                            {formatCurrency(service.costPrice)} {service.currency || 'VND'}
                          </Text>
                        </View>
                      )}
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Số lượng nhập:</Text>
                        <View style={styles.quantityRow}>
                          <Text style={styles.detailValue}>{service.importQuantity || 0}</Text>
                          {canManage(service) && (
                            <TouchableOpacity
                              style={styles.quantityButton}
                              onPress={() => updateImportQuantity(service._id!, 1)}
                            >
                              <Text style={styles.quantityIcon}>➕</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Số lượng bán:</Text>
                        <Text style={styles.detailValue}>{service.salesQuantity || 0}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Tồn kho:</Text>
                        <Text style={styles.detailValue}>
                          {service.inventory !== undefined 
                            ? service.inventory 
                            : calculateInventory(service)}
                        </Text>
                      </View>
                    </View>

                    {canManage(service) && (
                      <View style={styles.serviceActions}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.editButton]}
                          onPress={() => startEdit(service._id!)}
                        >
                              <Text style={styles.actionIcon}>✏️</Text>
                          <Text style={styles.actionButtonText}>Sửa</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.deleteButton]}
                          onPress={() => deleteService(service._id!)}
                        >
                              <Text style={styles.actionIcon}>🗑️</Text>
                          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Xóa</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Form Section */}
        {(canCreateService || editId) && (
          <View style={styles.formSection}>
            <View style={styles.formHeader}>
              <Text style={styles.formIcon}>
                {editId ? '✏️' : '➕'}
              </Text>
              <Text style={styles.formTitle}>
                {editId ? 'Cập nhật dịch vụ' : 'Thêm dịch vụ mới'}
              </Text>
            </View>

            <View style={styles.formContent}>
              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Khách sạn *</Text>
                <CustomPicker
                  selectedValue={formData.hotelId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, hotelId: value }))}
                  items={hotels.map(h => ({
                    label: h.name,
                    value: h._id,
                  }))}
                  placeholder="Chọn khách sạn"
                  disabled={isHotelManager}
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Tên dịch vụ *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  placeholder="Nhập tên dịch vụ"
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Giá bán *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.price}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, price: text }))}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Giá vốn</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.costPrice}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, costPrice: text }))}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Số lượng nhập</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.importQuantity}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, importQuantity: text }))}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Số lượng bán</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.salesQuantity}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, salesQuantity: text }))}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Danh mục *</Text>
                <CustomPicker
                  selectedValue={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as ServiceCategory }))}
                  items={serviceCategoryOptions}
                  placeholder="Chọn danh mục"
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Tiền tệ</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.currency}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, currency: text }))}
                  placeholder="VND"
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Mô tả</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                  placeholder="Nhập mô tả"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.formLabel}>URL hình ảnh</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.image}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, image: text }))}
                  placeholder="https://..."
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.formLabel}>Trạng thái</Text>
                <Switch
                  value={formData.isActive}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, isActive: value }))}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={formData.isActive ? '#1890ff' : '#f4f3f4'}
                />
                <Text style={styles.switchLabel}>
                  {formData.isActive ? 'Hoạt động' : 'Ngừng'}
                </Text>
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.formLabel}>Dịch vụ tùy chỉnh</Text>
                <Switch
                  value={formData.isCustom}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, isCustom: value }))}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={formData.isCustom ? '#1890ff' : '#f4f3f4'}
                />
                <Text style={styles.switchLabel}>
                  {formData.isCustom ? 'Có' : 'Không'}
                </Text>
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.submitButton, styles.primaryButton]}
                  onPress={submitForm}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      {editId ? 'Cập nhật' : 'Thêm mới'}
                    </Text>
                  )}
                </TouchableOpacity>
                {editId && (
                  <TouchableOpacity
                    style={[styles.submitButton, styles.cancelButton]}
                    onPress={stopEdit}
                  >
                    <Text style={styles.cancelButtonText}>Hủy</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonIcon: {
    fontSize: 24,
    color: '#333',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  filterSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  servicesList: {
    padding: 16,
  },
  categoryGroup: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#52c41a',
    marginRight: 8,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  serviceDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    padding: 4,
  },
  serviceActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  editButton: {
    backgroundColor: '#e6f7ff',
  },
  deleteButton: {
    backgroundColor: '#fff1f0',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#1890ff',
    fontWeight: '600',
  },
  actionIcon: {
    fontSize: 16,
  },
  formIcon: {
    fontSize: 24,
  },
  quantityIcon: {
    fontSize: 20,
  },
  deleteButtonText: {
    color: '#ff4d4f',
  },
  formSection: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  formContent: {
    gap: 16,
  },
  formRow: {
    gap: 8,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#1890ff',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});
