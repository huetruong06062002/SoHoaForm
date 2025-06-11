import { useDispatch, useSelector } from 'react-redux';

// Typed hooks for better TypeScript support and convenience
export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;

// Common selectors
export const useAuth = () => useAppSelector((state) => state.auth);
export const useUI = () => useAppSelector((state) => state.ui);

// Auth specific selectors
export const useAuthUser = () => useAppSelector((state) => state.auth.user);
export const useAuthToken = () => useAppSelector((state) => state.auth.token);
export const useIsAuthenticated = () => useAppSelector((state) => state.auth.isAuthenticated);
export const useAuthLoading = () => useAppSelector((state) => state.auth.loading);
export const useAuthError = () => useAppSelector((state) => state.auth.error);

// UI specific selectors
export const useSidebarCollapsed = () => useAppSelector((state) => state.ui.sidebarCollapsed);
export const useUILoading = () => useAppSelector((state) => state.ui.loading);
export const useTheme = () => useAppSelector((state) => state.ui.theme);
export const useBreadcrumb = () => useAppSelector((state) => state.ui.breadcrumb); 