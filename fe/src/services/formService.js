import apiClient from '../config/axios';

const formService = {
  getAllForms: async () => {
    const response = await apiClient.get('/User/GetAllFormWithCategory');
    return response.data;
  },

  getFormFields: async (formId) => {
    const response = await apiClient.get(`/Admin/forms/${formId}/fields`);
    return response.data;
  },


  getFormInfo: async (formId) => {
    const response = await apiClient.get(`/User/form/${formId}/information`);
    return response.data;
  },

  getFormsByCategory: async () => {
    const response = await apiClient.get('/User/forms/order-by-category');
    return response.data;
  },

  getWordFile: async (formId) => {
    const response = await apiClient.get(`/User/form/${formId}/word-file`, {
      responseType: 'blob'
    });
    return response.data;
  },

  createForm: async (formData) => {
    const response = await apiClient.post('/Admin/forms', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // API để cập nhật formula field
  updateFormula: async (formId, fieldId, payload) => {
    const response = await apiClient.put(`/Admin/form/${formId}/field/${fieldId}/formula`, payload);
    return response.data;
  },

  // API để cập nhật field config
  updateFieldConfig: async (formId, fieldId, config) => {
    const response = await apiClient.put(`/Admin/form/${formId}/field/${fieldId}/formula`, config);
    return response.data;
  },

  // API để lấy form fields với thông tin chi tiết
  getFormFields: async (formId) => {
    const response = await apiClient.get(`/Admin/forms/${formId}/fields`);
    return response.data;
  },
};

export default formService; 