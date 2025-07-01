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

  // User Management API
  userManagement: {
    getUsers: async (params = {}) => {
      const response = await apiClient.get('/UserManagement', { params });
      return response.data;
    },
    
    searchUsers: async (searchTerm = '', pageNumber = 1, pageSize = 10) => {
      try {
        console.log(`Calling search API with: searchTerm=${searchTerm}, pageNumber=${pageNumber}, pageSize=${pageSize}`);
        // Encode spaces in the search term
        const encodedSearchTerm = searchTerm ? encodeURIComponent(searchTerm) : '';
        const response = await apiClient.get('/UserManagement/search', { 
          params: { 
            searchTerm: encodedSearchTerm, 
            pageNumber, 
            pageSize 
          },
          paramsSerializer: {
            serialize: params => {
              return Object.entries(params)
                .map(([key, value]) => `${key}=${value !== undefined ? value : ''}`)
                .join('&');
            }
          } 
        });
        return response.data;
      } catch (error) {
        console.error('Error in searchUsers:', error);
        // Nếu endpoint search không tồn tại, thử dùng endpoint getAll
        if (error.response && error.response.status === 404) {
          console.log('Search endpoint not found, falling back to getAll');
          const response = await apiClient.get('/UserManagement', {
            params: { pageNumber, pageSize }
          });
          return response.data;
        }
        throw error;
      }
    },
    
    getUserById: async (id) => {
      const response = await apiClient.get(`/UserManagement/${id}`);
      return response.data;
    },
    
    createUser: async (userData) => {
      const response = await apiClient.post('/UserManagement', userData);
      return response.data;
    },
    
    updateUser: async (id, userData) => {
      const response = await apiClient.put(`/UserManagement/${id}`, userData);
      return response.data;
    },
    
    deleteUser: async (id) => {
      try {
        const response = await apiClient.delete(`/UserManagement/${id}`);
        return response.data;
      } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
      }
    },
    
    deleteUserRole: async (userId, roleId) => {
      const response = await apiClient.delete(`/UserManagement/${userId}/roles/${roleId}`);
      return response.data;
    },

    assignRoleToUser: async (userId, roleId) => {
      const response = await apiClient.post(`/UserManagement/${userId}/roles/${roleId}`);
      return response.data;
    },
  },

  // Role API
  roles: {
    getAll: async () => {
      const response = await apiClient.get('/Role');
      return response.data;
    },
    
    getById: async (id) => {
      const response = await apiClient.get(`/Role/${id}`);
      return response.data;
    },
    
    create: async (roleData) => {
      const response = await apiClient.post('/Role', roleData);
      return response.data;
    },
    
    update: async (id, roleData) => {
      const response = await apiClient.put(`/Role/${id}`, roleData);
      return response.data;
    },
    
    delete: async (id) => {
      const response = await apiClient.delete(`/Role/${id}`);
      return response.data;
    },
    
    assignPermissionToRole: async (roleId, permissionId) => {
      const response = await apiClient.post(`/Role/${roleId}/permissions`, {
        permissionId: permissionId
      });
      return response.data;
    },
    
    removePermissionFromRole: async (roleId, permissionId) => {
      const response = await apiClient.delete(`/Role/${roleId}/permissions/${permissionId}`);
      return response.data;
    },
    
    getCategoryPermissions: async (roleId) => {
      const response = await apiClient.get(`/RoleCategoryPermission/role/${roleId}`);
      return response.data;
    },
    
    updateCategoryPermission: async (roleCategoryPermissionId, canAccess) => {
      const response = await apiClient.put(`/RoleCategoryPermission/${roleCategoryPermissionId}`, {
        canAccess: canAccess
      });
      return response.data;
    },
    
    deleteCategoryPermission: async (roleId, categoryId) => {
      const response = await apiClient.delete(`/RoleCategoryPermission/role/${roleId}/category/${categoryId}`);
      return response.data;
    },
    
    assignCategoryToRole: async (roleId, formCategoryId, canAccess = true) => {
      const response = await apiClient.post('/RoleCategoryPermission', {
        roleId: roleId,
        formCategoryId: formCategoryId,
        canAccess: canAccess
      });
      return response.data;
    },
  },

  // Permission API
  permissions: {
    getAll: async () => {
      const response = await apiClient.get('/Permission');
      return response.data;
    },
    
    getById: async (id) => {
      const response = await apiClient.get(`/Permission/${id}`);
      return response.data;
    },
  },

  // Form Category API
  formCategory: {
    getAll: async () => {
      const response = await apiClient.get('/FormCategory');
      return response.data;
    },
    
    getById: async (id) => {
      const response = await apiClient.get(`/FormCategory/${id}`);
      return response.data;
    },
    
    create: async (categoryData) => {
      const response = await apiClient.post('/FormCategory', categoryData);
      return response.data;
    },
    
    update: async (id, categoryData) => {
      const response = await apiClient.put(`/FormCategory/${id}`, categoryData);
      return response.data;
    },
    
    delete: async (id) => {
      const response = await apiClient.delete(`/FormCategory/${id}`);
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