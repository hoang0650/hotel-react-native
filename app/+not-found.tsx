import { Link, Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Không tìm thấy' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Trang không tồn tại</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Quay về trang chủ</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: Colors.light.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  link: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Colors.light.tint,
    borderRadius: 8,
  },
  linkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500' as const,
  },
});
