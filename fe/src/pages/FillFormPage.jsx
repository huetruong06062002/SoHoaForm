import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Spin, Switch, DatePicker, App } from 'antd';
import mammoth from 'mammoth';
import { saveAs } from 'file-saver';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import formService from '../services/formService';
import AppLayout from '../components/layout/AppLayout';
import './PreviewFormPage.css'; // Reusing the same CSS

const FillFormPage = () => {
  const navigate = useNavigate();
  const { formId } = useParams();
  const { message, modal } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [isWordMode, setIsWordMode] = useState(false);
  const [wordContent, setWordContent] = useState('');
  const [formInfo, setFormInfo] = useState(null);
  const [formFields, setFormFields] = useState([]);
  const [savedFormData, setSavedFormData] = useState(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
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

        // Convert Word file to HTML
        if (wordFile instanceof Blob) {
          try {
            const result = await mammoth.convertToHtml({ arrayBuffer: await wordFile.arrayBuffer() });
            console.log('Word content after conversion:', result.value);
            setWordContent(result.value);
          } catch (error) {
            console.error('Error processing Word file:', error);
            message.error('Lỗi khi xử lý file Word');
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

  // Separate useEffect để handle makeFieldsEditable và formula calculation khi formFields đã sẵn sàng
  useEffect(() => {
    console.log('useEffect triggered - formFields:', formFields, 'wordContent:', wordContent);

    if (formFields.length > 0 && wordContent && containerRef.current) {
      console.log('✅ FormFields and wordContent loaded, updating fields...');
      
      // Set initial content
      containerRef.current.innerHTML = wordContent;
      
      // Make fields editable
      makeFieldsEditable();
      
      // Delay một chút để đảm bảo DOM đã stable
      setTimeout(() => {
        // Populate saved data nếu có
        if (savedFormData && savedFormData.fieldValues) {
          populateFormData(savedFormData);
        }
        
        // Update formula fields
        updateFormulaFields();
      }, 100);
    }
  }, [formFields, wordContent, savedFormData]);

  // Function để tính toán công thức
  const calculateFormula = (formula, fieldValueMap) => {
    try {
      // Replace field references [fieldName] with their values
      let calculationFormula = formula;
      for (const [fieldName, value] of Object.entries(fieldValueMap)) {
        const regex = new RegExp(`\\[${fieldName}\\]`, 'g');
        calculationFormula = calculationFormula.replace(regex, value || '0');
      }

      console.log('Calculating formula:', {
        original: formula,
        replaced: calculationFormula,
        values: fieldValueMap
      });

      // Evaluate the formula
      const result = eval(calculationFormula);
      console.log('Formula result:', result);
      return result;
    } catch (error) {
      console.error('Error calculating formula:', error);
      return 0;
    }
  };

  // Update formula fields
  const updateFormulaFields = () => {
    if (!containerRef.current) return;

    const inputs = containerRef.current.querySelectorAll('.form-input');
    const fieldValueMap = {};

    // Collect all field values
    inputs.forEach(input => {
      if (input.dataset.fieldType !== 'formula') {
        const fieldName = input.dataset.fieldName;
        const value = input.type === 'checkbox' ? input.checked : input.value;
        fieldValueMap[fieldName] = value;
      }
    });

    console.log('Collected field values:', fieldValueMap);

    // Update formula fields
    inputs.forEach(input => {
      if (input.dataset.fieldType === 'formula') {
        const formula = input.dataset.formula;
        if (formula) {
          const result = calculateFormula(formula, fieldValueMap);
          input.value = result;
        }
      }
    });
  };

  const makeFieldsEditable = () => {
    if (!containerRef.current) return;

    console.log('Starting makeFieldsEditable...');
    let updatedContent = containerRef.current.innerHTML;

    console.log('Current formFields:', formFields);

    // Process each form field
    formFields.forEach(field => {
      if (!field.formula) {
        console.log('No formula found for field:', field);
        return;
      }

      // For formula fields, we don't need to extract type and name from the formula
      let fieldType, fieldName;
      
      if (field.fieldType === 'Formula') {
        fieldType = 'f';
        fieldName = field.fieldName;
      } else {
        // Extract field type and name from formula for normal fields
        const formulaMatch = field.formula.match(/\{([a-z])_([^}]+)\}/);
        if (!formulaMatch) {
          console.log('Invalid formula format:', field.formula);
          return;
        }
        fieldType = formulaMatch[1];
        fieldName = formulaMatch[2];
      }

      console.log('Processing field:', { formula: field.formula, fieldType, fieldName, type: field.fieldType });

      const isRequired = field.isRequired || false;
      let inputHtml = '';

      // Handle formula fields differently
      if (field.fieldType === 'Formula') {
        inputHtml = `<input type="number" class="form-input" data-field-name="${field.fieldName}" data-field-type="formula" data-formula="${field.formula}" readonly style="background-color: #f5f5f5;">`;
      } else {
        // Map field type từ placeholder sang loại input
        switch (fieldType) {
          case 'n': // number
            inputHtml = `<input type="number" class="form-input" data-field-name="${fieldName}" data-field-type="n" ${isRequired ? 'required' : ''}>`;
            break;
          case 'd': // date
            inputHtml = `<input type="date" class="form-input date-input" data-field-name="${fieldName}" data-field-type="dt" ${isRequired ? 'required' : ''}>`;
            break;
          case 'c': // checkbox
            inputHtml = `<input type="checkbox" class="form-input" data-field-name="${fieldName}" data-field-type="c" ${isRequired ? 'required' : ''}>`;
            break;
          case 's': // select
            inputHtml = `<select class="form-input" data-field-name="${fieldName}" data-field-type="s" ${isRequired ? 'required' : ''}>
              <option value="">Chọn...</option>
              ${field.options?.map(opt => `<option value="${opt}">${opt}</option>`).join('') || ''}
            </select>`;
            break;
          default: // text
            inputHtml = `<input type="text" class="form-input" data-field-name="${fieldName}" data-field-type="t" ${isRequired ? 'required' : ''}>`;
            break;
        }
      }

      // Replace placeholder with input
      const replacement = `<span class="form-field-wrapper">${inputHtml}</span>`;
      
      if (field.fieldType === 'Formula') {
        // For formula fields, replace {f_fieldName} with input
        const placeholder = `{f_${field.fieldName}}`;
        const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedPlaceholder, 'g');
        
        const beforeCount = (updatedContent.match(regex) || []).length;
        updatedContent = updatedContent.replace(regex, replacement);
        const afterCount = (updatedContent.match(regex) || []).length;
        console.log(`Replaced formula placeholder "${placeholder}": ${beforeCount} matches found, ${afterCount} remaining`);
      } else {
        // For normal fields, replace the formula placeholder
        const escapedFormula = field.formula.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedFormula, 'g');
        
        const beforeCount = (updatedContent.match(regex) || []).length;
        updatedContent = updatedContent.replace(regex, replacement);
        const afterCount = (updatedContent.match(regex) || []).length;
        console.log(`Replaced "${field.formula}": ${beforeCount} matches found, ${afterCount} remaining`);
      }
    });

    console.log('Updating container innerHTML...');
    containerRef.current.innerHTML = updatedContent;

    // Add event listeners for formula updates
    const inputs = containerRef.current.querySelectorAll('.form-input');
    console.log('Found inputs:', inputs.length);
    inputs.forEach(input => {
      if (input.dataset.fieldType !== 'f') {
        input.addEventListener('input', () => {
          setTimeout(() => updateFormulaFields(), 100);
        });
      }
    });
  };

  const populateFormData = (savedData) => {
    if (!containerRef.current || !savedData || !savedData.fieldValues) return;

    const inputs = containerRef.current.querySelectorAll('.form-input');
    inputs.forEach(input => {
      const fieldName = input.dataset.fieldName;
      const savedField = savedData.fieldValues.find(f => f.fieldName === fieldName);

      if (savedField && savedField.value) {
        switch (input.dataset.fieldType?.toLowerCase()) {
          case 'c': // checkbox
            input.checked = savedField.value === 'true' || savedField.value === true;
            break;
          default:
            input.value = savedField.value;
            break;
        }

        // Trigger change event để update formula fields
        const event = new Event('input', { bubbles: true });
        input.dispatchEvent(event);
      }
    });

    // Cập nhật formula fields sau khi populate
    setTimeout(() => updateFormulaFields(), 200);
  };

  const validateForm = () => {
    if (!containerRef.current) return { isValid: true, errors: [] };

    const errors = [];
    const inputs = containerRef.current.querySelectorAll('.form-input');
    const fieldValueMap = new Map();

    inputs.forEach((input) => {
      const fieldName = input.dataset.fieldName;
      let value = '';

      switch (input.dataset.fieldType?.toLowerCase()) {
        case 'c': // checkbox
          value = input.checked;
          break;
        case 's': // select
          value = input.value;
          break;
        case 'dt': // date
          value = input.value?.trim() || '';
          break;
        case 'n': // number
          value = input.value?.trim() || '';
          break;
        case 't': // text
          value = input.value?.trim() || '';
          break;
        case 'f': // formula
          value = input.value?.trim() || '';
          break;
        default:
          value = input.value?.trim() || '';
          break;
      }

      fieldValueMap.set(fieldName, value);
    });

    formFields.forEach((fieldInfo) => {
      const fieldName = fieldInfo.fieldName;
      const fieldValue = fieldValueMap.get(fieldName);

      if (fieldInfo.isRequired && (!fieldValue || fieldValue === '')) {
        errors.push(`Trường "${fieldInfo.fieldName}" là bắt buộc`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  };

  const showValidationErrors = (errors) => {
    modal.error({
      title: 'Lỗi kiểm tra dữ liệu',
      content: (
        <div>
          <p>Vui lòng kiểm tra lại các trường sau:</p>
          <ul>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )
    });
  };

  const handleSaveAndExport = async () => {
    try {
      // Debug form state first
      debugFormState();

      // Validate form trước khi lưu
      const validationResult = validateForm();

      if (!validationResult.isValid) {
        showValidationErrors(validationResult.errors);
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
              fieldType = 'n';
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

      // Sau khi lưu thành công, tiến hành xuất PDF
      await handleExportPDF();

    } catch (err) {
      console.error('Error saving form:', err);
      message.error('Lỗi khi lưu dữ liệu form: ' + (err.response?.data?.message || err.message));
    }
  };

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

  const debugFormState = () => {
    if (!containerRef.current) return;

    const inputs = containerRef.current.querySelectorAll('.form-input');
    const fieldValueMap = new Map();

    inputs.forEach((input, index) => {
      const fieldName = input.dataset.fieldName;
      let value = '';

      switch (input.dataset.fieldType?.toLowerCase()) {
        case 'c': // checkbox
          value = input.checked;
          break;
        case 's': // select
          value = input.value;
          break;
        case 'dt': // date
          value = input.value?.trim() || '';
          break;
        case 'n': // number
          value = input.value?.trim() || '';
          break;
        case 't': // text
          value = input.value?.trim() || '';
          break;
        case 'f': // formula
          value = input.value?.trim() || '';
          break;
        default:
          value = input.value?.trim() || '';
          break;
      }

      fieldValueMap.set(fieldName, value);
    });

    console.log('Current form state:', Array.from(fieldValueMap.entries()));
  };

  const handleModeChange = (checked) => {
    setIsWordMode(checked);
  };

  return (
    <AppLayout>
      <div className="preview-page">
        <Spin spinning={loading}>
          <div className="page-header">
            <div className="page-title">
              <div className="form-title">
                {formInfo ? formInfo.formName : 'Điền form'}
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
              <Button onClick={() => navigate('/all-form')}>Về danh sách</Button>
            </div>
          </div>

          <div className="form-actions">
            <div className="action-buttons">
              <Button 
                type="primary" 
                className="save-btn" 
                onClick={handleSaveAndExport}
                loading={isExportingPDF}
                disabled={isExportingPDF}
              >
                {isExportingPDF ? 'Đang xử lý...' : 'Lưu dữ liệu và xuất PDF'}
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
            <Button onClick={() => navigate('/all-form')}>Về danh sách</Button>
            <Button 
              type="primary" 
              className="save-btn" 
              onClick={handleSaveAndExport}
              loading={isExportingPDF}
              disabled={isExportingPDF}
            >
              {isExportingPDF ? 'Đang xử lý...' : 'Lưu dữ liệu và xuất PDF'}
            </Button>
          </div>
        </Spin>
      </div>
    </AppLayout>
  );
};

export default FillFormPage; 