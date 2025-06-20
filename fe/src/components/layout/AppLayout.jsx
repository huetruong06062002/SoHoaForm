import { Layout, Menu, Dropdown, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutAsync } from '../../store/slices/authSlice';
import { DownOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar } from 'antd';
const { Header, Content } = Layout;

const AppLayout = ({ children }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const handleLogout = async () => {
    try {
      await dispatch(logoutAsync()).unwrap();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const userMenuItems = [
    {
      key: 'role',
      label: (
        <div style={{ 
          padding: '5px 16px',
          color: 'rgba(0, 0, 0, 0.88)',
          fontWeight: 400,
          fontSize: '14px'
        }}>
          Vai trò: {user?.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
        </div>
      ),
    },
    {
      key: 'logout',
      label: (
        <div style={{ 
          padding: '5px 16px',
          color: 'rgba(0, 0, 0, 0.88)',
          fontWeight: 400,
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '12px' }}>⎋</span>
          <span>Đăng xuất</span>
        </div>
      ),
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        padding: '0 16px',
        background: '#1677ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '48px',
        lineHeight: '48px'
      }}>
        {/* Left side - Logo and Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <div 
            style={{ 
              color: 'white', 
              fontSize: '16px', 
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
            onClick={() => navigate('/')}
          >
            SoHoaForm
          </div>
          
          <div style={{ display: 'flex', gap: '24px' }}>
            <div
              style={{
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                opacity: window.location.pathname === '/' ? 1 : 0.85
              }}
              onClick={() => navigate('/')}
            >
              Trang chủ
            </div>
            <div
              style={{
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                opacity: window.location.pathname === '/form' ? 1 : 0.85
              }}
              onClick={() => navigate('/allForm')}
            >
              Điền form
            </div>
            {/* Chỉ hiển thị "Quản lý form" cho admin */}
            {user?.role === 'admin' && (
              <div
                style={{
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  opacity: window.location.pathname === '/manage' ? 1 : 0.85
                }}
                onClick={() => navigate('/manage-form')}
              >
                Quản lý form
              </div>
            )}
          </div>
        </div>

        {/* Right side - User Menu */}
        <div>
          {isAuthenticated && user ? (
            <Dropdown
              menu={{ items: userMenuItems }}
              trigger={['click']}
              placement="bottomRight"
            >
              <div style={{ 
                color: 'white', 
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Space>
                <Avatar size="small" icon={<UserOutlined />} />
                  Vai trò: {user.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                  <DownOutlined style={{ fontSize: '12px' }} />
                </Space>
              </div>
            </Dropdown>
          ) : (
            <div
              style={{ 
                color: 'white', 
                cursor: 'pointer',
                fontSize: '14px',
                opacity: 0.85
              }}
              onClick={() => navigate('/login')}
            >
              Đăng nhập
            </div>
          )}
        </div>
      </Header>

      <Content>
        {children}
      </Content>
    </Layout>
  );
};

export default AppLayout; 