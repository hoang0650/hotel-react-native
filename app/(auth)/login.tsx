import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTranslation } from '@/contexts/TranslationContext';

export default function LoginScreen() {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!emailOrUsername || !password) {
      Alert.alert('Error', 'Please enter both username/email and password');
      return;
    }

    setLoading(true);
    try {
      const success = await login(emailOrUsername, password);
      if (success) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Login Failed', 'Invalid credentials');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <IconSymbol name="house.fill" size={32} color="#fff" />
      </View>
      <Text style={styles.title}>{t('home.title')}</Text>
      <Text style={styles.subtitle}>Sign in to continue</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          value={emailOrUsername}
          onChangeText={setEmailOrUsername}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
            <Text style={{ color: '#1890ff' }}>Quên mật khẩu?</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
            <Text style={{ color: '#1890ff' }}>Đăng ký</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.footer}>{t('home.title')} v1.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f7f9fc',
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1890ff',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    color: '#444',
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#1890ff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 16,
    textAlign: 'center',
    color: '#9aa0a6',
    fontSize: 12,
  },
});

