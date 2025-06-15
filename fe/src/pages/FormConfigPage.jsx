import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Table, Button, Typography, message, Card, Row, Col, Tag, Checkbox, Space, Input, Collapse } from 'antd';
import { CaretRightOutlined, CaretDownOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '../components/layout/AppLayout';
import formService from '../services/formService';
import { isApiSuccess, getApiData } from '../utils/apiUtils';
import '../styles/FormConfig.css';

const { Title } = Typography;
const { TextArea } = Input;

const FormConfigPage = () => {
  const { formId } = useParams();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(null);
  const [fields, setFields] = useState([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  const [formulaValues, setFormulaValues] = useState({});
  const [selectOptions, setSelectOptions] = useState({});
  const [dependentVariables, setDependentVariables] = useState({});
  const [configChanges, setConfigChanges] = useState({});

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
    // Initialize formula value if it's a formula field
    if (expanded && record.fieldType === 'Formula' && !formulaValues[record.formFieldId]) {
      setFormulaValues(prev => ({
        ...prev,
        [record.formFieldId]: record.formula || ''
      }));
    }
    // Initialize select options if it's a select field
    if (expanded && record.fieldType === 'Select' && !selectOptions[record.formFieldId]) {
      setSelectOptions(prev => ({
        ...prev,
        [record.formFieldId]: record.options || ''
      }));
    }
    // Initialize dependent variables if it's a boolean field
    if (expanded && record.fieldType === 'Boolean' && !dependentVariables[record.formFieldId]) {
      setDependentVariables(prev => ({
        ...prev,
        [record.formFieldId]: record.dependentVariables || ''
      }));
    }
  };

  const handleFormulaChange = (fieldId, value) => {
    setFormulaValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSelectOptionsChange = (fieldId, value) => {
    setSelectOptions(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleDependentVariablesChange = (fieldId, value) => {
    setDependentVariables(prev => ({
      ...prev,
      [fieldId]: value
    }));
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
      const formula = formulaValues[record.formFieldId];
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
      if (isApiSuccess(response)) {
        // Message thành công sẽ được hiển thị tự động bởi axios interceptor
        console.log('Formula updated successfully:', response);
        
        // Cập nhật lại data trong state
        setFields(prevFields => 
          prevFields.map(field => 
            field.formFieldId === record.formFieldId 
              ? { ...field, formula: formula.trim() }
              : field
          )
        );
        
        // Cập nhật formulaValues để hiển thị giá trị mới
        setFormulaValues(prev => ({
          ...prev,
          [record.formFieldId]: formula.trim()
        }));
      }
    } catch (error) {
      console.error('Error updating formula:', error);
      // Lỗi sẽ được hiển thị tự động bởi axios interceptor
    }
  };

  const handleSaveSelectOptions = async (record) => {
    try {
      const options = selectOptions[record.formFieldId];
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
      
      const response = await formService.updateFieldConfig(formId, record.fieldId, {
        options: options.trim(),
        description: ""
      });
      if (isApiSuccess(response)) {
        // Message thành công sẽ được hiển thị tự động bởi axios interceptor
        console.log('Select options updated successfully:', response);
        
        // Cập nhật lại data trong state
        setFields(prevFields => 
          prevFields.map(field => 
            field.formFieldId === record.formFieldId 
              ? { ...field, options: options.trim() }
              : field
          )
        );
        
        // Cập nhật selectOptions để hiển thị giá trị mới
        setSelectOptions(prev => ({
          ...prev,
          [record.formFieldId]: options.trim()
        }));
      }
    } catch (error) {
      console.error('Error updating select options:', error);
      // Lỗi sẽ được hiển thị tự động bởi axios interceptor
    }
  };

  const handleSaveDependentVariables = async (record) => {
    try {
      const depVars = dependentVariables[record.formFieldId];
      if (!depVars || depVars.trim() === '') {
        message.warning('Vui lòng nhập danh sách biến phụ thuộc');
        return;
      }
      
      console.log('Saving dependent variables:', {
        formId: formId,
        fieldId: record.fieldId,
        formFieldId: record.formFieldId,
        dependentVariables: depVars
      });
      
      const response = await formService.updateFieldConfig(formId, record.fieldId, {
        dependentVariables: depVars.trim(),
        description: ""
      });
      if (isApiSuccess(response)) {
        // Message thành công sẽ được hiển thị tự động bởi axios interceptor
        console.log('Dependent variables updated successfully:', response);
        
        // Cập nhật lại data trong state
        setFields(prevFields => 
          prevFields.map(field => 
            field.formFieldId === record.formFieldId 
              ? { ...field, dependentVariables: depVars.trim() }
              : field
          )
        );
        
        // Cập nhật dependentVariables để hiển thị giá trị mới
        setDependentVariables(prev => ({
          ...prev,
          [record.formFieldId]: depVars.trim()
        }));
      }
    } catch (error) {
      console.error('Error updating dependent variables:', error);
      // Lỗi sẽ được hiển thị tự động bởi axios interceptor
    }
  };

  const handleSaveConfig = async (record) => {
    try {
      console.log('Saving config for field:', record);
      
      // Lấy giá trị config hiện tại (từ changes hoặc original)
      const currentConfig = configChanges[record.formFieldId] || {};
      const isRequired = currentConfig.isRequired ?? record.isRequired;
      const isUpperCase = currentConfig.isUpperCase ?? (record.isUpperCase || false);
      
      // Nếu là Formula field, cần có formula trong payload
      let payload;
      if (record.fieldType === 'Formula') {
        const currentFormula = formulaValues[record.formFieldId] || record.formula || '';
        payload = {
          formula: currentFormula,
          description: "",
          isRequired: isRequired,
          isUpperCase: isUpperCase
        };
      } else {
        // Cho các field khác, chỉ gửi config
        payload = {
          isRequired: isRequired,
          isUpperCase: isUpperCase,
          description: ""
        };
      }
      
      console.log('Config payload:', payload);
      
      const response = await formService.updateFieldConfig(formId, record.fieldId, payload);
      if (isApiSuccess(response)) {
        // Message thành công sẽ được hiển thị tự động bởi axios interceptor
        console.log('Config updated successfully:', response);
        
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
      }
      
    } catch (error) {
      console.error('Error saving config:', error);
      // Lỗi sẽ được hiển thị tự động bởi axios interceptor
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
                  <Checkbox checked={record.isUpperCase}>Bắt buộc nhập chữ hoa</Checkbox>
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
                      Ví dụ: [bien1], [bien2], [bien3]
                    </div>
                    <Input
                      value={dependentVariables[record.formFieldId] || record.dependentVariables || ''}
                      onChange={(e) => handleDependentVariablesChange(record.formFieldId, e.target.value)}
                      placeholder="Nhập danh sách tên biến bị ảnh hưởng khi checkbox này được chọn. Sử dụng cú pháp [tên biến], ... các tên biến cách nhau bởi dấu phẩy."
                      style={{ marginBottom: '8px' }}
                    />
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#6b7280', 
                      marginBottom: '8px',
                      lineHeight: '1.4'
                    }}>
                      Nhập danh sách tên biến bị ảnh hưởng khi checkbox này được chọn. Sử dụng cú pháp [tên biến], ... các tên biến cách nhau bởi dấu phẩy.
                    </div>
                    <Button 
                      type="primary" 
                      size="small"
                      onClick={() => handleSaveDependentVariables(record)}
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
                    <TextArea
                      value={selectOptions[record.formFieldId] || record.options || ''}
                      onChange={(e) => handleSelectOptionsChange(record.formFieldId, e.target.value)}
                      placeholder="Nhập các lựa chọn, mỗi dòng một lựa chọn&#10;Ví dụ:&#10;Lựa chọn 1&#10;Lựa chọn 2&#10;Lựa chọn 3"
                      rows={4}
                      style={{ marginBottom: '8px' }}
                    />
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
                    <Input
                      value={formulaValues[record.formFieldId] || record.formula || ''}
                      onChange={(e) => handleFormulaChange(record.formFieldId, e.target.value)}
                      placeholder="Nhập công thức (ví dụ: [so1] * [so2])"
                      style={{ marginBottom: '8px' }}
                    />
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
              
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Checkbox 
                  checked={configChanges[record.formFieldId]?.isRequired ?? record.isRequired}
                  onChange={(e) => {
                    handleConfigChange(record.formFieldId, 'isRequired', e.target.checked);
                  }}
                >
                  Bắt buộc nhập
                </Checkbox>
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