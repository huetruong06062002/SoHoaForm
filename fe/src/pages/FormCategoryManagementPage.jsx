import { useState, useEffect } from 'react';
import { Typography, Card, Table, Button, Space, Modal, Form, Input, App, Row, Col, Tag, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import apiService from '../services/apiService';

const { Title } = Typography;
const { Search } = Input;

export default function FormCategoryManagementPage() {
  const { message, modal } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [form] = Form.useForm();

  // Fetch danh mục biểu mẫu
  const fetchCategories = async () => {
    setLoading(true);
    try {
      // Giả định API endpoint, bạn cần điều chỉnh theo backend thực tế
      const response = await apiService.crud.getAll('/FormCategory', {
        searchTerm: searchText,
        pageNumber: pagination.current,
        pageSize: pagination.pageSize
      });
      
      console.log('API Response:', response);
      
      if (response && response.data) {
        if (Array.isArray(response.data)) {
          setCategories(response.data);
          setPagination(prev => ({
            ...prev,
            total: response.data.length
          }));
        } else if (response.data.items) {
          setCategories(response.data.items);
          setPagination(prev => ({
            ...prev,
            total: response.data.totalCount || 0
          }));
        } else if (response.data.categories) {
          setCategories(response.data.categories);
          setPagination(prev => ({
            ...prev,
            current: response.data.pageNumber || prev.current,
            pageSize: response.data.pageSize || prev.pageSize,
            total: response.data.totalCount || 0
          }));
        }
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching form categories:', error);
      message.error('Không thể tải danh sách danh mục biểu mẫu');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [pagination.current, pagination.pageSize]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      setPagination(prev => ({ ...prev, current: 1 }));
      fetchCategories();
    }, 500);
    
    return () => clearTimeout(delaySearch);
  }, [searchText]);

  // Xử lý thay đổi phân trang
  const handleTableChange = (pagination, filters, sorter) => {
    setPagination(pagination);
  };

  // Xử lý tìm kiếm
  const handleSearch = (value) => {
    setSearchText(value);
  };

  // Xử lý thêm/sửa danh mục
  const handleAddEdit = () => {
    setSelectedCategory(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (category) => {
    setSelectedCategory(category);
    form.setFieldsValue({
      name: category.name,
      description: category.description,
      code: category.code
    });
    setModalVisible(true);
  };

  // Xử lý xóa danh mục
  const handleDelete = (id) => {
    modal.confirm({
      title: 'Xác nhận xóa',
      icon: <ExclamationCircleOutlined />,
      content: 'Bạn có chắc chắn muốn xóa danh mục biểu mẫu này không?',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          setLoading(true);
          // Giả định API endpoint, bạn cần điều chỉnh theo backend thực tế
          const response = await apiService.crud.delete('/FormCategory', id);
          
          if (response) {
            message.success('Xóa danh mục biểu mẫu thành công');
            fetchCategories();
          }
        } catch (error) {
          console.error('Error deleting form category:', error);
          message.error('Có lỗi xảy ra khi xóa danh mục biểu mẫu');
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
      
      if (selectedCategory) {
        // Cập nhật danh mục
        const response = await apiService.crud.update('/FormCategory', selectedCategory.id, values);
        if (response) {
          message.success('Cập nhật danh mục biểu mẫu thành công');
        }
      } else {
        // Tạo mới danh mục
        const response = await apiService.crud.create('/FormCategory', values);
        if (response) {
          message.success('Thêm danh mục biểu mẫu thành công');
        }
      }
      
      setModalVisible(false);
      fetchCategories();
    } catch (error) {
      console.error('Error submitting form:', error);
      message.error('Có lỗi xảy ra khi lưu thông tin danh mục biểu mẫu');
    } finally {
      setLoading(false);
    }
  };

  // Cấu hình cột cho bảng
  const columns = [
    {
      title: 'Mã danh mục',
      dataIndex: 'code',
      key: 'code',
      width: '15%'
    },
    {
      title: 'Tên danh mục',
      dataIndex: 'name',
      key: 'name',
      width: '25%'
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      width: '40%'
    },
    {
      title: 'Hành động',
      key: 'action',
      width: '20%',
      render: (_, record) => (
        <Space size="small">
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

  return (
    <App>
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <Title level={4}>Quản lý danh mục biểu mẫu</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddEdit}
          >
            Thêm danh mục mới
          </Button>
        </div>

        <Card variant="outlined" style={{ marginBottom: '16px' }}>
          <Row gutter={16} style={{ marginBottom: '16px' }}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Search
                placeholder="Tìm kiếm danh mục"
                allowClear
                enterButton={<Button icon={<SearchOutlined />}>Tìm kiếm</Button>}
                onSearch={handleSearch}
                onChange={(e) => setSearchText(e.target.value)}
                value={searchText}
              />
            </Col>
          </Row>
          
          <Table
            columns={columns}
            dataSource={categories}
            rowKey="id"
            loading={loading}
            pagination={{
              ...pagination,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} danh mục`
            }}
            onChange={handleTableChange}
          />
        </Card>

        {/* Modal thêm/sửa danh mục */}
        <Modal
          title={selectedCategory ? "Chỉnh sửa danh mục biểu mẫu" : "Thêm danh mục biểu mẫu mới"}
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
              name="code"
              label="Mã danh mục"
              rules={[{ required: true, message: 'Vui lòng nhập mã danh mục' }]}
            >
              <Input placeholder="Nhập mã danh mục" />
            </Form.Item>
            
            <Form.Item
              name="name"
              label="Tên danh mục"
              rules={[{ required: true, message: 'Vui lòng nhập tên danh mục' }]}
            >
              <Input placeholder="Nhập tên danh mục" />
            </Form.Item>
            
            <Form.Item
              name="description"
              label="Mô tả"
            >
              <Input.TextArea placeholder="Nhập mô tả danh mục" rows={4} />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </App>
  );
} 