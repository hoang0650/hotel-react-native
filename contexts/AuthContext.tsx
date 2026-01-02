import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { authService } from '@/services/auth.service';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (emailOrUsername: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  }, []);

  const login = useCallback(async (emailOrUsername: string, password: string): Promise<boolean> => {
    try {
      const success = await authService.login(emailOrUsername, password);
      if (success) {
        await refreshUser();
      }
      return success;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }, [refreshUser]);

  const logout = useCallback(async () => {
    try {
      console.log('Logout: Starting logout process...');
      
      // Clear AsyncStorage first
      await authService.logout();
      console.log('Logout: AsyncStorage cleared');
      
      // Clear user state to immediately update isAuthenticated
      // Use functional update to ensure we're working with latest state
      setUser((prevUser) => {
        console.log('Logout: Setting user to null, previous user:', prevUser);
        return null;
      });
      
      // Ensure loading is false to trigger navigation check in _layout.tsx
      setLoading((prevLoading) => {
        console.log('Logout: Setting loading to false, previous loading:', prevLoading);
        return false;
      });
      
      console.log('Logout: State updates scheduled, isAuthenticated should now be false');
      
      return;
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, clear user state and ensure navigation
      setUser(null);
      setLoading(false);
      return;
    }
  }, []);

  // Calculate isAuthenticated based on user state - calculate directly, not with useMemo
  // This ensures it's always fresh
  const isAuthenticated = !!user;
  
  console.log('AuthContext: Rendering with user:', user, 'isAuthenticated:', isAuthenticated, 'loading:', loading);

  // Create value object directly - React will handle re-renders when user/loading change
  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

