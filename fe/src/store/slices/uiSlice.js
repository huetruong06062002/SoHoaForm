import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  sidebarCollapsed: false,
  loading: false,
  theme: 'light',
  breadcrumb: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action) => {
      state.sidebarCollapsed = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    setBreadcrumb: (state, action) => {
      state.breadcrumb = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarCollapsed,
  setLoading,
  setTheme,
  setBreadcrumb,
} = uiSlice.actions;

export default uiSlice.reducer; 