import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Typography, Input, Button, message } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { loginAsync } from '../store/slices/authSlice';
import AppLayout from '../components/layout/AppLayout';

const { Title, Text } = Typography;

const LoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const [role, setRole] = useState('');

  const handleSubmit = async () => {
    if (!role) {
      message.error('Vui lòng nhập đầy đủ thông tin!');
      return;
    }

    try {
      const result = await dispatch(loginAsync({
        role: role
      })).unwrap();

      if (result) {
        message.success('Đăng nhập thành công!');
        navigate('/');
      }
    } catch (err) {
      message.error(err || 'Đăng nhập thất bại!');
    }
  };

  return (
    <AppLayout>
      <div style={{
        background: '#f5f5f5',
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px'
      }}>
        <Card
          style={{
            width: '100%',
            maxWidth: '400px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          {/* Header */}
          <div style={{
            background: '#1890ff',
            margin: '-24px -24px 24px -24px',
            padding: '16px 24px',
            borderRadius: '8px 8px 0 0',
            textAlign: 'center'
          }}>
            <Title 
              level={4} 
              style={{ 
                color: 'white', 
                margin: 0,
                fontWeight: 'normal'
              }}
            >
              Đăng nhập
            </Title>
          </div>

          {/* Form Content */}
          <div style={{ padding: '0 8px' }}>
            <div style={{ marginBottom: '16px' }}>
              <Text style={{ 
                display: 'block', 
                marginBottom: '8px',
                color: '#333'
              }}>
                Tên đăng nhập
              </Text>
              <Input
                placeholder="Nhập admin hoặc user"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ height: '40px' }}
              />
            </div>

            <Button
              type="primary"
              block
              size="large"
              loading={loading}
              onClick={handleSubmit}
              style={{
                height: '45px',
                fontWeight: 'bold',
                background: '#1890ff',
                borderColor: '#1890ff'
              }}
            >
              Đăng nhập
            </Button>

            {/* Error Message */}
            {error && (
              <Text type="danger" style={{ display: 'block', marginTop: '16px', textAlign: 'center' }}>
                {error}
              </Text>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default LoginPage; 