import { apiService } from './api';
import { API_ENDPOINTS } from '@/constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, LoginRequest, AuthResponse, UserRole } from '@/types';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export class AuthService {
  private currentUser: User | null = null;

  async login(emailOrUsername: string, password: string): Promise<boolean> {
    try {
      const isEmail = emailOrUsername.includes('@');
      const loginPayload: LoginRequest = {
        username: isEmail ? '' : emailOrUsername,
        password,
      };

      // Add email if it's an email
      const payload: any = { password };
      if (isEmail) {
        payload.email = emailOrUsername;
      } else {
        payload.username = emailOrUsername;
      }

      const response = await apiService.post<AuthResponse>(
        '/users/login',
        payload,
        false
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
    // Simple logout - just clear local storage and state
    // Similar to Angular app: UserService.logout() and AuthService.logout()
    // No API call needed - just clear client-side token and state
    try {
      // Clear local storage
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
      
      // Clear selected hotel if exists
      try {
        await AsyncStorage.removeItem('selectedHotelId');
      } catch (error) {
        // Ignore error if key doesn't exist
      }
      
      // Clear current user state
      this.currentUser = null;
    } catch (error) {
      console.error('Error during local logout:', error);
      // Even if there's an error, ensure local data is cleared
      try {
        await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, 'selectedHotelId']);
        this.currentUser = null;
      } catch (clearError) {
        console.error('Error clearing storage in fallback:', clearError);
      }
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

