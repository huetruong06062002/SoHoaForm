import { useState } from 'react';
import { Typography, Card, Table, Tag, Button, Space, Divider, Modal, Form, Input, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

const RoleManagementPage = () => {
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [form] = Form.useForm();

  // Mô phỏng dữ liệu vai trò
  const roles = [
    {
      id: 1,
      name: 'Quản trị viên',
      code: 'admin',
      description: 'Toàn quyền quản lý hệ thống',
      permissions: ['view_all', 'edit_all', 'delete_all', 'manage_users', 'manage_roles'],
      status: 'active',
    },
    {
      id: 2,
      name: 'Người dùng',
      code: 'user',
      description: 'Sử dụng các chức năng cơ bản của hệ thống',
      permissions: ['view_own', 'edit_own'],
      status: 'active',
    },
    {
      id: 3,
      name: 'Quản lý nội dung',
      code: 'content_manager',
      description: 'Quản lý nội dung và form',
      permissions: ['view_all', 'edit_all', 'manage_content'],
      status: 'inactive',
    },
  ];

  // Danh sách quyền hạn
  const permissionOptions = [
    { label: 'Xem tất cả', value: 'view_all' },
    { label: 'Chỉnh sửa tất cả', value: 'edit_all' },
    { label: 'Xóa tất cả', value: 'delete_all' },
    { label: 'Quản lý người dùng', value: 'manage_users' },
    { label: 'Quản lý vai trò', value: 'manage_roles' },
    { label: 'Quản lý nội dung', value: 'manage_content' },
    { label: 'Xem riêng', value: 'view_own' },
    { label: 'Chỉnh sửa riêng', value: 'edit_own' },
  ];

  // Cấu hình cột cho bảng vai trò
  const columns = [
    { title: 'Tên vai trò', dataIndex: 'name', key: 'name' },
    { title: 'Mã', dataIndex: 'code', key: 'code' },
    { title: 'Mô tả', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: 'Quyền hạn',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions) => (
        <div style={{ maxWidth: '300px' }}>
          {permissions.map((permission) => {
            const permOption = permissionOptions.find(p => p.value === permission);
            return (
              <Tag color="blue" key={permission} style={{ margin: '2px' }}>
                {permOption ? permOption.label : permission}
              </Tag>
            );
          })}
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'success' : 'default'}>
          {status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
        </Tag>
      ),
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="primary" 
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

  // Xử lý thêm/sửa vai trò
  const handleAddEdit = () => {
    setEditingRole(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (role) => {
    setEditingRole(role);
    form.setFieldsValue({
      name: role.name,
      code: role.code,
      description: role.description,
      permissions: role.permissions,
      status: role.status,
    });
    setModalVisible(true);
  };

  const handleDelete = (id) => {
    // Xử lý xóa vai trò
    console.log('Xóa vai trò:', id);
  };

  const handleSubmit = () => {
    form.validateFields().then(values => {
      console.log('Form values:', values);
      // Lưu dữ liệu vai trò mới hoặc cập nhật vai trò
      setModalVisible(false);
    }).catch(err => {
      console.error('Validation failed:', err);
    });
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <Title level={4}>Quản lý vai trò</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAddEdit}
        >
          Thêm vai trò mới
        </Button>
      </div>

      <Card bordered={false}>
        <Table 
          columns={columns} 
          dataSource={roles} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingRole ? "Chỉnh sửa vai trò" : "Thêm vai trò mới"}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ status: 'active' }}
        >
          <Form.Item
            name="name"
            label="Tên vai trò"
            rules={[{ required: true, message: 'Vui lòng nhập tên vai trò' }]}
          >
            <Input placeholder="Nhập tên vai trò" />
          </Form.Item>
          
          <Form.Item
            name="code"
            label="Mã vai trò"
            rules={[{ required: true, message: 'Vui lòng nhập mã vai trò' }]}
          >
            <Input placeholder="Nhập mã vai trò (không dấu, không khoảng trắng)" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Mô tả"
          >
            <Input.TextArea placeholder="Mô tả vai trò" rows={3} />
          </Form.Item>
          
          <Form.Item
            name="permissions"
            label="Quyền hạn"
            rules={[{ required: true, message: 'Vui lòng chọn quyền hạn' }]}
          >
            <Select
              mode="multiple"
              placeholder="Chọn quyền hạn"
              style={{ width: '100%' }}
              options={permissionOptions}
            />
          </Form.Item>
          
          <Form.Item
            name="status"
            label="Trạng thái"
          >
            <Select>
              <Option value="active">Hoạt động</Option>
              <Option value="inactive">Không hoạt động</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RoleManagementPage; 