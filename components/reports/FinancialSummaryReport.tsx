import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface FinancialSummaryReportProps {
  onBack: () => void;
}

export default function FinancialSummaryReport({ onBack }: FinancialSummaryReportProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Báo cáo tài chính tổng hợp</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.placeholder}>Đang phát triển...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { marginRight: 12 },
  backButtonText: { fontSize: 16, color: '#1890ff' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholder: { fontSize: 16, color: '#999' },
});

