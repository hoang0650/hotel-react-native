import { API_CONFIG } from '@/constants/api';

/**
 * Chuyển đổi image ID hoặc path thành full URL
 * @param urlOrId - Image ID, path (/files/xxx), hoặc full URL
 * @returns Full URL của ảnh
 */
export const getImageUrl = (urlOrId: string | null | undefined): string => {
  if (!urlOrId) return '';
  
  // Nếu đã là full URL (http/https), trả về nguyên
  if (urlOrId.startsWith('http://') || urlOrId.startsWith('https://')) {
    return urlOrId;
  }
  
  // Nếu là path bắt đầu bằng /files/, thêm base URL
  if (urlOrId.startsWith('/files/')) {
    return `${API_CONFIG.BASE_URL}${urlOrId}`;
  }
  
  // Nếu chỉ là ID, thêm /files/ prefix và base URL
  return `${API_CONFIG.BASE_URL}/files/${urlOrId}`;
};

