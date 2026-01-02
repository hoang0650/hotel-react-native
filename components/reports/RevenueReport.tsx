import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useHotel } from '@/contexts/HotelContext';
import { revenueService } from '@/services/revenue.service';
import { format, subDays, subWeeks, subMonths } from '@/utils/dateUtils';

type Period = 'day' | 'week' | 'month';

interface RevenueReportProps {
  onBack: () => void;
}

export default function RevenueReport({ onBack }: RevenueReportProps) {
  const { user } = useAuth();
  const { selectedHotelId } = useHotel();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('day');
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState({
    labels: [] as string[],
    revenueData: [] as number[],
    paymentData: [] as number[],
    expenseData: [] as number[],
    totalRevenue: 0,
    totalPayment: 0,
    totalExpense: 0,
  });

  useEffect(() => {
    loadRevenue();
  }, [selectedHotelId, selectedPeriod]);

  const loadRevenue = async () => {
    try {
      setLoading(true);
      const hotelId = selectedHotelId || user?.hotelId || user?.businessId;
      if (!hotelId) {
        console.warn('No hotelId found');
        return;
      }

      const now = new Date();
      let startDate: Date;
      switch (selectedPeriod) {
        case 'day':
          startDate = subDays(now, 6);
          break;
        case 'week':
          startDate = subWeeks(now, 3);
          break;
        case 'month':
          startDate = subMonths(now, 11);
          break;
        default:
          startDate = subDays(now, 6);
      }

      const response = await revenueService.getRevenue({
        hotelId,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(now, 'yyyy-MM-dd'),
        period: selectedPeriod,
      });

      setRevenueData(response);
    } catch (error: any) {
      console.error('Error loading revenue:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải dữ liệu doanh thu');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
  };

  const formatLabel = (label: string) => {
    if (selectedPeriod === 'month') {
      const parts = label.split('/');
      return parts.length === 2 ? `T${parts[0]}/${parts[1]}` : label;
    }
    return label;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1890ff" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Doanh thu</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[
              styles.periodButton,
              selectedPeriod === 'day' && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod('day')}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === 'day' && styles.periodButtonTextActive,
              ]}
            >
              Ngày
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodButton,
              selectedPeriod === 'week' && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod('week')}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === 'week' && styles.periodButtonTextActive,
              ]}
            >
              Tuần
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodButton,
              selectedPeriod === 'month' && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod('month')}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === 'month' && styles.periodButtonTextActive,
              ]}
            >
              Tháng
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCards}>
          <View style={[styles.summaryCard, styles.revenueCard]}>
            <Text style={styles.summaryLabel}>Tổng doanh thu</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(revenueData.totalRevenue)}
            </Text>
          </View>
          <View style={[styles.summaryCard, styles.expenseCard]}>
            <Text style={styles.summaryLabel}>Tổng chi phí</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(revenueData.totalExpense)}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCards}>
          <View style={[styles.summaryCard, styles.profitCard]}>
            <Text style={styles.summaryLabel}>Lợi nhuận</Text>
            <Text
              style={[
                styles.summaryValue,
                revenueData.totalRevenue - revenueData.totalExpense < 0 &&
                  styles.negativeValue,
              ]}
            >
              {formatCurrency(
                revenueData.totalRevenue - revenueData.totalExpense
              )}
            </Text>
          </View>
          <View style={[styles.summaryCard, styles.paymentCard]}>
            <Text style={styles.summaryLabel}>Tổng thanh toán</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(revenueData.totalPayment)}
            </Text>
          </View>
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Biểu đồ doanh thu</Text>
          <View style={styles.chartPlaceholder}>
            <Text style={styles.chartPlaceholderText}>
              {revenueData.labels.length === 0
                ? 'Chưa có dữ liệu'
                : `${revenueData.labels.length} kỳ dữ liệu`}
            </Text>
            {revenueData.labels.length > 0 && (
              <View style={styles.chartData}>
                {revenueData.labels.map((label, index) => (
                  <View key={index} style={styles.chartBar}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height:
                            (revenueData.revenueData[index] /
                              Math.max(...revenueData.revenueData, 1)) *
                            100,
                          backgroundColor: '#1890ff',
                        },
                      ]}
                    />
                    <Text style={styles.barLabel}>{formatLabel(label)}</Text>
                    <Text style={styles.barValue}>
                      {formatCurrency(revenueData.revenueData[index])}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
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
  backButton: {
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#1890ff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#1890ff',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#666',
  },
  periodButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  revenueCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#52c41a',
  },
  expenseCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff4d4f',
  },
  profitCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#1890ff',
  },
  paymentCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#722ed1',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  negativeValue: {
    color: '#ff4d4f',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  chartPlaceholder: {
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartPlaceholderText: {
    fontSize: 14,
    color: '#999',
  },
  chartData: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    width: '100%',
    height: 200,
    marginTop: 20,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  bar: {
    width: '100%',
    minHeight: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  barValue: {
    fontSize: 9,
    color: '#999',
    marginTop: 2,
  },
});

