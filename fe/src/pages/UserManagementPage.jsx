import { useState, useEffect } from 'react';
import { Typography, Card, Table, Tag, Button, Space, Divider, Modal, Form, Input, Select, Avatar, List, Descriptions, App, Pagination, Row, Col, Checkbox } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, LockOutlined, EyeOutlined, PlusCircleOutlined, InfoCircleOutlined, ExclamationCircleOutlined, SearchOutlined } from '@ant-design/icons';
import apiService from '../services/apiService';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

export default function UserManagementPage() {
  const { message, notification, modal } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [deleteRoleLoading, setDeleteRoleLoading] = useState(false);
  const [assignRoleLoading, setAssignRoleLoading] = useState(false);
  const [roleDetailLoading, setRoleDetailLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10
  });
  const [searchText, setSearchText] = useState('');
  const [availableRoles, setAvailableRoles] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [addRoleVisible, setAddRoleVisible] = useState(false);
  const [roleDetailVisible, setRoleDetailVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [roleForm] = Form.useForm();

  // Fetch users from API
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await apiService.userManagement.searchUsers(
        searchText,
        pagination.current,
        pagination.pageSize
      );
      
      console.log('API Response:', response);
      
      if (response && response.data) {
        // Kiểm tra cấu trúc response và xử lý phù hợp
        if (Array.isArray(response.data)) {
          setUsers(response.data);
          setTotalCount(response.data.length);
        } else if (response.data.items) {
          setUsers(response.data.items);
          setTotalCount(response.data.totalCount || 0);
        } else if (response.data.users) {
          // Cấu trúc mới từ API
          setUsers(response.data.users);
          setTotalCount(response.data.totalCount || 0);
          
          // Cập nhật thông tin phân trang
          setPagination(prev => ({
            ...prev,
            current: response.data.pageNumber || prev.current,
            pageSize: response.data.pageSize || prev.pageSize,
            total: response.data.totalCount || 0
          }));
        } else {
          setUsers([]);
          setTotalCount(0);
        }
      } else {
        setUsers([]);
        setTotalCount(0);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      message.error("Không thể tải danh sách người dùng");
      setUsers([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Fetch roles from API
  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await apiService.roles.getAll();
      if (response && response.data) {
        setAvailableRoles(Array.isArray(response.data) ? response.data : []);
        console.log('Available roles:', response.data);
      } else {
        setAvailableRoles([]);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
      message.error("Không thể tải danh sách vai trò");
      setAvailableRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [pagination.current, pagination.pageSize]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      setPagination(prev => ({ ...prev, current: 1 }));
      fetchUsers();
    }, 500);
    
    return () => clearTimeout(delaySearch);
  }, [searchText]);

  // Danh sách vai trò
  const roles = [
    { label: 'Quản trị viên', value: 'admin' },
    { label: 'Người dùng', value: 'user' },
    { label: 'Quản lý nội dung', value: 'content_manager' },
  ];

  // Danh sách phòng ban
  const departments = [
    { label: 'IT', value: 'IT' },
    { label: 'Sales', value: 'Sales' },
    { label: 'Marketing', value: 'Marketing' },
    { label: 'HR', value: 'HR' },
    { label: 'Finance', value: 'Finance' },
  ];

  // Xử lý thay đổi phân trang
  const handleTableChange = (pagination, filters, sorter) => {
    setPagination(pagination);
  };

  // Xử lý tìm kiếm
  const handleSearch = (value) => {
    setSearchText(value.trim());
  };

  // Cấu hình cột cho bảng người dùng
  const columns = [
    {
      title: 'Tài khoản',
      dataIndex: 'userName',
      key: 'userName',
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Avatar icon={<UserOutlined />} />
          <span>{text}</span>
        </div>
      )
    },
    { title: 'Họ và tên', dataIndex: 'name', key: 'name' },
    { 
      title: 'Vai trò', 
      dataIndex: 'roleName', 
      key: 'roleName',
      render: (role, record) => {
        if (!role && !record.roleName) return <Tag color="default">Chưa có vai trò</Tag>;
        
        const displayRole = role || record.roleName;
        let color = 'green';
        
        if (displayRole && displayRole.toLowerCase().includes('admin')) {
          color = 'blue';
        } else if (displayRole && displayRole.toLowerCase().includes('manager')) {
          color = 'purple';
        }
        
        return <Tag color={color}>{displayRole}</Tag>;
      }
    },
    {
      title: 'Tất cả vai trò',
      dataIndex: 'allRoleNames',
      key: 'allRoleNames',
      render: (text, record) => {
        if (!text || text === 'Chưa có role') return <Text type="secondary">Chưa có vai trò</Text>;
        
        // Nếu có nhiều vai trò, hiển thị dạng tags
        if (text.includes(',')) {
          return text.split(',').map((role, index) => {
            const trimmedRole = role.trim();
            let color = 'green';
            
            if (trimmedRole.toLowerCase().includes('admin')) {
              color = 'blue';
            } else if (trimmedRole.toLowerCase().includes('manager')) {
              color = 'purple';
            }
            
            return <Tag key={index} color={color} style={{ margin: '2px' }}>{trimmedRole}</Tag>;
          });
        }
        
        return text;
      }
    },
    { 
      title: 'Ngày tạo', 
      dataIndex: 'createdAt', 
      key: 'createdAt',
      render: (date) => date ? new Date(date).toLocaleString() : '--'
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="primary" 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record.id)}
          >
            Chi tiết
          </Button>
          <Button 
            type="default" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Sửa
          </Button>
          <Button 
            danger 
            size="small" 
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            Xóa
          </Button>
        </Space>
      ),
    },
  ];

  // Xử lý xem chi tiết người dùng
  const handleViewDetails = async (userId) => {
    try {
      setLoading(true);
      const response = await apiService.userManagement.getUserById(userId);
      if (response && response.data) {
        setSelectedUser(response.data);
        setUserDetailVisible(true);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching user details:", error);
      message.error("Không thể tải thông tin chi tiết người dùng");
      setLoading(false);
    }
  };

  // Xử lý xem chi tiết vai trò
  const handleViewRoleDetails = async (roleId) => {
    try {
      setRoleDetailLoading(true);
      const response = await apiService.roles.getById(roleId);
      
      if (response && response.data) {
        setSelectedRole(response.data);
        setRoleDetailVisible(true);
      }
      setRoleDetailLoading(false);
    } catch (error) {
      console.error("Error fetching role details:", error);
      message.error("Không thể tải thông tin vai trò");
      setRoleDetailLoading(false);
    }
  };

  // Mở modal thêm vai trò cho người dùng
  const handleOpenAddRoleModal = () => {
    roleForm.resetFields();
    setSelectedRole(null);
    setAddRoleVisible(true);
  };

  // Xử lý thêm vai trò cho người dùng
  const handleAddRole = async () => {
    try {
      const values = await roleForm.validateFields();
      const { roleId } = values;
      
      if (!roleId || !selectedUser) {
        message.error('Vui lòng chọn vai trò');
        return;
      }

      setAssignRoleLoading(true);
      
      try {
        const response = await apiService.userManagement.assignRoleToUser(selectedUser.id, roleId);
        
        if (response) {
          message.success('Thêm vai trò thành công');
          
          // Refresh user details
          const userResponse = await apiService.userManagement.getUserById(selectedUser.id);
          if (userResponse && userResponse.data) {
            setSelectedUser(userResponse.data);
          }
          
          setAddRoleVisible(false);
        }
      } catch (error) {
        console.error("Error adding role:", error);
        message.error('Có lỗi xảy ra khi thêm vai trò');
      }
      
      setAssignRoleLoading(false);
    } catch (error) {
      console.error("Form validation error:", error);
    }
  };

  // Xử lý thêm/sửa người dùng
  const handleAddEdit = () => {
    setSelectedUser(null);
    form.resetFields();
    form.setFieldsValue({
      assignRole: false
    });
    
    // Make sure we have the latest roles available
    fetchRoles();
    
    setModalVisible(true);
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    
    // Make sure we have the latest roles available
    fetchRoles();
    
    form.setFieldsValue({
      userName: user.userName,
      name: user.name,
      roleId: user.roleId,
      // Don't set password - it should be blank for security reasons
    });
    
    setModalVisible(true);
  };

  const handleResetPassword = (userId) => {
    setSelectedUser(userId);
    passwordForm.resetFields();
    setPasswordModalVisible(true);
  };

  // Xử lý xóa người dùng
  const handleDelete = (id) => {
    modal.confirm({
      title: 'Xác nhận xóa',
      icon: <ExclamationCircleOutlined />,
      content: 'Bạn có chắc chắn muốn xóa người dùng này không?',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          setLoading(true);
          const response = await apiService.userManagement.deleteUser(id);
          
          if (response && response.statusCode === 200) {
            message.success(response.message || 'Xóa người dùng thành công');
            fetchUsers(); // Refresh danh sách sau khi xóa
          }
        } catch (error) {
          console.error("Error deleting user:", error);
          message.error(error.response?.data?.message || "Có lỗi xảy ra khi xóa người dùng");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      if (selectedUser) {
        // For editing user, prepare user data with all required fields
        const userData = {
          name: values.name,
          userName: values.userName,
          roleId: values.roleId
        };
        
        // Only include password if provided
        if (values.password) {
          userData.password = values.password;
        }
        
        await apiService.userManagement.updateUser(selectedUser.id, userData);
        message.success('Cập nhật người dùng thành công');
      } else {
        // For creating a new user, prepare full user data
        const userData = {
          name: values.name,
          userName: values.userName,
          password: values.password
        };
        
        // Only include roleId if assignRole is checked
        if (values.assignRole && values.roleId) {
          userData.roleId = values.roleId;
        }
        
        const response = await apiService.userManagement.createUser(userData);
        if (response) {
          message.success(response.message || 'Thêm người dùng thành công');
        }
      }
      
      // Refresh user list
      fetchUsers();
      
      setModalVisible(false);
      form.resetFields();
      setLoading(false);
    } catch (error) {
      console.error("Error submitting form:", error);
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi lưu thông tin người dùng');
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    try {
      const values = await passwordForm.validateFields();
      setLoading(true);
      
      // Call API to change password
      // This depends on your API implementation
      
      setPasswordModalVisible(false);
      setLoading(false);
    } catch (error) {
      console.error("Error changing password:", error);
      setLoading(false);
    }
  };

  // Lọc các vai trò có sẵn mà người dùng chưa có
  const getFilteredRoles = () => {
    if (!selectedUser || !selectedUser.userRoles || !availableRoles) return [];
    
    // Lấy danh sách roleId mà người dùng đã có
    const userRoleIds = selectedUser.userRoles.map(role => role.roleId);
    
    // Lọc ra các vai trò mà người dùng chưa có
    return availableRoles.filter(role => !userRoleIds.includes(role.id));
  };

  // Render danh sách quyền
  const renderPermissionList = (permissions) => {
    if (!permissions || permissions.length === 0) {
      return <Text type="secondary">Không có quyền nào</Text>;
    }

    return (
      <List
        size="small"
        bordered
        dataSource={permissions}
        renderItem={item => (
          <List.Item>
            <Tag color="green">{item.permissionName}</Tag>
          </List.Item>
        )}
      />
    );
  };

  // Render danh sách phân loại
  const renderCategoryList = (categories) => {
    if (!categories || categories.length === 0) {
      return <Text type="secondary">Không có phân loại nào</Text>;
    }

    return (
      <List
        size="small"
        bordered
        dataSource={categories}
        renderItem={item => (
          <List.Item>
            <div>
              <div><Text strong>{item.categoryName}</Text></div>
              <div>
                <Tag color={item.canAccess ? "green" : "red"}>
                  {item.canAccess ? "Có quyền truy cập" : "Không có quyền truy cập"}
                </Tag>
              </div>
            </div>
          </List.Item>
        )}
      />
    );
  };

  // Xử lý xóa vai trò của người dùng
  const handleDeleteRole = (userId, roleId, roleName) => {
    modal.confirm({
      title: 'Xác nhận xóa vai trò',
      icon: <ExclamationCircleOutlined />,
      content: `Bạn có chắc chắn muốn xóa vai trò "${roleName}" của người dùng này không?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          setDeleteRoleLoading(true);
          const response = await apiService.userManagement.deleteUserRole(userId, roleId);
          
          if (response) {
            message.success(response.message || 'Xóa vai trò thành công');
            
            // Refresh user details
            const userResponse = await apiService.userManagement.getUserById(userId);
            if (userResponse && userResponse.data) {
              setSelectedUser(userResponse.data);
            }
          }
        } catch (error) {
          console.error("Error deleting user role:", error);
          message.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa vai trò');
        } finally {
          setDeleteRoleLoading(false);
        }
      },
    });
  };

  return (
    <App>
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <Title level={4}>Quản lý người dùng</Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAddEdit}
          >
            Thêm người dùng mới
          </Button>
        </div>

        <Card variant="outlined" style={{ marginBottom: '16px' }}>
          <Row gutter={16} style={{ marginBottom: '16px' }}>
                      <Col xs={24} sm={18} md={12} lg={12}>
            <Search
              placeholder="Tìm kiếm người dùng"
              allowClear
              enterButton={<Button icon={<SearchOutlined />}>Tìm kiếm</Button>}
              onSearch={handleSearch}
              onChange={(e) => setSearchText(e.target.value)}
              value={searchText}
              style={{ width: '100%' }}
            />
          </Col>
          </Row>
          
          <Table 
            columns={columns} 
            dataSource={users} 
            rowKey="id" 
            loading={loading}
            pagination={{
              ...pagination,
              total: totalCount,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} người dùng`
            }}
            onChange={handleTableChange}
          />
        </Card>

        {/* Modal thêm/sửa người dùng */}
        <Modal
          title={selectedUser ? "Chỉnh sửa vai trò người dùng" : "Thêm người dùng mới"}
          open={modalVisible}
          onOk={handleSubmit}
          onCancel={() => setModalVisible(false)}
          width={600}
          confirmLoading={loading}
        >
          <Form
            form={form}
            layout="vertical"
          >
            {!selectedUser ? (
              // Form for adding a new user
              <>
                <Form.Item
                  name="userName"
                  label="Tên đăng nhập"
                  rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
                >
                  <Input placeholder="Nhập tên đăng nhập" />
                </Form.Item>
                
                <Form.Item
                  name="password"
                  label="Mật khẩu"
                  rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
                >
                  <Input.Password placeholder="Nhập mật khẩu" />
                </Form.Item>
                
                <Form.Item
                  name="name"
                  label="Họ và tên"
                  rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
                >
                  <Input placeholder="Nhập họ và tên" />
                </Form.Item>
                
                <Divider orientation="left" plain>Vai trò người dùng</Divider>
                
                <Form.Item
                  name="assignRole"
                  valuePropName="checked"
                >
                  <Checkbox>Gán vai trò khi tạo</Checkbox>
                </Form.Item>
                
                <Form.Item
                  noStyle
                  shouldUpdate={(prevValues, currentValues) => prevValues.assignRole !== currentValues.assignRole}
                >
                  {({ getFieldValue }) => 
                    getFieldValue('assignRole') ? (
                      <Form.Item
                        name="roleId"
                        label="Vai trò"
                        rules={[{ required: getFieldValue('assignRole'), message: 'Vui lòng chọn vai trò' }]}
                      >
                        <Select 
                          placeholder="Chọn vai trò" 
                          loading={loading}
                          options={availableRoles.map(role => ({
                            label: role.roleName,
                            value: role.id
                          }))}
                          optionFilterProp="label"
                          showSearch
                          filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                          }
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    ) : null
                  }
                </Form.Item>
              </>
            ) : (
              // Form for editing user with all required fields
              <>
                <Form.Item
                  name="userName"
                  label={<span style={{ color: '#ff4d4f' }}>* Tên đăng nhập</span>}
                  rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
                >
                  <Input placeholder="Nhập tên đăng nhập" disabled={true} />
                </Form.Item>

                <Form.Item
                  name="name"
                  label={<span style={{ color: '#ff4d4f' }}>* Họ và tên</span>}
                  rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
                >
                  <Input placeholder="Nhập họ và tên" />
                </Form.Item>

                <Form.Item
                  name="password"
                  label="Mật khẩu"
                  tooltip="Để trống nếu không muốn thay đổi mật khẩu"
                >
                  <Input.Password placeholder="Nhập mật khẩu mới nếu muốn thay đổi" />
                </Form.Item>
                
                <Form.Item
                  name="roleId"
                  label={<span style={{ color: '#ff4d4f' }}>* Vai trò</span>}
                  rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
                >
                  <Select 
                    placeholder="Chọn vai trò" 
                    loading={loading}
                    options={availableRoles.map(role => ({
                      label: role.roleName,
                      value: role.id
                    }))}
                    optionFilterProp="label"
                    showSearch
                    filterOption={(input, option) =>
                      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </>
            )}
          </Form>
        </Modal>

        {/* Modal đổi mật khẩu */}
        <Modal
          title="Đổi mật khẩu"
          open={passwordModalVisible}
          onOk={handlePasswordSubmit}
          onCancel={() => setPasswordModalVisible(false)}
        >
          <Form
            form={passwordForm}
            layout="vertical"
          >
            <Form.Item
              name="newPassword"
              label="Mật khẩu mới"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu mới' }]}
            >
              <Input.Password placeholder="Nhập mật khẩu mới" />
            </Form.Item>
            
            <Form.Item
              name="confirmPassword"
              label="Xác nhận mật khẩu"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: 'Vui lòng xác nhận mật khẩu' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                  },
                }),
              ]}
            >
              <Input.Password placeholder="Xác nhận mật khẩu" />
            </Form.Item>
          </Form>
        </Modal>

        {/* Modal xem chi tiết người dùng */}
        <Modal
          title="Chi tiết người dùng"
          open={userDetailVisible}
          onCancel={() => setUserDetailVisible(false)}
          footer={[
            <Button key="close" onClick={() => setUserDetailVisible(false)}>
              Đóng
            </Button>
          ]}
          width={700}
        >
          {selectedUser && (
            <div>
              <Descriptions bordered={false} variant="bordered" column={2}>
                <Descriptions.Item label="Tên người dùng">{selectedUser.userName}</Descriptions.Item>
                <Descriptions.Item label="Họ và tên">{selectedUser.name}</Descriptions.Item>
                <Descriptions.Item label="Vai trò chính">{selectedUser.roleName}</Descriptions.Item>
                <Descriptions.Item label="Ngày tạo">{new Date(selectedUser.createdAt).toLocaleString()}</Descriptions.Item>
                <Descriptions.Item label="Tổng số vai trò" span={2}>{selectedUser.totalRoles}</Descriptions.Item>
                <Descriptions.Item label="Tất cả vai trò" span={2}>{selectedUser.allRoleNames}</Descriptions.Item>
              </Descriptions>

              <Divider orientation="left">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span>Danh sách vai trò của người dùng</span>
                  <Button 
                    type="primary" 
                    icon={<PlusCircleOutlined />} 
                    size="small"
                    onClick={handleOpenAddRoleModal}
                  >
                    Thêm vai trò
                  </Button>
                </div>
              </Divider>
              <List
                variant="bordered"
                loading={deleteRoleLoading}
                dataSource={selectedUser.userRoles}
                renderItem={item => (
                  <List.Item
                    actions={[
                      <Button 
                        type="primary" 
                        icon={<InfoCircleOutlined />} 
                        size="small" 
                        onClick={() => handleViewRoleDetails(item.roleId)}
                      >
                        Chi tiết
                      </Button>,
                      <Button 
                        type="text" 
                        danger 
                        icon={<DeleteOutlined />} 
                        onClick={() => handleDeleteRole(selectedUser.id, item.roleId, item.roleName)}
                        title={selectedUser.userRoles.length <= 1 ? "Không thể xóa vai trò cuối cùng" : ""}
                      >
                        Xóa
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={<span>Vai trò: <Tag color="blue">{item.roleName}</Tag></span>}
                      description={`Được gán vào: ${new Date(item.assignedAt).toLocaleString()}`}
                    />
                  </List.Item>
                )}
              />
            </div>
          )}
        </Modal>

        {/* Modal thêm vai trò cho người dùng */}
        <Modal
          title="Thêm vai trò cho người dùng"
          open={addRoleVisible}
          onOk={handleAddRole}
          onCancel={() => setAddRoleVisible(false)}
          confirmLoading={assignRoleLoading}
        >
          <Form
            form={roleForm}
            layout="vertical"
          >
            <Form.Item
              name="roleId"
              label="Vai trò"
              rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
            >
              <Select 
                placeholder="Chọn vai trò" 
                style={{ width: '100%' }}
                options={getFilteredRoles().map(role => ({ 
                  label: role.roleName, 
                  value: role.id,
                  disabled: false
                }))}
                optionFilterProp="label"
                showSearch
                loading={loading}
                notFoundContent={loading ? 'Đang tải...' : 'Không có vai trò nào có sẵn'}
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    <Divider style={{ margin: '8px 0' }} />
                    <div style={{ padding: '0 8px 4px' }}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Chọn vai trò và nhấn vào nút "Chi tiết" để xem thêm thông tin
                      </Text>
                    </div>
                  </>
                )}
              />
            </Form.Item>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                type="default" 
                icon={<InfoCircleOutlined />}
                onClick={() => {
                  const roleId = roleForm.getFieldValue('roleId');
                  if (roleId) {
                    handleViewRoleDetails(roleId);
                  } else {
                    message.warning('Vui lòng chọn vai trò để xem chi tiết');
                  }
                }}
              >
                Xem chi tiết vai trò
              </Button>
            </div>
          </Form>
        </Modal>

        {/* Modal chi tiết vai trò */}
        <Modal
          title="Chi tiết vai trò"
          open={roleDetailVisible}
          onCancel={() => setRoleDetailVisible(false)}
          footer={[
            <Button key="close" onClick={() => setRoleDetailVisible(false)}>
              Đóng
            </Button>
          ]}
          width={700}
          confirmLoading={roleDetailLoading}
        >
          {roleDetailLoading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              Đang tải thông tin vai trò...
            </div>
          ) : selectedRole && (
            <div>
              <Descriptions bordered={false} variant="bordered" column={2}>
                <Descriptions.Item label="ID" span={2}>{selectedRole.id}</Descriptions.Item>
                <Descriptions.Item label="Tên vai trò">{selectedRole.roleName}</Descriptions.Item>
                <Descriptions.Item label="Số lượng quyền">{selectedRole.permissionCount}</Descriptions.Item>
                <Descriptions.Item label="Số lượng danh mục được quyền">{selectedRole.categoryPermissionCount}</Descriptions.Item>
              </Descriptions>

              <Divider orientation="left">Danh sách quyền</Divider>
              {renderPermissionList(selectedRole.permissions)}

              <Divider orientation="left">Danh sách phân loại</Divider>
              {renderCategoryList(selectedRole.categoryPermissions)}
            </div>
          )}
        </Modal>
      </div>
    </App>
  );
} 