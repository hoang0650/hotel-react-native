import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTranslation } from '@/contexts/TranslationContext';
import InvoicesReport from '@/components/reports/InvoicesReport';
import RevenueReport from '@/components/reports/RevenueReport';
import PaymentHistoryReport from '@/components/reports/PaymentHistoryReport';
import ShiftHistoryReport from '@/components/reports/ShiftHistoryReport';
import FinancialSummaryReport from '@/components/reports/FinancialSummaryReport';
import BankTransferHistoryReport from '@/components/reports/BankTransferHistoryReport';

type ReportMenuItem = {
  id: string;
  title: string;
  icon: string;
  description: string;
};

export default function InvoicesScreen() {
  const { t } = useTranslation();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const reportMenuItems: ReportMenuItem[] = useMemo(() => [
    {
      id: 'invoices',
      title: t('reports.invoices'),
      icon: '📄',
      description: t('reports.invoices.description'),
    },
    {
      id: 'revenue',
      title: t('reports.revenue'),
      icon: '💰',
      description: t('reports.revenue.description'),
    },
    {
      id: 'payment-history',
      title: t('reports.paymentHistory'),
      icon: '💳',
      description: t('reports.paymentHistory.description'),
    },
    {
      id: 'shift-history',
      title: t('reports.shiftHistory'),
      icon: '🔄',
      description: t('reports.shiftHistory.description'),
    },
    {
      id: 'financial-summary',
      title: t('reports.financialSummary'),
      icon: '📊',
      description: t('reports.financialSummary.description'),
    },
    {
      id: 'bank-transfer-history',
      title: t('reports.bankTransfer'),
      icon: '🏦',
      description: t('reports.bankTransfer.description'),
    },
  ], [t]);

  const handleMenuItemPress = (item: ReportMenuItem) => {
    setSelectedReport(item.id);
  };

  const handleBack = () => {
    setSelectedReport(null);
  };

  // Render selected report screen
  if (selectedReport === 'invoices') {
    return <InvoicesReport onBack={handleBack} />;
  }

  if (selectedReport === 'revenue') {
    return <RevenueReport onBack={handleBack} />;
  }

  if (selectedReport === 'payment-history') {
    return <PaymentHistoryReport onBack={handleBack} />;
  }

  if (selectedReport === 'shift-history') {
    return <ShiftHistoryReport onBack={handleBack} />;
  }

  if (selectedReport === 'financial-summary') {
    return <FinancialSummaryReport onBack={handleBack} />;
  }

  if (selectedReport === 'bank-transfer-history') {
    return <BankTransferHistoryReport onBack={handleBack} />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('reports.title')}</Text>
      </View>

      {/* Menu List */}
      <ScrollView style={styles.content}>
        {reportMenuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={() => handleMenuItemPress(item)}
          >
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuItemIcon}>{item.icon}</Text>
              <View style={styles.menuItemTextContainer}>
                <Text style={styles.menuItemTitle}>{item.title}</Text>
                <Text style={styles.menuItemDescription}>
                  {item.description}
                </Text>
              </View>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    fontSize: 32,
    marginRight: 16,
    width: 48,
    textAlign: 'center',
  },
  menuItemTextContainer: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  menuItemArrow: {
    fontSize: 24,
    color: '#999',
    marginLeft: 12,
  },
});
