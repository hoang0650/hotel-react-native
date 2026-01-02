import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

interface HotelContextType {
  selectedHotelId: string | null;
  setSelectedHotelId: (hotelId: string | null) => Promise<void>;
  loading: boolean;
}

const HotelContext = createContext<HotelContextType | undefined>(undefined);

const SELECTED_HOTEL_KEY = 'selectedHotelId';

interface HotelProviderProps {
  children: ReactNode;
}

export function HotelProvider({ children }: HotelProviderProps) {
  const { user } = useAuth();
  const [selectedHotelId, setSelectedHotelIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load selected hotel from AsyncStorage on mount
  useEffect(() => {
    loadSelectedHotel();
  }, [user]);

  const loadSelectedHotel = async () => {
    try {
      setLoading(true);
      // First, try to get from AsyncStorage
      const savedHotelId = await AsyncStorage.getItem(SELECTED_HOTEL_KEY);
      
      if (savedHotelId) {
        setSelectedHotelIdState(savedHotelId);
      } else if (user?.hotelId) {
        // If no saved hotel, use user's hotelId
        setSelectedHotelIdState(user.hotelId);
        await AsyncStorage.setItem(SELECTED_HOTEL_KEY, user.hotelId);
      } else if (user?.businessId) {
        // Fallback to businessId if no hotelId
        setSelectedHotelIdState(user.businessId);
        await AsyncStorage.setItem(SELECTED_HOTEL_KEY, user.businessId);
      }
    } catch (error) {
      console.error('Error loading selected hotel:', error);
      // Fallback to user's hotelId or businessId
      if (user?.hotelId) {
        setSelectedHotelIdState(user.hotelId);
      } else if (user?.businessId) {
        setSelectedHotelIdState(user.businessId);
      }
    } finally {
      setLoading(false);
    }
  };

  const setSelectedHotelId = async (hotelId: string | null) => {
    try {
      if (hotelId) {
        await AsyncStorage.setItem(SELECTED_HOTEL_KEY, hotelId);
        setSelectedHotelIdState(hotelId);
      } else {
        await AsyncStorage.removeItem(SELECTED_HOTEL_KEY);
        setSelectedHotelIdState(null);
      }
    } catch (error) {
      console.error('Error saving selected hotel:', error);
      // Still update state even if AsyncStorage fails
      setSelectedHotelIdState(hotelId);
    }
  };

  return (
    <HotelContext.Provider
      value={{
        selectedHotelId,
        setSelectedHotelId,
        loading,
      }}
    >
      {children}
    </HotelContext.Provider>
  );
}

export function useHotel() {
  const context = useContext(HotelContext);
  if (context === undefined) {
    throw new Error('useHotel must be used within a HotelProvider');
  }
  return context;
}

