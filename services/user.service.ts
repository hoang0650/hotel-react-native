import { apiService } from './api';
import { User } from '@/types';

export interface UpdateProfileRequest {
  fullName?: string;
  phone?: string;
  avatar?: string;
  avatarId?: string;
  bankAccount?: {
    bankName?: string;
    accountNumber?: string;
    accountHolderName?: string;
    beneficiaryName?: string;
    branch?: string;
    swiftCode?: string;
    iban?: string;
    qrPaymentUrl?: string;
  };
  personalInfo?: {
    dateOfBirth?: Date | string;
    gender?: string;
    nationality?: string;
    idCard?: string;
    idCardIssueDate?: Date | string;
    idCardIssuePlace?: string;
    address?: {
      street?: string;
      ward?: string;
      district?: string;
      city?: string;
      country?: string;
      postalCode?: string;
    };
  };
}

class UserService {
  /**
   * Lấy thông tin profile của user hiện tại
   */
  async getProfile(): Promise<User> {
    return await apiService.get('/users/profile');
  }

  /**
   * Cập nhật thông tin profile
   */
  async updateProfile(data: UpdateProfileRequest): Promise<{ success: boolean; message?: string; data?: User; user?: User }> {
    // Clean up undefined values
    const cleanData: any = {};
    
    if (data.fullName !== undefined) cleanData.fullName = data.fullName;
    if (data.phone !== undefined) cleanData.phone = data.phone;
    if (data.avatar !== undefined) cleanData.avatar = data.avatar;
    if (data.avatarId !== undefined) cleanData.avatarId = data.avatarId;

    if (data.bankAccount) {
      cleanData.bankAccount = {};
      Object.keys(data.bankAccount).forEach(key => {
        const value = data.bankAccount![key as keyof typeof data.bankAccount];
        if (value !== undefined && value !== '') {
          cleanData.bankAccount[key] = value;
        }
      });
      if (Object.keys(cleanData.bankAccount).length === 0) {
        delete cleanData.bankAccount;
      }
    }

    if (data.personalInfo) {
      cleanData.personalInfo = {};
      if (data.personalInfo.dateOfBirth !== undefined) {
        cleanData.personalInfo.dateOfBirth = data.personalInfo.dateOfBirth instanceof Date 
          ? data.personalInfo.dateOfBirth.toISOString() 
          : data.personalInfo.dateOfBirth;
      }
      if (data.personalInfo.gender !== undefined && data.personalInfo.gender !== '') {
        cleanData.personalInfo.gender = data.personalInfo.gender;
      }
      if (data.personalInfo.nationality !== undefined && data.personalInfo.nationality !== '') {
        cleanData.personalInfo.nationality = data.personalInfo.nationality;
      }
      if (data.personalInfo.idCard !== undefined && data.personalInfo.idCard !== '') {
        cleanData.personalInfo.idCard = data.personalInfo.idCard;
      }
      if (data.personalInfo.idCardIssueDate !== undefined) {
        cleanData.personalInfo.idCardIssueDate = data.personalInfo.idCardIssueDate instanceof Date 
          ? data.personalInfo.idCardIssueDate.toISOString() 
          : data.personalInfo.idCardIssueDate;
      }
      if (data.personalInfo.idCardIssuePlace !== undefined && data.personalInfo.idCardIssuePlace !== '') {
        cleanData.personalInfo.idCardIssuePlace = data.personalInfo.idCardIssuePlace;
      }
      if (data.personalInfo.address) {
        cleanData.personalInfo.address = {};
        Object.keys(data.personalInfo.address).forEach(key => {
          const value = data.personalInfo!.address![key as keyof typeof data.personalInfo.address];
          if (value !== undefined && value !== '') {
            cleanData.personalInfo.address[key] = value;
          }
        });
        if (Object.keys(cleanData.personalInfo.address).length === 0) {
          delete cleanData.personalInfo.address;
        }
      }
      if (Object.keys(cleanData.personalInfo).length === 0) {
        delete cleanData.personalInfo;
      }
    }

    return await apiService.patch('/users/profile', cleanData);
  }

  /**
   * Upload avatar image
   */
  async uploadAvatar(imageUri: string): Promise<{ imageId: string; imageUrl: string }> {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'avatar.jpg',
    } as any);

    return await apiService.post('/files/upload', formData, true, {
      'Content-Type': 'multipart/form-data',
    });
  }

  /**
   * Lấy tất cả users (cho staff management)
   */
  async getAllUsers(): Promise<User[]> {
    return await apiService.get('/users');
  }

  /**
   * Lấy users theo hotel
   */
  async getUsersByHotel(hotelId: string): Promise<User[]> {
    return await apiService.get(`/users/hotel/${hotelId}`);
  }
}

export const userService = new UserService();

