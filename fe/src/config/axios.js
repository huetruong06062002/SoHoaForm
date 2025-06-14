import axios from 'axios';
import { message } from 'antd';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://157.66.100.51:5047/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Tăng timeout lên 30 giây
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log('Making request to:', config.baseURL + config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('Axios error:', error);
    
    if (error.code === 'ECONNABORTED') {
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

export default axiosInstance;