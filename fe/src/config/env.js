// Environment configuration
export const ENV = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5047/api',
  API_TIMEOUT: import.meta.env.VITE_API_TIMEOUT || 10000,
};

export default ENV; 