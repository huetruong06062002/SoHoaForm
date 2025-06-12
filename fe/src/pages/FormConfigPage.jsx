import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Table, Button, Typography, message, Card, Row, Col, Tag, Checkbox, Space } from 'antd';
import { CaretRightOutlined, CaretDownOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '../components/layout/AppLayout';
import formService from '../services/formService';
import '../styles/FormConfig.css';

const { Title } = Typography;

const FormConfigPage = () => {
  const { formId } = useParams();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(null);
  const [fields, setFields] = useState([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);

  const fetchFormConfig = async () => {
    try {
      setLoading(true);
      const response = await formService.getFormFields(formId);
      if (response.statusCode === 200) {
        setFormData(response.data);
        setFields(response.data.fields);
      } else {
        message.error('Không thể tải thông tin cấu hình form');
      }
    } catch (error) {
      console.error('Error fetching form config:', error);
      message.error('Đã có lỗi xảy ra khi tải thông tin cấu hình form');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (formId) {
      fetchFormConfig();
    }
  }, [formId]);

  const getFieldTypeTag = (type) => {
    switch (type) {
      case 'Text':
      case 'Textarea':
        return <Tag color="blue">Văn bản</Tag>;
      case 'Number':
        return <Tag color="success">Số</Tag>;
      case 'Date':
        return <Tag color="warning">Ngày tháng</Tag>;
      case 'Boolean':
        return <Tag color="purple">Đúng/Sai</Tag>;
      default:
        return <Tag>{type}</Tag>;
    }
  };

  const handleExpand = (expanded, record) => {
    setExpandedRowKeys(expanded ? [record.formFieldId] : []);
  };

  const expandedRowRender = (record) => {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <div style={{ padding: '12px' }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {(record.fieldType === 'Text' || record.fieldType === 'Textarea') && (
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <Checkbox checked={record.isUpperCase}>Bắt buộc nhập chữ hoa</Checkbox>
                </motion.div>
              )}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Checkbox checked={record.isRequired}>Bắt buộc nhập</Checkbox>
              </motion.div>
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Button type="primary" size="small">Lưu cấu hình</Button>
              </motion.div>
            </Space>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  };

  const leftColumns = [
    {
      title: 'Tên biến',
      dataIndex: 'fieldName',
      key: 'fieldName',
      width: '60%',
    },
    {
      title: '',
      dataIndex: 'fieldType',
      key: 'fieldType',
      width: '40%',
      render: (type) => getFieldTypeTag(type),
    },
  ];

  const rightColumns = [
    {
      title: 'STT',
      dataIndex: 'index',
      key: 'index',
      width: 60,
      render: (_, __, index) => index + 1,
      align: 'left',
    },
    {
      title: 'Tên biến',
      dataIndex: 'fieldName',
      key: 'fieldName',
      width: '30%',
    },
    {
      title: 'Loại',
      dataIndex: 'fieldType',
      key: 'fieldType',
      width: '20%',
      render: (type) => getFieldTypeTag(type),
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      render: (_, record) => {
        let description = '';
        if (record.fieldType?.toLowerCase() === 'boolean') {
          description = 'Lựa chọn (Có/Không)';
        } else if (record.fieldType?.toLowerCase() === 'number') {
          description = 'Nhập số';
        } else if (record.fieldType?.toLowerCase() === 'date') {
          description = 'Ngày tháng';
        } else {
          description = 'Văn bản tự do';
        }
        return `${description} ${record.isRequired ? '(Bắt buộc)' : ''}`;
      },
    },
  ];

  return (
    <AppLayout>
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Title level={3} style={{ margin: 0 }}>Danh mục: {formData?.formName}</Title>
        </div>

        <Row gutter={16}>
          <Col span={10}>
            <Card 
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Danh sách biến ({fields.length})</span>
                  <Button type="primary" size="small">Lưu tất cả</Button>
                </div>
              }
              bodyStyle={{ padding: 0 }}
            >
              <Table
                columns={leftColumns}
                dataSource={fields}
                rowKey="formFieldId"
                pagination={false}
                size="small"
                loading={loading}
                expandable={{
                  expandedRowRender,
                  expandedRowKeys,
                  onExpand: handleExpand,
                  expandIcon: ({ expanded, onExpand, record }) =>
                    expanded ? (
                      <CaretDownOutlined onClick={e => onExpand(record, e)} />
                    ) : (
                      <CaretRightOutlined onClick={e => onExpand(record, e)} />
                    )
                }}
                scroll={{ y: 'calc(100vh - 250px)' }}
                style={{ height: 'calc(100vh - 200px)' }}
              />
            </Card>
          </Col>
          <Col span={14}>
            <Card 
              title={
                <div className="preview-header">
                  Xem trước form và các biến
                </div>
              }
              className="preview-table"
              bodyStyle={{ padding: 0 }}
            >
              <Table
                columns={rightColumns}
                dataSource={fields}
                rowKey="formFieldId"
                pagination={false}
                size="small"
                loading={loading}
                scroll={{ y: 'calc(100vh - 250px)' }}
                className="preview-table-content"
              />
            </Card>
          </Col>
        </Row>
      </div>
    </AppLayout>
  );
};

export default FormConfigPage; 