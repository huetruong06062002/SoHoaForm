import React, { useState, useEffect } from 'react';
import { Input, DatePicker, Typography, Switch, Space, Spin, message, Form, Checkbox, Row, Col, Card, Button } from 'antd';
import { useParams } from 'react-router-dom';
import formService from '../services/formService';
import './AssessmentForm.css';

const { Title } = Typography;

const AssessmentForm = () => {
  const { formId } = useParams();
  const [isWordMode, setIsWordMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    const fetchFormContent = async () => {
      try {
        setLoading(true);
        const response = await formService.getFormContent(formId);
        if (response.statusCode === 200) {
          setFormData(response.data);
        } else {
          message.error('Không thể tải nội dung form');
        }
      } catch (error) {
        console.error('Error fetching form content:', error);
        message.error('Đã có lỗi xảy ra khi tải nội dung form');
      } finally {
        setLoading(false);
      }
    };

    if (formId) {
      fetchFormContent();
    }
  }, [formId]);

  const renderField = (field) => {
    if (!field) return null;

    const commonProps = {
      name: field.fieldName,
      required: field.isRequired,
      rules: [{ required: field.isRequired, message: `${field.fieldDescription} là bắt buộc` }]
    };

    switch (field.fieldType) {
      case 'Date':
        return (
          <Form.Item {...commonProps}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
        );
      case 'Number':
        return (
          <Form.Item {...commonProps}>
            <Input type="number" style={{ width: '100%' }} />
          </Form.Item>
        );
      case 'Boolean':
        return (
          <Form.Item {...commonProps} valuePropName="checked">
            <Checkbox />
          </Form.Item>
        );
      default:
        return (
          <Form.Item {...commonProps}>
            <Input style={{ width: '100%' }} />
          </Form.Item>
        );
    }
  };

  const renderTableCell = (cell) => {
    if (cell.isField) {
      const field = formData.fields.find(f => f.formula === cell.text);
      if (field) {
        return (
          <td className="value-cell">
            {renderField(field)}
          </td>
        );
      }
    }
    return <td>{cell.text}</td>;
  };

  const renderTable = (table) => {
    return (
      <table className="form-table">
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.cells.map((cell, cellIndex) => renderTableCell(cell))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderFormContent = () => {
    if (!formData?.wordContent) return null;

    const { tables, paragraphs, headers } = formData.wordContent;

    return (
      <>
        {headers?.map((header, index) => (
          <div key={index} className="form-header-text">
            {header}
          </div>
        ))}

        {paragraphs?.map((paragraph, index) => (
          <div key={index} className="form-paragraph">
            {paragraph.text}
          </div>
        ))}

        {tables?.map((table, index) => (
          <div key={index} className="table-container">
            {renderTable(table)}
          </div>
        ))}
      </>
    );
  };

  const handleFinish = (values) => {
    console.log('Form values:', values);
  };

  if (loading) {
    return <Spin spinning={loading} />;
  }

  return (
    <div className={`assessment-form ${isWordMode ? 'word-mode' : ''}`}>
      <div className="form-header">
        <Title level={4}>Xem trước form: {formData?.formName}</Title>
        <div className="form-actions">
          <Button type="primary" className="save-btn">Lưu dữ liệu</Button>
          <Button className="export-btn">Xuất PDF</Button>
          <div className="word-mode-toggle">
            <span>Chế độ Word</span>
            <Switch
              checked={isWordMode}
              onChange={(checked) => setIsWordMode(checked)}
            />
          </div>
        </div>
      </div>

      <Form
        form={form}
        onFinish={handleFinish}
        layout="vertical"
        className="form-content"
      >
        {renderFormContent()}
      </Form>
    </div>
  );
};

export default AssessmentForm; 