import { Layout, Menu, Avatar, Dropdown, Button, theme } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { toggleSidebar } from '../../store/slices/uiSlice';
import { logoutAsync } from '../../store/slices/authSlice';

const { Header, Sider, Content } = Layout;

const MainLayout = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { sidebarCollapsed } = useSelector((state) => state.ui);
  const { user } = useSelector((state) => state.auth);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // Sidebar menu items
  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
      onClick: () => navigate('/dashboard'),
    },
    {
      key: '/users',
      icon: <UserOutlined />,
      label: 'Users',
      onClick: () => navigate('/users'),
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => navigate('/settings'),
    },
  ];

  // User dropdown menu
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => navigate('/settings'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: () => {
        dispatch(logoutAsync());
        navigate('/login');
      },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={sidebarCollapsed}
        style={{
          background: colorBgContainer,
        }}
      >
        <div 
          style={{ 
            height: 32, 
            margin: 16, 
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: borderRadiusLG,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1890ff',
            fontWeight: 'bold',
          }}
        >
          {sidebarCollapsed ? 'App' : 'Your App Name'}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[window.location.pathname]}
          items={menuItems}
          style={{ borderRight: 0 }}
        />
      </Sider>
      
      <Layout>
        <Header
          style={{
            padding: 0,
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingRight: 24,
          }}
        >
          <Button
            type="text"
            icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => dispatch(toggleSidebar())}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />
          
          <Dropdown
            menu={{ items: userMenuItems }}
            placement="bottomRight"
            arrow
          >
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} />
              <span>
                {user?.role === 'admin' ? 'Admin' : 'User'} ({user?.role})
              </span>
            </div>
          </Dropdown>
        </Header>
        
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout; 