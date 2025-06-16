import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ConfigProvider, App } from 'antd';
import { store } from './store';
import HomePage from './pages/HomePage';
// import 'antd/dist/reset.css';
import './App.css';
import LoginPage from './pages/LoginPage';
import ManageFormPage from './pages/ManageFormPage';
import ProtectedRoute from './components/ProtectedRoute';
import FormConfigPage from './pages/FormConfigPage';
import PreviewFormPage from './pages/PreviewFormPage';
import AllFormPage from './pages/AllFormPage';
import FormHistoryPage from './pages/FormHistoryPage';
import AssessmentForm from './components/AssessmentForm';
import ViewFilledFormPage from './pages/ViewFilledFormPage';

// Ant Design theme configuration
const theme = {
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 6,
  },
};

function AppComponent() {
  return (
    <Provider store={store}>
      <ConfigProvider theme={theme}>
        <App>
          <Router>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />        
              {/* Protected routes */}
              <Route 
                path="/manage-form" 
                element={
                  <ProtectedRoute>
                    <ManageFormPage />
                  </ProtectedRoute>
                } 
              />
              <Route path="/form-config/:formId" element={<FormConfigPage />} />
              <Route path="/preview-form/:formId" element={<PreviewFormPage />} />
              <Route path="/allForm" element={<AllFormPage />} />
              <Route path="/form-history/:formId" element={<FormHistoryPage />} />
              <Route path="/view-filled-form/:userFillFormId" element={<ViewFilledFormPage />} />
            </Routes>
          </Router>
        </App>
      </ConfigProvider>
    </Provider>
  );
}

export default AppComponent;
