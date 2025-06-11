import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../config/axios';

// Async thunk for login
export const loginAsync = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/Auth/login', credentials);
      const { data } = response.data;
      
      // Store token and user info in localStorage
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userInfo', JSON.stringify({
        userId: data.userId,
        role: data.role,
        message: data.message,
      }));
      
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Login failed'
      );
    }
  }
);

// Async thunk for logout
export const logoutAsync = createAsyncThunk(
  'auth/logout',
  async (_, { dispatch }) => {
    // Clear localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    
    // You can add API call to logout endpoint here if needed
    // await apiClient.post('/Auth/logout');
    
    return true;
  }
);

// Initial state
const getInitialState = () => {
  const token = localStorage.getItem('authToken');
  const userInfo = localStorage.getItem('userInfo');
  
  return {
    isAuthenticated: !!token,
    user: userInfo ? JSON.parse(userInfo) : null,
    token: token,
    loading: false,
    error: null,
  };
};

const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialState(),
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(loginAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = {
          userId: action.payload.userId,
          role: action.payload.role,
          message: action.payload.message,
        };
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.error = action.payload;
      })
      // Logout cases
      .addCase(logoutAsync.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.loading = false;
        state.error = null;
      });
  },
});

export const { clearError, setLoading } = authSlice.actions;
export default authSlice.reducer; 