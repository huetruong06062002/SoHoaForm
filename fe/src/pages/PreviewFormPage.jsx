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
            console.log(`Checkbox ${fieldName} value: ${input.checked} -> ${value}`);
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
            // Xử lý multiple formats cho boolean values
            const boolValue = savedField.value === 'true' || 
                            savedField.value === true || 
                            savedField.value === '1' || 
                            savedField.value === 1;
            input.checked = boolValue;
            console.log(`Checkbox ${fieldName}: ${savedField.value} -> ${boolValue}`);
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

  const createInputElement = (fieldType, fieldName, fieldInfo = null, formFieldsData = formFields) => {
    let element;
    console.log('Creating input element:', { fieldType, fieldName, formFieldsDataLength: formFieldsData.length }); // Debug log
    
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
        // Tạo dropdown select
        element = document.createElement('select');
        element.className = 'form-input select-input';
        
        // Tìm field info từ API để lấy formula
        console.log(`Looking for field ${fieldName} in formFields array:`, {
          formFieldsLength: formFieldsData.length,
          availableFieldNames: formFieldsData.map(f => f.fieldName),
          fieldInfoParam: fieldInfo
        });
        
        const currentFieldInfo = fieldInfo || formFieldsData.find(f => f.fieldName === fieldName);
        
        console.log(`Processing select field ${fieldName}:`, {
          currentFieldInfo: currentFieldInfo,
          formula: currentFieldInfo?.formula,
          fieldType: currentFieldInfo?.fieldType,
          foundField: !!currentFieldInfo
        });
        
        // Xử lý options dựa trên formula
        if (currentFieldInfo && currentFieldInfo.formula && currentFieldInfo.fieldType?.toLowerCase() === 'select') {
          console.log(`Found field info for ${fieldName}, processing options...`);
          console.log(`Field info details:`, {
            fieldName: currentFieldInfo.fieldName,
            fieldType: currentFieldInfo.fieldType,
            formula: currentFieldInfo.formula,
            formulaLength: currentFieldInfo.formula.length
          });
          
          // Kiểm tra nếu formula KHÔNG phải pattern {s_...} thì parse custom options
          if (!currentFieldInfo.formula.match(/^\{s_.*\}$/)) {
            console.log(`Select field ${fieldName} has custom formula: "${currentFieldInfo.formula}"`);
            
            // Parse options từ formula
            let options = [];
            
            // Method 1: Split by comma hoặc newline
            if (currentFieldInfo.formula.includes(',')) {
              options = currentFieldInfo.formula.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
              console.log(`Method 1: Split by comma, found ${options.length} options:`, options);
            } else if (currentFieldInfo.formula.includes('\n')) {
              options = currentFieldInfo.formula.split('\n').map(opt => opt.trim()).filter(opt => opt.length > 0);
              console.log(`Method 2: Split by newline, found ${options.length} options:`, options);
            } else if (currentFieldInfo.formula.trim().length > 0 && !currentFieldInfo.formula.includes('{')) {
              // Method 3: Single option (như "Lựa chọn 1")
              options = [currentFieldInfo.formula.trim()];
              console.log(`Method 3: Single option from formula: "${currentFieldInfo.formula}" -> options:`, options);
            }
            
            console.log(`Final parsed ${options.length} custom options for ${fieldName}:`, options);
            
            // Thêm custom options vào select (không có option "-- Chọn --")
            options.forEach((optionText, index) => {
              const option = document.createElement('option');
              option.value = optionText;
              option.textContent = optionText;
              element.appendChild(option);
              console.log(`Added custom option: "${optionText}" to ${fieldName}`);
            });
            
            // Mặc định chọn option đầu tiên
            if (options.length > 0) {
              element.value = options[0];
              console.log(`Set default value for ${fieldName}: "${options[0]}"`);
            }
            
            // Debug final select state
            console.log(`Final select for ${fieldName} has ${element.options.length} options:`, [...element.options].map(opt => opt.value));
          } else {
            console.log(`Select field ${fieldName} has {s_...} pattern, adding Pass/Fail/N/A options`);
            // Chỉ thêm Pass/Fail/N/A cho pattern {s_...}
            const defaultOptions = ['Pass', 'Fail', 'N/A'];
            defaultOptions.forEach(optionText => {
              const option = document.createElement('option');
              option.value = optionText;
              option.textContent = optionText;
              element.appendChild(option);
            });
          }
        } else {
          console.log(`Select field ${fieldName} no custom info found - currentFieldInfo:`, currentFieldInfo);
          // Nếu không có field info hoặc không có formula, chỉ để option "-- Chọn --" thôi
          console.log(`Select field ${fieldName} will only have "-- Chọn --" option`);
        }
        break;
        
      case 'c': // checkbox
        element = document.createElement('input');
        element.type = 'checkbox';
        element.className = 'form-input checkbox-input';
        // Thêm inline styles để đảm bảo hiển thị đúng
        element.style.display = 'inline';
        element.style.verticalAlign = 'middle';
        element.style.margin = '0 4px';
        element.style.width = '16px';
        element.style.height = '16px';
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

  const fixInlineLayout = () => {
    if (!containerRef.current) return;

    console.log('Fixing inline layout...');
    
    // Method: Tìm các field cần ghép và restructure DOM
    const content = containerRef.current;
    
    // Tìm tất cả elements chứa field labels
    const allElements = content.querySelectorAll('*');
    const fieldElements = [];
    
    allElements.forEach(el => {
      const text = el.textContent || '';
      if (text.includes('Name:') || text.includes('EID:') || 
          text.includes('Date:') || text.includes('Duration') || 
          text.includes('Venue:')) {
        fieldElements.push(el);
      }
    });
    
    console.log('Found field elements:', fieldElements.length);
    
    // Strategy: Gom các field cùng dòng vào container riêng
    fieldElements.forEach(el => {
      const text = el.textContent || '';
      
             // Nếu element chứa cả Name và EID -> đảm bảo inline nhưng responsive
       if (text.includes('Name:') && text.includes('EID:')) {
         el.style.display = 'block';
         el.style.whiteSpace = 'normal'; // Cho phép wrap trên mobile
         el.style.marginBottom = '12px';
         el.style.overflow = 'visible';
         console.log('Fixed Name+EID line');
       }
       // Nếu element chứa cả Date và Duration -> đảm bảo inline nhưng responsive  
       else if (text.includes('Date:') && text.includes('Duration')) {
         el.style.display = 'block';
         el.style.whiteSpace = 'normal'; // Cho phép wrap trên mobile
         el.style.marginBottom = '12px';
         el.style.overflow = 'visible';
         console.log('Fixed Date+Duration line');
       }
      // Venue riêng dòng
      else if (text.includes('Venue:') && !text.includes('Duration')) {
        el.style.display = 'block';
        el.style.marginBottom = '12px';
        console.log('Fixed Venue line');
      }
    });
    
    // Đảm bảo inputs trong các dòng này display inline - nhưng không override CSS
    const inputs = content.querySelectorAll('.form-input');
    inputs.forEach(input => {
      // Chỉ set inline styles nếu chưa có từ CSS
      if (!input.style.display) {
        input.style.display = 'inline-block';
      }
      if (!input.style.verticalAlign) {
        input.style.verticalAlign = 'middle';
      }
    });
    
    console.log('Fixed inline layout');
  };

  const makeFieldsEditable = () => {
    if (!containerRef.current) return;
    
    console.log('makeFieldsEditable called, current formFields:', formFields.length);

    // Kiểm tra xem đã có input elements chưa
    const existingInputs = containerRef.current.querySelectorAll('.form-input');
    console.log('Existing inputs found:', existingInputs.length);
    
    if (existingInputs.length > 0 && formFields.length > 0) {
      console.log('Found existing inputs AND formFields, updating select options...');
      
      // Update existing select elements với data từ formFields
      const selectInputs = containerRef.current.querySelectorAll('select.form-input');
      console.log('Found select inputs:', selectInputs.length);
      
      selectInputs.forEach(select => {
        const fieldName = select.dataset.fieldName;
        console.log(`Checking select field: ${fieldName}`);
        const fieldInfo = formFields.find(f => f.fieldName === fieldName);
        console.log(`Field info for ${fieldName}:`, fieldInfo);
        
        if (fieldInfo && fieldInfo.fieldType?.toLowerCase() === 'select' && fieldInfo.formula) {
          console.log(`Updating select options for ${fieldName} with formula: "${fieldInfo.formula}"`);
          
          // Kiểm tra nếu formula KHÔNG phải pattern {s_...} thì thay thế options
          if (!fieldInfo.formula.match(/^\{s_.*\}$/)) {
            console.log(`Select field ${fieldName} has custom formula, replacing options...`);
            
            // Lưu giá trị hiện tại
            const currentValue = select.value;
            
            // Xóa tất cả options
            select.innerHTML = '';
            
            // Parse options từ formula
            let options = [];
            
            if (fieldInfo.formula.includes(',')) {
              options = fieldInfo.formula.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
            } else if (fieldInfo.formula.includes('\n')) {
              options = fieldInfo.formula.split('\n').map(opt => opt.trim()).filter(opt => opt.length > 0);
            } else if (fieldInfo.formula.trim().length > 0 && !fieldInfo.formula.includes('{')) {
              options = [fieldInfo.formula.trim()];
            }
            
            console.log(`Adding ${options.length} custom options for ${fieldName}:`, options);
            
            // Thêm custom options (không có option "-- Chọn --")
            options.forEach(optionText => {
              const option = document.createElement('option');
              option.value = optionText;
              option.textContent = optionText;
              select.appendChild(option);
              console.log(`Added option "${optionText}" to ${fieldName}`);
            });
            
            console.log(`Final options for ${fieldName}:`, [...select.options].map(opt => opt.value));
            
            // Khôi phục giá trị đã chọn nếu còn hợp lệ, không thì chọn option đầu tiên
            if (currentValue && [...select.options].some(opt => opt.value === currentValue)) {
              select.value = currentValue;
            } else if (options.length > 0) {
              select.value = options[0];
              console.log(`Set default value for ${fieldName}: "${options[0]}"`);
            }
          } else {
            console.log(`Select field ${fieldName} has {s_...} pattern, keeping only "-- Chọn --" option`);
            // Không thêm Pass/Fail/N/A, chỉ giữ option "-- Chọn --"
          }
        } else {
          console.log(`No field info found for select ${fieldName} or not a select field`);
        }
      });
      
      return; // Chỉ return khi đã có cả inputs và formFields
    }
    
    // Nếu chưa có inputs hoặc chưa có formFields, tiếp tục tạo inputs mới
    console.log('Creating new inputs or waiting for formFields...');

    // Đơn giản hóa: thay thế trực tiếp bằng regex trong innerHTML
    let htmlContent = containerRef.current.innerHTML;
    console.log('Original HTML length:', htmlContent.length);

    // Tìm tất cả placeholders
    const placeholderPattern = /\{([a-z]+)_([^}]+)\}/gi;
    let match;
    const foundPlaceholders = new Set(); // Dùng Set để tránh duplicate
    const replacements = [];

    while ((match = placeholderPattern.exec(htmlContent)) !== null) {
      const fullMatch = match[0];
      const fieldType = match[1];
      const fieldName = match[2];
      
      // Skip nếu đã process placeholder này rồi
      if (foundPlaceholders.has(fullMatch)) {
        console.log('Skipping duplicate placeholder:', fullMatch);
        continue;
      }
      
      foundPlaceholders.add(fullMatch);
      console.log('Found field:', { fieldType, fieldName, fullMatch });
      
      // Tìm field info từ API để lấy field type chính xác
      const fieldInfo = formFields.find(f => f.fieldName === fieldName);
      const actualFieldType = fieldInfo ? fieldInfo.fieldType : fieldType;
      console.log('Field info from API:', fieldInfo);
      
      const inputElement = createInputElement(actualFieldType, fieldName, fieldInfo, formFields);
      
      replacements.push({
        placeholder: fullMatch,
        replacement: inputElement.outerHTML
      });
    }

    // Thực hiện tất cả replacements - sử dụng replaceAll để thay thế tất cả instances
    replacements.forEach(({ placeholder, replacement }) => {
      // Escape special regex characters trong placeholder
      const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedPlaceholder, 'g');
      const beforeCount = (htmlContent.match(regex) || []).length;
      htmlContent = htmlContent.replace(regex, replacement);
      const afterCount = (htmlContent.match(regex) || []).length;
      console.log(`Replaced ${beforeCount} instances of "${placeholder}" with input, ${afterCount} remaining`);
    });

    // Cập nhật innerHTML
    containerRef.current.innerHTML = htmlContent;
    console.log('Updated HTML content');
    
    // Post-process để fix layout cho các fields cùng dòng
    fixInlineLayout();

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
        
        // Extract header từ file Word gốc và kết hợp với body
        try {
          let headerFromWord = '';
          let bodyContent = '';
          
          // Method 1: Extract header từ JSZip
          try {
            const JSZip = (await import('https://cdn.skypack.dev/jszip')).default;
            const zip = await JSZip.loadAsync(wordFile);
            
            // Đọc header files - thử tất cả các header có thể
            const headerFiles = Object.keys(zip.files).filter(name => 
              name.startsWith('word/header') || name.includes('header')
            );
            console.log('HEADER DEBUG: Found header files:', headerFiles);
            
            for (const headerFile of headerFiles) {
              const xmlContent = await zip.file(headerFile)?.async('string');
              if (xmlContent) {
                console.log(`HEADER DEBUG: Raw XML from ${headerFile}:`, xmlContent.substring(0, 800) + '...');
                
                // Extract text từ header XML - cải thiện với nhiều pattern
                const textMatches = xmlContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
                let extractedTexts = [];
                
                // Pattern 1: Standard w:t tags
                extractedTexts = textMatches.map(match => {
                  return match.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, '')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .trim();
                }).filter(text => text.length > 0);
                
                // Pattern 2: Thử extract từ instrText nếu có
                const instrMatches = xmlContent.match(/<w:instrText[^>]*>([^<]*)<\/w:instrText>/g) || [];
                instrMatches.forEach(match => {
                  const text = match.replace(/<w:instrText[^>]*>/, '').replace(/<\/w:instrText>/, '').trim();
                  if (text.length > 0) extractedTexts.push(text);
                });
                
                // Pattern 3: Thử extract từ table cells nếu header trong table
                const tableCells = xmlContent.match(/<w:tc[^>]*>.*?<\/w:tc>/gs) || [];
                tableCells.forEach(cell => {
                  const cellTexts = cell.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
                  cellTexts.forEach(cellText => {
                    const text = cellText.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, '')
                      .replace(/&amp;/g, '&').trim();
                    if (text.length > 0) extractedTexts.push(text);
                  });
                });
                
                const headerText = extractedTexts.join(' ').replace(/\s+/g, ' ').trim();
                console.log('HEADER DEBUG: Extracted text parts:', extractedTexts);
                console.log('HEADER DEBUG: Combined text:', headerText);
                
                if (headerText.length > 15) {
                  headerFromWord = headerText;
                  console.log('HEADER DEBUG: Using this header text');
                  break;
                }
              }
            }
            
            // Nếu không tìm thấy header, thử đọc từ document.xml
            if (!headerFromWord) {
              console.log('HEADER DEBUG: No header files found, trying document.xml...');
              const docXml = await zip.file('word/document.xml')?.async('string');
              if (docXml) {
                // Tìm header reference trong document
                const headerRef = docXml.match(/<w:headerReference[^>]*r:id="([^"]*)"[^>]*>/);
                if (headerRef) {
                  console.log('HEADER DEBUG: Found header reference:', headerRef[1]);
                  
                  // Đọc relationships để tìm header file
                  const relsXml = await zip.file('word/_rels/document.xml.rels')?.async('string');
                  if (relsXml) {
                    const relMatch = relsXml.match(new RegExp(`Id="${headerRef[1]}"[^>]*Target="([^"]*header[^"]*\.xml)"`));
                    if (relMatch) {
                      const headerPath = 'word/' + relMatch[1];
                      console.log('HEADER DEBUG: Found header path:', headerPath);
                      
                      const headerXml = await zip.file(headerPath)?.async('string');
                      if (headerXml) {
                        const textMatches = headerXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
                        if (textMatches) {
                          const extractedTexts = textMatches.map(match => {
                            return match.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, '').trim();
                          }).filter(text => text.length > 0);
                          
                          headerFromWord = extractedTexts.join(' ').replace(/\s+/g, ' ').trim();
                          console.log('HEADER DEBUG: Extracted from document reference:', headerFromWord);
                        }
                      }
                    }
                  }
                }
              }
            }
            
          } catch (zipError) {
            console.log('HEADER DEBUG: JSZip extraction failed:', zipError);
          }
          
          // Method 2: Get body content từ mammoth và thử extract header nếu chưa có
          try {
            const result = await mammoth.convertToHtml({ arrayBuffer: wordFile }, {
              includeDefaultStyleMap: true,
              includeEmbeddedStyleMap: true
            });
            bodyContent = result.value;
            
            // Nếu chưa tìm thấy header từ JSZip, thử tìm trong body content
            if (!headerFromWord) {
              console.log('HEADER DEBUG: Trying to extract header from mammoth body content...');
              
              // Tìm table đầu tiên có thể chứa header
              const firstTableMatch = bodyContent.match(/<table[^>]*>.*?<\/table>/is);
              if (firstTableMatch) {
                const tableContent = firstTableMatch[0];
                console.log('HEADER DEBUG: Found first table:', tableContent.substring(0, 500) + '...');
                
                // Extract text từ table cells
                const cellTexts = [];
                const cellMatches = tableContent.match(/<td[^>]*>(.*?)<\/td>/gis) || [];
                cellMatches.forEach(cellMatch => {
                  const cellText = cellMatch.replace(/<td[^>]*>/, '')
                                            .replace(/<\/td>/, '')
                                            .replace(/<[^>]*>/g, '')
                                            .replace(/&nbsp;/g, ' ')
                                            .replace(/&amp;/g, '&')
                                            .trim();
                  if (cellText.length > 0) {
                    cellTexts.push(cellText);
                  }
                });
                
                const headerFromTable = cellTexts.join(' ').replace(/\s+/g, ' ').trim();
                console.log('HEADER DEBUG: Header from table cells:', headerFromTable);
                
                if (headerFromTable.length > 20) {
                  headerFromWord = headerFromTable;
                  console.log('HEADER DEBUG: Using header from table');
                }
              }
              
              // Nếu vẫn không có, thử tìm từ các thẻ h1, h2, h3, strong đầu tiên
              if (!headerFromWord) {
                const titlePatterns = [
                  /<h[1-3][^>]*>(.*?)<\/h[1-3]>/is,
                  /<p[^>]*style="[^"]*font-weight:\s*bold[^"]*"[^>]*>(.*?)<\/p>/is,
                  /<div[^>]*style="[^"]*font-weight:\s*bold[^"]*"[^>]*>(.*?)<\/div>/is,
                  /<strong[^>]*>(.*?)<\/strong>/is
                ];
                
                for (const pattern of titlePatterns) {
                  const match = bodyContent.match(pattern);
                  if (match) {
                    const titleText = match[1].replace(/<[^>]*>/g, '')
                                            .replace(/&nbsp;/g, ' ')
                                            .replace(/&amp;/g, '&')
                                            .trim();
                    
                    if (titleText.length > 10 && titleText.toLowerCase().includes('assessment')) {
                      headerFromWord = titleText;
                      console.log('HEADER DEBUG: Using header from title element:', titleText);
                      break;
                    }
                  }
                }
              }
            }
            
          } catch (mammothError) {
            bodyContent = '<p>Error reading Word file body content</p>';
          }
          
          // Method 3: Parse và format header
          let fullContent = '';
          if (headerFromWord) {
            console.log('HEADER DEBUG: Full header text to parse:', headerFromWord);
            
            // Cải thiện parsing logic để đọc chính xác header từ Word
            const headerParts = headerFromWord.trim();
            console.log('HEADER DEBUG: Clean header text:', headerParts);
            
            // Extract title - tìm phần title từ các pattern thường gặp
            let title = '';
            let code = '';
            let issue = '';
            let date = '';
            
            // Thử parse theo nhiều pattern khác nhau
            
            // Cách 1: Tách theo khoảng trắng và vị trí
            const words = headerParts.split(/\s+/);
            console.log('HEADER DEBUG: All words in header:', words);
            
            // Tìm vị trí của VJC code để xác định boundaries
            let vjcIndex = -1;
            for (let i = 0; i < words.length; i++) {
              if (words[i].match(/VJC/i)) {
                vjcIndex = i;
                break;
              }
            }
            
            // Sử dụng array words để parse chính xác
            
            // Pattern 1: Extract title (từ đầu đến trước VJC)
            if (vjcIndex > 0) {
              const titleWords = words.slice(0, vjcIndex);
              title = titleWords.join(' ').replace(/&amp;/g, '&').trim();
            } else {
              // Fallback: lấy từ trước VJC trong text
              const titleMatch = headerParts.match(/^(.*?)(?=VJC|$)/i);
              if (titleMatch) {
                title = titleMatch[1].replace(/&amp;/g, '&')
                            .replace(/\s+/g, ' ')
                            .replace(/^[\s\-\.]+|[\s\-\.]+$/g, '')
                            .trim();
              }
            }
            
            // Pattern 2: Extract VJC code từ words array
            if (vjcIndex >= 0) {
              // Lấy từ VJC đến trước Iss (hoặc đến cuối nếu không có Iss)
              let codeEndIndex = words.length;
              for (let i = vjcIndex + 1; i < words.length; i++) {
                if (words[i].toLowerCase().includes('iss')) {
                  codeEndIndex = i;
                  break;
                }
              }
              
              const codeWords = words.slice(vjcIndex, codeEndIndex);
              code = codeWords.join(''); // Ghép tất cả words của code
              console.log('HEADER DEBUG: Found code from words:', code);
            }
            
            // Pattern 3: Extract Issue/Rev từ words array
            let issueStartIndex = -1;
            for (let i = 0; i < words.length; i++) {
              if (words[i].toLowerCase().includes('iss')) {
                issueStartIndex = i;
                break;
              }
            }
            
            if (issueStartIndex >= 0) {
              // Tìm Rev index
              let revIndex = -1;
              for (let i = issueStartIndex; i < words.length && i < issueStartIndex + 5; i++) {
                if (words[i].toLowerCase().includes('rev')) {
                  revIndex = i;
                  break;
                }
              }
              
              if (revIndex >= 0) {
                // Ghép Iss number và Rev number
                const issWord = words[issueStartIndex];
                const issNum = words[issueStartIndex + 1] || '01';
                const revWord = words[revIndex];
                const revNum = words[revIndex + 1] || '01';
                
                issue = `Iss${issNum.replace(/\D/g, '').padStart(2, '0')}/Rev${revNum.replace(/\D/g, '').padStart(2, '0')}`;
                console.log('HEADER DEBUG: Found issue from words:', issue);
              }
            }
            
            // Pattern 4: Extract date từ words array
            // Tìm các số có thể là ngày tháng năm (thường ở cuối)
            const numberWords = [];
            for (let i = Math.max(0, words.length - 10); i < words.length; i++) {
              if (words[i].match(/^\d/) || words[i].includes('/')) {
                numberWords.push(words[i]);
              }
            }
            
            if (numberWords.length >= 3) {
              // Thử ghép thành date format
              const dateStr = numberWords.join('').replace(/[^0-9\/]/g, '');
              const dateMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
              if (dateMatch) {
                let day = dateMatch[1].padStart(2, '0');
                let month = dateMatch[2].padStart(2, '0');
                let year = dateMatch[3];
                if (year.length === 2) {
                  year = '20' + year;
                }
                date = `${day}/${month}/${year}`;
                console.log('HEADER DEBUG: Found date from words:', date);
              }
            }
            
            // Fallbacks cho các trường bị thiếu
            if (!title || title.length < 5) {
              // Thử extract title từ body content nếu header không có
              const bodyTitleMatch = bodyContent.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/i) ||
                                    bodyContent.match(/<p[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*><strong>([^<]+)<\/strong><\/p>/i) ||
                                    bodyContent.match(/<div[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*><strong>([^<]+)<\/strong><\/div>/i);
              
              if (bodyTitleMatch) {
                title = bodyTitleMatch[1].trim().replace(/&amp;/g, '&');
              } else {
                title = 'PRACTICAL ASSESSMENT RESULT';
              }
            }
            
            if (!code) {
              code = 'VJC-V';
            }
            
            if (!issue) {
              issue = 'Iss01/Rev01';
            }
            
            if (!date) {
              date = new Date().toLocaleDateString('en-GB');
            }
            
            console.log('HEADER DEBUG: Final parsed values:', { title, code, date, issue });
            
            const formattedHeader = `
              <div style="margin-bottom: 20px;">
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #000;">
                  <tr>
                    <td style="width: 25%; border-right: 1px solid #000; padding: 15px; text-align: center; vertical-align: middle;">
                      <div style="color: #e31e24; font-weight: bold; font-size: 18px; font-family: Arial, sans-serif;">
                        vietjetair.com
                      </div>
                    </td>
                    <td style="width: 50%; border-right: 1px solid #000; padding: 15px; text-align: center; vertical-align: middle;">
                      <div style="font-weight: bold; font-size: 16px; color: #333; line-height: 1.3; font-family: Arial, sans-serif;">
                        ${title}
                      </div>
                    </td>
                    <td style="width: 25%; padding: 10px; vertical-align: top;">
                      <div style="font-size: 12px; line-height: 1.4; font-family: Arial, sans-serif;">
                        <div style="margin-bottom: 8px; font-weight: bold;">${code}</div>
                        <div style="margin-bottom: 8px;">${issue}</div>
                        <div>${date}</div>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>
            `;
            
            fullContent = formattedHeader + bodyContent;
          } else {
            console.log('HEADER DEBUG: No header found, using body only');
            fullContent = bodyContent;
          }

          setWordContent(fullContent);

          if (containerRef.current) {
            containerRef.current.innerHTML = fullContent;
            makeFieldsEditable();

            // Populate saved data nếu có
            if (savedDataResponse && savedDataResponse.data) {
              setTimeout(() => populateFormData(savedDataResponse.data), 500);
            }
          }

        } catch (error) {
          console.error('Error in enhanced Word processing:', error);
          // Fallback to basic mammoth
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
    console.log('useEffect triggered - formFields.length:', formFields.length, 'wordContent.length:', wordContent.length, 'containerRef.current:', !!containerRef.current);
    
    if (formFields.length > 0 && containerRef.current && wordContent) {
      console.log('✅ FormFields loaded, updating select options with custom data...');
      console.log('Available formFields:', formFields.map(f => ({ name: f.fieldName, type: f.fieldType, formula: f.formula })));
      
      // Debug specific field "1A"
      const field1A = formFields.find(f => f.fieldName === '1A');
      console.log('DEBUG: Field 1A info:', field1A);
      
      // Delay một chút để đảm bảo DOM đã stable
      setTimeout(() => {
        // Re-run makeFieldsEditable với formFields data để update custom options
        makeFieldsEditable();
        
        // Kiểm tra lại select field "1A" sau khi makeFieldsEditable
        setTimeout(() => {
          const select1A = containerRef.current?.querySelector('select[data-field-name="1A"]');
          if (select1A) {
            console.log('DEBUG: Select 1A after makeFieldsEditable:', {
              optionsCount: select1A.options.length,
              options: [...select1A.options].map(opt => opt.value)
            });
          } else {
            console.log('DEBUG: Select 1A not found after makeFieldsEditable');
          }
          
          updateFormulaFields();
        }, 100);
      }, 100);
      
      // Chạy formula calculation nhiều lần để đảm bảo
      setTimeout(() => updateFormulaFields(), 500);
      setTimeout(() => updateFormulaFields(), 1000);
    } else {
      console.log('⏳ FormFields not loaded yet, basic selects already created...');
    }
  }, [formFields, wordContent]);

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
        const fieldName = input.dataset.fieldName;
        const label = input.dataset.label || fieldName;
        const fieldType = input.dataset.fieldType;
        let value = '';
        
        // Xử lý giá trị dựa trên loại field
        const isDateField = input.type === 'date' || 
                           fieldName?.toLowerCase().includes('date') || 
                           fieldName?.toLowerCase().includes('ngay');
        
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
          fieldName: fieldName,
          fieldType: fieldType,
          label: label,
          value: value
        });
      });

      // Tạo HTML content với dữ liệu đã điền - đảm bảo có header VietJet
      let printContentHTML = wordContent; // Bắt đầu với Word content gốc

      // Thay thế patterns với giá trị đã điền
      formData.forEach(field => {
        const { fieldName, fieldType, value } = field;

        // Tạo display value
        let displayValue = '';
        switch (fieldType?.toLowerCase()) {
          case 'c': // checkbox
            displayValue = value === 'true' ? '☑ Có' : '☐ Không';
            break;
          case 'dt': // date
            if (value) {
              try {
                const date = new Date(value);
            displayValue = date.toLocaleDateString('vi-VN');
              } catch {
                displayValue = value;
              }
            }
            break;
          case 'f': // formula
            displayValue = `<span style="color: #1890ff; font-weight: bold; background-color: #f0f9ff; padding: 2px 6px; border-radius: 3px;">${value || '0'}</span>`;
            break;
          default:
            displayValue = value || '';
            break;
        }

        // Thay thế patterns
        const patterns = [
          `{${fieldType?.toLowerCase()}_${fieldName}}`,
          `{${fieldType?.toUpperCase()}_${fieldName}}`,
          `{${fieldName}}`,
          `{${fieldName.toUpperCase()}}`,
          `[${fieldType?.toLowerCase()}_${fieldName}]`,
          `[${fieldType?.toUpperCase()}_${fieldName}]`,
          `[${fieldName}]`,
          `[${fieldName.toUpperCase()}]`
        ];

        patterns.forEach(pattern => {
          if (printContentHTML.includes(pattern)) {
            const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedPattern, 'g');
            printContentHTML = printContentHTML.replace(regex, displayValue);
          }
        });
      });

      // Kiểm tra xem có header không và thêm nếu cần
      const hasVietJetContent = printContentHTML.toLowerCase().includes('vietjet') || 
                               printContentHTML.includes('VJC-VJAA') ||
                               printContentHTML.includes('CABIN HEALTH');
      
      if (!hasVietJetContent) {
        console.log('No VietJet header found in Word content, adding fallback header...');
        
        // Lấy thông tin form để tạo header động
        const formName = formInfo?.formName || 'FORM';
        const formCode = formInfo?.formCode || 'VJC-VJAA-IF-XXX';
        
        const vietjetHeader = `
          <div style="margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #000;">
              <tr>
                <td style="width: 30%; border-right: 1px solid #000; padding: 15px; text-align: center; vertical-align: middle;">
                  <div style="color: #e31e24; font-weight: bold; font-size: 18px; font-family: Arial, sans-serif;">
                    vietjetair.com
                  </div>
                </td>
                <td style="width: 40%; border-right: 1px solid #000; padding: 15px; text-align: center; vertical-align: middle;">
                  <div style="font-weight: bold; font-size: 16px; color: #333; line-height: 1.3; font-family: Arial, sans-serif;">
                    ${formName.toUpperCase()}
                  </div>
                </td>
                <td style="width: 30%; padding: 10px; vertical-align: top;">
                  <div style="font-size: 11px; line-height: 1.4; font-family: Arial, sans-serif;">
                    <div style="margin-bottom: 8px; font-weight: bold;">${formCode}</div>
                    <div style="margin-bottom: 8px;">Iss01/Rev01</div>
                    <div>${new Date().toLocaleDateString('en-GB').replace(/\//g, '/')}</div>
                  </div>
                </td>
              </tr>
            </table>
          </div>
        `;
        
        printContentHTML = vietjetHeader + printContentHTML;
        console.log('Added dynamic VietJet header based on form info');
        } else {
        console.log('VietJet header found in original content');
      }
      
      console.log('Final content preview:', printContentHTML.substring(0, 500));

      // Xử lý patterns chưa được thay thế
      const remainingPatterns = printContentHTML.match(/\{[^}]+\}|\[[^\]]+\]/g);
      if (remainingPatterns) {
        remainingPatterns.forEach(pattern => {
          const underlineField = `<span style="border-bottom: 1px solid #000; min-width: 100px; display: inline-block; padding: 2px 4px;">_____________</span>`;
          const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedPattern, 'g');
          printContentHTML = printContentHTML.replace(regex, underlineField);
        });
      }

      console.log('Final PDF content with VietJet header:', printContentHTML);

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
             ${printContentHTML}
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