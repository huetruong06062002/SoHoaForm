import axios from 'axios';
import { message } from 'antd';
import ENV from './env';

// Create axios instance
const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: ENV.API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
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
    
    // Log request for debugging
    console.log('API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      data: config.data,
    });
    
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
    // Log successful response
    console.log('API Response:', {
      status: response.status,
      data: response.data,
    });
    
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    
    const { response } = error;
    
    if (response) {
      const { status, data } = response;
      
      switch (status) {
        case 401:
          message.error('Unauthorized. Please login again.');
          localStorage.removeItem('authToken');
          localStorage.removeItem('userInfo');
          // Redirect to login page
          window.location.href = '/login';
          break;
        case 403:
          message.error('Access forbidden');
          break;
        case 404:
          message.error('Resource not found');
          break;
        case 500:
          message.error('Internal server error');
          break;
        default:
          // Display error message from API response
          const errorMessage = data?.message || `Error: ${status}`;
          message.error(errorMessage);
      }
    } else if (error.request) {
      message.error('Network error. Please check your connection.');
    } else {
      message.error('Something went wrong. Please try again.');
    }
    
    return Promise.reject(error);
  }
);

export default apiClient; 