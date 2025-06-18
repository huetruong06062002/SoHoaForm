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

  // API để xóa form
  deleteForm: async (formId) => {
    const response = await apiClient.delete(`/Admin/forms/${formId}`);
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

  // API để cập nhật select options
  updateSelectOptions: async (formId, fieldId, options) => {
    const response = await apiClient.put(`/Admin/form/${formId}/field/${fieldId}/select-options`, {
      options: options
    });
    return response.data;
  },

  // API để cập nhật Boolean formula (dependent variables)
  updateBooleanFormula: async (formId, fieldId, payload) => {
    const response = await apiClient.put(`/Admin/form/${formId}/field/${fieldId}/boolean-formula`, payload);
    return response.data;
  },

  // API để lưu dữ liệu form đã điền
  saveFormData: async (payload) => {
    const response = await apiClient.post('/User/fill-form/save', payload);
    return response.data;
  },

  // API để lấy dữ liệu form đã điền gần nhất
  getLatestFormData: async (formId) => {
    const response = await apiClient.get(`/User/fill-form/latest/${formId}`);
    return response.data;
  },

  // API để lấy lịch sử điền form
  getFormHistory: async (formId) => {
    const response = await apiClient.get(`/User/user-fill-forms/form/${formId}/ids`);
    return response.data;
  },

  // API để lấy dữ liệu form đã điền theo userFillFormId
  getFilledFormData: async (userFillFormId) => {
    const response = await apiClient.get(`/User/user-fill-form/${userFillFormId}/json-field-value`);
    return response.data;
  },
};

export default formService; 