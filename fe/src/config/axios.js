import axios from 'axios';
import { message } from 'antd';

// Create axios instance
const apiClient = axios.create({
  baseURL: 'http://localhost:5047/api',
  timeout: 30000, // Tăng timeout lên 30 giây
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log('Making request to:', config.baseURL + config.url);
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Tự động hiển thị message từ API response nếu có
    if (response.data && response.data.message) {
      // Chỉ hiển thị message cho các request không phải GET (để tránh spam message khi load data)
      const method = response.config.method?.toLowerCase();
      if (method && ['post', 'put', 'patch', 'delete'].includes(method)) {
        // Kiểm tra statusCode để quyết định loại message
        if (response.data.statusCode >= 200 && response.data.statusCode < 300) {
          message.success(response.data.message);
        } else if (response.data.statusCode >= 400) {
          message.error(response.data.message);
        } else {
          message.info(response.data.message);
        }
      }
    }
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    
    // Kiểm tra nếu API trả về lỗi nhưng vẫn có format chuẩn
    if (error.response?.data?.message) {
      message.error(error.response.data.message);
    } else if (error.code === 'ECONNABORTED') {
      message.error('Kết nối timeout. Vui lòng thử lại!');
    } else if (error.response) {
      const { status } = error.response;
      switch (status) {
        case 401:
          message.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
          localStorage.removeItem('authToken');
          localStorage.removeItem('userInfo');
          window.location.href = '/login';
          break;
        case 403:
          message.error('Bạn không có quyền truy cập tính năng này!');
          break;
        case 404:
          message.error('Không tìm thấy tài nguyên yêu cầu!');
          break;
        case 500:
          message.error('Lỗi hệ thống. Vui lòng thử lại sau!');
          break;
        default:
          message.error('Đã có lỗi xảy ra. Vui lòng thử lại!');
      }
    } else if (error.request) {
      message.error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối!');
    } else {
      message.error('Đã có lỗi xảy ra. Vui lòng thử lại!');
    }
    
    return Promise.reject(error);
  }
);

export default apiClient; 