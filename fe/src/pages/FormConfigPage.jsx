import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Table, Button, Typography, Card, Row, Col, Tag, Checkbox, Space, Input, Collapse, App, Form, Result } from 'antd';
import { CaretRightOutlined, CaretDownOutlined, InfoCircleOutlined, EyeOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import AppLayout from '../components/layout/AppLayout';
import formService from '../services/formService';
import { isApiSuccess, getApiData } from '../utils/apiUtils';
import '../styles/FormConfig.css';

const { Title } = Typography;
const { TextArea } = Input;

const FormConfigPage = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { user } = useSelector((state) => state.auth);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(null);
  const [fields, setFields] = useState([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  const [configChanges, setConfigChanges] = useState({});

  const getRandomFieldsExample = (currentRecord) => {
    // Lấy các field khác currentRecord để làm ví dụ
    const otherFields = fields.filter(field => 
      field.formFieldId !== currentRecord.formFieldId && 
      field.fieldType !== 'Formula' // Loại bỏ Formula fields
    );
    
    if (otherFields.length === 0) {
      return 'TraineeName, TraineeID';
    }
    
    // Random 2-3 fields để làm ví dụ
    const shuffled = otherFields.sort(() => 0.5 - Math.random());
    const selectedFields = shuffled.slice(0, Math.min(3, otherFields.length));
    
    return selectedFields.map(field => field.fieldName).join(', ');
  };

  const fetchFormConfig = async () => {
    try {
      setLoading(true);
      const response = await formService.getFormFields(formId);
      if (response.statusCode === 200) {
        setFormData(response.data);
        setFields(response.data.fields);
        
        // Set initial form values
        const initialValues = {};
        response.data.fields.forEach(field => {
          initialValues[`formula_${field.formFieldId}`] = field.formula || '';
          
          // Với Select fields, nếu formula không phải pattern {s_...} thì hiển thị vào options field
          if (field.fieldType === 'Select') {
            const formula = field.formula || '';
            console.log(`Select field ${field.fieldName}: formula="${formula}", matches pattern: ${formula.match(/^\{.*\}$/)}`);
            if (!formula.match(/^\{.*\}$/)) {
              // Formula chứa custom options
              console.log(`Setting custom options for ${field.fieldName}: "${formula}"`);
              initialValues[`options_${field.formFieldId}`] = formula;
            } else {
              // Formula dạng {s_...} thì để trống
              console.log(`Setting empty options for ${field.fieldName}`);
              initialValues[`options_${field.formFieldId}`] = '';
            }
          } else {
            initialValues[`options_${field.formFieldId}`] = field.options || '';
          }
          
          // Với Boolean fields, nếu formula không phải pattern {X_...} thì hiển thị vào dependentVariables
          if (field.fieldType === 'Boolean') {
            const formula = field.formula || '';
            console.log(`Field ${field.fieldName}: formula="${formula}", matches pattern: ${formula.match(/^\{.*\}$/)}`);
            if (!formula.match(/^\{.*\}$/)) {
              // Loại bỏ dấu [ ] và chỉ lấy tên biến
              const cleanedFormula = formula.replace(/[\[\]]/g, '');
              console.log(`Setting dependentVariables for ${field.fieldName}: "${cleanedFormula}"`);
              initialValues[`dependentVariables_${field.formFieldId}`] = cleanedFormula;
            } else {
              // Với formula dạng {X_...} thì để trống
              console.log(`Setting empty dependentVariables for ${field.fieldName}`);
              initialValues[`dependentVariables_${field.formFieldId}`] = '';
            }
          } else {
            initialValues[`dependentVariables_${field.formFieldId}`] = field.dependentVariables || '';
          }
          
          initialValues[`isRequired_${field.formFieldId}`] = field.isRequired;
          initialValues[`isUpperCase_${field.formFieldId}`] = field.isUpperCase || false;
        });
        form.setFieldsValue(initialValues);
      } else {
        message.error('Không thể tải thông tin cấu hình form');
      }
    } catch (error) {
      console.error('Error fetching form config:', error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('Đã có lỗi xảy ra khi tải thông tin cấu hình form');
      }
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
      case 'Formula':
        return <Tag color="orange">Công thức</Tag>;
      case 'Select':
        return <Tag color="cyan">Lựa chọn</Tag>;
      default:
        return <Tag>{type}</Tag>;
    }
  };

  const handleExpand = (expanded, record) => {
    setExpandedRowKeys(expanded ? [record.formFieldId] : []);
  };

  const handleConfigChange = (fieldId, configType, value) => {
    setConfigChanges(prev => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        [configType]: value
      }
    }));
  };

  const handleSaveFormula = async (record) => {
    try {
      const formula = form.getFieldValue(`formula_${record.formFieldId}`);
      if (!formula || formula.trim() === '') {
        message.warning('Vui lòng nhập công thức');
        return;
      }
      
      console.log('Saving formula:', {
        formId: formId,
        fieldId: record.fieldId,
        formFieldId: record.formFieldId,
        formula: formula
      });
      
      const response = await formService.updateFormula(formId, record.fieldId, {
        formula: formula.trim(),
        description: ""
      });
      
      if (response.statusCode === 200) {
        message.success(response.message || 'Cập nhật formula thành công');
        console.log('Formula updated successfully:', response);
        
        // Cập nhật lại data trong state
        setFields(prevFields => 
          prevFields.map(field => 
            field.formFieldId === record.formFieldId 
              ? { ...field, formula: formula.trim() }
              : field
          )
        );
      }
    } catch (error) {
      console.error('Error updating formula:', error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('Đã có lỗi xảy ra khi cập nhật công thức');
      }
    }
  };

  const handleSaveSelectOptions = async (record) => {
    try {
      const options = form.getFieldValue(`options_${record.formFieldId}`);
      if (!options || options.trim() === '') {
        message.warning('Vui lòng nhập các lựa chọn');
        return;
      }
      
      console.log('Saving select options:', {
        formId: formId,
        fieldId: record.fieldId,
        formFieldId: record.formFieldId,
        options: options
      });
      
      const response = await formService.updateSelectOptions(formId, record.fieldId, options.trim());
      if (response.statusCode === 200) {
        message.success(response.message || 'Cập nhật danh sách lựa chọn thành công');
        console.log('Select options updated successfully:', response);
        
        // Cập nhật lại data trong state
        setFields(prevFields => 
          prevFields.map(field => 
            field.formFieldId === record.formFieldId 
              ? { ...field, formula: options.trim(), options: options.trim() }
              : field
          )
        );
      }
    } catch (error) {
      console.error('Error updating select options:', error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('Đã có lỗi xảy ra khi cập nhật danh sách lựa chọn');
      }
    }
  };

  const handleSaveBooleanConfig = async (record) => {
    try {
      const depVars = form.getFieldValue(`dependentVariables_${record.formFieldId}`);
      const isRequired = form.getFieldValue(`isRequired_${record.formFieldId}`);
      
      console.log('Saving Boolean field config:', {
        formId: formId,
        fieldId: record.fieldId,
        formFieldId: record.formFieldId,
        dependentVariables: depVars,
        isRequired: isRequired,
        originalRequired: record.isRequired
      });
      
      // 1. Cập nhật formula nếu có dependent variables
      if (depVars && depVars.trim() !== '') {
        // Truyền formula đúng như user nhập, không tự động format
        const formula = depVars.trim();
        
        console.log('Updating boolean formula (raw input):', formula);
        const formulaResponse = await formService.updateBooleanFormula(formId, record.fieldId, {
          formula: formula
        });
        if (formulaResponse.statusCode !== 200) {
          message.error('Lỗi khi cập nhật biến phụ thuộc');
          return;
        }
        console.log('Boolean formula updated successfully:', formulaResponse);
      }
      
      // 2. Cập nhật isRequired nếu có thay đổi
      if (isRequired !== record.isRequired) {
        console.log('Toggling required status...');
        const requiredResponse = await formService.toggleRequired(formId, record.fieldId);
        if (requiredResponse.statusCode !== 200) {
          message.error('Lỗi khi cập nhật trạng thái bắt buộc nhập');
          return;
        }
        console.log('Required status toggled successfully:', requiredResponse);
      }
      
      message.success('Cập nhật cấu hình Boolean field thành công');
      
      // Cập nhật lại data trong state
      setFields(prevFields => 
        prevFields.map(field => 
          field.formFieldId === record.formFieldId 
            ? { 
                ...field, 
                dependentVariables: depVars?.trim() || '',
                isRequired: isRequired,
                formula: depVars && depVars.trim() !== '' 
                  ? depVars.trim()  // Lưu đúng như user nhập
                  : field.formula
              }
            : field
        )
      );
      
    } catch (error) {
      console.error('Error updating Boolean field config:', error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('Đã có lỗi xảy ra khi cập nhật cấu hình Boolean field');
      }
    }
  };

  const handleSaveConfig = async (record) => {
    try {
      console.log('Saving config for field:', record);
      
      // Lấy giá trị config hiện tại từ form
      const isRequired = form.getFieldValue(`isRequired_${record.formFieldId}`);
      const isUpperCase = form.getFieldValue(`isUpperCase_${record.formFieldId}`);
      
      console.log('Current values:', { isRequired, isUpperCase });
      console.log('Original values:', { originalRequired: record.isRequired, originalUpperCase: record.isUpperCase });
      
      // Gọi API toggle-required nếu giá trị isRequired thay đổi
      if (isRequired !== record.isRequired) {
        console.log('Toggling required status...');
        const requiredResponse = await formService.toggleRequired(formId, record.fieldId);
        if (requiredResponse.statusCode !== 200) {
          message.error('Lỗi khi cập nhật trạng thái bắt buộc nhập');
          return;
        }
        console.log('Required status toggled successfully:', requiredResponse);
      }
      
      // Gọi API toggle-uppercase nếu giá trị isUpperCase thay đổi và field hỗ trợ uppercase
      if ((record.fieldType === 'Text' || record.fieldType === 'Textarea') && 
          isUpperCase !== record.isUpperCase) {
        console.log('Toggling uppercase status...');
        const uppercaseResponse = await formService.toggleUppercase(formId, record.fieldId);
        if (uppercaseResponse.statusCode !== 200) {
          message.error('Lỗi khi cập nhật trạng thái bắt buộc nhập chữ hoa');
          return;
        }
        console.log('Uppercase status toggled successfully:', uppercaseResponse);
      }
      
      message.success('Cập nhật cấu hình thành công');
      
      // Cập nhật lại data trong state
      setFields(prevFields => 
        prevFields.map(field => 
          field.formFieldId === record.formFieldId 
            ? { ...field, isRequired: isRequired, isUpperCase: isUpperCase }
            : field
        )
      );
      
      // Clear config changes cho field này
      setConfigChanges(prev => {
        const newChanges = { ...prev };
        delete newChanges[record.formFieldId];
        return newChanges;
      });
      
    } catch (error) {
      console.error('Error saving config:', error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('Đã có lỗi xảy ra khi lưu cấu hình');
      }
    }
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
                  <Form.Item
                    name={`isUpperCase_${record.formFieldId}`}
                    valuePropName="checked"
                    style={{ marginBottom: 0 }}
                  >
                    <Checkbox>Bắt buộc nhập chữ hoa</Checkbox>
                  </Form.Item>
                </motion.div>
              )}

              {record.fieldType === 'Boolean' && (
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  style={{ width: '100%' }}
                >
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontWeight: '500', marginBottom: '4px', display: 'block' }}>
                      Danh sách biến phụ thuộc:
                    </label>
                    <div style={{ 
                      backgroundColor: '#f0f9ff', 
                      border: '1px solid #bfdbfe', 
                      borderRadius: '4px', 
                      padding: '8px', 
                      marginBottom: '8px',
                      fontSize: '12px',
                      color: '#1e40af'
                    }}>
                      Ví dụ: {getRandomFieldsExample(record)}
                    </div>
                    <Form.Item
                      name={`dependentVariables_${record.formFieldId}`}
                      style={{ marginBottom: '8px' }}
                    >
                      <Input
                        placeholder={`Ví dụ: ${getRandomFieldsExample(record)}`}
                      />
                    </Form.Item>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#6b7280', 
                      marginBottom: '12px',
                      lineHeight: '1.4'
                    }}>
                      Nhập danh sách tên biến bị ảnh hưởng khi checkbox này được chọn. Hệ thống sẽ truyền lên API đúng như bạn nhập.
                    </div>

                    {/* Checkbox bắt buộc nhập cho Boolean field */}
                    <Form.Item
                      name={`isRequired_${record.formFieldId}`}
                      valuePropName="checked"
                      style={{ marginBottom: '12px' }}
                    >
                      <Checkbox>Bắt buộc nhập</Checkbox>
                    </Form.Item>

                    <Button 
                      type="primary" 
                      size="small"
                      onClick={() => handleSaveBooleanConfig(record)}
                      style={{
                        height: '28px',
                        fontSize: '12px',
                        padding: '4px 12px'
                      }}
                    >
                      Lưu cấu hình
                    </Button>
                  </div>
                </motion.div>
              )}
              
              {record.fieldType === 'Select' && (
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  style={{ width: '100%' }}
                >
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontWeight: '500', marginBottom: '4px', display: 'block' }}>
                      Danh sách lựa chọn (mỗi dòng 1 lựa chọn):
                    </label>
                    <Form.Item
                      name={`options_${record.formFieldId}`}
                      style={{ marginBottom: '8px' }}
                    >
                      <TextArea
                        rows={4}
                      />
                    </Form.Item>
                    <Button 
                      type="primary" 
                      size="small"
                      onClick={() => handleSaveSelectOptions(record)}
                      style={{
                        height: '28px',
                        fontSize: '12px',
                        padding: '4px 12px'
                      }}
                    >
                      Lưu danh sách lựa chọn
                    </Button>
                  </div>
                </motion.div>
              )}
              
              {record.fieldType === 'Formula' && (
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  style={{ width: '100%' }}
                >
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontWeight: '500', marginBottom: '4px', display: 'block' }}>
                      Công thức:
                    </label>
                    <Form.Item
                      name={`formula_${record.formFieldId}`}
                      style={{ marginBottom: '8px' }}
                    >
                      <Input
                        placeholder="Nhập công thức (ví dụ: [so1] * [so2])"
                      />
                    </Form.Item>
                    <Button 
                      type="default" 
                      size="small" 
                      icon={<InfoCircleOutlined />}
                      onClick={() => {
                        // Toggle formula help
                        const helpElement = document.getElementById(`formula-help-${record.formFieldId}`);
                        if (helpElement) {
                          helpElement.style.display = helpElement.style.display === 'none' ? 'block' : 'none';
                        }
                      }}
                      style={{ 
                        padding: '4px 12px',
                        height: '28px',
                        fontSize: '12px',
                        borderColor: '#1890ff',
                        color: '#1890ff',
                        backgroundColor: '#f0f9ff'
                      }}
                    >
                      Hiển thị hướng dẫn công thức
                    </Button>
                    <div 
                      id={`formula-help-${record.formFieldId}`}
                      style={{ 
                        display: 'none',
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #e9ecef',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ marginBottom: '12px' }}>
                        <strong>Hướng dẫn nhập công thức</strong>
                      </div>
                      
                      <div style={{ marginBottom: '8px' }}>
                        <strong>Cú pháp cơ bản:</strong> Sử dụng [tenBien] để tham chiếu đến biến khác. Sử dụng $$funName$$ để cho phép người dùng tự nhập nếu muốn.
                      </div>
                      
                      <div style={{ marginBottom: '8px' }}>
                        <strong>Các phép toán số học:</strong> +, -, *, /, %, Math.pow(x,y), Math.round(x)
                      </div>
                      
                      <div style={{ marginBottom: '8px' }}>
                        <strong>Hàm toán học:</strong> Math.abs(), Math.max(), Math.min(), Math.floor(), Math.ceil()
                      </div>
                      
                      <div style={{ marginBottom: '8px' }}>
                        <strong>Các toán tử so sánh:</strong> ==, ===, !=, !==, &gt;, &lt;, &gt;=, &lt;=
                      </div>
                      
                      <div style={{ marginBottom: '8px' }}>
                        <strong>Các toán tử logic:</strong> && (VÀ), || (HOẶC), ! (PHỦ ĐỊNH)
                      </div>
                      
                      <div style={{ marginBottom: '8px' }}>
                        <strong>Toán tử điều kiện:</strong> điều_kiện ? giá_trị_nếu_đúng : giá_trị_nếu_sai
                      </div>
                      
                      <div style={{ marginBottom: '12px' }}>
                        <strong>Các ví dụ:</strong>
                        <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
                          <li>Tính tổng: <code style={{ backgroundColor: '#e9ecef', padding: '2px 4px' }}>[soLuong] * [donGia]</code></li>
                          <li>Làm tròn 2 chữ số: <code style={{ backgroundColor: '#e9ecef', padding: '2px 4px' }}>Math.round([tongTien] * 100) / 100</code></li>
                          <li>Điều kiện đơn giản: <code style={{ backgroundColor: '#e9ecef', padding: '2px 4px' }}>[tuoi] &gt;= 18 ? "Đủ tuổi" : "Chưa đủ tuổi"</code></li>
                          <li>Điều kiện lồng nhau: <code style={{ backgroundColor: '#e9ecef', padding: '2px 4px' }}>[diem] &gt;= 8 ? "Giỏi" : ([diem] &gt;= 6.5 ? "Khá" : "Trung bình")</code></li>
                          <li>Cho phép người dùng tự nhập: <code style={{ backgroundColor: '#e9ecef', padding: '2px 4px' }}>$$tuNhap$$</code></li>
                        </ul>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button 
                          type="primary" 
                          size="small"
                          onClick={() => handleSaveFormula(record)}
                          style={{
                            height: '28px',
                            fontSize: '12px',
                            padding: '4px 12px'
                          }}
                        >
                          Lưu công thức
                        </Button>
                        <Button 
                          type="default" 
                          size="small"
                          onClick={() => {
                            document.getElementById(`formula-help-${record.formFieldId}`).style.display = 'none';
                          }}
                          style={{
                            height: '28px',
                            fontSize: '12px',
                            padding: '4px 12px'
                          }}
                        >
                          Ẩn hướng dẫn
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* Chỉ hiển thị checkbox và nút lưu cho fields không phải Boolean */}
              {record.fieldType !== 'Boolean' && (
                <>
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Form.Item
                      name={`isRequired_${record.formFieldId}`}
                      valuePropName="checked"
                      style={{ marginBottom: 0 }}
                    >
                      <Checkbox>Bắt buộc nhập</Checkbox>
                    </Form.Item>
                  </motion.div>
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Button 
                      type="primary" 
                      size="small"
                      onClick={() => handleSaveConfig(record)}
                    >
                      Lưu cấu hình
                    </Button>
                  </motion.div>
                </>
              )}
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
        } else if (record.fieldType?.toLowerCase() === 'formula') {
          description = 'Tính toán tự động';
        } else if (record.fieldType?.toLowerCase() === 'select') {
          description = 'Chọn từ danh sách (Bắt buộc)';
        } else {
          description = 'Văn bản tự do';
        }
        return `${description} ${record.isRequired ? '(Bắt buộc)' : ''}`;
      },
    },
  ];

  // Kiểm tra quyền admin
  if (user?.role !== 'admin') {
    return (
      <AppLayout>
        <div style={{ padding: '24px' }}>
          <Result
            status="403"
            title="403"
            subTitle="Xin lỗi, bạn không có quyền truy cập trang này. Chỉ quản trị viên mới có thể cấu hình form."
            extra={
              <Button type="primary" onClick={() => navigate('/')}>
                Về trang chủ
              </Button>
            }
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Form form={form} layout="vertical">
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

        {/* Action buttons at bottom */}
        <div style={{ 
          marginTop: '24px', 
          textAlign: 'center',
          padding: '20px',
          backgroundColor: '#fafafa',
          borderRadius: '8px',
          border: '1px solid #d9d9d9'
        }}>
          <Space size="large">
            <Button 
              type="primary" 
              size="large"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/preview-form/${formId}`)}
              style={{
                height: '40px',
                fontSize: '14px',
                padding: '0 24px',
                backgroundColor: '#52c41a',
                borderColor: '#52c41a'
              }}
            >
              Xem trước form
            </Button>
            <Button 
              type="primary" 
              size="large"
              onClick={() => navigate('/manage-form')}
              style={{
                height: '40px',
                fontSize: '14px',
                padding: '0 24px',
                backgroundColor: '#1890ff',
                borderColor: '#1890ff'
              }}
            >
              Hoàn thành cấu hình biến
            </Button>
            <Button 
              size="large"
              icon={<UnorderedListOutlined />}
              onClick={() => navigate('/manage-form')}
              style={{
                height: '40px',
                fontSize: '14px',
                padding: '0 24px'
              }}
            >
              Quay lại danh sách
            </Button>
          </Space>
        </div>
        </div>
      </Form>
    </AppLayout>
  );
};

export default FormConfigPage; 