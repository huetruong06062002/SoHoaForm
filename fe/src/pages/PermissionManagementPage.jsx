import { useState, useEffect } from 'react';
import { Typography, Card, Table, Tag, Button, Space, Divider, Modal, Form, Input, Select, Switch, message, App, Badge, Tooltip, Popover } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, AppstoreOutlined, EyeOutlined } from '@ant-design/icons';
import apiService from '../services/apiService';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const PermissionManagementPage = () => {
  const { message: messageApi } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPermission, setEditingPermission] = useState(null);
  const [form] = Form.useForm();
  const [permissions, setPermissions] = useState([]);
  const [rolesModalVisible, setRolesModalVisible] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState(null);

  // Fetch permissions data from API
  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const response = await apiService.crud.getAll('/Permission');
      
      if (response && response.data) {
        console.log('API Permissions Response:', response);
        setPermissions(response.data);
      } else {
        setPermissions([]);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      messageApi.error('Không thể tải danh sách quyền hạn');
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  // Load permissions when component mounts
  useEffect(() => {
    fetchPermissions();
  }, []);

  // Cấu hình cột cho bảng quyền hạn
  const columns = [
    { 
      title: 'Tên quyền hạn',
      dataIndex: 'permissionName',
      key: 'name',
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>
    },
    { 
      title: 'Số vai trò được chỉ định',
      key: 'rolePermissionsCount',
      dataIndex: 'rolePermissionsCount',
      render: (count, record) => (
        <Badge 
          count={count} 
          overflowCount={99}
          style={{ 
            backgroundColor: count > 0 ? '#1890ff' : '#d9d9d9',
            cursor: 'pointer' 
          }}
          onClick={() => handleViewRoles(record)}
        />
      )
    },
    {
      title: 'Vai trò đã gán',
      key: 'assignedRoles',
      dataIndex: 'assignedRoles',
      render: (roles, record) => (
        <Space size={[0, 4]} wrap>
          {roles?.slice(0, 2).map(role => (
            <Tag color="blue" key={role.id} style={{ margin: '2px' }}>
              {role.roleName}
            </Tag>
          ))}
          {roles?.length > 2 && (
            <Tooltip title="Xem tất cả vai trò">
              <Tag 
                color="processing" 
                style={{ cursor: 'pointer' }}
                onClick={() => handleViewRoles(record)}
              >
                +{roles.length - 2}
              </Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="primary" 
            ghost
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleViewRoles(record)}
            style={{ borderRadius: '4px', color: '#1890ff', borderColor: '#1890ff' }}
          >
            Chi tiết
          </Button>
          <Button 
            type="primary" 
            ghost
            size="small" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            style={{ borderRadius: '4px', color: '#52c41a', borderColor: '#52c41a' }}
          >
            Sửa
          </Button>
          <Button 
            danger 
            size="small" 
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
            style={{ borderRadius: '4px' }}
          >
            Xóa
          </Button>
        </Space>
      ),
    },
  ];

  // Xử lý xem chi tiết vai trò đã gán
  const handleViewRoles = (permission) => {
    setSelectedPermission(permission);
    setRolesModalVisible(true);
  };

  // Xử lý thêm/sửa quyền hạn
  const handleAddEdit = () => {
    setEditingPermission(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (permission) => {
    setEditingPermission(permission);
    form.setFieldsValue({
      permissionName: permission.permissionName,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      const response = await apiService.crud.delete('/Permission', id);
      
      if (response) {
        messageApi.success('Xóa quyền hạn thành công');
        fetchPermissions(); // Refresh the list
      }
    } catch (error) {
      console.error('Error deleting permission:', error);
      messageApi.error('Có lỗi xảy ra khi xóa quyền hạn');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      setLoading(true);
      
      if (editingPermission) {
        // Update existing permission
        try {
          console.log(`Updating permission: ${editingPermission.id} with values:`, values);
          const response = await apiService.crud.update('/Permission', editingPermission.id, values);
          console.log('Update response:', response);
          messageApi.success('Cập nhật quyền hạn thành công');
          setModalVisible(false);
          fetchPermissions(); // Refresh the list
        } catch (updateError) {
          console.error('Error updating permission:', updateError);
          messageApi.error('Có lỗi xảy ra khi cập nhật quyền hạn');
        }
      } else {
        // Create new permission
        try {
          await apiService.crud.create('/Permission', values);
          messageApi.success('Thêm quyền hạn mới thành công');
          setModalVisible(false);
          fetchPermissions(); // Refresh the list
        } catch (createError) {
          console.error('Error creating permission:', createError);
          messageApi.error('Có lỗi xảy ra khi thêm quyền hạn mới');
        }
      }
    } catch (formError) {
      console.error('Form validation error:', formError);
    } finally {
      setLoading(false);
    }
  };

  // Columns for the roles table in detail modal
  const rolesColumns = [
    {
      title: 'Tên vai trò',
      dataIndex: 'roleName',
      key: 'roleName',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      render: (id) => <Text style={{ fontSize: '12px', color: '#888' }}>{id}</Text>
    }
  ];

  return (
    <App>
      <div style={{ padding: '24px', backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
        <Card bordered={false} style={{ borderRadius: '8px', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <Title level={4} style={{ margin: 0, fontWeight: 600 }}>Quản lý quyền hạn</Title>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleAddEdit}
              style={{ borderRadius: '6px', fontWeight: 500, height: '38px' }}
            >
              Thêm quyền hạn mới
            </Button>
          </div>

          <Table 
            columns={columns} 
            dataSource={permissions} 
            rowKey="id" 
            loading={loading}
            pagination={{ 
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Tổng số ${total} quyền hạn`,
              style: { marginTop: '16px' }
            }}
            style={{ 
              borderRadius: '8px', 
              overflow: 'hidden' 
            }}
            size="middle"
            className="custom-permission-table"
          />
        </Card>

        {/* Modal thêm/sửa quyền hạn */}
        <Modal
          title={editingPermission ? "Chỉnh sửa quyền hạn" : "Thêm quyền hạn mới"}
          open={modalVisible}
          onOk={handleSubmit}
          onCancel={() => setModalVisible(false)}
          width={500}
          okText={editingPermission ? "Cập nhật" : "Thêm mới"}
          cancelText="Hủy"
          style={{ top: 20 }}
        >
          <Form
            form={form}
            layout="vertical"
          >
            <Form.Item
              name="permissionName"
              label="Tên quyền hạn"
              rules={[{ required: true, message: 'Vui lòng nhập tên quyền hạn' }]}
            >
              <Input 
                placeholder="Nhập tên quyền hạn (VD: VIEW_FORM, CREATE_USER)" 
                size="large" 
                style={{ textTransform: 'uppercase' }}
              />
            </Form.Item>
          </Form>
        </Modal>
        
        {/* Modal xem chi tiết vai trò đã gán */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <UserOutlined style={{ marginRight: '8px', fontSize: '18px' }} />
              <span>Vai trò được gán quyền: {selectedPermission?.permissionName}</span>
            </div>
          }
          open={rolesModalVisible}
          onCancel={() => setRolesModalVisible(false)}
          footer={[
            <Button key="close" type="primary" onClick={() => setRolesModalVisible(false)}>
              Đóng
            </Button>
          ]}
          width={600}
        >
          {selectedPermission?.assignedRoles?.length > 0 ? (
            <Table 
              dataSource={selectedPermission.assignedRoles} 
              columns={rolesColumns} 
              rowKey="id"
              pagination={false}
              style={{ marginTop: '16px' }}
              size="middle"
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#999' }}>
              <UserOutlined style={{ fontSize: '32px', marginBottom: '16px', display: 'block' }} />
              <p>Không có vai trò nào được gán quyền này</p>
            </div>
          )}
        </Modal>
      </div>
      <style jsx global>{`
        .custom-permission-table .ant-table-thead > tr > th {
          background-color: #f5f7fa;
          font-weight: 600;
        }
      `}</style>
    </App>
  );
};

export default PermissionManagementPage; 