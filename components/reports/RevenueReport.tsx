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
import { useTranslation } from '@/contexts/TranslationContext';
import { revenueService } from '@/services/revenue.service';
import { format, subDays, subWeeks, subMonths } from '@/utils/dateUtils';
import { IconSymbol } from '@/components/ui/icon-symbol';

type Period = 'day' | 'week' | 'month';

interface RevenueReportProps {
  onBack: () => void;
}

export default function RevenueReport({ onBack }: RevenueReportProps) {
  const { user } = useAuth();
  const { selectedHotelId } = useHotel();
  const { t } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('day');
  const [loading, setLoading] = useState(false);
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
      // Ưu tiên selectedHotelId từ context (khách sạn hiện tại từ tổng quan)
      const hotelId = selectedHotelId || user?.hotelId || user?.businessId;
      if (!hotelId) {
        console.warn('No hotelId found, cannot load revenue');
        Alert.alert('Lỗi', 'Vui lòng chọn khách sạn để xem doanh thu');
        setRevenueData({
          labels: [],
          revenueData: [],
          paymentData: [],
          expenseData: [],
          totalRevenue: 0,
          totalPayment: 0,
          totalExpense: 0,
        });
        return;
      }

      console.log('Loading revenue for hotelId:', hotelId, 'Period:', selectedPeriod);

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

      console.log('Revenue loaded:', {
        labels: response.labels?.length || 0,
        totalRevenue: response.totalRevenue,
        totalExpense: response.totalExpense,
      });

      setRevenueData(response);
    } catch (error: any) {
      console.error('Error loading revenue:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải dữ liệu doanh thu');
      setRevenueData({
        labels: [],
        revenueData: [],
        paymentData: [],
        expenseData: [],
        totalRevenue: 0,
        totalPayment: 0,
        totalExpense: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const reload = () => {
    // Reset dữ liệu trước khi tải lại
    setRevenueData({
      labels: [],
      revenueData: [],
      paymentData: [],
      expenseData: [],
      totalRevenue: 0,
      totalPayment: 0,
      totalExpense: 0,
    });
    // Tải lại dữ liệu
    loadRevenue();
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
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>{t('home.revenue.title')}</Text>
          <View style={styles.chartControls}>
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
                  {t('home.revenue.period.day')}
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
                  {t('home.revenue.period.week')}
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
                  {t('home.revenue.period.month')}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.reloadButton}
              onPress={reload}
              disabled={loading}
            >
              <IconSymbol name="arrow.clockwise" size={16} color="#666" />
              <Text style={styles.reloadButtonText}>{t('common.reload') || 'Tải lại'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.summaryCards}>
          <View style={[styles.summaryCard, styles.revenueCard]}>
            <View style={styles.summaryIconContainer}>
              <View style={[styles.summaryIcon, styles.revenueIcon]}>
                <IconSymbol name="chart.bar.fill" size={24} color="#1890ff" />
              </View>
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Tổng doanh thu</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(revenueData.totalRevenue)}
              </Text>
            </View>
          </View>
          <View style={[styles.summaryCard, styles.expenseCard]}>
            <View style={styles.summaryIconContainer}>
              <View style={[styles.summaryIcon, styles.expenseIcon]}>
                <IconSymbol name="minus.circle" size={24} color="#ff4d4f" />
              </View>
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Tổng chi phí</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(revenueData.totalExpense)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.chartContainer}>
          <View style={styles.chartPlaceholder}>
            {revenueData.labels.length === 0 ? (
              <View style={styles.emptyContainer}>
                <IconSymbol name="doc.text.fill" size={40} color="#999" />
                <Text style={styles.chartPlaceholderText}>Chưa có dữ liệu</Text>
              </View>
            ) : (
              <View style={styles.chartData}>
                {revenueData.labels.map((label, index) => {
                  const maxValue = Math.max(
                    ...revenueData.revenueData,
                    ...revenueData.expenseData,
                    1
                  );
                  const revenueHeight = (revenueData.revenueData[index] / maxValue) * 150;
                  const expenseHeight = (revenueData.expenseData[index] / maxValue) * 150;
                  
                  return (
                    <View key={index} style={styles.chartBarGroup}>
                      <View style={styles.chartBars}>
                        <View style={styles.barContainer}>
                          <View
                            style={[
                              styles.bar,
                              styles.revenueBar,
                              { height: Math.max(revenueHeight, 4) },
                            ]}
                          />
                          <Text style={styles.barValue}>
                            {revenueData.revenueData[index] > 0
                              ? formatCurrency(revenueData.revenueData[index])
                              : ''}
                          </Text>
                        </View>
                        <View style={styles.barContainer}>
                          <View
                            style={[
                              styles.bar,
                              styles.expenseBar,
                              { height: Math.max(expenseHeight, 4) },
                            ]}
                          />
                          <Text style={styles.barValue}>
                            {revenueData.expenseData[index] > 0
                              ? formatCurrency(revenueData.expenseData[index])
                              : ''}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.barLabel}>{formatLabel(label)}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
          {revenueData.labels.length > 0 && (
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#1890ff' }]} />
                <Text style={styles.legendText}>Doanh thu</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#ff4d4f' }]} />
                <Text style={styles.legendText}>Chi phí</Text>
              </View>
            </View>
          )}
        </View>

        {revenueData.labels.length > 0 && (
          <View style={styles.chartFooter}>
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <IconSymbol name="info.circle" size={18} color="#1890ff" />
                <Text style={styles.infoTitle}>Thông tin biểu đồ</Text>
              </View>
              <Text style={styles.infoText}>
                Biểu đồ hiển thị doanh thu và chi phí theo {selectedPeriod === 'day' ? 'ngày' : selectedPeriod === 'week' ? 'tuần' : 'tháng'}
              </Text>
              <View style={styles.infoStats}>
                <View style={styles.infoStatItem}>
                  <Text style={styles.statLabel}>Tổng doanh thu:</Text>
                  <Text style={[styles.statValue, styles.revenueValue]}>
                    {formatCurrency(revenueData.totalRevenue)}
                  </Text>
                </View>
                <View style={styles.infoStatItem}>
                  <Text style={styles.statLabel}>Tổng chi phí:</Text>
                  <Text style={[styles.statValue, styles.expenseValue]}>
                    {formatCurrency(revenueData.totalExpense)}
                  </Text>
                </View>
                <View style={styles.infoStatItem}>
                  <Text style={styles.statLabel}>Lợi nhuận:</Text>
                  <Text
                    style={[
                      styles.statValue,
                      revenueData.totalRevenue - revenueData.totalExpense >= 0
                        ? styles.profitValue
                        : styles.lossValue,
                    ]}
                  >
                    {formatCurrency(revenueData.totalRevenue - revenueData.totalExpense)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
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
  chartHeader: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
  },
  chartControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  periodSelector: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
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
  reloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  reloadButtonText: {
    fontSize: 14,
    color: '#666',
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 3,
  },
  revenueCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#1890ff',
  },
  expenseCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff4d4f',
  },
  summaryIconContainer: {
    marginRight: 16,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  revenueIcon: {
    backgroundColor: 'rgba(24, 144, 255, 0.1)',
  },
  expenseIcon: {
    backgroundColor: 'rgba(255, 77, 79, 0.1)',
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '500',
    color: '#333',
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
  chartPlaceholder: {
    minHeight: 200,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  chartPlaceholderText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
  },
  chartData: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    width: '100%',
    height: 200,
    marginTop: 20,
  },
  chartBarGroup: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    width: '100%',
    marginBottom: 8,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    minHeight: 4,
    borderRadius: 4,
    marginBottom: 4,
  },
  revenueBar: {
    backgroundColor: '#1890ff',
  },
  expenseBar: {
    backgroundColor: '#ff4d4f',
  },
  barLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  barValue: {
    fontSize: 8,
    color: '#999',
    marginTop: 2,
    textAlign: 'center',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 13,
    color: '#595959',
  },
  chartFooter: {
    marginTop: 12,
  },
  infoCard: {
    backgroundColor: '#f6f8fb',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#262626',
  },
  infoText: {
    fontSize: 14,
    color: '#595959',
    lineHeight: 20,
    marginBottom: 16,
  },
  infoStats: {
    gap: 12,
  },
  infoStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  statLabel: {
    fontSize: 13,
    color: '#8c8c8c',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  revenueValue: {
    color: '#1890ff',
  },
  expenseValue: {
    color: '#ff4d4f',
  },
  profitValue: {
    color: '#52c41a',
  },
  lossValue: {
    color: '#ff4d4f',
  },
});

