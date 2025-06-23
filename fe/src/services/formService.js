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

  // API để lấy file Word đã điền với dữ liệu thực tế
  getFilledWordFile: async (userFillFormId) => {
    const response = await apiClient.get(`/User/user-fill-form/${userFillFormId}/filled-word-file`, {
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

  // API để toggle required status
  toggleRequired: async (formId, fieldId) => {
    const response = await apiClient.put(`/Admin/form/${formId}/field/${fieldId}/toggle-required`);
    return response.data;
  },

  // API để toggle uppercase status
  toggleUppercase: async (formId, fieldId) => {
    const response = await apiClient.put(`/Admin/form/${formId}/field/${fieldId}/toggle-uppercase`);
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

  // API để hoàn thành form
  completeFilledForm: async (userFillFormId) => {
    const response = await apiClient.put(`/User/fill-form/${userFillFormId}/complete`);
    return response.data;
  },

  // API để cập nhật field values
  updateFieldValues: async (userFillFormId, fieldValues) => {
    const response = await apiClient.put(`/User/user-fill-form/${userFillFormId}/update-field-values`, {
      fieldValues: fieldValues
    });
    return response.data;
  },

  // API để lấy Word template file
  getWordTemplate: async (formId) => {
    const response = await apiClient.get(`/User/form/${formId}/word-file`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // API để lấy data mới nhất của form
  getLatestFormData: async (formId) => {
    const response = await apiClient.get(`/User/fill-form/latest/${formId}`);
    return response.data;
  },

  // API để lấy PDF từ formId
  getFormPDF: async (formId) => {
    const response = await apiClient.get(`/User/form/${formId}/export-pdf`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Hàm xử lý Word document với dữ liệu thực
  processWordWithFieldValues: async (wordBlob, fieldValues) => {
    try {
      // Tạo mapping từ fieldName sang value
      const fieldMap = {};
      fieldValues.forEach(field => {
        // Chỉ set value nếu có giá trị, nếu không để trống
        fieldMap[field.fieldName] = field.value || '';
      });

      console.log('Processing Word document with field mapping:', fieldMap);

      // Sử dụng JSZip để xử lý file Word như một zip file
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // Load Word document
      const loadedZip = await zip.loadAsync(wordBlob);
      
      // Tìm các file XML trong Word document và thay thế placeholder
      const xmlFiles = [
        'word/document.xml',
        'word/header1.xml', 
        'word/header2.xml',
        'word/header3.xml',
        'word/footer1.xml',
        'word/footer2.xml', 
        'word/footer3.xml'
      ];

      for (const filename of xmlFiles) {
        const file = loadedZip.file(filename);
        if (file) {
          let content = await file.async('text');
          
          // Thay thế các placeholder {fieldName} với giá trị thực tế
          Object.keys(fieldMap).forEach(fieldName => {
            const placeholder = `{${fieldName}}`;
            const value = fieldMap[fieldName];
            
            // Escape XML special characters in value
            const escapedValue = value
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&apos;');
            
            // Thay thế placeholder với value đã escape
            content = content.replaceAll(placeholder, escapedValue);
          });
          
          // Cập nhật file content
          loadedZip.file(filename, content);
        }
      }
      
      // Tạo blob mới từ zip đã được xử lý
      const processedBlob = await loadedZip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      
      return processedBlob;
      
    } catch (error) {
      console.error('Error processing Word document:', error);
      throw error;
    }
  },
};

export default formService; 