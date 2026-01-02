import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { userService } from '@/services/user.service';
import { User } from '@/types';
import { format } from '@/utils/dateUtils';
import { getImageUrl } from '@/utils/imageUtils';

interface AccountModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AccountModal({ visible, onClose }: AccountModalProps) {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<User | null>(null);

  // Basic info
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');

  // Bank account
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [branch, setBranch] = useState('');
  const [swiftCode, setSwiftCode] = useState('');
  const [iban, setIban] = useState('');

  // Personal info
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [nationality, setNationality] = useState('');
  const [idCard, setIdCard] = useState('');
  const [idCardIssueDate, setIdCardIssueDate] = useState('');
  const [idCardIssuePlace, setIdCardIssuePlace] = useState('');
  const [street, setStreet] = useState('');
  const [ward, setWard] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');

  useEffect(() => {
    if (visible && user) {
      loadProfile();
    }
  }, [visible, user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const profile = await userService.getProfile();
      setProfileData(profile);
      
      // Populate basic info
      setFullName(profile.fullName || '');
      setPhone(profile.phone || '');
      setAvatar(profile.avatar || '');

      // Populate bank account
      if (profile.bankAccount) {
        setBankName(profile.bankAccount.bankName || '');
        setAccountNumber(profile.bankAccount.accountNumber || '');
        setAccountHolderName(profile.bankAccount.accountHolderName || '');
        setBeneficiaryName(profile.bankAccount.beneficiaryName || '');
        setBranch(profile.bankAccount.branch || '');
        setSwiftCode(profile.bankAccount.swiftCode || '');
        setIban(profile.bankAccount.iban || '');
      }

      // Populate personal info
      if (profile.personalInfo) {
        setDateOfBirth(
          profile.personalInfo.dateOfBirth
            ? format(new Date(profile.personalInfo.dateOfBirth), 'yyyy-MM-dd')
            : ''
        );
        setGender(profile.personalInfo.gender || '');
        setNationality(profile.personalInfo.nationality || '');
        setIdCard(profile.personalInfo.idCard || '');
        setIdCardIssueDate(
          profile.personalInfo.idCardIssueDate
            ? format(new Date(profile.personalInfo.idCardIssueDate), 'yyyy-MM-dd')
            : ''
        );
        setIdCardIssuePlace(profile.personalInfo.idCardIssuePlace || '');
        
        if (profile.personalInfo.address) {
          setStreet(profile.personalInfo.address.street || '');
          setWard(profile.personalInfo.address.ward || '');
          setDistrict(profile.personalInfo.address.district || '');
          setCity(profile.personalInfo.address.city || '');
          setCountry(profile.personalInfo.address.country || '');
          setPostalCode(profile.personalInfo.address.postalCode || '');
        }
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin tài khoản');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const updateData: any = {
        fullName: fullName || undefined,
        phone: phone || undefined,
        avatar: avatar || undefined,
      };

      // Bank account
      if (bankName || accountNumber || accountHolderName || beneficiaryName || branch || swiftCode || iban) {
        updateData.bankAccount = {
          bankName: bankName || undefined,
          accountNumber: accountNumber || undefined,
          accountHolderName: accountHolderName || undefined,
          beneficiaryName: beneficiaryName || undefined,
          branch: branch || undefined,
          swiftCode: swiftCode || undefined,
          iban: iban || undefined,
        };
      }

      // Personal info
      if (
        dateOfBirth ||
        gender ||
        nationality ||
        idCard ||
        idCardIssueDate ||
        idCardIssuePlace ||
        street ||
        ward ||
        district ||
        city ||
        country ||
        postalCode
      ) {
        updateData.personalInfo = {
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : undefined,
          gender: gender || undefined,
          nationality: nationality || undefined,
          idCard: idCard || undefined,
          idCardIssueDate: idCardIssueDate ? new Date(idCardIssueDate).toISOString() : undefined,
          idCardIssuePlace: idCardIssuePlace || undefined,
          address: {
            street: street || undefined,
            ward: ward || undefined,
            district: district || undefined,
            city: city || undefined,
            country: country || undefined,
            postalCode: postalCode || undefined,
          },
        };
      }

      const response = await userService.updateProfile(updateData);
      
      if (response.success || response.data || response.user) {
        Alert.alert('Thành công', 'Cập nhật thông tin tài khoản thành công');
        await refreshUser();
        onClose();
      } else {
        Alert.alert('Lỗi', response.message || 'Không thể cập nhật thông tin');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật thông tin');
    } finally {
      setSaving(false);
    }
  };


  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Thông tin tài khoản</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1890ff" />
            </View>
          ) : (
            <ScrollView style={styles.modalBody}>
              {/* Basic Info */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
                
                <View style={styles.formRow}>
                  <Text style={styles.label}>Tên đăng nhập</Text>
                  <TextInput
                    style={[styles.input, styles.inputDisabled]}
                    value={user?.username || ''}
                    editable={false}
                    placeholder="Tên đăng nhập"
                  />
                  <Text style={styles.hint}>Tên đăng nhập không thể thay đổi</Text>
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={[styles.input, styles.inputDisabled]}
                    value={user?.email || ''}
                    editable={false}
                    placeholder="Email"
                  />
                  <Text style={styles.hint}>Email không thể thay đổi</Text>
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.label}>Họ và tên</Text>
                  <TextInput
                    style={styles.input}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Nhập họ và tên"
                  />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.label}>Số điện thoại</Text>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Nhập số điện thoại"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.label}>Ảnh đại diện (URL)</Text>
                  <TextInput
                    style={styles.input}
                    value={avatar}
                    onChangeText={setAvatar}
                    placeholder="Nhập URL ảnh đại diện"
                  />
                  {avatar && (
                    <Image
                      source={{ uri: getImageUrl(avatar) }}
                      style={styles.avatarPreview}
                    />
                  )}
                </View>
              </View>

