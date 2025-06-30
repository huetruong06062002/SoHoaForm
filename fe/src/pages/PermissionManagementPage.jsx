import { useState } from 'react';
import { Typography, Card, Table, Tag, Button, Space, Divider, Modal, Form, Input, Select, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const PermissionManagementPage = () => {
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFeature, setEditingFeature] = useState(null);
  const [form] = Form.useForm();

  // Mô phỏng dữ liệu chức năng
  const features = [
    {
      id: 1,
      name: 'Quản lý người dùng',
      code: 'user_management',
      description: 'Quản lý tài khoản người dùng và phân quyền',
      module: 'admin',
      status: 'active',
      requiredPermission: 'manage_users',
    },
    {
      id: 2,
      name: 'Quản lý vai trò',
      code: 'role_management',
      description: 'Quản lý vai trò và phân quyền hệ thống',
      module: 'admin',
      status: 'active',
      requiredPermission: 'manage_roles',
    },
    {
      id: 3,
      name: 'Tạo form mới',
      code: 'create_form',
      description: 'Tạo mới biểu mẫu',
      module: 'form',
      status: 'active',
      requiredPermission: 'create_form',
    },
    {
      id: 4,
      name: 'Xuất báo cáo',
      code: 'export_report',
      description: 'Xuất báo cáo thống kê',
      module: 'report',
      status: 'inactive',
      requiredPermission: 'export_report',
    },
    {
      id: 5,
      name: 'Gửi thông báo',
      code: 'send_notification',
      description: 'Gửi thông báo cho người dùng',
      module: 'notification',
      status: 'active',
      requiredPermission: 'send_notification',
    },
  ];

  // Danh sách module
  const modules = [
    { label: 'Admin', value: 'admin' },
    { label: 'Form', value: 'form' },
    { label: 'Báo cáo', value: 'report' },
    { label: 'Thông báo', value: 'notification' },
    { label: 'Tài liệu', value: 'document' },
  ];

  // Danh sách quyền hạn
  const permissions = [
    { label: 'Quản lý người dùng', value: 'manage_users' },
    { label: 'Quản lý vai trò', value: 'manage_roles' },
    { label: 'Tạo form', value: 'create_form' },
    { label: 'Chỉnh sửa form', value: 'edit_form' },
    { label: 'Xóa form', value: 'delete_form' },
    { label: 'Xuất báo cáo', value: 'export_report' },
    { label: 'Gửi thông báo', value: 'send_notification' },
  ];

  // Cấu hình cột cho bảng chức năng
  const columns = [
    { title: 'Tên chức năng', dataIndex: 'name', key: 'name' },
    { title: 'Mã', dataIndex: 'code', key: 'code' },
    { title: 'Mô tả', dataIndex: 'description', key: 'description', ellipsis: true },
    { 
      title: 'Module', 
      dataIndex: 'module', 
      key: 'module',
      render: (module) => {
        const moduleObj = modules.find(m => m.value === module);
        return (
          <Tag color="blue">
            {moduleObj ? moduleObj.label : module}
          </Tag>
        );
      }
    },
    { 
      title: 'Quyền yêu cầu', 
      dataIndex: 'requiredPermission', 
      key: 'requiredPermission',
      render: (permission) => {
        const permObj = permissions.find(p => p.value === permission);
        return (
          <Tag color="purple">
            {permObj ? permObj.label : permission}
          </Tag>
        );
      }
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

  // Xử lý thêm/sửa chức năng
  const handleAddEdit = () => {
    setEditingFeature(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (feature) => {
    setEditingFeature(feature);
    form.setFieldsValue({
      name: feature.name,
      code: feature.code,
      description: feature.description,
      module: feature.module,
      requiredPermission: feature.requiredPermission,
      status: feature.status === 'active',
    });
    setModalVisible(true);
  };

  const handleDelete = (id) => {
    // Xử lý xóa chức năng
    console.log('Xóa chức năng:', id);
  };

  const handleSubmit = () => {
    form.validateFields().then(values => {
      const formattedValues = {
        ...values,
        status: values.status ? 'active' : 'inactive',
      };
      console.log('Form values:', formattedValues);
      // Lưu dữ liệu chức năng mới hoặc cập nhật chức năng
      setModalVisible(false);
    }).catch(err => {
      console.error('Validation failed:', err);
    });
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <Title level={4}>Quản lý chức năng</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAddEdit}
        >
          Thêm chức năng mới
        </Button>
      </div>

      <Card bordered={false}>
        <Table 
          columns={columns} 
          dataSource={features} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingFeature ? "Chỉnh sửa chức năng" : "Thêm chức năng mới"}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ status: true }}
        >
          <Form.Item
            name="name"
            label="Tên chức năng"
            rules={[{ required: true, message: 'Vui lòng nhập tên chức năng' }]}
          >
            <Input placeholder="Nhập tên chức năng" />
          </Form.Item>
          
          <Form.Item
            name="code"
            label="Mã chức năng"
            rules={[{ required: true, message: 'Vui lòng nhập mã chức năng' }]}
          >
            <Input placeholder="Nhập mã chức năng (không dấu, không khoảng trắng)" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Mô tả"
          >
            <TextArea placeholder="Mô tả chức năng" rows={3} />
          </Form.Item>
          
          <Form.Item
            name="module"
            label="Module"
            rules={[{ required: true, message: 'Vui lòng chọn module' }]}
          >
            <Select placeholder="Chọn module" options={modules} />
          </Form.Item>
          
          <Form.Item
            name="requiredPermission"
            label="Quyền yêu cầu"
            rules={[{ required: true, message: 'Vui lòng chọn quyền yêu cầu' }]}
          >
            <Select placeholder="Chọn quyền yêu cầu" options={permissions} />
          </Form.Item>
          
          <Form.Item
            name="status"
            label="Trạng thái"
            valuePropName="checked"
          >
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Không hoạt động" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PermissionManagementPage; 