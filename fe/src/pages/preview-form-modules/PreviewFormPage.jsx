import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Spin, Switch, App } from 'antd';
import mammoth from 'mammoth';

import formService from '../../services/formService';
import AppLayout from '../../components/layout/AppLayout';
import '../PreviewFormPage.css';

// Import các module đã tách
import { fixInlineLayout, preprocessHtmlContent } from './utils';
import { makeFieldsEditable } from './formFields';
import { updateFormulaFields, populateFormData } from './formula';
import { validateForm, showValidationErrors, debugFormState } from './validation.jsx';

/**
 * Component hiển thị và chỉnh sửa form từ file Word
 */
const PreviewFormPage = () => {
  const navigate = useNavigate();
  const { formId } = useParams();
  const { message, modal } = App.useApp();
  
  const [loading, setLoading] = useState(true);
  const [isWordMode, setIsWordMode] = useState(false);
  const [mode, setMode] = useState('edit'); // 'edit' or 'view'
  const [wordContent, setWordContent] = useState('');
  const [formInfo, setFormInfo] = useState(null);
  const [formFields, setFormFields] = useState([]);
  const [savedFormData, setSavedFormData] = useState(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [fieldValues, setFieldValues] = useState({});
  
  const containerRef = useRef(null);

  // Xử lý khi chuyển chế độ
  const handleModeChange = (checked) => {
    setIsWordMode(checked);
    setMode(checked ? 'view' : 'edit');
    
    if (checked) {
      // Chuyển sang chế độ Word - hiển thị nội dung Word gốc
      displayOriginalWord();
    } else {
      // Chuyển về chế độ HTML
      displayHtmlContent();
    }
  };
  
  // Hàm hiển thị nội dung Word gốc
  const displayOriginalWord = async () => {
    try {
      // Lấy file Word từ API
      const wordFile = await formService.getWordFile(formId);
      
      // Chuyển đổi Word sang HTML với các options giữ nguyên style
      const result = await mammoth.convertToHtml(wordFile, {
        styleMap: [
          "p[style-name='Section Title'] => h1:fresh",
          "p[style-name='Subsection Title'] => h2:fresh"
        ],
        includeDefaultStyleMap: true,
        preserveStyles: true,
        ignoreEmptyParagraphs: false,
        idPrefix: "word-"
      });
      
      // Hiển thị nội dung Word nguyên bản
      if (containerRef.current) {
        containerRef.current.innerHTML = result.value;
        
        // Thêm style để hiển thị giống Word
        containerRef.current.style.backgroundColor = 'white';
        containerRef.current.style.padding = '40px';
        containerRef.current.style.fontFamily = 'Calibri, Arial, sans-serif';
        containerRef.current.style.fontSize = '11pt';
        containerRef.current.style.lineHeight = '1.5';
        containerRef.current.style.color = '#000';
        
        // Style cho bảng - giữ nguyên định dạng
        const tables = containerRef.current.querySelectorAll('table');
        tables.forEach(table => {
          table.style.borderCollapse = 'collapse';
          table.style.width = '100%';
          table.style.margin = '10px 0';
          
          const cells = table.querySelectorAll('th, td');
          cells.forEach(cell => {
            cell.style.border = '1px solid #000';
            cell.style.padding = '8px';
          });
        });
      }
    } catch (error) {
      console.error('Error displaying Word content:', error);
      message.error('Lỗi khi hiển thị nội dung Word');
    }
  };
  
  // Hàm hiển thị nội dung HTML
  const displayHtmlContent = () => {
    if (containerRef.current && wordContent) {
      containerRef.current.innerHTML = wordContent;
      
      // Áp dụng lại các xử lý
      makeFieldsEditable(containerRef.current, formFields, () => updateFormulaFields(containerRef.current, formFields, setFieldValues));
      fixInlineLayout(containerRef.current);
      
      // Cập nhật các trường công thức
      setTimeout(() => updateFormulaFields(containerRef.current, formFields, setFieldValues), 100);
    }
  };

  // Tải dữ liệu form khi component mount
  useEffect(() => {
    const fetchData = async () => {
      if (!formId) return;
      
      setLoading(true);
      try {
        // Fetch form information và Word file trước (bắt buộc phải có)
        const [formInfoResponse, wordFile] = await Promise.all([
          formService.getFormInfo(formId),
          formService.getWordFile(formId)
        ]);

        // Fetch form fields và saved data (có thể fail)
        let formFieldsResponse = null;
        let savedDataResponse = null;

        try {
          formFieldsResponse = await formService.getFormFields(formId);
          console.log('✅ Form fields loaded successfully');
        } catch (fieldsError) {
          console.log('⚠️ Form fields API failed (404), will use basic mode:', fieldsError.response?.status);
          formFieldsResponse = { data: { fields: [] } };
        }

        try {
          savedDataResponse = await formService.getLatestFormData(formId);
          console.log('✅ Saved data loaded successfully');
        } catch (savedError) {
          if (savedError.response?.status === 404) {
            console.log('No saved data found for this form');
            savedDataResponse = null;
          } else {
            console.log('⚠️ Saved data API failed:', savedError.response?.status);
            savedDataResponse = null;
          }
        }

        // Set form info và fields
        setFormInfo(formInfoResponse.data);
        const fieldsData = formFieldsResponse.data?.fields || [];
        setFormFields(fieldsData);
        console.log('Loaded form fields:', formFieldsResponse.data);

        // Set saved data nếu có
        if (savedDataResponse && savedDataResponse.data) {
          setSavedFormData(savedDataResponse.data);
          console.log('Loaded saved form data:', savedDataResponse.data);
        }

        try {
          // Chuyển đổi Word sang HTML
          const result = await mammoth.convertToHtml({ arrayBuffer: wordFile }, {
            includeDefaultStyleMap: true,
            includeEmbeddedStyleMap: true
          });
          
          // Thêm CSS để giữ định dạng tốt hơn
          const cssStyles = `
            <style>
              table { border-collapse: collapse; width: 100%; }
              table, th, td { border: 1px solid #ddd; }
              th, td { padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .form-container img { max-width: 100%; height: auto; }
              /* Không xử lý danh sách đánh số */
            </style>
          `;

          const enhancedHtml = cssStyles + result.value;
          // Không xử lý danh sách đánh số
          setWordContent(enhancedHtml);

          if (containerRef.current) {
            containerRef.current.innerHTML = enhancedHtml;
            
            // Xử lý các trường
            makeFieldsEditable(containerRef.current, fieldsData, () => updateFormulaFields(containerRef.current, fieldsData, setFieldValues));
            
            // Sửa layout
            fixInlineLayout(containerRef.current);
            
            // Không sửa danh sách đánh số
            
            // Cập nhật các trường công thức
            updateFormulaFields(containerRef.current, fieldsData, setFieldValues);

            // Populate saved data nếu có
            if (savedDataResponse && savedDataResponse.data) {
              setTimeout(() => populateFormData(savedDataResponse.data, containerRef.current, 
                () => updateFormulaFields(containerRef.current, fieldsData, setFieldValues)), 500);
            }
          }
        } catch (error) {
          console.error('Error in Word processing:', error);
          // Fallback to basic mammoth
          const result = await mammoth.convertToHtml({ arrayBuffer: wordFile });
          setWordContent(result.value);

          if (containerRef.current) {
            containerRef.current.innerHTML = result.value;
            makeFieldsEditable(containerRef.current, fieldsData, () => updateFormulaFields(containerRef.current, fieldsData, setFieldValues));

            // Populate saved data nếu có
            if (savedDataResponse && savedDataResponse.data) {
              setTimeout(() => populateFormData(savedDataResponse.data, containerRef.current, 
                () => updateFormulaFields(containerRef.current, fieldsData, setFieldValues)), 500);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        message.error('Lỗi khi tải dữ liệu form');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [formId]);

  // Thêm useEffect để setup event delegation cho dynamic content
  useEffect(() => {
    if (!containerRef.current) return;

    const handleInputChange = (e) => {
      const target = e.target;
      if (target.classList.contains('form-input') && target.dataset.fieldType !== 'f') {
        console.log(`Delegation event ${e.type}: ${target.dataset.fieldName} = ${target.value}`);
        setTimeout(() => updateFormulaFields(containerRef.current, formFields, setFieldValues), 50);
      }
    };

    // Sử dụng event delegation để capture events từ dynamic elements
    const container = containerRef.current;
    const events = ['input', 'change', 'keyup'];

    events.forEach(eventType => {
      container.addEventListener(eventType, handleInputChange, true);
    });

    // Cleanup
    return () => {
      events.forEach(eventType => {
        container.removeEventListener(eventType, handleInputChange, true);
      });
    };
  }, [wordContent, formFields]); // Re-setup khi wordContent thay đổi

  // Lưu dữ liệu form
  const handleSave = async () => {
    try {
      // Debug form state first
      debugFormState(containerRef.current, formFields);

      // Validate form trước khi lưu
      const validationResult = validateForm(containerRef.current, formFields, wordContent);

      if (!validationResult.isValid) {
        showValidationErrors(validationResult.errors, modal);
        return;
      }

      const fieldValues = [];
      const inputs = containerRef.current.querySelectorAll('.form-input');

      inputs.forEach((input) => {
        const fieldName = input.dataset.fieldName;
        const label = input.dataset.label || fieldName;
        let fieldType = input.dataset.fieldType;
        let value = '';

        // Xử lý giá trị dựa trên loại field
        const isDateField = input.type === 'date' ||
          fieldName?.toLowerCase().includes('date') ||
          fieldName?.toLowerCase().includes('ngay');

        switch (fieldType?.toLowerCase()) {
          case 'c': // checkbox
            value = input.checked ? 'true' : 'false';
            fieldType = 'c';
            break;
          case 'rd': // radio
            // For individual radio buttons
            if (input.type === 'radio') {
              // Only include checked radio buttons
              value = input.checked ? 'true' : 'false';
              fieldType = 'rd';
            } else {
              // Skip other elements that might have 'rd' type but aren't radio buttons
              return;
            }
            break;
        case 's': // select
            value = input.value || '';
            fieldType = 's';
            break;
          case 'd': // number hoặc date
            if (isDateField) {
              value = input.value || '';
              fieldType = 'dt';
            } else {
              value = input.value || '0';
              fieldType = 'n'; // number type theo API
            }
            break;
          case 'dt': // date
            value = input.value || '';
            fieldType = 'dt';
            break;
          case 'f': // formula
            value = input.value || input.placeholder || '';
            fieldType = 'f';
            break;
          case 't': // text
          default:
            value = input.value || '';
            fieldType = 't';
            break;
        }

        fieldValues.push({
          fieldName: fieldName,
          fieldType: fieldType,
          label: label,
          value: value
        });
      });

      // Lấy userId từ localStorage
      const userInfo = localStorage.getItem('userInfo');
      const userId = JSON.parse(userInfo).userId;

      if (!userId) {
        message.error('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
        return;
      }

      // Tạo payload theo format API
      const payload = {
        formId: formId,
        userId: userId,
        name: "", // Mặc định trống theo yêu cầu
        fieldValues: fieldValues,
        status: "Draft"
      };

      console.log('Saving form data:', payload);

      // Gọi API để lưu dữ liệu
      const response = await formService.saveFormData(payload);

      console.log('Save response:', response);
      message.success('Đã lưu dữ liệu form thành công!');

    } catch (err) {
      console.error('Error saving form:', err);
      message.error('Lỗi khi lưu dữ liệu form: ' + (err.response?.data?.message || err.message));
    }
  };

  // Xuất PDF
  const handleExportPDF = async () => {
    try {
      setIsExportingPDF(true);
      console.log('📄 Starting PDF export...');
      
      if (!formId) {
        message.error('Không tìm thấy formId để xuất PDF');
        return;
      }

      // Gọi API để lấy PDF file từ server
      console.log('📄 Fetching PDF from server with formId:', formId);
      const pdfBlob = await formService.getFormPDF(formId);
      
      // Tạo URL để download
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(formInfo?.formName || 'Form').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up URL object
      window.URL.revokeObjectURL(url);
      
      console.log('✅ PDF export completed successfully!');
      message.success('Đã xuất PDF thành công!');

    } catch (error) {
      console.error('🚨 Error exporting PDF:', error);
      message.error('Có lỗi xảy ra khi xuất PDF: ' + error.message);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleComplete = () => {
    message.success('Hoàn thành cấu hình');
  };

  return (
    <AppLayout>
      <div className="preview-page">
        <Spin spinning={loading}>
          <div className="page-header">
            <div className="page-title">
              <div className="form-title">
                {formInfo ? formInfo.formName : 'Xem trước form'}
              </div>
              {formInfo && (
                <div className="form-info">
                  <span className="form-category">Danh mục: {formInfo.categoryName}</span>
                  <span className="form-date">Tạo ngày: {new Date(formInfo.createdAt).toLocaleDateString('vi-VN')}</span>
                  <span className="form-status">Trạng thái: {formInfo.status}</span>
                  <span className="form-creator">Tạo bởi: {formInfo.createdBy}</span>
                  {savedFormData && (
                    <span className="saved-data-info" style={{
                      color: '#000000',
                      fontWeight: 'bold',
                      display: 'inline-block',
                      padding: '2px 8px',
                      backgroundColor: '#f6ffed',
                      border: '1px solid #b7eb8f',
                      borderRadius: '4px',
                      fontSize: '12px',
                      whiteSpace: 'nowrap'
                    }}>
                      📄 Đã tải dữ liệu đã lưu ({new Date(savedFormData.lastUpdated).toLocaleString('vi-VN')})
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="page-actions">
              <Button type="primary" onClick={handleComplete}>
                Hoàn thành cấu hình
              </Button>
              <Button onClick={() => navigate(`/form-config/${formInfo?.formId}`)}>Quay lại cấu hình</Button>
              <Button href="/manage-form">Về danh sách</Button>
            </div>
          </div>

          <div className="form-actions">
            <div className="action-buttons">
              <Button type="primary" className="save-btn" onClick={handleSave}>Lưu dữ liệu</Button>
              <Button 
                className="export-btn" 
                onClick={handleExportPDF}
                loading={isExportingPDF}
                disabled={isExportingPDF}
              >
                {isExportingPDF ? 'Đang xuất PDF...' : 'Xuất PDF'}
              </Button>
              <div className="mode-switch">
                <Switch
                  checked={isWordMode}
                  onChange={handleModeChange}
                  checkedChildren="Word"
                  unCheckedChildren="Form"
                />
              </div>
            </div>
          </div>

          <div className="preview-form">
            <div ref={containerRef} className={`form-content ${isWordMode ? 'word-mode' : ''}`} />
          </div>

          <div className="bottom-actions">
            <Button type="primary" onClick={handleComplete}>Hoàn thành cấu hình</Button>
            <Button type="primary" className="save-btn" onClick={handleSave}>Lưu dữ liệu</Button>
            <Button 
              type="primary" 
              className="export-btn" 
              onClick={handleExportPDF}
              loading={isExportingPDF}
              disabled={isExportingPDF}
            >
              {isExportingPDF ? 'Đang xuất PDF...' : 'Xuất PDF'}
            </Button>
          </div>
        </Spin>
      </div>
    </AppLayout>
  );
};

export default PreviewFormPage; 