import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Spin, Switch, DatePicker, App } from 'antd';
import mammoth from 'mammoth';
import html2pdf from 'html2pdf.js';
import formService from '../services/formService';
import AppLayout from '../components/layout/AppLayout';
import './PreviewFormPage.css';

const PreviewFormPage = () => {
  const { formId } = useParams();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [isWordMode, setIsWordMode] = useState(false);
  const [wordContent, setWordContent] = useState('');
  const [formInfo, setFormInfo] = useState(null);
  const [formFields, setFormFields] = useState([]);
  const [savedFormData, setSavedFormData] = useState(null);
  const containerRef = useRef(null);

  // Function để tính toán công thức
  const calculateFormula = (formula, fieldValues, formFieldsData = formFields) => {
    try {
      if (!formula) return '';
      
      console.log('Calculating formula:', formula, 'with values:', fieldValues);
      
      let calculatedFormula = formula;
      
      // Thay thế các biến [fieldName] bằng giá trị thực
      const variableMatches = formula.match(/\[([^\]]+)\]/g);
      if (variableMatches) {
        variableMatches.forEach(match => {
          const fieldName = match.slice(1, -1); // Bỏ dấu []
          let value = fieldValues[fieldName];
          
          // Nếu không tìm thấy field name trực tiếp, thử map với logic tự động
          if (value === undefined) {
            // Kiểm tra xem có formFieldsData không
            if (!formFieldsData || formFieldsData.length === 0) {
              console.log('No formFieldsData available for mapping');
              value = 0; // Fallback value
            } else {
              // Lấy danh sách các fields không phải Formula từ formFields (theo thứ tự API)
              const nonFormulaFields = formFieldsData
                .filter(f => f.fieldType !== 'Formula')
                .map(f => f.fieldName);
              
              console.log('Non-formula fields from API:', nonFormulaFields);
              console.log('Available field values:', Object.keys(fieldValues));
              console.log('Looking for field:', fieldName);
            
                          // Tự động map dựa trên pattern a1, a2, a3... với thứ tự fields
              const match = fieldName.match(/^a(\d+)$/);
              if (match) {
                const index = parseInt(match[1]) - 1; // a1 -> index 0, a2 -> index 1, ...
                if (index >= 0 && index < nonFormulaFields.length) {
                  const targetFieldName = nonFormulaFields[index];
                  value = fieldValues[targetFieldName];
                  console.log(`Auto-mapped ${fieldName} (index ${index}) -> ${targetFieldName} = ${value}`);
                }
              }
            }
          }
          
          // Xử lý các loại giá trị khác nhau
          if (value === undefined || value === null || value === '') {
            value = 0;
          } else if (typeof value === 'string') {
            // Thử parse thành số
            const numValue = parseFloat(value);
            value = isNaN(numValue) ? 0 : numValue;
          } else if (typeof value === 'boolean') {
            value = value ? 1 : 0;
          }
          
          calculatedFormula = calculatedFormula.replace(new RegExp('\\[' + fieldName + '\\]', 'g'), value);
        });
      }
      
      console.log('Formula after variable replacement:', calculatedFormula);
      
      // Xử lý các hàm Math (đảm bảo Math object có sẵn)
      calculatedFormula = calculatedFormula.replace(/Math\.(\w+)\(/g, 'Math.$1(');
      
      // Đánh giá biểu thức một cách an toàn
      const result = Function('"use strict"; return (' + calculatedFormula + ')')();
      
      console.log('Calculation result:', result);
      
      // Làm tròn kết quả nếu là số
      if (typeof result === 'number' && !isNaN(result)) {
        return Math.round(result * 100) / 100; // Làm tròn 2 chữ số thập phân
      }
      
      return result;
    } catch (error) {
      console.error('Error calculating formula:', error, 'Formula:', formula);
      return 'Lỗi tính toán';
    }
  };

  // Function để cập nhật tất cả các formula fields
  const updateFormulaFields = () => {
    if (!containerRef.current) return;
    
    console.log('Updating formula fields...');
    
    // Lấy tất cả giá trị hiện tại từ form
    const fieldValues = {};
    const inputs = containerRef.current.querySelectorAll('.form-input');
    inputs.forEach(input => {
      const fieldName = input.dataset.fieldName;
      if (fieldName && input.dataset.fieldType !== 'f') {
        let value = '';
        
        switch (input.dataset.fieldType?.toLowerCase()) {
          case 'c': // checkbox
            value = input.checked ? 1 : 0;
            break;
          case 'd': // number hoặc date
            if (input.type === 'date') {
              value = input.value || '';
            } else {
              const numValue = parseFloat(input.value);
              value = isNaN(numValue) ? 0 : numValue;
            }
            break;
          case 'dt': // date
            value = input.value || '';
            break;
          case 's': // select
            value = input.value || '';
            break;
          case 't': // text
          default:
            value = input.value || '';
            // Thử parse thành số nếu có thể
            const numValue = parseFloat(value);
            if (!isNaN(numValue) && value.trim() !== '') {
              value = numValue;
            }
            break;
        }
        
        console.log(`Field ${fieldName} (type: ${input.dataset.fieldType}) has value:`, value);
        
        fieldValues[fieldName] = value;
      }
    });
    
    console.log('Current field values:', fieldValues);
    
    // Cập nhật các formula fields
    const formulaInputs = containerRef.current.querySelectorAll('.form-input[data-field-type="f"]');
    console.log('Found formula inputs:', formulaInputs.length);
    
    formulaInputs.forEach(input => {
      const fieldName = input.dataset.fieldName;
      console.log('Processing formula field:', fieldName);
      console.log('Available formFields:', formFields);
      console.log('Looking for field with name:', fieldName);
      
      const fieldInfo = formFields.find(f => f.fieldName === fieldName);
      console.log('Found fieldInfo:', fieldInfo);
      
      if (fieldInfo && fieldInfo.formula) {
        console.log('Found field info with formula:', fieldInfo.formula);
        const result = calculateFormula(fieldInfo.formula, fieldValues, formFields);
        input.value = result;
        console.log('Updated formula field', fieldName, 'with result:', result);
        
        // Thêm visual feedback để thấy field đã được update
        input.style.backgroundColor = '#e6f7ff';
        input.style.borderColor = '#1890ff';
        setTimeout(() => {
          input.style.backgroundColor = '#f0f9ff';
          input.style.borderColor = '#d1d5db';
        }, 300);
      } else {
        console.log('No field info or formula found for:', fieldName);
        console.log('Reason: fieldInfo exists?', !!fieldInfo, 'has formula?', fieldInfo?.formula);
      }
    });
  };

  // Function để populate dữ liệu đã lưu vào form
  const populateFormData = (savedData) => {
    if (!containerRef.current || !savedData || !savedData.fieldValues) return;
    
    console.log('Populating form with saved data:', savedData);
    
    const inputs = containerRef.current.querySelectorAll('.form-input');
    inputs.forEach(input => {
      const fieldName = input.dataset.fieldName;
      const savedField = savedData.fieldValues.find(f => f.fieldName === fieldName);
      
      if (savedField && savedField.value) {
        console.log(`Setting ${fieldName} = ${savedField.value}`);
        
        switch (input.dataset.fieldType?.toLowerCase()) {
          case 'c': // checkbox
            input.checked = savedField.value === 'true';
            break;
          case 's': // select
            input.value = savedField.value;
            break;
          case 'd': // number
          case 'dt': // date
          case 't': // text
          case 'f': // formula
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

    const createInputElement = (fieldType, fieldName) => {
    let element;
    console.log('Creating input element:', { fieldType, fieldName }); // Debug log
    
    // Map field type từ API sang internal field type
    let internalFieldType = fieldType.toLowerCase();
    if (fieldType === 'Number' || fieldType === 'number') internalFieldType = 'd';
    if (fieldType === 'Formula' || fieldType === 'formula') internalFieldType = 'f';
    if (fieldType === 'Text' || fieldType === 'text') internalFieldType = 't';
    if (fieldType === 'Boolean' || fieldType === 'boolean') internalFieldType = 'c';
    if (fieldType === 'Date' || fieldType === 'date') internalFieldType = 'dt';
    if (fieldType === 'Select' || fieldType === 'select') internalFieldType = 's';
    
    console.log(`Mapping fieldType ${fieldType} to internalFieldType ${internalFieldType} for field ${fieldName}`);
    
    // Kiểm tra nếu fieldName chứa "date" thì tạo date input
    const isDateField = fieldName.toLowerCase().includes('date') || 
                       fieldName.toLowerCase().includes('ngay') ||
                       internalFieldType === 'dt';
    
    switch (internalFieldType) {
      case 't': // text
        element = document.createElement('input');
        element.type = 'text';
        element.className = 'form-input text-input';
        break;
        
      case 's': // select
        element = document.createElement('select');
        element.className = 'form-input select-input';
        // Thêm option mặc định
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '-- Chọn --';
        element.appendChild(defaultOption);
        // Có thể thêm các option khác dựa trên fieldName hoặc config
        break;
        
      case 'c': // checkbox
        element = document.createElement('input');
        element.type = 'checkbox';
        element.className = 'form-input checkbox-input';
        break;
        
      case 'd': // number hoặc date
        element = document.createElement('input');
        if (isDateField) {
          element.type = 'date';
          element.className = 'form-input date-input';
          console.log('Creating date input for field:', fieldName);
        } else {
          element.type = 'number';
          element.className = 'form-input number-input';
        }
        break;
        
      case 'dt': // date
        element = document.createElement('input');
        element.type = 'date';
        element.className = 'form-input date-input';
        break;
        
      case 'f': // formula (readonly text input)
        element = document.createElement('input');
        element.type = 'text';
        element.className = 'form-input formula-input';
        element.placeholder = 'Tự động tính toán...';
        element.readOnly = true;
        element.style.backgroundColor = '#f0f9ff';
        element.style.borderColor = '#1890ff';
        element.style.cursor = 'not-allowed';
        element.style.fontWeight = 'bold';
        element.style.color = '#1890ff';
        element.style.textAlign = 'center';
        break;
        
      default:
        // Mặc định là text input
        element = document.createElement('input');
        element.type = 'text';
        element.className = 'form-input text-input';
        break;
    }
    
    element.dataset.fieldType = internalFieldType;
    element.dataset.fieldName = fieldName;
    element.dataset.originalFieldType = fieldType; // Lưu field type gốc từ API
    
    // Thêm event listener để tự động tính toán formula khi có thay đổi
    if (internalFieldType !== 'f') {
      // Sử dụng nhiều events để đảm bảo capture được mọi thay đổi
      const events = ['input', 'change', 'keyup', 'blur'];
      
      events.forEach(eventType => {
        element.addEventListener(eventType, (e) => {
          console.log(`${eventType} event: ${fieldName} = ${e.target.value}`);
          // Delay để đảm bảo giá trị đã được cập nhật trong DOM
          setTimeout(() => updateFormulaFields(), 50);
        });
      });
    }
    
    return element;
  };

  const makeFieldsEditable = () => {
    if (!containerRef.current) return;

    // Tìm tất cả text nodes có chứa placeholder
    const walk = document.createTreeWalker(
      containerRef.current,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          return node.textContent.match(/\{[a-z]+_[^}]+\}/i)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP;
        }
      }
    );

    let node;
    let placeholders = [];
    while (node = walk.nextNode()) {
      placeholders.push({
        node,
        text: node.textContent
      });
    }

    // Thay thế các placeholder bằng input tương ứng
    placeholders.forEach(({ node, text }) => {
      const matches = text.match(/\{([a-z]+)_([^}]+)\}/i);
      if (!matches) return;

      const fieldType = matches[1];
      const fieldName = matches[2];
      console.log('Found field:', { fieldType, fieldName, text }); // Debug log
      
      // Tìm field info từ API để lấy field type chính xác
      const fieldInfo = formFields.find(f => f.fieldName === fieldName);
      const actualFieldType = fieldInfo ? fieldInfo.fieldType : fieldType;
      console.log('Field info from API:', fieldInfo);
      
      const inputElement = createInputElement(actualFieldType, fieldName);

      // Nếu placeholder nằm trong text node có nhiều nội dung khác
      if (text.length > matches[0].length) {
        const span = document.createElement('span');
        span.className = 'input-wrapper';
        span.innerHTML = text.replace(matches[0], '');
        span.appendChild(inputElement);
        node.parentNode.replaceChild(span, node);
      } else {
        // Nếu text node chỉ chứa mỗi placeholder
        const span = document.createElement('span');
        span.className = 'input-wrapper';
        span.appendChild(inputElement);
        node.parentNode.replaceChild(span, node);
      }
    });

    // Lấy tất cả các cell có text cố định và thêm vào formFields
    const cells = containerRef.current.querySelectorAll('td');
    cells.forEach(cell => {
      const text = cell.textContent.trim();
      if (text && !text.match(/\{[a-z]+_[^}]+\}/i)) {
        const nextCell = cell.nextElementSibling;
        if (nextCell && nextCell.querySelector('.form-input')) {
          const input = nextCell.querySelector('.form-input');
          input.dataset.label = text;
        }
      }
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch form information, form fields, Word file và saved data song song
        const [formInfoResponse, formFieldsResponse, wordFile, savedDataResponse] = await Promise.all([
          formService.getFormInfo(formId),
          formService.getFormFields(formId),
          formService.getWordFile(formId),
          formService.getLatestFormData(formId).catch(err => {
            // Nếu không có dữ liệu đã lưu (404), không báo lỗi
            if (err.response?.status === 404) {
              console.log('No saved data found for this form');
              return null;
            }
            throw err;
          })
        ]);
        
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
        
        // Convert Word to HTML using mammoth
        const result = await mammoth.convertToHtml({ arrayBuffer: wordFile });
        setWordContent(result.value);
        
        if (containerRef.current) {
          containerRef.current.innerHTML = result.value;
          makeFieldsEditable();
          
          // Populate saved data nếu có
          if (savedDataResponse && savedDataResponse.data) {
            setTimeout(() => populateFormData(savedDataResponse.data), 500);
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

  // Separate useEffect để handle formula calculation khi formFields đã sẵn sàng
  useEffect(() => {
    if (formFields.length > 0 && containerRef.current) {
      console.log('FormFields updated, running formula calculation...');
      // Chạy nhiều lần để đảm bảo
      setTimeout(() => updateFormulaFields(), 100);
      setTimeout(() => updateFormulaFields(), 500);
      setTimeout(() => updateFormulaFields(), 1000);
    }
  }, [formFields]);

  // Thêm useEffect để setup event delegation cho dynamic content
  useEffect(() => {
    if (!containerRef.current) return;

    const handleInputChange = (e) => {
      const target = e.target;
      if (target.classList.contains('form-input') && target.dataset.fieldType !== 'f') {
        console.log(`Delegation event ${e.type}: ${target.dataset.fieldName} = ${target.value}`);
        setTimeout(() => updateFormulaFields(), 50);
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
  }, [wordContent]); // Re-setup khi wordContent thay đổi

  const handleSave = async () => {
    try {
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

  const handleExportPDF = async () => {
    try {
      // Lấy tất cả dữ liệu từ form
      const formData = [];
      const inputs = containerRef.current.querySelectorAll('.form-input');
      inputs.forEach((input) => {
        const label = input.dataset.label || input.dataset.fieldName;
        const fieldType = input.dataset.fieldType;
        let value = '';
        
        // Xử lý giá trị dựa trên loại field
        const isDateField = input.type === 'date' || 
                           input.dataset.fieldName?.toLowerCase().includes('date') || 
                           input.dataset.fieldName?.toLowerCase().includes('ngay');
        
        switch (fieldType?.toLowerCase()) {
          case 'c': // checkbox
            value = input.checked ? 'true' : 'false';
            break;
          case 's': // select
            value = input.value || '';
            break;
          case 'd': // number hoặc date
            if (isDateField) {
              value = input.value || '';
            } else {
              value = input.value || '0';
            }
            break;
          case 'dt': // date
            value = input.value || '';
            break;
          case 'f': // formula
            value = input.value || input.placeholder || '';
            break;
          case 't': // text
          default:
            value = input.value || '';
            break;
        }
        
        formData.push({
          fieldName: input.dataset.fieldName,
          fieldType: fieldType,
          label: label,
          value: value
        });
      });

      // Tạo HTML content với dữ liệu đã điền
      const printContent = containerRef.current.cloneNode(true);
      
      // Thay thế tất cả input bằng text hiển thị giá trị
      const inputs_clone = printContent.querySelectorAll('.form-input');
      inputs_clone.forEach((input, index) => {
        const originalInput = inputs[index];
        let displayValue = '';
        
        if (originalInput.type === 'checkbox') {
          displayValue = originalInput.checked ? '☑ Có' : '☐ Không';
        } else if (originalInput.type === 'date') {
          if (originalInput.value) {
            const date = new Date(originalInput.value);
            displayValue = date.toLocaleDateString('vi-VN');
          }
        } else {
          displayValue = originalInput.value || '';
        }
        
        const span = document.createElement('span');
        span.textContent = displayValue;
        span.style.borderBottom = '1px solid #000';
        span.style.minWidth = '100px';
        span.style.display = 'inline-block';
        span.style.padding = '2px 4px';
        span.style.fontWeight = 'bold';
        input.parentNode.replaceChild(span, input);
      });

      // Tạo HTML hoàn chỉnh cho trang mới
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${formInfo?.formName || 'Form'} - Preview</title>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              line-height: 1.4;
              background-color: #2f2f2f;
              overflow-x: auto;
              min-height: 100vh;
            }
            .container {
              max-width: 210mm;
              margin: 20px auto;
              background-color: white;
              padding: 20mm;
              box-shadow: 0 4px 20px rgba(0,0,0,0.3);
              zoom: 1.3;
              transform-origin: top center;
              min-height: calc(100vh - 40px);
            }
            
            /* Responsive zoom cho các màn hình khác nhau */
            @media screen and (min-width: 1600px) {
              .container {
                zoom: 1.5;
              }
            }
            
            @media screen and (min-width: 1920px) {
              .container {
                zoom: 1.7;
              }
            }
            
            @media screen and (max-width: 1400px) {
              .container {
                zoom: 1.1;
              }
            }
            
            @media screen and (max-width: 1200px) {
              .container {
                zoom: 1.0;
                margin: 10px;
              }
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #1890ff;
              padding-bottom: 20px;
            }
            .form-title {
              font-size: 24px;
              font-weight: bold;
              color: #1890ff;
              margin-bottom: 10px;
            }
            .form-info {
              font-size: 14px;
              color: #666;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            td, th {
              border: 1px solid #000;
              padding: 8px;
              vertical-align: middle;
              font-size: 12px;
            }
            .actions {
              position: fixed;
              top: 20px;
              right: 20px;
              z-index: 1000;
              background: rgba(255, 255, 255, 0.95);
              padding: 15px;
              border-radius: 8px;
              box-shadow: 0 4px 15px rgba(0,0,0,0.2);
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255,255,255,0.3);
            }
            .btn {
              padding: 8px 16px;
              margin: 0 5px;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
            }
            .btn-primary {
              background-color: #1890ff;
              color: white;
            }
            .btn-secondary {
              background-color: #52c41a;
              color: white;
            }
            .btn-default {
              background-color: #f0f0f0;
              color: #333;
            }
            @media print {
              .actions {
                display: none !important;
              }
              body {
                background-color: white;
              }
              .container {
                box-shadow: none;
                margin: 0;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="actions">
            <button class="btn btn-primary" onclick="downloadPDF()">Tải PDF</button>
            <button class="btn btn-secondary" onclick="window.print()">In</button>
            <button class="btn" onclick="toggleFullscreen()" style="background-color: #722ed1; color: white;">Full Screen</button>
            <button class="btn btn-default" onclick="window.close()">Đóng</button>
          </div>
          
          <div class="container" id="content">
            <div class="header">
              <div class="form-title">${formInfo?.formName || 'Form'}</div>
              <div class="form-info">
                <div>Danh mục: ${formInfo?.categoryName || ''}</div>
                <div>Ngày tạo: ${formInfo?.createdAt ? new Date(formInfo.createdAt).toLocaleDateString('vi-VN') : ''}</div>
                <div>Ngày xuất: ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}</div>
              </div>
            </div>
            ${printContent.innerHTML}
          </div>

          <script>
            // Auto fit window to screen on load
            window.addEventListener('load', function() {
              if (window.outerHeight < screen.height * 0.9 || window.outerWidth < screen.width * 0.9) {
                window.moveTo(0, 0);
                window.resizeTo(screen.width, screen.height);
              }
            });

            function toggleFullscreen() {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                  console.log('Error attempting to enable fullscreen:', err.message);
                });
              } else {
                document.exitFullscreen();
              }
            }

            function downloadPDF() {
              const element = document.getElementById('content');
              const formName = '${formInfo?.formName || 'form'}';
              const timestamp = new Date().toISOString().slice(0, 10);
              
              const opt = {
                margin: [10, 10, 10, 10],
                filename: formName + '_' + timestamp + '.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                  scale: 2,
                  useCORS: true,
                  letterRendering: true,
                  allowTaint: true
                },
                jsPDF: { 
                  unit: 'mm', 
                  format: 'a4', 
                  orientation: 'portrait',
                  compress: true
                }
              };
              
              html2pdf().set(opt).from(element).save();
            }
          </script>
        </body>
        </html>
      `;

      // Mở tab mới với nội dung preview full screen
      const newWindow = window.open('', '_blank', 'width=' + screen.width + ',height=' + screen.height + ',fullscreen=yes,scrollbars=yes');
      newWindow.document.write(htmlContent);
      newWindow.document.close();
      
      // Thử maximize window nếu browser hỗ trợ
      if (newWindow.outerHeight < screen.height || newWindow.outerWidth < screen.width) {
        newWindow.moveTo(0, 0);
        newWindow.resizeTo(screen.width, screen.height);
      }
      
      message.success('Đã mở trang preview PDF!');
      
    } catch (error) {
      console.error('Error creating PDF preview:', error);
      message.error('Lỗi khi tạo preview PDF');
    }
  };

  const handleComplete = () => {
    message.success('Hoàn thành cấu hình');
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
              <Button>Quay lại cấu hình</Button>
              <Button href="/manage-form">Về danh sách</Button>
            </div>
          </div>

          <div className="form-actions">
            <div className="action-buttons">
              <Button type="primary" className="save-btn" onClick={handleSave}>Lưu dữ liệu</Button>
              <Button className="export-btn" onClick={handleExportPDF}>Xuất PDF</Button>
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
            <Button type="primary" className="export-btn" onClick={handleExportPDF}>Xuất PDF</Button>
          </div>
        </Spin>
      </div>
    </AppLayout>
  );
};

export default PreviewFormPage; 