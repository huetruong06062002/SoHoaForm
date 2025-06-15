import { message } from 'antd';

/**
 * Xử lý API response với tùy chọn hiển thị message
 * @param {Object} response - API response
 * @param {Object} options - Tùy chọn
 * @param {boolean} options.showSuccessMessage - Có hiển thị message thành công không
 * @param {boolean} options.showErrorMessage - Có hiển thị message lỗi không
 * @param {string} options.successMessage - Message thành công tùy chỉnh
 * @param {string} options.errorMessage - Message lỗi tùy chỉnh
 * @returns {Object} - Processed response
 */
export const handleApiResponse = (response, options = {}) => {
  const {
    showSuccessMessage = false, // Mặc định không hiển thị vì axios interceptor đã xử lý
    showErrorMessage = false,
    successMessage,
    errorMessage
  } = options;

  if (response?.data) {
    const { statusCode, message: apiMessage, data } = response.data;
    
    if (statusCode >= 200 && statusCode < 300) {
      if (showSuccessMessage) {
        message.success(successMessage || apiMessage || 'Thành công');
      }
      return { success: true, data, message: apiMessage };
    } else {
      if (showErrorMessage) {
        message.error(errorMessage || apiMessage || 'Có lỗi xảy ra');
      }
      return { success: false, data, message: apiMessage };
    }
  }
  
  return { success: false, data: null, message: 'Invalid response format' };
};

/**
 * Wrapper cho API calls với xử lý lỗi tự động
 * @param {Function} apiCall - Function gọi API
 * @param {Object} options - Tùy chọn xử lý
 * @returns {Promise} - Promise với kết quả đã xử lý
 */
export const callApi = async (apiCall, options = {}) => {
  try {
    const response = await apiCall();
    return handleApiResponse(response, options);
  } catch (error) {
    console.error('API call error:', error);
    
    // Axios interceptor đã xử lý hiển thị message lỗi
    // Chỉ return kết quả để component xử lý logic
    return { 
      success: false, 
      data: null, 
      message: error.response?.data?.message || error.message || 'Có lỗi xảy ra',
      error 
    };
  }
};

/**
 * Kiểm tra response có thành công không
 * @param {Object} response - API response
 * @returns {boolean}
 */
export const isApiSuccess = (response) => {
  return response?.data?.statusCode >= 200 && response?.data?.statusCode < 300;
};

/**
 * Lấy message từ API response
 * @param {Object} response - API response
 * @returns {string}
 */
export const getApiMessage = (response) => {
  return response?.data?.message || '';
};

/**
 * Lấy data từ API response
 * @param {Object} response - API response
 * @returns {any}
 */
export const getApiData = (response) => {
  return response?.data?.data;
}; 