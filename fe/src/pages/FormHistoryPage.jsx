import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Table, Tag, message, Spin, Space, Tooltip } from 'antd';
import { ArrowLeftOutlined, EyeOutlined, DownloadOutlined, CalendarOutlined } from '@ant-design/icons';
import formService from '../services/formService';
import AppLayout from '../components/layout/AppLayout';
import './FormHistoryPage.css';

const FormHistoryPage = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [formInfo, setFormInfo] = useState(null);
  const [historyData, setHistoryData] = useState([]);

  useEffect(() => {
    fetchData();
  }, [formId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch form info
      const formInfoResponse = await formService.getFormInfo(formId);
      setFormInfo(formInfoResponse.data);
      
      // Mock history data - replace with actual API call
      const mockHistory = [
        {
          id: '1',
          submissionDate: '2025-06-14T10:30:00',
          submittedBy: 'Nguyễn Văn A',
          status: 'completed',
          version: '1.0',
          fileSize: '2.5 MB'
        },
        {
          id: '2',
          submissionDate: '2025-06-13T15:45:00',
          submittedBy: 'Trần Thị B',
          status: 'pending',
          version: '1.0',
          fileSize: '1.8 MB'
        },
        {
          id: '3',
          submissionDate: '2025-06-12T09:15:00',
          submittedBy: 'Lê Văn C',
          status: 'completed',
          version: '1.0',
          fileSize: '3.2 MB'
        }
      ];
      setHistoryData(mockHistory);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleViewSubmission = (record) => {
    message.info(`Xem chi tiết submission ${record.id}`);
    // Navigate to submission detail page
    // navigate(`/submission/${record.id}`);
  };

  const handleDownloadPDF = (record) => {
    message.info(`Tải xuống PDF submission ${record.id}`);
    // Download PDF logic
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const getStatusTag = (status) => {
    const statusConfig = {
      completed: { color: 'green', text: 'Hoàn thành' },
      pending: { color: 'orange', text: 'Đang xử lý' },
      rejected: { color: 'red', text: 'Từ chối' }
    };
    
    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Ngày nộp',
      dataIndex: 'submissionDate',
      key: 'submissionDate',
      render: (date) => (
        <div className="date-cell">
          <CalendarOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          {formatDate(date)}
        </div>
      ),
    },
    {
      title: 'Người nộp',
      dataIndex: 'submittedBy',
      key: 'submittedBy',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Phiên bản',
      dataIndex: 'version',
      key: 'version',
      width: 100,
    },
    {
      title: 'Kích thước',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 120,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewSubmission(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Tải xuống PDF">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={() => handleDownloadPDF(record)}
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="form-history-page">
        <Spin spinning={loading}>
          <div className="page-header">
            <div className="header-left">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/allForm')}
                className="back-btn"
              >
                Quay lại
              </Button>
              <div className="header-info">
                <h1 className="page-title">Lịch sử điền form</h1>
                {formInfo && (
                  <p className="form-name">{formInfo.formName}</p>
                )}
              </div>
            </div>
            <div className="header-actions">
              <Button
                type="primary"
                onClick={() => navigate(`/preview-form/${formId}`)}
              >
                Điền form mới
              </Button>
            </div>
          </div>

          <div className="history-content">
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-number">{historyData.length}</div>
                <div className="stat-label">Tổng số lần nộp</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">
                  {historyData.filter(item => item.status === 'completed').length}
                </div>
                <div className="stat-label">Đã hoàn thành</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">
                  {historyData.filter(item => item.status === 'pending').length}
                </div>
                <div className="stat-label">Đang xử lý</div>
              </div>
            </div>

            <div className="table-container">
              <Table
                columns={columns}
                dataSource={historyData}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) =>
                    `${range[0]}-${range[1]} của ${total} bản ghi`,
                }}
                locale={{
                  emptyText: 'Chưa có lịch sử nộp form nào'
                }}
              />
            </div>
          </div>
        </Spin>
      </div>
    </AppLayout>
  );
};

export default FormHistoryPage; 