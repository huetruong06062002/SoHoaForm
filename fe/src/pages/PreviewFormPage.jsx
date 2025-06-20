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
  const { message, modal } = App.useApp();
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

            // Pattern 1: Extract title - chỉ lấy "ANNOUNCEMENT ASSESSMENT FORM"
            console.log('HEADER DEBUG: Extracting title from words...');
            
            // Approach 1: Tìm boundaries chính xác của title
            let titleStartIndex = 0;
            let titleEndIndex = words.length;
            
            // Tìm vị trí kết thúc title (trước VJC, VTC, hoặc các patterns khác)
            for (let i = 0; i < words.length; i++) {
              const word = words[i].toUpperCase();
              // Stop khi gặp code patterns
              if (word.includes('VJC') || word.includes('VTC') || 
                  word.match(/^V[JT]C/) || 
                  word.includes('-') && (word.includes('IF') || word.includes('AA'))) {
                titleEndIndex = i;
                console.log('HEADER DEBUG: Found code boundary at index:', i, 'word:', word);
                break;
              }
            }
            
            // Extract title từ đầu đến titleEndIndex
            if (titleEndIndex > 0) {
              const titleWords = words.slice(titleStartIndex, titleEndIndex);
              title = titleWords.join(' ')
                .replace(/&amp;/g, '&')
                .replace(/\s+/g, ' ')
                .trim();
              console.log('HEADER DEBUG: Extracted title:', title);
            }
            
            // Nếu title vẫn rỗng hoặc quá ngắn, thử approach khác
            if (!title || title.length < 5) {
              // Thử regex pattern để tìm title
              const titlePatterns = [
                /^(.*?)(?=VTC-|VJC-)/i,
                /^(ANNOUNCEMENT\s+ASSESSMENT\s+FORM)/i,
                /^(.*?ASSESSMENT\s+FORM)/i,
                /^(.*?)(?=\s+V[JT]C)/i
              ];
              
              for (const pattern of titlePatterns) {
                const match = headerParts.match(pattern);
                if (match && match[1].trim().length >= 5) {
                  title = match[1].trim();
                  console.log('HEADER DEBUG: Found title with pattern:', title);
                  break;
                }
              }
            }

            // Pattern 2: Extract VJC/VTC code - approach đơn giản và hiệu quả hơn
            console.log('HEADER DEBUG: Extracting code from words:', words);
            
            // Approach 1: Tìm trực tiếp trong text với regex patterns
            const directCodePatterns = [
              /VJC-VJAA-F-\d+/i,
              /VTC-VJAA-IF-\d+/i,
              /VJC-[A-Z]+-[A-Z]+-\d+/i,
              /VTC-[A-Z]+-[A-Z]+-\d+/i,
            ];
            
            for (const pattern of directCodePatterns) {
              const match = headerParts.match(pattern);
              if (match) {
                code = match[0].toUpperCase();
                console.log('HEADER DEBUG: Found code with direct pattern:', pattern, 'result:', code);
                break;
              }
            }
            
            // Approach 2: Nếu chưa tìm thấy, thử assembly từ words
            if (!code) {
              console.log('HEADER DEBUG: Trying word assembly...');
              
              for (let i = 0; i < words.length; i++) {
                const word = words[i].toUpperCase();
                if (word.includes('VJC') || word.includes('VTC')) {
                  console.log('HEADER DEBUG: Found VJC/VTC at index:', i, 'word:', word);
                  
                  // Collect all potential code parts từ vị trí này
                  let codeParts = [];
                  let j = i;
                  
                  // Continue cho đến khi gặp Iss hoặc date
                  while (j < words.length && j < i + 10) {
                    const currentWord = words[j];
                    console.log('HEADER DEBUG: Processing word at', j, ':', currentWord);
                    
                    if (currentWord.toLowerCase().includes('iss') || 
                        currentWord.includes('/') ||
                        currentWord.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)) {
                      console.log('HEADER DEBUG: Stopping assembly at:', currentWord);
                      break;
                    }
                    
                    // Add word nếu có potential code content
                    if (currentWord.match(/[A-Z]{2,4}/) || 
                        currentWord.match(/^\d{1,4}$/) ||
                        currentWord.includes('-') ||
                        currentWord.toUpperCase().includes('VJC') ||
                        currentWord.toUpperCase().includes('VTC') ||
                        currentWord.toUpperCase().includes('VJAA') ||
                        currentWord.toUpperCase().includes('IF') ||
                        currentWord.toUpperCase() === 'F') {
                      codeParts.push(currentWord);
                      console.log('HEADER DEBUG: Added to code parts:', currentWord);
                    }
                    
                    j++;
                  }
                  
                  if (codeParts.length > 0) {
                    // Join và clean up
                    code = codeParts.join('-')
                      .replace(/--+/g, '-')
                      .replace(/^-+|-+$/g, '')
                      .toUpperCase();
                    console.log('HEADER DEBUG: Assembled code:', code);
                    break;
                  }
                }
              }
            }
            
            // Fallback: Regex patterns với patterns cụ thể hơn
            if (!code) {
              const codePatterns = [
                /VJC-VJAA-F-\d+/i,          // VJC-VJAA-F-087
                /VTC-VJAA-IF-\d+/i,         // VTC-VJAA-IF-013  
                /VJC-[A-Z]+-[A-Z]+-\d+/i,   // VJC-XXXX-X-123
                /VTC-[A-Z]+-[A-Z]+-\d+/i,   // VTC-XXXX-X-123
                /V[JT]C-[A-Z\d\-]+/i        // General VJC/VTC patterns
              ];
              
              for (const pattern of codePatterns) {
                const match = headerParts.match(pattern);
                if (match) {
                  code = match[0];
                  console.log('HEADER DEBUG: Found code with regex pattern:', pattern, 'result:', code);
                  break;
                }
              }
            }
            
            // Additional fallback: tìm trong toàn bộ text bằng word boundaries
            if (!code) {
              // Tìm bất kỳ pattern nào có dạng XXX-XXX-X-XXX
              const generalCodeMatch = headerParts.match(/\b[A-Z]{2,3}-[A-Z]{2,4}-[A-Z]{1,2}-\d{1,4}\b/i);
              if (generalCodeMatch) {
                code = generalCodeMatch[0];
                console.log('HEADER DEBUG: Found code with general pattern:', code);
              }
            }

            // Pattern 3: Extract Issue/Rev từ words array
            console.log('HEADER DEBUG: Extracting Issue/Rev from words...');
            
            // Approach 1: Tìm pattern Iss X / Rev Y hoặc Iss X Rev Y
            const issueRevPatterns = [
              /Iss\s*(\d+)\s*\/\s*Rev\s*(\d+)/i,
              /Iss\s*(\d+)\s*Rev\s*(\d+)/i,
              /Issue\s*(\d+)\s*\/\s*Rev\s*(\d+)/i,
              /Issue\s*(\d+)\s*Rev\s*(\d+)/i
            ];
            
            for (const pattern of issueRevPatterns) {
              const match = headerParts.match(pattern);
              if (match) {
                const issNum = match[1].padStart(2, '0');
                const revNum = match[2].padStart(2, '0');
                issue = `Iss${issNum}/Rev${revNum}`;
                console.log('HEADER DEBUG: Found issue with pattern:', pattern, 'result:', issue);
                break;
              }
            }
            
            // Approach 2: Nếu chưa tìm thấy, parse từ words array
            if (!issue) {
              let issueStartIndex = -1;
              for (let i = 0; i < words.length; i++) {
                if (words[i].toLowerCase().includes('iss')) {
                  issueStartIndex = i;
                  console.log('HEADER DEBUG: Found Iss at index:', i, 'word:', words[i]);
                  break;
                }
              }

              if (issueStartIndex >= 0) {
                // Tìm Rev index
                let revIndex = -1;
                for (let i = issueStartIndex; i < words.length && i < issueStartIndex + 5; i++) {
                  if (words[i].toLowerCase().includes('rev')) {
                    revIndex = i;
                    console.log('HEADER DEBUG: Found Rev at index:', i, 'word:', words[i]);
                    break;
                  }
                }

                if (revIndex >= 0) {
                  // Extract numbers carefully
                  let issNum = '01';
                  let revNum = '00';
                  
                  // Get Iss number - có thể ở cùng word hoặc word tiếp theo
                  const issWord = words[issueStartIndex];
                  if (issWord.match(/\d+/)) {
                    issNum = issWord.match(/\d+/)[0];
                  } else if (issueStartIndex + 1 < words.length && words[issueStartIndex + 1].match(/^\d+$/)) {
                    issNum = words[issueStartIndex + 1];
                  }
                  
                  // Get Rev number - có thể ở cùng word hoặc word tiếp theo
                  const revWord = words[revIndex];
                  if (revWord.match(/\d+/)) {
                    const revNumbers = revWord.match(/\d+/g);
                    revNum = revNumbers[revNumbers.length - 1]; // Lấy số cuối cùng
                  } else if (revIndex + 1 < words.length && words[revIndex + 1].match(/^\d+$/)) {
                    revNum = words[revIndex + 1];
                  }
                  
                  // Đảm bảo không lấy date làm Rev number
                  if (revNum.length > 2) {
                    revNum = revNum.substring(0, 2); // Chỉ lấy 2 chữ số đầu
                  }
                  
                  issue = `Iss${issNum.padStart(2, '0')}/Rev${revNum.padStart(2, '0')}`;
                  console.log('HEADER DEBUG: Assembled issue from words:', issue, 'issNum:', issNum, 'revNum:', revNum);
                }
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
              console.log('HEADER DEBUG: Using fallback for title');
              
              // Thử extract title từ body content nếu header không có
              const bodyTitleMatch = bodyContent.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/i) ||
                bodyContent.match(/<p[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*><strong>([^<]+)<\/strong><\/p>/i) ||
                bodyContent.match(/<div[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*><strong>([^<]+)<\/strong><\/div>/i);

              if (bodyTitleMatch) {
                let extractedTitle = bodyTitleMatch[1].trim().replace(/&amp;/g, '&');
                // Clean extracted title - loại bỏ code/date nếu có
                const cleanMatch = extractedTitle.match(/^(.*?)(?=VTC|VJC|Iss|\d{1,2}\/\d{1,2}\/\d{2,4})/i);
                if (cleanMatch && cleanMatch[1].trim().length > 5) {
                  title = cleanMatch[1].trim();
                } else {
                  title = extractedTitle;
                }
                console.log('HEADER DEBUG: Extracted title from body:', title);
              } else {
                title = 'ANNOUNCEMENT ASSESSMENT FORM';
              }
            }
            
            // Final cleanup cho title
            if (title) {
              title = title.replace(/\s+/g, ' ').trim();
              console.log('HEADER DEBUG: Final title:', title);
            }

            // Special case: nếu code = "VJC-V" thì có thể bị truncated
            if (code === 'VJC-V' || code === 'VTC-V' || code?.length < 8) {
              console.log('HEADER DEBUG: Code seems truncated:', code, 'trying to find full version...');
              
              // Tìm trong raw text 
              const fullCodePatterns = [
                /VJC-VJAA-F-\d+/gi,
                /VTC-VJAA-IF-\d+/gi,
                /VJC-[A-Z]{2,4}-[A-Z]{1,3}-\d{1,4}/gi,
                /VTC-[A-Z]{2,4}-[A-Z]{1,3}-\d{1,4}/gi
              ];
              
              for (const pattern of fullCodePatterns) {
                const matches = headerParts.match(pattern);
                if (matches && matches[0]) {
                  code = matches[0].toUpperCase();
                  console.log('HEADER DEBUG: Found full code with pattern:', pattern, 'result:', code);
                  break;
                }
              }
            }

            // Final fallback cho code nếu vẫn không tìm thấy
            if (!code || code === 'VJC-V' || code === 'VTC-V') {
              console.log('HEADER DEBUG: No valid code found, using fallback. Current code:', code);
              
              // Thử tìm trong toàn bộ text với pattern loose hơn
              const looseCodeMatch = headerParts.match(/[A-Z]{2,3}[\-\s][A-Z]{2,4}[\-\s][A-Z]{1,2}[\-\s]\d{1,4}/i);
              if (looseCodeMatch) {
                code = looseCodeMatch[0].replace(/\s/g, '-').toUpperCase();
                console.log('HEADER DEBUG: Found loose code pattern:', code);
              } else {
                // Try to extract from form name or use sensible default
                const formName = formInfoResponse?.data?.formName || '';
                if (formName.includes('VJC')) {
                  code = 'VJC-VJAA-F-087';
                } else if (formName.includes('VTC')) {
                  code = 'VTC-VJAA-IF-013';
                } else {
                  code = 'VJC-VJAA-F-087';  // Default fallback
                }
                console.log('HEADER DEBUG: Using default fallback code:', code);
              }
            }

            if (!issue) {
              console.log('HEADER DEBUG: No issue found, using fallback');
              issue = 'Iss03/Rev00';
            }
            
            console.log('HEADER DEBUG: Final issue value:', issue);

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

  // Function chuyển đổi fieldName thành tên hiển thị dễ hiểu từ Word content
  const getDisplayFieldName = (fieldName) => {
    // Tìm label từ Word content dựa trên pattern TRƯỚC (ưu tiên cao hơn)
    if (wordContent && fieldName) {
      const labelFromWord = extractLabelFromWordContent(fieldName);
      if (labelFromWord) {
        return `${labelFromWord} (${fieldName})`;
      }
    }
    
    // Tìm field info từ API data sau
    const fieldInfo = formFields.find(f => f.fieldName === fieldName);
    
    if (fieldInfo && fieldInfo.fieldDescription && fieldInfo.fieldDescription.trim() !== '') {
      // Sử dụng fieldDescription từ API làm display name chính
      return `${fieldInfo.fieldDescription} (${fieldName})`;
    }
    
    // Fallback: Tự động tạo tên đẹp từ fieldName
    let displayName = fieldName;
    
    // Pattern: {type_FieldName} -> Field Name
    const typeMatch = fieldName.match(/^\{[a-z]_(.+)\}$/);
    if (typeMatch) {
      displayName = typeMatch[1];
    }
    
    // Convert camelCase/PascalCase to readable
    displayName = displayName
      .replace(/([A-Z])/g, ' $1') // Add space before capitals
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .trim();
    

    return `${displayName} (${fieldName})`;
  };

  // Function extract label từ Word content
  const extractLabelFromWordContent = (fieldName) => {
    if (!wordContent || !fieldName) return null;
    
    // Map fieldName với field pattern trong Word
    const fieldInfo = formFields.find(f => f.fieldName === fieldName);
    if (!fieldInfo || !fieldInfo.formula) return null;
    
    // Extract pattern từ formula 
    const patternMatch = fieldInfo.formula.match(/^\{([a-z]_.*)\}$/);
    if (!patternMatch) return null;
    
    const fullPattern = patternMatch[1]; // "t_TraineeName"
    
    // Escape pattern cho regex
    const escapedPattern = fullPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
         // Tìm pattern trong wordContent và extract text xung quanh
     const regex = new RegExp(`([^{]*?)\\{${escapedPattern}\\}`, 'i');
     const match = wordContent.match(regex);
     
     if (match && match[1]) {
       let rawText = match[1];
       
       // Extract text từ HTML, ưu tiên text trong <strong> tags
       let label = '';
       
       // Đặc biệt xử lý cho các field trong table (1S, 1W, 2A, etc.)
       if (/^[0-9][A-Z]+$/.test(fieldName)) {
         // Tìm table header hoặc column title cho field này
         label = extractTableColumnLabel(fieldName, wordContent);
         if (label) {
           return label;
         }
       }
       
        // Tìm tất cả text trong <strong> tags
        const strongMatches = rawText.match(/<strong[^>]*>([^<]+)<\/strong>/gi);
        if (strongMatches && strongMatches.length > 0) {
          // Lấy <strong> tag cuối cùng (gần với pattern nhất)
          const lastStrong = strongMatches[strongMatches.length - 1];
          const match = lastStrong.match(/<strong[^>]*>([^<]+)<\/strong>/i);
          if (match && match[1]) {
            label = match[1].trim();
            
            // Xử lý trường hợp có nhiều từ trong <strong>, chỉ lấy từ chính
            if (label.includes(' ')) {
              // Nếu có "Name BLOCK LETTER" → lấy "Name"
              // Nếu có "Duration hrs" → lấy "Duration"
              const words = label.split(' ');
              label = words[0]; // Lấy từ đầu tiên
            }
          }
        } else {
          // Fallback: lấy text cuối cùng, bỏ HTML tags
          const plainText = rawText.replace(/<[^>]*>/g, ' ')
                                  .replace(/\s+/g, ' ')
                                  .trim();
          const words = plainText.split(' ').filter(w => w.length > 0);
          
          // Tìm từ có nghĩa cuối cùng (bỏ qua các từ ngắn như "You", "of", etc.)
          for (let i = words.length - 1; i >= 0; i--) {
            const word = words[i];
            if (word.length >= 3 && 
                !/^(You|The|And|Of|In|On|At|To|For|With|By)$/i.test(word)) {
              label = word;
              break;
            }
          }
          
          // Nếu không tìm thấy, lấy từ cuối cùng
          if (!label && words.length > 0) {
            label = words[words.length - 1];
          }
        }
      
      // Clean up label
      if (label.endsWith(':')) {
        label = label.slice(0, -1).trim();
      }
      
      // Validate label
      if (label && 
          label.length > 0 && 
          label.length < 30 && 
          !label.includes('{') && 
          !label.includes('}') &&
          !label.includes('<') &&
          !label.includes('>') &&
          !/^\d+$/.test(label) &&
          !/^[^\w\s]*$/.test(label)) {
        
        return label;
      }
    }
    
    return null;
  };

  // Function extract table column label cho các field trong table
  const extractTableColumnLabel = (fieldName, content) => {
    if (!content || !fieldName) return null;
    
    console.log('Extracting table column for:', fieldName);
    
    // Tìm field pattern trong content
    const fieldInfo = formFields.find(f => f.fieldName === fieldName);
    if (!fieldInfo || !fieldInfo.formula) {
      console.log('No field info found for:', fieldName);
      return null;
    }
    
    const patternMatch = fieldInfo.formula.match(/^\{([a-z]_.*)\}$/);
    if (!patternMatch) {
      console.log('No pattern match for formula:', fieldInfo.formula);
      return null;
    }
    
    const fullPattern = patternMatch[1]; // "s_1A", "s_2C", etc.
    console.log('Looking for pattern:', fullPattern);
    
    const escapedPattern = fullPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Tìm vị trí của field trong content
    const fieldRegex = new RegExp(`\\{${escapedPattern}\\}`, 'i');
    const fieldMatch = content.search(fieldRegex);
    
    if (fieldMatch === -1) {
      console.log('Pattern not found in content');
      return null;
    }
    
    console.log('Found pattern at position:', fieldMatch);
    
    // Lấy phần content từ đầu đến field
    const beforeField = content.substring(0, fieldMatch);
    
    // Tìm table gần nhất chứa field này
    const tableStart = beforeField.lastIndexOf('<table');
    if (tableStart === -1) {
      console.log('No table found before field');
      return null;
    }
    
    console.log('Table starts at:', tableStart);
    
    // Lấy table content rộng hơn để có đủ headers
    const tableEnd = content.indexOf('</table>', tableStart);
    const tableContent = tableEnd !== -1 ? 
      content.substring(tableStart, tableEnd + 8) : 
      content.substring(tableStart, fieldMatch + 500);
    
    console.log('Table content length:', tableContent.length);
    
         // Đếm số <td> tags trước field để xác định column index
     const beforeFieldInTable = beforeField.substring(tableStart);
     const tdMatches = beforeFieldInTable.match(/<td[^>]*>/gi) || [];
     
     // Tìm row hiện tại chứa field
     const fieldContext = content.substring(fieldMatch - 200, fieldMatch + 50);
     const currentRowStart = fieldContext.lastIndexOf('<tr');
     let columnIndexInRow = 0;
     
     if (currentRowStart !== -1) {
       // Đếm <td> trong row hiện tại
       const currentRowContent = fieldContext.substring(currentRowStart, fieldContext.length);
       const tdInCurrentRow = currentRowContent.substring(0, currentRowContent.indexOf(fullPattern)).match(/<td[^>]*>/gi) || [];
       columnIndexInRow = tdInCurrentRow.length;
       console.log('Column index in current row:', columnIndexInRow);
     }
     
     const columnIndex = columnIndexInRow > 0 ? columnIndexInRow : tdMatches.length;
     
     console.log('Total TD count:', tdMatches.length, 'Column index used:', columnIndex);
    
         // Tìm tất cả table headers - thử nhiều cách khác nhau
     let headerMatches = tableContent.match(/<th[^>]*>.*?<\/th>/gi);
     
     // Nếu không có <th>, thử tìm <td> trong row đầu tiên (có thể là header row)
     if (!headerMatches) {
       console.log('No <th> tags found, trying first row <td> tags');
       
       // Tìm row đầu tiên trong table
       const firstRowMatch = tableContent.match(/<tr[^>]*>(.*?)<\/tr>/i);
       if (firstRowMatch && firstRowMatch[1]) {
         headerMatches = firstRowMatch[1].match(/<td[^>]*>.*?<\/td>/gi);
         console.log('Found first row cells:', headerMatches ? headerMatches.length : 0);
       }
     }
     
     // Nếu vẫn không có, thử tìm tất cả <td> có text trong table
     if (!headerMatches) {
       console.log('Trying all <td> tags with meaningful text');
       const allCells = tableContent.match(/<td[^>]*>.*?<\/td>/gi) || [];
       
       // Lọc những cell có text có nghĩa (không chỉ là pattern hoặc rỗng)
       headerMatches = allCells.filter(cell => {
         const text = cell.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
         return text && 
                text.length > 3 && 
                text.length < 100 &&
                !text.includes('{') && 
                !text.includes('}') &&
                !/^[A-Z]\}$/.test(text); // Không phải pattern như "A}", "C}"
       }).slice(0, 15); // Lấy tối đa 15 cells đầu làm headers
       
       console.log('Found meaningful cells:', headerMatches ? headerMatches.length : 0);
     }
     
     if (!headerMatches || headerMatches.length === 0) {
       console.log('No headers found in table at all');
       return null;
     }
     
     console.log('Found headers:', headerMatches.length);
     
     // Extract text từ headers
     const headers = headerMatches.map((header, index) => {
       // Bỏ HTML tags và lấy text
       const text = header.replace(/<[^>]*>/g, ' ')
                         .replace(/\s+/g, ' ')
                         .trim();
       console.log(`Header ${index}:`, text);
       return text;
     });
    
    console.log('All headers:', headers);
    console.log('Target header at index', columnIndex, ':', headers[columnIndex]);
    
    // Lấy header tương ứng với column index
    if (headers[columnIndex]) {
      let columnTitle = headers[columnIndex];
      
      // Clean up column title
      columnTitle = columnTitle
        .replace(/^\W+|\W+$/g, '') // Remove leading/trailing punctuation
        .trim();
      
      console.log('Cleaned column title:', columnTitle);
      
      // Validate và return
      if (columnTitle && 
          columnTitle.length > 2 && 
          columnTitle.length < 100 &&
          !columnTitle.includes('{') &&
          !columnTitle.includes('}')) {
        console.log('Returning column title:', columnTitle);
        return columnTitle;
      }
    }
    
    console.log('No valid column title found');
    return null;
  };

  // Function hiển thị lỗi validation 
  const showValidationErrors = (errors) => {
    modal.error({
      title: '⚠️ Vui lòng kiểm tra lại thông tin',
      width: 600,
      content: (
        <div style={{ marginTop: '16px' }}>
          <p style={{ marginBottom: '12px', color: '#666' }}>
            Có <strong>{errors.length}</strong> lỗi cần được sửa:
          </p>
          <ul style={{ 
            listStyle: 'none', 
            padding: 0, 
            margin: 0,
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {errors.map((error, index) => (
              <li key={index} style={{
                padding: '8px 12px',
                margin: '4px 0',
                backgroundColor: '#fff2f0',
                border: '1px solid #ffccc7',
                borderRadius: '4px',
                color: '#a8071a',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center'
              }}>
                <span style={{ 
                  marginRight: '8px', 
                  fontSize: '16px',
                  color: '#ff4d4f'
                }}>
                  ❌
                </span>
                {error}
              </li>
            ))}
          </ul>
          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            backgroundColor: '#f6ffed', 
            border: '1px solid #b7eb8f', 
            borderRadius: '4px' 
          }}>
            <p style={{ margin: 0, color: '#389e0d', fontSize: '13px' }}>
              💡 <strong>Gợi ý:</strong> Hãy điền đầy đủ thông tin bắt buộc và kiểm tra định dạng trước khi lưu.
            </p>
          </div>
        </div>
      ),
      okText: 'Đã hiểu',
      okButtonProps: {
        size: 'large',
        style: {
          backgroundColor: '#1890ff',
          borderColor: '#1890ff'
        }
      }
          });
  };

  // Function validate form trước khi lưu
  const validateForm = () => {
    const errors = [];
    const inputs = containerRef.current.querySelectorAll('.form-input');
    
    console.log('=== VALIDATION START ===');
    console.log('Total inputs found:', inputs.length);
    
    // Tạo map để dễ tra cứu giá trị
    const fieldValueMap = new Map();
    inputs.forEach(input => {
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
        case 'd': // number
        case 't': // text
        case 'f': // formula
        default:
          value = input.value?.trim() || '';
          break;
      }
      
      fieldValueMap.set(fieldName, value);
      console.log(`Field ${fieldName} (${input.dataset.fieldType}): "${value}"`);
    });

    console.log('fieldValueMap:', fieldValueMap);

    // Validate từng field
    formFields.forEach(fieldInfo => {
      const fieldName = fieldInfo.fieldName;
      const fieldValue = fieldValueMap.get(fieldName);

      console.log(`Validating field ${fieldName}:`, {
        fieldType: fieldInfo.fieldType,
        isRequired: fieldInfo.isRequired,
        fieldValue: fieldValue,
        formula: fieldInfo.formula
      });

      // 1. Validate isRequired
      if (fieldInfo.isRequired) {
        let isEmpty = false;
        
        if (fieldInfo.fieldType?.toLowerCase() === 'boolean') {
          // Boolean field required nghĩa là phải được check (true)
          isEmpty = !fieldValue; // false = empty, true = not empty
          console.log(`Boolean field ${fieldName} required check - checked: ${fieldValue}, isEmpty: ${isEmpty}`);
        } else {
          isEmpty = !fieldValue || fieldValue === '';
          console.log(`Non-boolean field ${fieldName} required check - value: "${fieldValue}", isEmpty: ${isEmpty}`);
        }
        
        if (isEmpty) {
          const errorMsg = `${getDisplayFieldName(fieldName)} là bắt buộc`;
          console.log(`Adding required error: ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      // 2. Validate isUpperCase cho Text fields
      if (fieldInfo.isUpperCase && 
          (fieldInfo.fieldType?.toLowerCase() === 'text') && 
          fieldValue && fieldValue !== '') {
        if (fieldValue !== fieldValue.toUpperCase()) {
          errors.push(`${getDisplayFieldName(fieldName)} phải viết HOA`);
        }
      }

      // 3. Validate dependencies cho Boolean fields có formula phụ thuộc
      if (fieldInfo.fieldType?.toLowerCase() === 'boolean' && 
          fieldInfo.formula && 
          !fieldInfo.formula.match(/^\{c_.*\}$/)) {
        
        console.log(`Processing Boolean dependency for ${fieldName}:`, {
          formula: fieldInfo.formula,
          fieldValue: fieldValue,
          isChecked: !!fieldValue
        });
        
        // CHỈ kiểm tra dependencies khi Boolean field được check (true)
        if (fieldValue) {
          console.log(`${fieldName} is checked, validating dependencies...`);
          
          // Parse dependencies từ formula đơn giản: "TraineeName, TraineeID"
          const dependencies = fieldInfo.formula.split(',').map(f => f.trim()).filter(f => f.length > 0);
          console.log(`Dependencies for ${fieldName}:`, dependencies);
          
          // Kiểm tra từng dependency
          dependencies.forEach(depFieldName => {
            const depValue = fieldValueMap.get(depFieldName);
            console.log(`Checking dependency ${depFieldName}: value = "${depValue}"`);
            
            if (!depValue || depValue === '') {
              const errorMsg = `${getDisplayFieldName(depFieldName)} phải có giá trị vì liên quan đến ${getDisplayFieldName(fieldName)}`;
              console.log(`Adding dependency error: ${errorMsg}`);
              errors.push(errorMsg);
            }
          });
        } else {
          console.log(`${fieldName} is not checked, skipping dependency validation`);
        }
      }
    });
    
    console.log('=== VALIDATION END ===');
    console.log('Total errors:', errors.length);
    console.log('Errors:', errors);
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  };

  const handleSave = async () => {
    try {
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
      console.log('Creating PDF from current DOM state...');

      // Lấy tất cả giá trị hiện tại từ DOM gốc trước
      const originalInputs = containerRef.current.querySelectorAll('.form-input');
      const inputValues = new Map();
      
      originalInputs.forEach((input, index) => {
        const fieldName = input.dataset.fieldName;
        const fieldType = input.dataset.fieldType;
        
        let value = '';
        let isChecked = false;
        let selectedText = '';
        
        switch (fieldType?.toLowerCase()) {
          case 'c': // checkbox
            isChecked = input.checked;
            value = isChecked ? 'checked' : 'unchecked';
            break;
          case 's': // select
            value = input.value;
            selectedText = input.options[input.selectedIndex]?.text || '';
            break;
          case 'dt': // date
            value = input.value || '';
            break;
          case 'd': // number hoặc date
            value = input.value || '';
            // Kiểm tra nếu là date field
            if (input.type === 'date' || fieldName?.toLowerCase().includes('date')) {
              // Đánh dấu là date field
              inputValues.set(index, { 
                fieldName, 
                fieldType: 'dt', // Override thành dt để xử lý như date
                value, 
                isChecked, 
                selectedText 
              });
              return; // Skip phần set bên dưới
            }
            break;
          case 't': // text
          case 'f': // formula
          default:
            value = input.value || '';
            break;
        }
        
        inputValues.set(index, {
          fieldName,
          fieldType,
          value,
          isChecked,
          selectedText
        });
        
        console.log(`Stored input ${index}: ${fieldName} (${fieldType}) = ${value}`, { isChecked, selectedText });
      });

      // Tạo HTML content từ DOM hiện tại
      let printContentHTML = containerRef.current.innerHTML;
      
      // Xử lý để làm sạch content cho PDF
      printContentHTML = printContentHTML.replace(/style="[^"]*"/g, '');
      
      // Thay thế input elements bằng giá trị đã lưu
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = printContentHTML;
      
      const tempInputs = tempDiv.querySelectorAll('.form-input');
      tempInputs.forEach((input, index) => {
        const inputData = inputValues.get(index);
        if (!inputData) return;
        
        const { fieldType, value, isChecked, selectedText } = inputData;
        let replacement = '';
        
        console.log(`Processing input ${index}: ${inputData.fieldName} (${fieldType})`, { value, isChecked, selectedText });
        
        switch (fieldType?.toLowerCase()) {
          case 'c': // checkbox
            if (isChecked) {
              replacement = '<span style="font-size: 16px; color: #000; font-weight: bold;">☑</span>';
            } else {
              replacement = '<span style="font-size: 16px; color: #000;">☐</span>';
            }
            console.log(`Checkbox replacement: ${replacement}`);
            break;
          case 's': // select
            replacement = `<span style="border-bottom: 1px solid #000; min-width: 100px; display: inline-block; padding: 2px 4px; font-weight: bold;">${selectedText || value || '_____________'}</span>`;
            break;
          case 'dt': // date
            let dateValue = value;
            if (dateValue) {
              try {
                // Parse date và format thành dd/mm/yyyy
                const date = new Date(dateValue + 'T00:00:00'); // Thêm time để tránh timezone issues
                const day = date.getDate().toString().padStart(2, '0');
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const year = date.getFullYear();
                dateValue = `${day}/${month}/${year}`;
                console.log(`Date conversion: ${value} -> ${dateValue}`);
              } catch (e) {
                console.log('Date parse error:', e);
                // Keep original value if parse fails
              }
            }
            replacement = `<span style="border-bottom: 1px solid #000; min-width: 120px; display: inline-block; padding: 2px 4px; font-weight: bold;">${dateValue || '_____________'}</span>`;
            break;
          case 'f': // formula
            replacement = `<span style="color: #1890ff; font-weight: bold; background-color: #f0f9ff; padding: 2px 6px; border-radius: 3px; border-bottom: 1px solid #000; min-width: 80px; display: inline-block; text-align: center;">${value || '0'}</span>`;
            break;
          case 'd': // number
            // Kiểm tra nếu fieldName chứa "date" thì xử lý như date
            if (inputData.fieldName?.toLowerCase().includes('date')) {
              let dateValue = value;
              if (dateValue) {
                try {
                  const date = new Date(dateValue + 'T00:00:00');
                  const day = date.getDate().toString().padStart(2, '0');
                  const month = (date.getMonth() + 1).toString().padStart(2, '0');
                  const year = date.getFullYear();
                  dateValue = `${day}/${month}/${year}`;
                  console.log(`Date field (type d) conversion: ${value} -> ${dateValue}`);
                } catch (e) {
                  console.log('Date parse error for field type d:', e);
                }
              }
              replacement = `<span style="border-bottom: 1px solid #000; min-width: 120px; display: inline-block; padding: 2px 4px; font-weight: bold;">${dateValue || '_____________'}</span>`;
            } else {
              replacement = `<span style="border-bottom: 1px solid #000; min-width: 100px; display: inline-block; padding: 2px 4px; font-weight: bold;">${value || '_____________'}</span>`;
            }
            break;
          case 't': // text
          default:
            replacement = `<span style="border-bottom: 1px solid #000; min-width: 100px; display: inline-block; padding: 2px 4px; font-weight: bold;">${value || '_____________'}</span>`;
            break;
        }
        
        // Thay thế input bằng span
        const span = document.createElement('span');
        span.innerHTML = replacement;
        input.parentNode.replaceChild(span, input);
      });
      
      // Lấy HTML đã xử lý
      printContentHTML = tempDiv.innerHTML;

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