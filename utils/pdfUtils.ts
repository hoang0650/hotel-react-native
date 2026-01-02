import { Platform } from 'react-native';
import { getImageUrl } from './imageUtils';

// Format currency helper
const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0';
  }
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

// Format currency K (thousands)
const formatCurrencyK = (value: number): string => {
  if (!value || value === 0) return '0';
  const thousands = Math.round(value / 1000);
  return `${thousands.toLocaleString('vi-VN')}K`;
};

// Format date helper
const formatDate = (date: any): string => {
  if (!date) return '-';
  let parsedDate: Date;
  if (date instanceof Date) {
    parsedDate = new Date(date.getTime());
  } else if (typeof date === 'string') {
    parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return '-';
  } else {
    return '-';
  }
  
  const day = String(parsedDate.getDate()).padStart(2, '0');
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const year = parsedDate.getFullYear();
  return `${day}/${month}/${year}`;
};

// Get salary period
const getSalaryPeriod = (calculationDate: any): string => {
  if (calculationDate) {
    const date = typeof calculationDate === 'string' ? new Date(calculationDate) : calculationDate;
    if (!isNaN(date.getTime())) {
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return `${month}/${year}`;
    }
  }
  return '';
};

export interface SalarySlipData {
  breakdown: {
    baseDate: Date | string;
    calculationDate: Date | string;
    baseSalary: number;
    daysWorked: number;
    allowance: number;
    insurance: number;
    penalty: number;
    bonus: number;
    advancePayment: number;
    netSalary: number;
    startDate?: Date | string;
  };
  staff: {
    personalInfo: {
      firstName: string;
      lastName: string;
    };
    employmentInfo: {
      position: string;
      salary: number;
      startDate?: Date | string;
    };
  };
  businessInfo?: {
    name?: string;
    logo?: string;
  };
  businessLogo?: string;
}

export async function exportSalaryPDF(data: SalarySlipData): Promise<void> {
  const { breakdown, staff, businessInfo, businessLogo } = data;
  const staffName = `${staff.personalInfo.firstName} ${staff.personalInfo.lastName}`.trim().toUpperCase();
  const period = getSalaryPeriod(breakdown.calculationDate);
  const businessName = businessInfo?.name || 'Khách sạn';
  const baseSalaryMonthly = staff.employmentInfo?.salary || 0;
  const baseSalaryText = baseSalaryMonthly > 0 ? `Tháng = ${formatCurrencyK(baseSalaryMonthly)}` : '';
  
  // Get position label
  const getPositionLabel = (position: string): string => {
    const labels: Record<string, string> = {
      'manager': 'Quản lý',
      'receptionist': 'Lễ tân',
      'housekeeper': 'Housekeeping',
      'maintenance': 'Bảo trì',
      'other': 'Khác'
    };
    return labels[position] || position;
  };
  const positionLabel = getPositionLabel(staff.employmentInfo?.position || 'other');

  // Get start date from breakdown or staff
  const startDate = breakdown.startDate || staff.employmentInfo?.startDate;
  const startDateText = startDate ? formatDate(startDate) : 'N/A';

  // Calculate allowances
  const allowanceItems: string[] = [];
  if (breakdown.allowance > 0) {
    allowanceItems.push(`${formatCurrencyK(breakdown.allowance)} Phụ cấp`);
  }
  if (breakdown.bonus > 0) {
    allowanceItems.push(`${formatCurrencyK(breakdown.bonus)} Thưởng`);
  }

  // Create HTML content for PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            font-size: 11px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            max-width: 120px;
            max-height: 120px;
            margin-bottom: 10px;
          }
          .title {
            font-size: 18px;
            font-weight: bold;
            margin: 20px 0 30px 0;
            text-align: center;
            text-transform: uppercase;
          }
          .info-section {
            margin-bottom: 30px;
          }
          .info-row {
            margin-bottom: 8px;
          }
          .label {
            font-weight: bold;
          }
          .value {
            margin-left: 5px;
          }
          .allowances {
            margin-top: 10px;
            font-weight: bold;
            font-size: 12px;
          }
          .allowance-item {
            font-size: 10px;
            margin-left: 10px;
          }
          .penalty {
            color: red;
            font-size: 12px;
          }
          .net-salary {
            font-size: 14px;
            font-weight: bold;
            margin-top: 10px;
          }
          .signature-section {
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
          }
          .signature {
            font-size: 10px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        ${businessLogo ? `<div class="header"><img src="${getImageUrl(businessLogo)}" alt="Logo" class="logo" onerror="this.style.display='none'"></div>` : ''}
        <div class="title">PHIẾU TÍNH LƯƠNG ${period}</div>
        <div class="info-section">
          <div class="info-row">
            <span class="label">Họ và tên:</span>
            <span class="value"><strong>${staffName}</strong></span>
          </div>
          <div class="info-row">
            <span class="label">Chức vụ:</span>
            <span class="value">${positionLabel}</span>
          </div>
          <div class="info-row">
            <span class="label">Lương cơ bản:</span>
            <span class="value"><strong>${baseSalaryText || 'N/A'}</strong></span>
          </div>
          <div class="info-row">
            <span class="label">Số ngày làm việc:</span>
            <span class="value">${breakdown.daysWorked || 0} ngày</span>
          </div>
          <div class="info-row">
            <span class="label">Ngày bắt đầu:</span>
            <span class="value">${startDateText}</span>
          </div>
          <div class="allowances">
            Phụ cấp:
            ${allowanceItems.map(item => `<div class="allowance-item">${item}</div>`).join('')}
          </div>
          <div class="info-row penalty">
            <span class="label">Phạt:</span>
            <span class="value">${breakdown.penalty > 0 ? formatCurrencyK(breakdown.penalty) : '0'}</span>
          </div>
          <div class="info-row penalty">
            <span class="label">Ứng lương:</span>
            <span class="value">${breakdown.advancePayment > 0 ? formatCurrencyK(breakdown.advancePayment) : '0'}</span>
          </div>
          <div class="info-row net-salary">
            <span class="label">Lương thực nhận:</span>
            <span class="value">${formatCurrency(breakdown.netSalary || 0)}</span>
          </div>
        </div>
        <div class="signature-section">
          <div class="signature">Người lập</div>
          <div class="signature" style="text-align: right;">Giám đốc</div>
        </div>
      </body>
    </html>
  `;

  try {
    if (Platform.OS === 'web') {
      // For web, use browser print
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
        };
      } else {
        throw new Error('Không thể mở cửa sổ in');
      }
    } else {
      // For mobile, use expo-print
      const Print = await import('expo-print');
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Print.printAsync({ uri });
    }
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw error;
  }
}

