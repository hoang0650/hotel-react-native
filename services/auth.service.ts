import { apiService } from './api';
import { API_ENDPOINTS } from '@/constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, LoginRequest, AuthResponse, UserRole } from '@/types';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export class AuthService {
  private currentUser: User | null = null;

  async signup(data: { username: string; email: string; password: string; fullName?: string; phone?: string }): Promise<User | null> {
    try {
      const res = await apiService.post<any>(API_ENDPOINTS.AUTH.REGISTER, data, false);
      const user = res?.user || null;
      return user;
    } catch (error: any) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  async forgotPassword(emailOrUsername: string): Promise<string> {
    try {
      const isEmail = emailOrUsername.includes('@');
      const payload: any = {};
      if (isEmail) {
        payload.email = emailOrUsername;
      } else {
        payload.username = emailOrUsername;
      }
      const res = await apiService.post<{ message: string }>(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, payload, false);
      return res?.message || 'Yêu cầu đặt lại mật khẩu đã được tạo';
    } catch (error: any) {
      console.error('Forgot password error:', error);
      throw error;
    }
  }

  async resetPassword(token: string, password: string): Promise<string> {
    try {
      const payload = { token, password };
      const res = await apiService.post<{ message: string }>(API_ENDPOINTS.AUTH.RESET_PASSWORD, payload, false);
      return res?.message || 'Đặt lại mật khẩu thành công';
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw error;
    }
  }

  async login(emailOrUsername: string, password: string): Promise<boolean> {
    try {
      const isEmail = emailOrUsername.includes('@');
      const form = new URLSearchParams();
      form.append('password', password);
      if (isEmail) {
        form.append('email', emailOrUsername);
      } else {
        form.append('username', emailOrUsername);
      }

      const response = await apiService.post<AuthResponse>(
        API_ENDPOINTS.AUTH.LOGIN,
        form,
        false,
        'application/x-www-form-urlencoded'
      );

      if (response && response.token) {
        await AsyncStorage.setItem(TOKEN_KEY, response.token);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));
        this.currentUser = response.user;
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      try {
        await apiService.post(API_ENDPOINTS.AUTH.LOGOUT, {}, true);
      } catch (apiErr) {}
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, 'selectedHotelId']);
      this.currentUser = null;
    } catch (error) {
      console.error('Error during logout:', error);
      try {
        await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, 'selectedHotelId']);
        this.currentUser = null;
      } catch (clearError) {}
    }
  }

  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    try {
      const userJson = await AsyncStorage.getItem(USER_KEY);
      if (userJson) {
        this.currentUser = JSON.parse(userJson);
        return this.currentUser;
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }

    return null;
  }

  async isLoggedIn(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }

  // Role checks
  async isSuperAdmin(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return !!user && user.role === 'superadmin';
  }

  async isAdmin(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return !!user && (user.role === 'admin' || user.role === 'superadmin');
  }

  async isBusiness(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return !!user && user.role === 'business';
  }

  async isHotelManager(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return !!user && user.role === 'hotel';
  }

  async isStaff(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return !!user && user.role === 'staff';
  }

  async getBusinessId(): Promise<string | null> {
    const user = await this.getCurrentUser();
    return user?.businessId || null;
  }

  async getHotelId(): Promise<string | null> {
    const user = await this.getCurrentUser();
    return user?.hotelId || null;
  }

  async getUserId(): Promise<string | null> {
    const user = await this.getCurrentUser();
    return user?._id || null;
  }
}

export const authService = new AuthService();

