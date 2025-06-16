import { Table, Button, Typography, Modal, Form, Input, Upload, App } from 'antd';
import { PlusOutlined, UploadOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import formService from '../services/formService';
import dayjs from 'dayjs';

const { Title } = Typography;

const ManageFormPage = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [forms, setForms] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deletingForm, setDeletingForm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const response = await formService.getAllForms();
      if (response.statusCode === 200) {
        // Transform the data to match table structure
        const transformedData = response.data.map(form => ({
          key: form.formId,
          name: form.formName,
          category: form.categoryName,
          createdAt: dayjs(form.dateCreated).format('DD/MM/YYYY HH:mm'),
        }));
        setForms(transformedData);
      } else {
        message.error('Không thể tải danh sách form');
      }
    } catch (error) {
      console.error('Error fetching forms:', error);
      // Không hiển thị message ở đây vì axios interceptor đã xử lý
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, []);

  const handleCreateForm = async (values) => {
    try {
      setSubmitting(true);
      const formData = new FormData();
      
      // Đảm bảo gửi đúng tên field và dữ liệu
      if (!values.name) {
        message.error('Tên form là bắt buộc');
        return;
      }
      if (!values.categoryName) {
        message.error('Tên danh mục là bắt buộc');
        return;
      }
      if (!values.wordFile?.[0]?.originFileObj) {
        message.error('Vui lòng chọn file');
        return;
      }

      formData.append('Name', values.name.trim());
      formData.append('CategoryName', values.categoryName.trim());
      formData.append('WordFile', values.wordFile[0].originFileObj);

      console.log('FormData content:');
      for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }

      const response = await formService.createForm(formData);
      
      if (response.statusCode === 200) {
        message.success(response.message || 'Tạo form thành công');
        setIsModalVisible(false);
        form.resetFields();
        fetchForms();
      }
    } catch (error) {
      console.error('Error creating form:', error);
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        Object.entries(errors).forEach(([key, messages]) => {
          if (Array.isArray(messages)) {
            messages.forEach(msg => message.error(msg));
          }
        });
      } else if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('Đã có lỗi xảy ra khi tạo form');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const showDeleteModal = (formId, formName) => {
    setDeletingForm({ id: formId, name: formName });
    setIsDeleteModalVisible(true);
  };

  const handleDeleteForm = async () => {
    try {
      setDeleteLoading(true);
      const response = await formService.deleteForm(deletingForm.id);
      if (response.statusCode === 200) {
        message.success(response.message || 'Xóa form thành công');
        setIsDeleteModalVisible(false);
        setDeletingForm(null);
        fetchForms(); // Reload danh sách form
      }
    } catch (error) {
      console.error('Error deleting form:', error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('Đã có lỗi xảy ra khi xóa form');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteModalVisible(false);
    setDeletingForm(null);
  };

  const columns = [
    {
      title: 'Tên',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Danh mục',
      dataIndex: 'category',
      key: 'category',
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button 
            type="primary"
            onClick={() => navigate(`/form-config/${record.key}`)}
          >
            Cấu hình biến
          </Button>
          <Button 
            style={{ backgroundColor: '#52c41a', color: 'white' }}
            onClick={() => navigate(`/preview-form/${record.key}`)}
          >
            Xem trước
          </Button>
          <Button 
            style={{ backgroundColor: '#722ed1', color: 'white' }}
            onClick={() => navigate(`/form-history/${record.key}`)}
          >
            Xem lịch sử
          </Button>
          <Button 
            danger
            icon={<DeleteOutlined />}
            onClick={() => showDeleteModal(record.key, record.name)}
          >
            Xóa
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <div style={{ padding: '24px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <Title level={2} style={{ margin: 0 }}>Quản lý form</Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setIsModalVisible(true)}
          >
            Tạo form
          </Button>
        </div>
        <Table 
          columns={columns} 
          dataSource={forms}
          pagination={{ pageSize: 10 }}
          loading={loading}
        />

        {/* Modal tạo form mới */}
        <Modal
          title="Tạo form mới"
          open={isModalVisible}
          onCancel={() => {
            setIsModalVisible(false);
            form.resetFields();
          }}
          footer={null}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateForm}
            validateMessages={{
              required: '${label} là bắt buộc'
            }}
          >
            <Form.Item
              name="name"
              label="Tên form"
              rules={[{ required: true }]}
            >
              <Input placeholder="Nhập tên form" />
            </Form.Item>

            <Form.Item
              name="categoryName"
              label="Tên danh mục"
              rules={[{ required: true }]}
            >
              <Input placeholder="Nhập tên danh mục" />
            </Form.Item>

            <Form.Item
              name="wordFile"
              label="File Word"
              rules={[{ required: true }]}
              valuePropName="fileList"
              getValueFromEvent={(e) => {
                if (Array.isArray(e)) {
                  return e;
                }
                return e?.fileList;
              }}
            >
              <Upload
                beforeUpload={() => false}
                maxCount={1}
                accept=".doc,.docx"
                listType="text"
              >
                <Button icon={<UploadOutlined />}>Chọn file</Button>
              </Upload>
            </Form.Item>

            <Form.Item>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button onClick={() => {
                  setIsModalVisible(false);
                  form.resetFields();
                }}>
                  Hủy
                </Button>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  Tạo form
                </Button>
              </div>
            </Form.Item>
          </Form>
        </Modal>

        {/* Modal xác nhận xóa */}
        <Modal
          title="Xác nhận xóa form"
          open={isDeleteModalVisible}
          onOk={handleDeleteForm}
          onCancel={handleCancelDelete}
          okText="Xóa"
          cancelText="Hủy"
          okType="danger"
          confirmLoading={deleteLoading}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: '22px' }} />
            <span>
              Bạn có chắc chắn muốn xóa form "<strong>{deletingForm?.name}</strong>"? 
              Hành động này không thể hoàn tác.
            </span>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
};

export default ManageFormPage; 