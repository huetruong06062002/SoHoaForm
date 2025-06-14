import { useEffect, useState } from 'react';
import { Button, Input, Spin, Card, Tag, message, Row, Col } from 'antd';
import { SearchOutlined, FileTextOutlined, CalendarOutlined, UserOutlined, HistoryOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import formService from '../services/formService';
import AppLayout from '../components/layout/AppLayout';
import './AllFormPage.css';

const { Search } = Input;

const AllFormPage = () => {
  const [loading, setLoading] = useState(true);
  const [allForms, setAllForms] = useState([]);
  const [categorizedForms, setCategorizedForms] = useState([]);
  const [filteredForms, setFilteredForms] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchText, setSearchText] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [allFormsResponse, categorizedResponse] = await Promise.all([
        formService.getAllForms(),
        formService.getFormsByCategory()
      ]);

      setAllForms(allFormsResponse.data || []);
      setCategorizedForms(categorizedResponse.data?.categories || []);
      setFilteredForms(allFormsResponse.data || []);
    } catch (error) {
      console.error('Error fetching forms:', error);
      message.error('Lỗi khi tải danh sách form');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryFilter = (categoryName) => {
    setSelectedCategory(categoryName);
    filterForms(categoryName, searchText);
  };

  const handleSearch = (value) => {
    setSearchText(value);
    filterForms(selectedCategory, value);
  };

  const filterForms = (category, search) => {
    let filtered = allForms;

    // Filter by category
    if (category !== 'all') {
      filtered = filtered.filter(form => form.categoryName === category);
    }

    // Filter by search text
    if (search) {
      filtered = filtered.filter(form => 
        form.formName.toLowerCase().includes(search.toLowerCase()) ||
        form.categoryName.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredForms(filtered);
  };

  const handleFillForm = (formId) => {
    navigate(`/preview-form/${formId}`);
  };

  const handleViewHistory = (formId) => {
    navigate(`/form-history/${formId}`);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const getTotalForms = () => {
    return categorizedForms.reduce((total, category) => total + category.formCount, 0);
  };

  return (
    <AppLayout>
      <div className="all-form-page">
        <div className="page-header">
          <div className="header-content">
            <h1 className="page-title">Điền biểu mẫu</h1>
            <p className="page-description">Chọn biểu mẫu để điền thông tin</p>
          </div>
          <div className="header-stats">
            <div className="stat-item">
              <span className="stat-number">{categorizedForms.length}</span>
              <span className="stat-label">Danh mục</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{getTotalForms()}</span>
              <span className="stat-label">Biểu mẫu</span>
            </div>
          </div>
        </div>

        <Spin spinning={loading}>
          <div className="filter-section">
            <div className="search-bar">
              <Search
                placeholder="Tìm kiếm biểu mẫu..."
                allowClear
                enterButton={<SearchOutlined />}
                size="large"
                onSearch={handleSearch}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>

            <div className="category-filters">
              <Button
                type={selectedCategory === 'all' ? 'primary' : 'default'}
                onClick={() => handleCategoryFilter('all')}
                className="category-btn"
              >
                Tất cả ({allForms.length})
              </Button>
              {categorizedForms.map(category => (
                <Button
                  key={category.categoryId}
                  type={selectedCategory === category.categoryName ? 'primary' : 'default'}
                  onClick={() => handleCategoryFilter(category.categoryName)}
                  className="category-btn"
                >
                  {category.categoryName} ({category.formCount})
                </Button>
              ))}
            </div>
          </div>

          <div className="forms-grid">
            <Row gutter={[16, 16]}>
              {filteredForms.map(form => (
                <Col xs={24} sm={12} md={8} lg={6} key={form.formId}>
                  <Card
                    className="form-card"
                    hoverable
                    actions={[
                      <Button
                        type="primary"
                        icon={<FileTextOutlined />}
                        onClick={() => handleFillForm(form.formId)}
                        block
                      >
                        Điền form
                      </Button>,
                      <Button
                        type="default"
                        icon={<HistoryOutlined />}
                        onClick={() => handleViewHistory(form.formId)}
                        block
                      >
                        Xem lịch sử
                      </Button>
                    ]}
                  >
                    <div className="form-card-content">
                      <div className="form-icon">
                        <FileTextOutlined />
                      </div>
                      <h3 className="form-title">{form.formName}</h3>
                      <div className="form-meta">
                        <Tag color="blue" className="category-tag">
                          {form.categoryName}
                        </Tag>
                        <div className="form-date">
                          <CalendarOutlined />
                          <span>{formatDate(form.dateCreated)}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>

            {filteredForms.length === 0 && !loading && (
              <div className="empty-state">
                <FileTextOutlined className="empty-icon" />
                <h3>Không tìm thấy biểu mẫu</h3>
                <p>Thử thay đổi từ khóa tìm kiếm hoặc danh mục</p>
              </div>
            )}
          </div>
        </Spin>
      </div>
    </AppLayout>
  );
};

export default AllFormPage; 