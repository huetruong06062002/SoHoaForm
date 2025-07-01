import { useState, useEffect } from 'react';
import { Typography, Card, Table, Button, Space, Modal, Form, Input, App, Row, Col, Tag, Divider, Select, List, Descriptions, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ExclamationCircleOutlined, CaretDownOutlined, FolderOutlined, EyeOutlined, FileTextOutlined } from '@ant-design/icons';
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
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [categoryDetails, setCategoryDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

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

  // Xử lý xem chi tiết danh mục
  const handleViewDetails = async (id) => {
    try {
      setLoadingDetails(true);
      const response = await apiService.formCategory.getById(id);
      
      if (response && response.data) {
        setCategoryDetails(response.data);
        setDetailsModalVisible(true);
      }
    } catch (error) {
      console.error('Error fetching category details:', error);
      message.error('Có lỗi xảy ra khi tải thông tin chi tiết danh mục');
    } finally {
      setLoadingDetails(false);
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
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
            {record.children && record.children.length > 0 ? (
              <FolderOutlined style={{ color: '#1890ff', fontSize: '16px', marginRight: 4 }} />
            ) : (
              <FolderOutlined style={{ color: '#52c41a', fontSize: '16px', marginRight: 4 }} />
            )}
            {record.children && record.children.length > 0 && (
              <div style={{ cursor: 'pointer' }} 
                   onClick={() => handleExpand(!expandedKeys.includes(record.id), record)}>
                {expandedKeys.includes(record.id) ? (
                  <CaretDownOutlined style={{ fontSize: '12px' }} />
                ) : (
                  <CaretDownOutlined rotate={-90} style={{ fontSize: '12px' }} />
                )}
              </div>
            )}
          </div>
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
      width: '25%',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            ghost
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record.id)}
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
            onClick={() => handleDelete(record.id, record.hasChildren)}
            disabled={record.hasChildren}
            title={record.hasChildren ? "Không thể xóa danh mục có danh mục con" : ""}
            style={{ borderRadius: '4px' }}
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
            <FolderOutlined style={{ marginRight: 8, color: '#52c41a' }} />}
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
      <div style={{ padding: '24px', backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
        <Card bordered={false} style={{ borderRadius: '8px', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <Title level={4} style={{ margin: 0, fontWeight: 600 }}>Quản lý danh mục biểu mẫu</Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddEdit}
              size="middle"
              style={{ borderRadius: '6px', fontWeight: 500, height: '38px' }}
            >
              Thêm danh mục mới
            </Button>
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <Row gutter={16} style={{ marginBottom: '20px' }}>
              <Col xs={24} sm={12} md={8} lg={6}>
                <Search
                  placeholder="Tìm kiếm danh mục"
                  allowClear
                  enterButton={<Button type="primary" icon={<SearchOutlined />}>Tìm kiếm</Button>}
                  onSearch={handleSearch}
                  onChange={(e) => setSearchText(e.target.value)}
                  value={searchText}
                  size="large"
                  style={{ width: '100%', borderRadius: '6px' }}
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
                expandIcon: () => null
              }}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `Tổng số ${total} danh mục`,
                pageSizeOptions: ['10', '20', '50', '100'],
                position: ['bottomRight'],
                style: { marginTop: '16px' }
              }}
              style={{ 
                borderRadius: '8px', 
                overflow: 'hidden'
              }}
              rowClassName={(record) => record.id === selectedCategory?.id ? 'ant-table-row-selected' : ''}
              size="middle"
              className="custom-category-table"
            />
          </div>
        </Card>

        {/* Modal thêm/sửa danh mục */}
        <Modal
          title={selectedCategory ? "Chỉnh sửa danh mục biểu mẫu" : "Thêm danh mục biểu mẫu mới"}
          open={modalVisible}
          onOk={handleSubmit}
          onCancel={() => setModalVisible(false)}
          width={600}
          confirmLoading={loading}
          style={{ top: 20 }}
          okText={selectedCategory ? "Cập nhật" : "Thêm mới"}
          cancelText="Hủy"
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
              <Input placeholder="Nhập tên danh mục" size="large" />
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
                size="large"
              >
                {renderCategoryOptions(getAvailableParentCategories())}
              </Select>
            </Form.Item>
          </Form>
        </Modal>
        
        {/* Modal xem chi tiết danh mục */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
              <span>Chi tiết danh mục biểu mẫu</span>
            </div>
          }
          open={detailsModalVisible}
          onCancel={() => setDetailsModalVisible(false)}
          width={700}
          footer={[
            <Button key="close" type="primary" onClick={() => setDetailsModalVisible(false)}>
              Đóng
            </Button>
          ]}
          style={{ top: 20 }}
        >
          {loadingDetails ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" />
              <div style={{ marginTop: '16px', color: '#1890ff' }}>Đang tải thông tin chi tiết...</div>
            </div>
          ) : categoryDetails ? (
            <div style={{ padding: '8px 0' }}>
              <Descriptions 
                bordered 
                column={1} 
                size="middle"
                labelStyle={{ fontWeight: 500, backgroundColor: '#f5f7fa' }}
                contentStyle={{ backgroundColor: '#fff' }}
                style={{ marginBottom: '24px' }}
              >
                <Descriptions.Item label="Tên danh mục">{categoryDetails.categoryName}</Descriptions.Item>
                <Descriptions.Item label="Đường dẫn">{categoryDetails.path}</Descriptions.Item>
                <Descriptions.Item label="Danh mục cha">{categoryDetails.parentCategoryName || 'Không có'}</Descriptions.Item>
                <Descriptions.Item label="Số lượng con">{categoryDetails.childrenCount}</Descriptions.Item>
                <Descriptions.Item label="Số lượng biểu mẫu">{categoryDetails.formsCount}</Descriptions.Item>
                <Descriptions.Item label="Cấp">{categoryDetails.level}</Descriptions.Item>
                <Descriptions.Item label="Danh mục gốc">
                  {categoryDetails.isRoot ? 
                    <Tag color="green" style={{ margin: 0 }}>Là danh mục gốc</Tag> : 
                    <Tag color="orange" style={{ margin: 0 }}>Không là danh mục gốc</Tag>}
                </Descriptions.Item>
              </Descriptions>
              
              {categoryDetails.children && categoryDetails.children.length > 0 && (
                <>
                  <Divider orientation="left" style={{ color: '#1890ff', fontWeight: 500 }}>
                    <FolderOutlined /> Danh mục con ({categoryDetails.children.length})
                  </Divider>
                  <List
                    dataSource={categoryDetails.children}
                    renderItem={item => (
                      <List.Item style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#f5f7fa', marginBottom: '8px' }}>
                        <FolderOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                        <span style={{ fontWeight: 500 }}>{item.categoryName}</span>
                      </List.Item>
                    )}
                    style={{ marginBottom: '24px' }}
                  />
                </>
              )}
              
              {categoryDetails.forms && categoryDetails.forms.length > 0 && (
                <>
                  <Divider orientation="left" style={{ color: '#1890ff', fontWeight: 500 }}>
                    <FileTextOutlined /> Biểu mẫu thuộc danh mục ({categoryDetails.forms.length})
                  </Divider>
                  <List
                    itemLayout="horizontal"
                    dataSource={categoryDetails.forms}
                    renderItem={item => (
                      <List.Item
                        style={{ padding: '16px', borderRadius: '6px', backgroundColor: '#f5f7fa', marginBottom: '8px' }}
                        actions={[
                          <Tag color={item.status === 'Active' ? 'green' : 'red'} style={{ margin: 0 }}>{item.status}</Tag>
                        ]}
                      >
                        <List.Item.Meta
                          avatar={<FileTextOutlined style={{ fontSize: 24, color: '#1890ff', backgroundColor: '#e6f7ff', padding: '8px', borderRadius: '4px' }} />}
                          title={<span style={{ fontWeight: 500, fontSize: '16px' }}>{item.name}</span>}
                          description={
                            <div style={{ fontSize: '13px', color: '#666' }}>
                              <div>Số trường: <Tag color="blue" style={{ marginRight: 8 }}>{item.fieldsCount}</Tag></div>
                              <div style={{ marginTop: '4px' }}>Tạo lúc: {new Date(item.createdAt).toLocaleString()}</div>
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
              <FileTextOutlined style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px', display: 'block' }} />
              Không có thông tin chi tiết
            </div>
          )}
        </Modal>
      </div>
      <style jsx global>{`
        .custom-category-table .ant-table-thead > tr > th {
          background-color: #f5f7fa;
          font-weight: 600;
        }
        .ant-table-row-selected > td {
          background-color: #e6f7ff;
        }
        .ant-pagination-item-active {
          border-color: #1890ff;
        }
      `}</style>
    </App>
  );
} 