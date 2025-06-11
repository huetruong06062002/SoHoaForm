import apiClient from '../config/axios';

export const authService = {
  // Login user
  login: async (credentials) => {
    const response = await apiClient.post('/Auth/login', credentials);
    return response.data;
  },

  // Logout user
  logout: async () => {
    const response = await apiClient.post('/Auth/logout');
    return response.data;
  },

  // Get current user profile
  getProfile: async () => {
    const response = await apiClient.get('/Auth/profile');
    return response.data;
  },

  // Update user profile
  updateProfile: async (profileData) => {
    const response = await apiClient.put('/Auth/profile', profileData);
    return response.data;
  },

  // Change password
  changePassword: async (passwordData) => {
    const response = await apiClient.post('/Auth/change-password', passwordData);
    return response.data;
  },

  // Refresh token
  refreshToken: async () => {
    const response = await apiClient.post('/Auth/refresh-token');
    return response.data;
  },

  // Register new user (if endpoint exists)
  register: async (userData) => {
    const response = await apiClient.post('/Auth/register', userData);
    return response.data;
  },

  // Forgot password
  forgotPassword: async (email) => {
    const response = await apiClient.post('/Auth/forgot-password', { email });
    return response.data;
  },

  // Reset password
  resetPassword: async (resetData) => {
    const response = await apiClient.post('/Auth/reset-password', resetData);
    return response.data;
  },
};

export default authService; 