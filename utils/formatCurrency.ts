/**
 * Format a number as Vietnamese currency
 * @param value - The number to format
 * @returns Formatted string (e.g., "1,000,000")
 */
export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0';
  }
  return new Intl.NumberFormat('vi-VN').format(value);
}

