import { useState, useEffect } from 'react';
import { Typography, Card, Layout, Menu, Button, Divider } from 'antd';
import { 
  UserSwitchOutlined,
  ApartmentOutlined,
  ControlOutlined,
  HomeOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';

const { Title, Text } = Typography;
const { Sider, Content } = Layout;

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector(state => state.auth);
  const [collapsed, setCollapsed] = useState(false);
  
  // Get current selected key based on path
  const getSelectedKey = () => {
    const path = location.pathname;
    
    if (path.includes('role-management')) {
      return '1';
    } else if (path.includes('user-management')) {
      return '2';
    } else if (path.includes('permission-management')) {
      return '3';
    } else if (path.includes('form-category-management')) {
      return '4';
    }
    
    return '1'; // Default to role management
  };
  
  // Menu items cho sidebar
  const sidebarItems = [
    {
      key: '1',
      icon: <ApartmentOutlined />,
      label: 'Quản lý vai trò',
      onClick: () => navigate('/admin-dashboard/role-management')
    },
    {
      key: '2',
      icon: <UserSwitchOutlined />,
      label: 'Quản lý người dùng',
      onClick: () => navigate('/admin-dashboard/user-management')
    },
    {
      key: '3',
      icon: <ControlOutlined />,
      label: 'Quản lý chức năng',
      onClick: () => navigate('/admin-dashboard/permission-management')
    },
    {
      key: '4',
      icon: <FileTextOutlined />,
      label: 'Quản lý danh mục biểu mẫu',
      onClick: () => navigate('/admin-dashboard/form-category-management')
    }
  ];
  
  // Home menu item
  const homeMenuItem = {
    key: 'home',
    icon: <HomeOutlined />,
    label: 'Về trang chủ',
    onClick: () => navigate('/')
  };
  
  // Kiểm tra quyền truy cập
  useEffect(() => {
    if (!user || user.roleName !== 'admin') {
      navigate('/');
    }
    
    // Redirect to role management by default if at root admin dashboard
    if (location.pathname === '/admin-dashboard') {
      navigate('/admin-dashboard/role-management');
    }
  }, [user, navigate, location]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={(value) => setCollapsed(value)}
        theme="light"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
        width={250}
      >
        <div style={{ 
          height: '64px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '16px',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
            {collapsed ? 'SF' : 'SoHoaForm'}
          </Title>
        </div>
        <Menu
          mode="inline"
          defaultSelectedKeys={['1']}
          selectedKeys={[getSelectedKey()]}
          style={{ borderRight: 0 }}
          items={sidebarItems}
        />
        
        {/* Divider and Home button at bottom */}
        <div style={{ 
          position: 'absolute', 
          bottom: '60px', 
          width: '100%',
          padding: '0 16px'
        }}>
          <Divider style={{ margin: '10px 0' }} />
          <Menu
            mode="inline"
            style={{ borderRight: 0 }}
            items={[homeMenuItem]}
          />
        </div>
      </Sider>
      
      <Layout>
        <Content style={{ margin: '0 16px', padding: '24px', background: '#f0f2f5' }}>
          <div style={{ marginBottom: '24px' }}>
            <Title level={3}>Trang quản lý hệ thống</Title>
            <Text type="secondary">Xin chào, {user?.name || 'Quản trị viên'}. Dưới đây là tổng quan về hệ thống.</Text>
          </div>

          {/* Outlet for nested routes */}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminDashboardPage; 