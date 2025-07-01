import { useState, useEffect } from 'react';
import { Typography, Card, Table, Tag, Button, Space, Divider, Modal, Form, Input, Select, App, message, List, Descriptions, Switch, Row, Col, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PlusCircleOutlined, CloseCircleOutlined, EyeOutlined, FolderOutlined, SettingOutlined } from '@ant-design/icons';
import apiService from '../services/apiService';

const { Title, Text } = Typography;
const { Option } = Select;

// Define custom button styles
const buttonStyle = {
  borderRadius: '4px',
  boxShadow: '0 2px 0 rgba(0,0,0,0.02)',
  marginRight: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const primaryButtonStyle = {
  ...buttonStyle,
  background: '#1890ff',
  borderColor: '#1890ff',
  color: '#fff'
};

const defaultButtonStyle = {
  ...buttonStyle,
  background: '#fff',
  borderColor: '#d9d9d9',
  color: '#333'
};

const dangerButtonStyle = {
  ...buttonStyle,
  background: '#fff',
  borderColor: '#ff4d4f',
  color: '#ff4d4f'
};

// Permission tag styles
const permissionTagStyle = {
  margin: '2px',
  borderRadius: '2px',
  fontSize: '12px',
  padding: '0 6px',
  lineHeight: '20px',
  display: 'inline-block'
};

const RoleManagementPage = () => {
  const { message, modal } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [roleDetail, setRoleDetail] = useState(null);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [categoryPermissions, setCategoryPermissions] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [form] = Form.useForm();
  const [permissionForm] = Form.useForm();
  const [categoryForm] = Form.useForm();

  // Fetch roles from API
  const fetchRoles = async () => {
    setLoading(true);
    try {
      const response = await apiService.roles.getAll();
      if (response && response.data) {
        setRoles(response.data);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
      message.error("Không thể tải danh sách vai trò");
    } finally {
      setLoading(false);
    }
  };

  // Fetch role detail
  const fetchRoleDetail = async (roleId) => {
    setLoading(true);
    try {
      const response = await apiService.roles.getById(roleId);
      if (response && response.data) {
        setRoleDetail(response.data);
      }
    } catch (error) {
      console.error("Error fetching role detail:", error);
      message.error("Không thể tải thông tin chi tiết vai trò");
    } finally {
      setLoading(false);
    }
  };

  // Fetch available permissions
  const fetchPermissions = async () => {
    try {
      const response = await apiService.permissions.getAll();
      if (response && response.data) {
        setAvailablePermissions(response.data);
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
      message.error("Không thể tải danh sách quyền");
    }
  };

  // Fetch role category permissions
  const fetchRoleCategoryPermissions = async (roleId) => {
    setLoading(true);
    try {
      // Use the updated API endpoint
      const response = await apiService.roles.getCategoryPermissions(roleId);
      
      if (response && response.data) {
        // Set the category permissions directly from the API response
        setCategoryPermissions(response.data);
      }
    } catch (error) {
      console.error("Error fetching role category permissions:", error);
      message.error("Không thể tải danh sách phân quyền danh mục");
    } finally {
      setLoading(false);
    }
  };

  // Fetch available form categories
  const fetchFormCategories = async () => {
    try {
      const response = await apiService.formCategory.getAll();
      if (response && response.data) {
        setAvailableCategories(response.data);
      }
    } catch (error) {
      console.error("Error fetching form categories:", error);
      message.error("Không thể tải danh sách danh mục biểu mẫu");
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
    fetchFormCategories();
  }, []);

  // Danh sách quyền hạn
  const permissionOptions = [
    { label: 'Xem biểu mẫu', value: 'VIEW_FORM' },
    { label: 'Tạo biểu mẫu', value: 'CREATE_FORM' },
    { label: 'Chỉnh sửa biểu mẫu', value: 'EDIT_FORM' },
    { label: 'Xóa biểu mẫu', value: 'DELETE_FORM' },
    { label: 'Xuất PDF', value: 'EXPORT_PDF' },
    { label: 'Quản lý người dùng', value: 'MANAGE_USERS' },
    { label: 'Quản lý vai trò', value: 'MANAGE_ROLES' },
  ];

  // Cấu hình cột cho bảng vai trò
  const columns = [
    { 
      title: 'Tên vai trò', 
      dataIndex: 'roleName', 
      key: 'roleName',
      width: '15%'
    },
    { 
      title: 'Số lượng quyền', 
      dataIndex: 'permissionCount', 
      key: 'permissionCount',
      width: '10%',
      align: 'center',
      render: (count) => (
        <Tag color="blue" style={{ minWidth: '30px', textAlign: 'center' }}>
          {count}
        </Tag>
      )
    },
    {
      title: 'Số lượng danh mục được quyền',
      dataIndex: 'categoryPermissionCount',
      key: 'categoryPermissionCount',
      width: '15%',
      align: 'center',
      render: (count) => (
        <Tag color="green" style={{ minWidth: '30px', textAlign: 'center' }}>
          {count}
        </Tag>
      )
    },
    {
      title: 'Quyền hạn',
      dataIndex: 'permissions',
      key: 'permissions',
      width: '25%',
      render: (permissions) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {permissions && permissions.length > 0 ? permissions.map((permission) => (
            <Tag 
              color="blue" 
              key={permission.id} 
              style={permissionTagStyle}
            >
              {permission.permissionName}
              </Tag>
          )) : (
            <Text type="secondary">Không có quyền</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Hành động',
      key: 'action',
      width: '35%',
      render: (_, record) => (
        <Space size="small" wrap style={{ display: 'flex', flexWrap: 'wrap' }}>
          <Tooltip title="Xem chi tiết">
          <Button 
            type="primary" 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record.id)}
              style={primaryButtonStyle}
            >
              Chi tiết
            </Button>
          </Tooltip>
          <Tooltip title="Chỉnh sửa vai trò">
            <Button 
              type="default" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
              style={defaultButtonStyle}
          >
            Sửa
          </Button>
          </Tooltip>
          <Tooltip title="Quản lý quyền cho vai trò">
            <Button 
              type="default"
              size="small" 
              icon={<SettingOutlined />}
              onClick={() => handleManagePermissions(record)}
              style={defaultButtonStyle}
            >
              Quản lý quyền
            </Button>
          </Tooltip>
          <Tooltip title="Quản lý danh mục cho vai trò">
            <Button 
              type="default"
              size="small" 
              icon={<FolderOutlined />}
              onClick={() => handleManageCategories(record)}
              style={defaultButtonStyle}
            >
              Quản lý danh mục
            </Button>
          </Tooltip>
          <Tooltip title="Xóa vai trò">
          <Button 
            danger 
            size="small" 
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
              style={dangerButtonStyle}
          >
            Xóa
          </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Xử lý xem chi tiết vai trò
  const handleViewDetail = async (roleId) => {
    await fetchRoleDetail(roleId);
    setDetailModalVisible(true);
  };

  // Xử lý thêm/sửa vai trò
  const handleAddEdit = () => {
    setEditingRole(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (role) => {
    setEditingRole(role);
    form.setFieldsValue({
      roleName: role.roleName
    });
    setModalVisible(true);
  };

  // Xử lý quản lý quyền cho vai trò
  const handleManagePermissions = (role) => {
    setSelectedRole(role);
    permissionForm.resetFields();
    setPermissionModalVisible(true);
  };

  // Xử lý thêm quyền cho vai trò
  const handleAddPermission = async () => {
    try {
      const values = await permissionForm.validateFields();
      if (!selectedRole || !values.permissionId) {
        message.error('Vui lòng chọn quyền');
        return;
      }

      setLoading(true);
      try {
        const response = await apiService.roles.assignPermissionToRole(selectedRole.id, values.permissionId);
        
        if (response && response.statusCode === 200) {
          message.success(response.message || 'Thêm quyền thành công');
          
          // Refresh role details
          const roleResponse = await apiService.roles.getById(selectedRole.id);
          if (roleResponse && roleResponse.data) {
            setSelectedRole(roleResponse.data);
            // Update the role in the roles list
            setRoles(prevRoles => 
              prevRoles.map(r => r.id === roleResponse.data.id ? roleResponse.data : r)
            );
          }
        } else {
          message.error(response?.message || 'Có lỗi xảy ra khi thêm quyền');
        }
        
        permissionForm.resetFields();
      } catch (error) {
        console.error("Error adding permission:", error);
        message.error(error.response?.data?.message || 'Có lỗi xảy ra khi thêm quyền');
      } finally {
        setLoading(false);
      }
    } catch (error) {
      console.error("Form validation error:", error);
    }
  };

  // Xử lý xóa quyền khỏi vai trò
  const handleRemovePermission = async (roleId, permissionId, permissionName) => {
    modal.confirm({
      title: 'Xác nhận xóa quyền',
      content: `Bạn có chắc chắn muốn xóa quyền "${permissionName}" khỏi vai trò này không?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        setLoading(true);
        try {
          await apiService.roles.removePermissionFromRole(roleId, permissionId);
          message.success('Xóa quyền thành công');
          
          // Refresh role details
          const response = await apiService.roles.getById(roleId);
          if (response && response.data) {
            setSelectedRole(response.data);
            // Update the role in the roles list
            setRoles(prevRoles => 
              prevRoles.map(r => r.id === response.data.id ? response.data : r)
            );
          }
        } catch (error) {
          console.error("Error removing permission:", error);
          message.error('Có lỗi xảy ra khi xóa quyền');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleDelete = (id) => {
    modal.confirm({
      title: 'Xác nhận xóa',
      content: 'Bạn có chắc chắn muốn xóa vai trò này không?',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          setLoading(true);
          const response = await apiService.roles.delete(id);
          
          if (response && response.statusCode === 200) {
            message.success(response.message || 'Xóa vai trò thành công');
            fetchRoles(); // Refresh list
          } else {
            message.error(response?.message || 'Có lỗi xảy ra khi xóa vai trò');
          }
        } catch (error) {
          console.error("Error deleting role:", error);
          message.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa vai trò');
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
      
      if (editingRole) {
        // Update existing role - chỉ cập nhật tên
        await apiService.roles.update(editingRole.id, {
          roleName: values.roleName
        });
        message.success('Cập nhật vai trò thành công');
      } else {
        // Create new role - API chỉ cần roleName
        const createResponse = await apiService.roles.create({
          roleName: values.roleName
        });
        
        message.success('Thêm vai trò mới thành công');
      }
      
      fetchRoles(); // Refresh the roles list
      setModalVisible(false);
    } catch (error) {
      console.error('Error submitting form:', error);
      message.error('Có lỗi xảy ra khi lưu thông tin vai trò');
    } finally {
      setLoading(false);
    }
  };

  // Lọc các quyền có sẵn mà vai trò chưa có
  const getFilteredPermissions = () => {
    if (!selectedRole || !selectedRole.permissions || !availablePermissions) return [];
    
    // Lấy danh sách permissionId mà vai trò đã có
    const rolePermissionIds = selectedRole.permissions.map(perm => perm.id);
    
    // Lọc ra các quyền mà vai trò chưa có
    return availablePermissions.filter(perm => !rolePermissionIds.includes(perm.id));
  };

  // Xử lý quản lý danh mục cho vai trò
  const handleManageCategories = async (role) => {
    setSelectedRole(role);
    await fetchRoleCategoryPermissions(role.id);
    categoryForm.resetFields();
    setCategoryModalVisible(true);
  };

  // Xử lý thêm danh mục cho vai trò
  const handleAddCategory = async () => {
    try {
      const values = await categoryForm.validateFields();
      if (!selectedRole || !values.categoryId) {
        message.error('Vui lòng chọn danh mục');
        return;
      }

      setLoading(true);
      try {
        const response = await apiService.roles.assignCategoryToRole(
          selectedRole.id, 
          values.categoryId,
          true // Mặc định cho phép truy cập
        );
        
        if (response && response.statusCode === 200) {
          message.success(response.message || 'Thêm danh mục thành công');
          
          // Refresh category permissions list
          await fetchRoleCategoryPermissions(selectedRole.id);
          
          // Update the role in the roles list
          await fetchRoles();
        } else {
          message.error(response?.message || 'Có lỗi xảy ra khi thêm danh mục');
        }
        
        categoryForm.resetFields();
      } catch (error) {
        console.error("Error adding category:", error);
        message.error(error.response?.data?.message || 'Có lỗi xảy ra khi thêm danh mục');
      } finally {
        setLoading(false);
      }
    } catch (error) {
      console.error("Form validation error:", error);
    }
  };

  // Lọc các danh mục có sẵn mà vai trò chưa có
  const getFilteredCategories = () => {
    if (!selectedRole || !categoryPermissions || !availableCategories) return [];
    
    // Lấy danh sách formCategoryId mà vai trò đã có
    const roleCategoryIds = categoryPermissions.map(cat => cat.formCategoryId);
    
    // Lọc ra các danh mục mà vai trò chưa có
    return availableCategories.filter(cat => !roleCategoryIds.includes(cat.id));
  };

  // Xử lý xóa phân quyền danh mục
  const handleDeleteCategoryPermission = async (permissionId, categoryId) => {
    try {
      setLoading(true);
      
      // Call API to delete category permission
      const response = await apiService.roles.deleteCategoryPermission(selectedRole.id, categoryId);
      
      if (response && response.statusCode === 200) {
        message.success(response.message || 'Xóa phân quyền danh mục thành công');
        
        // Refresh category permissions list
        await fetchRoleCategoryPermissions(selectedRole.id);
        
        // Update the role in the roles list
        await fetchRoles();
        
        // Update role detail if it's currently displayed
        if (roleDetail && roleDetail.id === selectedRole.id) {
          await fetchRoleDetail(selectedRole.id);
        }
      } else {
        message.error(response?.message || 'Có lỗi xảy ra khi xóa phân quyền danh mục');
      }
    } catch (error) {
      console.error("Error deleting category permission:", error);
      message.error('Có lỗi xảy ra khi xóa phân quyền danh mục');
    } finally {
      setLoading(false);
    }
  };

  // Xử lý cập nhật quyền truy cập danh mục
  const handleToggleCategoryAccess = async (permissionId, currentAccess) => {
    setLoading(true);
    try {
      // Use the updated API endpoint for updating permissions
      const response = await apiService.roles.updateCategoryPermission(
        permissionId, 
        !currentAccess // toggle current access status
      );
      
      if (response && response.statusCode === 200) {
        message.success('Cập nhật quyền truy cập danh mục thành công');
        
        // Refresh category permissions list
        await fetchRoleCategoryPermissions(selectedRole.id);
        
        // Update role detail if it's currently displayed
        if (roleDetail && roleDetail.id === selectedRole.id) {
          await fetchRoleDetail(selectedRole.id);
        }
        
        // Update the roles list
        await fetchRoles();
      } else {
        message.error('Có lỗi xảy ra khi cập nhật quyền truy cập danh mục');
      }
    } catch (error) {
      console.error("Error updating category permission:", error);
      message.error('Có lỗi xảy ra khi cập nhật quyền truy cập danh mục');
    } finally {
      setLoading(false);
    }
  };

  return (
    <App>
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>Quản lý vai trò</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAddEdit}
          style={primaryButtonStyle}
        >
          Thêm vai trò mới
        </Button>
      </div>

      <Card bordered={false} style={{ borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
        <Table 
          columns={columns} 
          dataSource={roles} 
          rowKey="id" 
          loading={loading}
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng số ${total} vai trò`,
            pageSizeOptions: ['10', '20', '50'],
          }}
          style={{ marginTop: '8px' }}
          size="middle"
          bordered
        />
      </Card>

        {/* Modal xem chi tiết vai trò */}
        <Modal
          title="Chi tiết vai trò"
          open={detailModalVisible}
          onCancel={() => setDetailModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setDetailModalVisible(false)}>
              Đóng
            </Button>
          ]}
          width={800}
        >
          {roleDetail && (
            <div>
              <Descriptions bordered column={2}>
                <Descriptions.Item label="Tên vai trò">{roleDetail.roleName}</Descriptions.Item>
                <Descriptions.Item label="Số lượng quyền">
                  <Tag color="blue">{roleDetail.permissionCount}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Số lượng danh mục được quyền" span={2}>
                  <Tag color="green">{roleDetail.categoryPermissionCount}</Tag>
                </Descriptions.Item>
              </Descriptions>

              <Divider orientation="left">Danh sách quyền</Divider>
              <div style={{ marginBottom: '20px' }}>
                {roleDetail.permissions && roleDetail.permissions.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {roleDetail.permissions.map(permission => (
                      <Tag color="blue" key={permission.id}>
                        {permission.permissionName}
                      </Tag>
                    ))}
                  </div>
                ) : (
                  <Text type="secondary">Không có quyền nào</Text>
                )}
              </div>

              <Divider orientation="left">Danh sách phân loại</Divider>
              {roleDetail.categoryPermissions && roleDetail.categoryPermissions.length > 0 ? (
                <List
                  bordered
                  dataSource={roleDetail.categoryPermissions}
                  renderItem={item => (
                    <List.Item>
                      <List.Item.Meta
                        title={item.categoryName}
                        description={
                          <div>
                            <Tag color={item.canAccess ? "green" : "red"}>
                              {item.canAccess ? "Có quyền truy cập" : "Không có quyền truy cập"}
                            </Tag>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Text type="secondary">Không có phân loại nào</Text>
              )}
            </div>
          )}
        </Modal>

        {/* Modal thêm/sửa vai trò */}
      <Modal
        title={editingRole ? "Chỉnh sửa vai trò" : "Thêm vai trò mới"}
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
          <Form.Item
              name="roleName"
            label="Tên vai trò"
            rules={[{ required: true, message: 'Vui lòng nhập tên vai trò' }]}
          >
            <Input placeholder="Nhập tên vai trò" />
          </Form.Item>
          </Form>
        </Modal>

        {/* Modal quản lý quyền cho vai trò */}
        <Modal
          title="Quản lý quyền cho vai trò"
          open={permissionModalVisible}
          onCancel={() => setPermissionModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setPermissionModalVisible(false)}>
              Đóng
            </Button>
          ]}
          width={700}
        >
          {selectedRole && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <Title level={5}>Vai trò: {selectedRole.roleName}</Title>
              </div>

              <Divider orientation="left">Danh sách quyền hiện tại</Divider>
              <List
                bordered
                dataSource={selectedRole.permissions || []}
                renderItem={item => (
                  <List.Item
                    actions={[
                      <Button 
                        type="text" 
                        danger 
                        icon={<CloseCircleOutlined />} 
                        onClick={() => handleRemovePermission(selectedRole.id, item.id, item.permissionName)}
                      >
                        Xóa
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={<span>{item.permissionName}</span>}
                    />
                  </List.Item>
                )}
                locale={{ emptyText: 'Chưa có quyền nào' }}
              />

              <Divider orientation="left">Thêm quyền mới</Divider>
              <Form
                form={permissionForm}
                layout="horizontal"
                onFinish={handleAddPermission}
              >
                <div style={{ display: 'flex', gap: '10px' }}>
          <Form.Item
                    name="permissionId"
                    style={{ flex: 1, marginBottom: '10px' }}
                    rules={[{ required: true, message: 'Vui lòng chọn quyền' }]}
          >
            <Select
                      placeholder="Chọn quyền"
                      options={getFilteredPermissions().map(perm => ({
                        label: perm.permissionName,
                        value: perm.id
                      }))}
                      loading={loading}
                      notFoundContent={loading ? 'Đang tải...' : 'Không có quyền nào có sẵn'}
            />
          </Form.Item>
                  <Form.Item style={{ marginBottom: '10px' }}>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      loading={loading}
                      icon={<PlusCircleOutlined />}
                    >
                      Thêm
                    </Button>
          </Form.Item>
                </div>
        </Form>
            </div>
          )}
      </Modal>

      {/* Modal quản lý danh mục cho vai trò */}
      <Modal
        title={<div style={{ fontSize: '16px', fontWeight: 500 }}>Quản lý danh mục cho vai trò</div>}
        open={categoryModalVisible}
        onCancel={() => setCategoryModalVisible(false)}
        footer={[
          <Button 
            key="close" 
            onClick={() => setCategoryModalVisible(false)}
            style={defaultButtonStyle}
          >
            Đóng
          </Button>
        ]}
        width={800}
      >
        {selectedRole && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <Title level={5} style={{ margin: 0 }}>Vai trò: {selectedRole.roleName}</Title>
              <Text type="secondary">Quản lý quyền truy cập vào các danh mục biểu mẫu</Text>
            </div>

            {/* Form thêm danh mục mới */}
            <Divider orientation="left" style={{ margin: '16px 0' }}>Thêm danh mục mới</Divider>
            <Form
              form={categoryForm}
              layout="horizontal"
              onFinish={handleAddCategory}
            >
              <div style={{ display: 'flex', gap: '10px' }}>
                <Form.Item
                  name="categoryId"
                  style={{ flex: 1, marginBottom: '10px' }}
                  rules={[{ required: true, message: 'Vui lòng chọn danh mục' }]}
                >
                  <Select 
                    placeholder="Chọn danh mục"
                    options={getFilteredCategories().map(cat => ({
                      label: cat.categoryName || cat.name,
                      value: cat.id
                    }))}
                    loading={loading}
                    notFoundContent={loading ? 'Đang tải...' : 'Không có danh mục nào có sẵn'}
                  />
                </Form.Item>
                <Form.Item style={{ marginBottom: '10px' }}>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={loading}
                    icon={<PlusCircleOutlined />}
                    style={primaryButtonStyle}
                  >
                    Thêm
                  </Button>
                </Form.Item>
              </div>
            </Form>

            <Divider orientation="left" style={{ margin: '16px 0' }}>Danh sách phân loại</Divider>
            
            {loading ? (
              <div style={{ textAlign: 'center', padding: '30px' }}>
                <div>Đang tải dữ liệu...</div>
              </div>
            ) : categoryPermissions && categoryPermissions.length > 0 ? (
              <Table
                rowKey="id"
                dataSource={categoryPermissions}
                pagination={{ pageSize: 10 }}
                size="middle"
                bordered
                columns={[
                  { 
                    title: 'Tên phân loại', 
                    dataIndex: 'categoryName', 
                    key: 'categoryName',
                    render: (text, record) => (
                      <Space>
                        <FolderOutlined style={{ color: '#1890ff' }} />
                        <span>{text}</span>
                      </Space>
                    )
                  },
                  {
                    title: 'Phân loại cha',
                    dataIndex: 'parentCategoryName',
                    key: 'parentCategoryName',
                    render: (text) => text || <span style={{ color: '#999' }}>Không có</span>
                  },
                  {
                    title: 'Cấp',
                    dataIndex: 'categoryLevel',
                    key: 'categoryLevel',
                    width: 80,
                    align: 'center',
                    render: (level) => <Tag color="blue">{level}</Tag>
                  },
                  {
                    title: 'Quyền truy cập',
                    key: 'canAccess',
                    dataIndex: 'canAccess',
                    width: 150,
                    align: 'center',
                    render: (canAccess, record) => (
                      <Switch
                        checked={canAccess}
                        onChange={() => handleToggleCategoryAccess(record.id, canAccess)}
                        checkedChildren="Có quyền"
                        unCheckedChildren="Không có"
                        style={{ backgroundColor: canAccess ? '#52c41a' : undefined }}
                      />
                    )
                  },
                  {
                    title: 'Hành động',
                    key: 'action',
                    width: 120,
                    align: 'center',
                    render: (_, record) => (
                      <Popconfirm
                        title="Xóa phân quyền này?"
                        description="Bạn có chắc chắn muốn xóa phân quyền này không?"
                        onConfirm={() => handleDeleteCategoryPermission(record.id, record.formCategoryId)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                      >
                        <Button 
                          type="primary" 
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          style={{ ...dangerButtonStyle, background: '#ff4d4f', color: '#fff' }}
                        >
                          Xóa
                        </Button>
                      </Popconfirm>
                    )
                  }
                ]}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '30px' }}>
                <Text type="secondary">Không có dữ liệu danh mục</Text>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
    </App>
  );
};

export default RoleManagementPage; 