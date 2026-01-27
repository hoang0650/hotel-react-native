import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/contexts/TranslationContext';
import { authService } from '@/services/auth.service';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!emailOrUsername) {
      Alert.alert('Lỗi', 'Vui lòng nhập email hoặc username');
      return;
    }
    setLoading(true);
    try {
      const message = await authService.forgotPassword(emailOrUsername);
      Alert.alert('Thành công', message);
      router.replace('/(auth)/login');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể gửi yêu cầu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <IconSymbol name="envelope.fill" size={32} color="#fff" />
      </View>
      <Text style={styles.title}>Quên mật khẩu</Text>
      <View style={styles.form}>
        <Text style={styles.label}>Email hoặc Username</Text>
        <TextInput style={styles.input} value={emailOrUsername} onChangeText={setEmailOrUsername} autoCapitalize="none" />
        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Gửi yêu cầu</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.linkText}>Quay lại đăng nhập</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f7f9fc' },
  iconWrapper: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1890ff', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  form: { width: '100%' },
  label: { fontSize: 14, color: '#444', marginBottom: 6, marginLeft: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  button: { backgroundColor: '#1890ff', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkButton: { marginTop: 12, alignItems: 'center' },
  linkText: { color: '#1890ff' },
});
