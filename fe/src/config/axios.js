import axios from 'axios';

// Tự động detect environment
const getBaseURL = () => {
  if (import.meta.env.DEV) {
    return 'http://localhost:5047/api';
  }
  return 'http://157.66.100.51:5047/api';
};


// Create axios instance
const apiClient = axios.create({
  baseURL: getBaseURL(),
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
    // Để component tự xử lý message để tránh static function warning
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    
    // Xử lý các lỗi nghiêm trọng
    if (error.response) {
      const { status } = error.response;
      switch (status) {
        case 401:
          console.log('Unauthorized - redirecting to login');
          localStorage.removeItem('authToken');
          localStorage.removeItem('userInfo');
          window.location.href = '/login';
          break;
        case 403:
          console.log('Forbidden access');
          break;
        case 404:
          console.log('Resource not found');
          break;
        case 500:
          console.log('Server error');
          break;
        default:
          console.log('Unknown error');
      }
    } else if (error.request) {
      console.log('Network error');
    } else {
      console.log('Request setup error');
    }
    
    return Promise.reject(error);
  }
);

export default apiClient; 