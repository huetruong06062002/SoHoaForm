import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ConfigProvider } from 'antd';
import { store } from './store';
import HomePage from './pages/HomePage';
// import 'antd/dist/reset.css';
import './App.css';
import LoginPage from './pages/LoginPage';

// Ant Design theme configuration
const theme = {
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 6,
  },
};

function App() {
  return (
    <Provider store={store}>
      <ConfigProvider theme={theme}>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </Router>
      </ConfigProvider>
    </Provider>
  );
}

export default App;
