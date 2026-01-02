import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { HotelProvider } from '@/contexts/HotelContext';
import { TranslationProvider } from '@/contexts/TranslationContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

function RootLayoutNav() {
  const { currentTheme } = useTheme();
  const { isAuthenticated, loading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationAttempted = useRef(false);

  useEffect(() => {
    console.log('Layout: useEffect triggered - isAuthenticated:', isAuthenticated, 'loading:', loading, 'user:', user);
    
    if (loading) {
      console.log('Layout: Still loading, skipping navigation check');
      navigationAttempted.current = false;
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    // Check both isAuthenticated and user directly to be sure
    const actuallyAuthenticated = isAuthenticated && !!user;
    console.log('Layout: Navigation check - isAuthenticated:', isAuthenticated, 'user:', user, 'actuallyAuthenticated:', actuallyAuthenticated, 'inAuthGroup:', inAuthGroup, 'segments:', segments);

    if (!actuallyAuthenticated && !inAuthGroup) {
      // User is not authenticated and not in auth group, redirect to login
      console.log('Layout: User not authenticated, redirecting to login...');
      
      // Prevent multiple navigation attempts
      if (navigationAttempted.current) {
        console.log('Layout: Navigation already attempted, skipping...');
        return;
      }
      
      navigationAttempted.current = true;
      
      // Use multiple attempts with increasing delays to ensure navigation happens
      const attemptNavigation = (attempt: number) => {
        try {
          console.log(`Layout: Navigation attempt ${attempt} to /(auth)/login...`);
          router.replace('/(auth)/login');
          console.log(`Layout: Navigation attempt ${attempt} successful`);
        } catch (error) {
          console.error(`Layout: Navigation attempt ${attempt} error:`, error);
          if (attempt < 3) {
            // Retry with delay
            setTimeout(() => attemptNavigation(attempt + 1), 100 * attempt);
          } else {
            // Last resort: try fallback paths
            try {
              router.replace('/login');
            } catch (e1) {
              try {
                router.push('/(auth)/login');
              } catch (e2) {
                console.error('Layout: All navigation methods failed', e2);
              }
            }
          }
        }
      };
      
      // Start navigation attempts
      attemptNavigation(1);
      setTimeout(() => attemptNavigation(2), 50);
      setTimeout(() => attemptNavigation(3), 150);
      
    } else if (actuallyAuthenticated && inAuthGroup) {
      // User is authenticated but in auth group, redirect to tabs
      console.log('Layout: User authenticated but in auth group, redirecting to tabs...');
      navigationAttempted.current = false;
      const navigationTimer = setTimeout(() => {
        router.replace('/(tabs)');
      }, 0);
      return () => clearTimeout(navigationTimer);
    } else {
      // Reset navigation flag when authenticated and in correct group
      navigationAttempted.current = false;
    }
  }, [isAuthenticated, loading, segments, router, user]);

  return (
    <NavigationThemeProvider value={currentTheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style={currentTheme === 'dark' ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <TranslationProvider>
      <ThemeProvider>
        <AuthProvider>
          <HotelProvider>
            <RootLayoutNav />
          </HotelProvider>
        </AuthProvider>
      </ThemeProvider>
    </TranslationProvider>
  );
}
