import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiService } from '@/services/api';
import { API_CONFIG } from '@/constants/api';

interface OCRScannerProps {
  visible: boolean;
  onClose: () => void;
  onScanComplete: (data: {
    fullName?: string;
    idNumber?: string;
    dateOfBirth?: string;
    gender?: 'male' | 'female';
    nationality?: string;
    phone?: string;
    address?: string;
    permanentAddress?: string;
  }) => void;
  allowMultiple?: boolean;
}

export default function OCRScanner({
  visible,
  onClose,
  onScanComplete,
  allowMultiple = true,
}: OCRScannerProps) {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');
  const [swapFrontBack, setSwapFrontBack] = useState(false);

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Quyền truy cập camera',
          'Ứng dụng cần quyền truy cập camera để quét CMND/CCCD',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  };

  const requestMediaLibraryPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Quyền truy cập thư viện',
          'Ứng dụng cần quyền truy cập thư viện ảnh để chọn ảnh CMND/CCCD',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  };

  const pickImage = async (source: 'camera' | 'library') => {
    try {
      let result;

      if (source === 'camera') {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) return;

        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
          allowsMultipleSelection: allowMultiple,
        });
      } else {
        const hasPermission = await requestMediaLibraryPermission();
        if (!hasPermission) return;

        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
          allowsMultipleSelection: allowMultiple,
        });
      }

      if (!result.canceled && result.assets) {
        let imageUris = result.assets.map((asset) => asset.uri);
        if (allowMultiple && imageUris.length > 2) {
          imageUris = imageUris.slice(0, 2);
          Alert.alert('Thông báo', 'Chỉ hỗ trợ tối đa 2 ảnh (mặt trước và mặt sau). Đã chọn 2 ảnh đầu tiên.');
        }
        setSelectedImages(imageUris);
        setSwapFrontBack(false);
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
    }
  };

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newImages);
  };

  const scanOCR = async () => {
    if (selectedImages.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng chọn ít nhất một ảnh để quét');
      return;
    }

    try {
      setIsScanning(true);
      setScanProgress(0);
      setScanStatus('Đang xử lý ảnh...');

      const formData = new FormData();
      // Chuẩn bị FormData theo API AI:
      // - Nếu 1 ảnh: /ocr với field 'image'
      // - Nếu >=2 ảnh: /ocr-card với fields 'front' và 'back'
      const buildFile = (uri: string, index: number) => {
        const filename = uri.split('/').pop() || `image_${index}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        return {
          uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
          name: filename,
          type,
        } as any;
      };
      let useCardApi = false;
      if (selectedImages.length >= 2) {
        useCardApi = true;
        const frontIndex = swapFrontBack ? 1 : 0;
        const backIndex = swapFrontBack ? 0 : 1;
        formData.append('front', buildFile(selectedImages[frontIndex], frontIndex));
        formData.append('back', buildFile(selectedImages[backIndex], backIndex));
      } else {
        formData.append('image', buildFile(selectedImages[0], 0));
      }

      setScanProgress(30);
      setScanStatus(selectedImages.length >= 2 ? 'Đang gửi mặt trước/sau lên server...' : 'Đang gửi ảnh lên server...');

      // Gọi API OCR tới PHGroup-AI
      const endpoint = useCardApi ? `${API_CONFIG.AI_BASE_URL}/ocr-card` : `${API_CONFIG.AI_BASE_URL}/ocr`;
      const response = await apiService.post<any>(endpoint, formData, false);

      setScanProgress(70);
      setScanStatus('Đang phân tích thông tin...');

      // AI server trả payload trực tiếp
      if (response && (response.fullName || response.idNumber || response.rawText)) {
        setScanProgress(100);
        setScanStatus('Hoàn thành!');

        // Parse và format dữ liệu OCR
        const ocrData = response;
        
        const parsedData = {
          fullName: ocrData.fullName || ocrData.name,
          idNumber: ocrData.idNumber || ocrData.cmnd || ocrData.cccd,
          dateOfBirth: ocrData.dateOfBirth || ocrData.dob,
          gender: ocrData.gender === 'Nam' || ocrData.gender === 'male' ? 'male' : 
                  ocrData.gender === 'Nữ' || ocrData.gender === 'female' ? 'female' : undefined,
          nationality: ocrData.nationality || ocrData.quocTich || 'Việt Nam',
          phone: ocrData.phone || ocrData.phoneNumber,
          address: ocrData.address || ocrData.diaChi,
          permanentAddress: ocrData.permanentAddress || ocrData.noiThuongTru,
        };

        // Gọi callback với dữ liệu đã parse
        onScanComplete(parsedData);
        
        // Reset và đóng modal
        setTimeout(() => {
          setSelectedImages([]);
          setIsScanning(false);
          setScanProgress(0);
          setScanStatus('');
          onClose();
          Alert.alert('Thành công', 'Đã quét và điền thông tin từ CMND/CCCD. Vui lòng kiểm tra và chỉnh sửa nếu cần.');
        }, 500);
      } else {
        throw new Error(response?.error || 'Không thể quét thông tin từ ảnh');
      }
    } catch (error: any) {
      console.error('OCR scan error:', error);
      setIsScanning(false);
      setScanProgress(0);
      setScanStatus('');
      Alert.alert(
        'Lỗi',
        error.message || 'Không thể quét thông tin từ ảnh. Vui lòng thử lại hoặc nhập thủ công.'
      );
    }
  };

  const handleClose = () => {
    if (!isScanning) {
      setSelectedImages([]);
      setScanProgress(0);
      setScanStatus('');
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlayContainer} pointerEvents="box-none">
      <View style={styles.container}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Quét CMND/CCCD</Text>
            <TouchableOpacity onPress={handleClose} disabled={isScanning}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {selectedImages.length === 0 ? (
              <View style={styles.uploadArea}>
                <Text style={styles.uploadIcon}>📷</Text>
                <Text style={styles.uploadText}>
                  {allowMultiple
                    ? 'Chọn ảnh CMND/CCCD (có thể chọn 2 mặt)'
                    : 'Chọn ảnh CMND/CCCD'}
                </Text>
                <Text style={styles.uploadHint}>
                  Hỗ trợ: JPG, PNG. {allowMultiple && 'Có thể chọn nhiều ảnh (mặt trước và sau)'}
                </Text>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.button, styles.cameraButton]}
                    onPress={() => pickImage('camera')}
                  >
                    <Text style={styles.buttonIcon}>📷</Text>
                    <Text style={styles.buttonText}>Chụp ảnh</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.libraryButton]}
                    onPress={() => pickImage('library')}
                  >
                    <Text style={styles.buttonIcon}>🖼️</Text>
                    <Text style={styles.buttonText}>Chọn từ thư viện</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.previewContainer}>
                <Text style={styles.previewTitle}>Ảnh đã chọn:</Text>
                {selectedImages.map((uri, index) => (
                  <View key={index} style={styles.previewItem}>
                    <Image source={{ uri }} style={styles.previewImage} />
                    <View style={styles.previewInfo}>
                      <Text style={styles.previewLabel}>
                        {allowMultiple && selectedImages.length > 1
                          ? (index === (swapFrontBack ? 1 : 0) ? 'Mặt trước' : 'Mặt sau')
                          : 'Ảnh CMND/CCCD'}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeImage(index)}
                        style={styles.removeButton}
                        disabled={isScanning}
                      >
                        <Text style={styles.removeButtonText}>Xóa</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {selectedImages.length === 2 && (
                  <TouchableOpacity
                    style={[styles.addMoreButton, isScanning && styles.buttonDisabled]}
                    onPress={() => setSwapFrontBack((v) => !v)}
                    disabled={isScanning}
                  >
                    <Text style={styles.addMoreButtonText}>{swapFrontBack ? 'Hoán đổi lại: Ảnh đầu = mặt trước' : 'Hoán đổi: Ảnh đầu = mặt sau'}</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.addMoreButton, isScanning && styles.buttonDisabled]}
                  onPress={() => pickImage('library')}
                  disabled={isScanning}
                >
                  <Text style={styles.addMoreButtonText}>+ Thêm ảnh</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Scan Progress */}
            {isScanning && (
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>{scanStatus}</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${scanProgress}%` }]} />
                </View>
                <Text style={styles.progressPercent}>{scanProgress}%</Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.footerButton, styles.cancelButton]}
              onPress={handleClose}
              disabled={isScanning}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.footerButton,
                styles.scanButton,
                (selectedImages.length === 0 || isScanning) && styles.buttonDisabled,
              ]}
              onPress={scanOCR}
              disabled={selectedImages.length === 0 || isScanning}
            >
              {isScanning ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.scanButtonText}>Quét OCR</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 1000, // For Android
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#999',
  },
  content: {
    padding: 20,
    maxHeight: '70%',
  },
  uploadArea: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  uploadIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  uploadHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  cameraButton: {
    backgroundColor: '#1890ff',
  },
  libraryButton: {
    backgroundColor: '#52c41a',
  },
  buttonIcon: {
    fontSize: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  previewContainer: {
    gap: 16,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  previewItem: {
    marginBottom: 12,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginBottom: 8,
  },
  previewInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 14,
    color: '#666',
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ff4d4f',
    borderRadius: 4,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  addMoreButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#1890ff',
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  addMoreButtonText: {
    color: '#1890ff',
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1890ff',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  footerButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  scanButton: {
    backgroundColor: '#1890ff',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

