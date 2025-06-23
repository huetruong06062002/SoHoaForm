import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Table, Tag, message, Spin, Space, Tooltip } from 'antd';
import { ArrowLeftOutlined, EyeOutlined, DownloadOutlined, CalendarOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import formService from '../services/formService';
import AppLayout from '../components/layout/AppLayout';
import './FormHistoryPage.css';
import moment from 'moment';

const FormHistoryPage = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState([]);
  const [formInfo, setFormInfo] = useState(null);

  useEffect(() => {
    fetchHistoryData();
  }, [formId]);

  const fetchHistoryData = async () => {
    setLoading(true);
    try {
      // Fetch form info và history data
      const [formInfoResponse, historyResponse] = await Promise.all([
        formService.getFormInfo(formId),
        formService.getFormHistory(formId)
      ]);

      setFormInfo(formInfoResponse.data);
      setHistoryData(historyResponse.data?.userFillFormIds || []);
    } catch (error) {
      console.error('Error fetching history:', error);
      message.error('Lỗi khi tải lịch sử form');
    } finally {
      setLoading(false);
    }
  };

  const handleViewSubmission = (record) => {
    // Navigate to view specific submission
    navigate(`/form-submission/${record.userFillFormId}`);
  };

  const handleDownloadPDF = (record) => {
    message.info(`Tải xuống PDF submission ${record.userFillFormId}`);
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
      dataIndex: 'index',
      key: 'index',
      width: 60,
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Ngày điền',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => moment(date).format('HH:mm:ss DD/MM/YYYY'),
    },
    {
      title: 'Ngày hoàn tất',
      dataIndex: 'dateFinish',
      key: 'dateFinish',
      render: (date) => date ? moment(date).format('HH:mm:ss DD/MM/YYYY') : 'Chưa hoàn tất',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'Draft' ? 'orange' : 'green'}>
          {status === 'Draft' ? 'Đã điền' : 'Hoàn tất'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/view-filled-form/${record.userFillFormId}`)}
        >
          Xem
        </Button>
      ),
    },
  ];



  return (
    <AppLayout>
      <div className="form-history-page">
        <div className="page-header">
          <div className="header-left">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/manage-form')}
              style={{ marginRight: 16 }}
            >
              Quay lại
            </Button>
            <div className="page-title">
              <h2>Lịch sử điền form</h2>
              {formInfo && (
                <div className="form-info">
                  <span>Form: {formInfo.formName}</span>
                  <span>Danh mục: {formInfo.categoryName}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="history-content">
          <div className="table-header">
            <h3>Danh sách lần điền form</h3>
          </div>
          
          <Spin spinning={loading}>
            <Table
              columns={columns}
              dataSource={historyData}
              rowKey="userFillFormId"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `Tổng ${total} lần điền`,
              }}
              locale={{
                emptyText: 'Chưa có lịch sử điền form',
              }}
            />
          </Spin>
        </div>
      </div>
    </AppLayout>
  );
};

export default FormHistoryPage; 