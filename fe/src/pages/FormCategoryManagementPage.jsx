import { useState, useEffect } from 'react';
import { Typography, Card, Table, Button, Space, Modal, Form, Input, App, Row, Col, Tag, Divider, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ExclamationCircleOutlined, CaretRightOutlined, FolderOutlined, FileOutlined } from '@ant-design/icons';
import apiService from '../services/apiService';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

export default function FormCategoryManagementPage() {
  const { message, modal } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]); // Lưu tất cả danh mục để chọn parent
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [form] = Form.useForm();

  // Fetch danh mục biểu mẫu
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await apiService.formCategory.getAll();
      
      console.log('API Response:', response);
      
      if (response && response.data) {
        // Lưu tất cả danh mục
        setAllCategories(response.data);
        
        // Chuẩn bị dữ liệu cho bảng
        const processedData = processData(response.data);
        setCategories(processedData);
        
        // Mở rộng các danh mục có con
        const keys = findCategoriesWithChildren(response.data);
        setExpandedKeys(keys);
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

  // Xử lý dữ liệu để hiển thị theo cấu trúc cây
  const processData = (data) => {
    return data.map(item => {
      const newItem = { ...item, key: item.id };
      
      if (item.children && item.children.length > 0) {
        newItem.children = processData(item.children);
      }
      
      return newItem;
    });
  };

  // Tìm các danh mục có con để mở rộng mặc định
  const findCategoriesWithChildren = (data) => {
    let keys = [];
    
    data.forEach(item => {
      if (item.children && item.children.length > 0) {
        keys.push(item.id);
        keys = [...keys, ...findCategoriesWithChildren(item.children)];
      }
    });
    
    return keys;
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Xử lý tìm kiếm
  const handleSearch = (value) => {
    setSearchText(value);
    
    if (!value) {
      fetchCategories();
      return;
    }
    
    // Tìm kiếm trong danh mục
    const searchInCategories = (categories, keyword) => {
      const result = [];
      
      categories.forEach(category => {
        if (category.categoryName.toLowerCase().includes(keyword.toLowerCase())) {
          // Nếu tìm thấy, thêm vào kết quả
          result.push({ ...category, key: category.id });
        }
        
        // Tìm kiếm trong danh mục con
        if (category.children && category.children.length > 0) {
          const childResults = searchInCategories(category.children, keyword);
          if (childResults.length > 0) {
            // Nếu có kết quả từ danh mục con, thêm danh mục cha và kết quả con
            const found = result.find(r => r.id === category.id);
            if (!found) {
              result.push({
                ...category,
                key: category.id,
                children: childResults
              });
            } else {
              // Nếu danh mục cha đã có, chỉ thêm con
              found.children = childResults;
            }
          }
        }
      });
      
      return result;
    };
    
    const searchResults = searchInCategories(allCategories, value);
    setCategories(searchResults);
    
    // Mở rộng tất cả kết quả tìm kiếm
    const allKeys = searchResults.map(item => item.id);
    setExpandedKeys(allKeys);
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
      categoryName: category.categoryName,
      parentCategoryId: category.parentCategoryId,
      description: category.description
    });
    setModalVisible(true);
  };

  // Xử lý xóa danh mục
  const handleDelete = (id, hasChildren) => {
    if (hasChildren) {
      message.warning('Không thể xóa danh mục có danh mục con');
      return;
    }
    
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
          const response = await apiService.formCategory.delete(id);
          
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
      
      // Chuẩn bị dữ liệu gửi lên API
      const categoryData = {
        categoryName: values.categoryName,
        parentCategoryId: values.parentCategoryId || null
      };
      
      console.log('Sending data to API:', categoryData);
      
      if (selectedCategory) {
        // Cập nhật danh mục
        const response = await apiService.formCategory.update(selectedCategory.id, categoryData);
        if (response) {
          message.success('Cập nhật danh mục biểu mẫu thành công');
        }
      } else {
        // Tạo mới danh mục
        const response = await apiService.formCategory.create(categoryData);
        if (response) {
          message.success('Thêm danh mục biểu mẫu thành công');
        }
      }
      
      setModalVisible(false);
      form.resetFields();
      fetchCategories();
    } catch (error) {
      console.error('Error submitting form:', error);
      message.error('Có lỗi xảy ra khi lưu thông tin danh mục biểu mẫu');
    } finally {
      setLoading(false);
    }
  };

  // Xử lý mở rộng/thu gọn danh mục
  const handleExpand = (expanded, record) => {
    if (expanded) {
      setExpandedKeys([...expandedKeys, record.id]);
    } else {
      setExpandedKeys(expandedKeys.filter(key => key !== record.id));
    }
  };

  // Cấu hình cột cho bảng
  const columns = [
    {
      title: 'Tên danh mục',
      dataIndex: 'categoryName',
      key: 'categoryName',
      width: '40%',
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {record.children && record.children.length > 0 ? (
            <FolderOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          ) : (
            <FileOutlined style={{ marginRight: 8, color: '#52c41a' }} />
          )}
          <span>{text}</span>
          {record.hasChildren && (
            <Tag color="blue" style={{ marginLeft: 8 }}>
              {record.childrenCount} danh mục con
            </Tag>
          )}
        </div>
      )
    },
    {
      title: 'Đường dẫn',
      dataIndex: 'path',
      key: 'path',
      width: '30%',
      render: (path) => {
        if (!path) return '-';
        
        return path.split(' > ').map((part, index, array) => (
          <span key={index}>
            {part}
            {index < array.length - 1 && <span style={{ margin: '0 4px', color: '#1890ff' }}>&gt;</span>}
          </span>
        ));
      }
    },
    {
      title: 'Số biểu mẫu',
      dataIndex: 'formsCount',
      key: 'formsCount',
      width: '10%',
      render: (count) => count || 0
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
            onClick={() => handleDelete(record.id, record.hasChildren)}
            disabled={record.hasChildren}
            title={record.hasChildren ? "Không thể xóa danh mục có danh mục con" : ""}
          >
            Xóa
          </Button>
        </Space>
      ),
    },
  ];

  // Hàm lấy danh sách danh mục có thể chọn làm parent (tránh chọn chính nó hoặc con của nó)
  const getAvailableParentCategories = () => {
    if (!selectedCategory) return allCategories;
    
    // Lọc ra các danh mục không phải là chính nó hoặc con của nó
    const getChildrenIds = (category) => {
      let ids = [category.id];
      if (category.children && category.children.length > 0) {
        category.children.forEach(child => {
          ids = [...ids, ...getChildrenIds(child)];
        });
      }
      return ids;
    };
    
    // Tìm danh mục hiện tại trong allCategories
    const findCategory = (categories, id) => {
      for (const category of categories) {
        if (category.id === id) return category;
        if (category.children && category.children.length > 0) {
          const found = findCategory(category.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    
    const currentCategory = findCategory(allCategories, selectedCategory.id);
    if (!currentCategory) return allCategories;
    
    const excludedIds = getChildrenIds(currentCategory);
    
    // Làm phẳng tất cả danh mục và loại bỏ các ID đã loại trừ
    const flattenCategories = (categories, excluded) => {
      let result = [];
      categories.forEach(category => {
        if (!excluded.includes(category.id)) {
          result.push(category);
        }
        if (category.children && category.children.length > 0) {
          result = [...result, ...flattenCategories(category.children, excluded)];
        }
      });
      return result;
    };
    
    return flattenCategories(allCategories, excludedIds);
  };

  // Chuẩn bị options cho dropdown chọn parent
  const renderCategoryOptions = (categories, level = 0) => {
    const result = [];
    
    categories.forEach(category => {
      // Thêm indent để thể hiện cấp độ
      const indent = '—'.repeat(level);
      const prefix = level > 0 ? indent + ' ' : '';
      
      result.push(
        <Option key={category.id} value={category.id}>
          {(category.children && category.children.length > 0) ? 
            <FolderOutlined style={{ marginRight: 8, color: '#1890ff' }} /> : 
            <FileOutlined style={{ marginRight: 8, color: '#52c41a' }} />}
          {prefix + category.categoryName}
        </Option>
      );
      
      // Đệ quy với các danh mục con
      if (category.children && category.children.length > 0) {
        result.push(...renderCategoryOptions(category.children, level + 1));
      }
    });
    
    return result;
  };

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
            expandable={{
              expandedRowKeys: expandedKeys,
              onExpand: handleExpand,
              expandIcon: ({ expanded, onExpand, record }) => 
                record.children && record.children.length > 0 ? (
                  expanded ? (
                    <Button 
                      type="text" 
                      icon={<CaretRightOutlined rotate={90} />} 
                      size="small"
                      onClick={e => onExpand(record, e)}
                      style={{ marginRight: 8 }}
                    />
                  ) : (
                    <Button 
                      type="text" 
                      icon={<CaretRightOutlined />} 
                      size="small"
                      onClick={e => onExpand(record, e)}
                      style={{ marginRight: 8 }}
                    />
                  )
                ) : <span style={{ width: 24, display: 'inline-block' }}></span>
            }}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Tổng số ${total} danh mục`
            }}
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
              name="categoryName"
              label="Tên danh mục"
              rules={[{ required: true, message: 'Vui lòng nhập tên danh mục' }]}
            >
              <Input placeholder="Nhập tên danh mục" />
            </Form.Item>
            
            <Form.Item
              name="parentCategoryId"
              label="Danh mục cha"
            >
              <Select
                placeholder="Chọn danh mục cha (không bắt buộc)"
                allowClear
                showSearch
                optionFilterProp="children"
                style={{ width: '100%' }}
              >
                {renderCategoryOptions(getAvailableParentCategories())}
              </Select>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </App>
  );
} 