              {/* Bank Account */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Thông tin ngân hàng</Text>
                
                <View style={styles.formRow}>
                  <Text style={styles.label}>Tên ngân hàng</Text>
                  <TextInput
                    style={styles.input}
                    value={bankName}
                    onChangeText={setBankName}
                    placeholder="Nhập tên ngân hàng"
                  />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.label}>Số tài khoản</Text>
                  <TextInput
                    style={styles.input}
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    placeholder="Nhập số tài khoản"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.label}>Tên chủ tài khoản</Text>
                  <TextInput
                    style={styles.input}
                    value={accountHolderName}
                    onChangeText={setAccountHolderName}
                    placeholder="Nhập tên chủ tài khoản"
                  />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.label}>Tên người thụ hưởng</Text>
                  <TextInput
                    style={styles.input}
                    value={beneficiaryName}
                    onChangeText={setBeneficiaryName}
                    placeholder="Nhập tên người thụ hưởng"
                  />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.label}>Chi nhánh</Text>
                  <TextInput
                    style={styles.input}
                    value={branch}
                    onChangeText={setBranch}
                    placeholder="Nhập chi nhánh"
                  />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.label}>SWIFT Code</Text>
                  <TextInput
                    style={styles.input}
                    value={swiftCode}
                    onChangeText={setSwiftCode}
                    placeholder="Nhập SWIFT Code"
                  />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.label}>IBAN</Text>
                  <TextInput
                    style={styles.input}
                    value={iban}
                    onChangeText={setIban}
                    placeholder="Nhập IBAN"
                  />
                </View>
              </View>

              {/* Personal Info */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
                
                <View style={styles.formRow}>
                  <Text style={styles.label}>Ngày sinh</Text>
                  <TextInput
                    style={styles.input}
                    value={dateOfBirth}
                    onChangeText={setDateOfBirth}
                    placeholder="YYYY-MM-DD"
                  />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.label}>Giới tính</Text>
                  <View style={styles.genderContainer}>
                    {['male', 'female', 'other'].map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[
                          styles.genderButton,
                          gender === g && styles.genderButtonActive,
                        ]}
                        onPress={() => setGender(g)}
                      >
                        <Text
                          style={[
                            styles.genderButtonText,
                            gender === g && styles.genderButtonTextActive,
                          ]}
                        >
                          {g === 'male' ? 'Nam' : g === 'female' ? 'Nữ' : 'Khác'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.label}>Quốc tịch</Text>
                  <TextInput
                    style={styles.input}
                    value={nationality}
                    onChangeText={setNationality}
                    placeholder="Nhập quốc tịch"
                  />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.label}>Số CMND/CCCD</Text>
                  <TextInput
                    style={styles.input}
                    value={idCard}
                    onChangeText={setIdCard}
                    placeholder="Nhập số CMND/CCCD"
                  />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.label}>Ngày cấp</Text>
                  <TextInput
                    style={styles.input}
                    value={idCardIssueDate}
                    onChangeText={setIdCardIssueDate}
                    placeholder="YYYY-MM-DD"
                  />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.label}>Nơi cấp</Text>
                  <TextInput
                    style={styles.input}
                    value={idCardIssuePlace}
                    onChangeText={setIdCardIssuePlace}
                    placeholder="Nhập nơi cấp"
                  />
                </View>

                <Text style={styles.subsectionTitle}>Địa chỉ</Text>

                <View style={styles.formRow}>
                  <Text style={styles.label}>Đường/Phố</Text>
                  <TextInput
                    style={styles.input}
                    value={street}
                    onChangeText={setStreet}
                    placeholder="Nhập đường/phố"
                  />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.label}>Phường/Xã</Text>
                  <TextInput
                    style={styles.input}
                    value={ward}
                    onChangeText={setWard}
                    placeholder="Nhập phường/xã"
                  />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.label}>Quận/Huyện</Text>
                  <TextInput
                    style={styles.input}
                    value={district}
                    onChangeText={setDistrict}
                    placeholder="Nhập quận/huyện"
                  />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.label}>Tỉnh/Thành phố</Text>
                  <TextInput
                    style={styles.input}
                    value={city}
                    onChangeText={setCity}
                    placeholder="Nhập tỉnh/thành phố"
                  />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.label}>Quốc gia</Text>
                  <TextInput
                    style={styles.input}
                    value={country}
                    onChangeText={setCountry}
                    placeholder="Nhập quốc gia"
                  />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.label}>Mã bưu điện</Text>
                  <TextInput
                    style={styles.input}
                    value={postalCode}
                    onChangeText={setPostalCode}
                    placeholder="Nhập mã bưu điện"
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onClose}
                  disabled={saving}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  modalBody: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 12,
  },
  formRow: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#999',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  avatarPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginTop: 8,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#e6f7ff',
    borderColor: '#1890ff',
  },
  genderButtonText: {
    fontSize: 14,
    color: '#666',
  },
  genderButtonTextActive: {
    color: '#1890ff',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#1890ff',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

