import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/contexts/TranslationContext';
import { authService } from '@/services/auth.service';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function SignupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!username || !email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập username, email và mật khẩu');
      return;
    }
    setLoading(true);
    try {
      const user = await authService.signup({ username, email, password, fullName, phone });
      if (user) {
        Alert.alert('Thành công', 'Đăng ký tài khoản thành công. Vui lòng đăng nhập.');
        router.replace('/(auth)/login');
      } else {
        Alert.alert('Thông báo', 'Đăng ký không thành công. Vui lòng thử lại.');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Có lỗi xảy ra khi đăng ký');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <IconSymbol name="person.crop.circle.fill" size={32} color="#fff" />
      </View>
      <Text style={styles.title}>Đăng ký</Text>
      <View style={styles.form}>
        <Text style={styles.label}>Username</Text>
        <TextInput style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none" />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

        <Text style={styles.label}>Mật khẩu</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />

        <Text style={styles.label}>Họ và tên (tùy chọn)</Text>
        <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />

        <Text style={styles.label}>Số điện thoại (tùy chọn)</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSignup} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Đăng ký</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.linkText}>Đã có tài khoản? Đăng nhập</Text>
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
