import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/contexts/TranslationContext';
import { authService } from '@/services/auth.service';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!token || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập token và mật khẩu mới');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    setLoading(true);
    try {
      const message = await authService.resetPassword(token, password);
      Alert.alert('Thành công', message);
      router.replace('/(auth)/login');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể đặt lại mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <IconSymbol name="lock.rotation" size={32} color="#fff" />
      </View>
      <Text style={styles.title}>Đặt lại mật khẩu</Text>
      <View style={styles.form}>
        <Text style={styles.label}>Token</Text>
        <TextInput style={styles.input} value={token} onChangeText={setToken} autoCapitalize="none" />

        <Text style={styles.label}>Mật khẩu mới</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Đặt lại mật khẩu</Text>}
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
