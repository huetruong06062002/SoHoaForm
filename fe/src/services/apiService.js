import apiClient from '../config/axios';

export const apiService = {
  // Users API
  users: {
    getAll: async (params = {}) => {
      const response = await apiClient.get('/users', { params });
      return response.data;
    },
    
    getById: async (id) => {
      const response = await apiClient.get(`/users/${id}`);
      return response.data;
    },
    
    create: async (userData) => {
      const response = await apiClient.post('/users', userData);
      return response.data;
    },
    
    update: async (id, userData) => {
      const response = await apiClient.put(`/users/${id}`, userData);
      return response.data;
    },
    
    delete: async (id) => {
      const response = await apiClient.delete(`/users/${id}`);
      return response.data;
    },
  },

  // Generic CRUD operations
  crud: {
    getAll: async (endpoint, params = {}) => {
      const response = await apiClient.get(endpoint, { params });
      return response.data;
    },
    
    getById: async (endpoint, id) => {
      const response = await apiClient.get(`${endpoint}/${id}`);
      return response.data;
    },
    
    create: async (endpoint, data) => {
      const response = await apiClient.post(endpoint, data);
      return response.data;
    },
    
    update: async (endpoint, id, data) => {
      const response = await apiClient.put(`${endpoint}/${id}`, data);
      return response.data;
    },
    
    delete: async (endpoint, id) => {
      const response = await apiClient.delete(`${endpoint}/${id}`);
      return response.data;
    },
  },

  // File upload
  upload: {
    single: async (file, endpoint = '/upload') => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    
    multiple: async (files, endpoint = '/upload/multiple') => {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append(`files[${index}]`, file);
      });
      const response = await apiClient.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
  },
};

export default apiService; 