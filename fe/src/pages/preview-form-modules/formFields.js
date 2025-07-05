/**
 * Module xử lý các trường form
 */

/**
 * Tạo input element dựa trên loại trường
 * @param {string} fieldType - Loại trường
 * @param {string} fieldName - Tên trường
 * @param {Object} fieldInfo - Thông tin trường từ API
 * @param {Array} formFieldsData - Danh sách các trường từ API
 * @returns {HTMLElement} Element input đã tạo
 */
export const createInputElement = (fieldType, fieldName, fieldInfo = null, formFieldsData = []) => {
  let element;
  console.log('Creating input element:', { fieldType, fieldName, formFieldsDataLength: formFieldsData.length });

  // Map field type từ API sang internal field type
  let internalFieldType = fieldType.toLowerCase();
  if (fieldType === 'Number' || fieldType === 'number') internalFieldType = 'n';
  if (fieldType === 'Formula' || fieldType === 'formula') internalFieldType = 'f';
  if (fieldType === 'Text' || fieldType === 'text') internalFieldType = 't';
  if (fieldType === 'Boolean' || fieldType === 'boolean') internalFieldType = 'c';
  if (fieldType === 'Date' || fieldType === 'date') internalFieldType = 'dt';
  if (fieldType === 'Select' || fieldType === 'select') internalFieldType = 's';
  if (fieldType === 'Radio' || fieldType === 'radio') internalFieldType = 'rd';
  if (fieldType === 'rd') internalFieldType = 'rd'; // Handle case when pattern is {rd_field}

  // Xử lý pattern từ placeholder {type_field}
  if (typeof fieldType === 'string' && fieldType.length === 1) {
    // Đây là pattern từ placeholder như d_, t_, c_, etc.
    if (fieldType === 'd') {
      // Kiểm tra xem có phải Date field không dựa trên fieldInfo từ API
      const apiFieldInfo = fieldInfo || formFieldsData.find(f => f.fieldName === fieldName);
      console.log(`DEBUG d_ field processing - fieldName: ${fieldName}`, {
        apiFieldInfo: apiFieldInfo,
        apiFieldType: apiFieldInfo?.fieldType,
        formFieldsDataLength: formFieldsData.length
      });

      if (apiFieldInfo && apiFieldInfo.fieldType === 'Date') {
        internalFieldType = 'dt'; // Date
        console.log(`Setting ${fieldName} as date field (dt)`);
      } else {
        // Fallback: check nếu fieldName chứa "date"
        if (fieldName.toLowerCase().includes('date') ||
          fieldName.toLowerCase().includes('ngay')) {
          internalFieldType = 'dt'; // Date
          console.log(`Setting ${fieldName} as date field (dt) based on name`);
        } else {
          internalFieldType = 'n'; // Number
          console.log(`Setting ${fieldName} as number field (n)`);
        }
      }
    } else {
      internalFieldType = fieldType;
    }
  }

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

    case 'n': // number
      element = document.createElement('input');
      element.type = 'number';
      element.className = 'form-input number-input';
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
      element.placeholder = '';
      element.readOnly = true;
      element.style.backgroundColor = '#f0f9ff';
      element.style.borderColor = '#1890ff';
      element.style.cursor = 'not-allowed';
      element.style.fontWeight = 'bold';
      element.style.color = '#1890ff';
      element.style.textAlign = 'center';
      break;
    
    case 'rd': // radio
      // For radio buttons, we create a simple radio input without label
      const radioInput = document.createElement('input');
      radioInput.type = 'radio';
      radioInput.name = fieldName;
      radioInput.value = 'true';
      radioInput.className = 'form-input radio-input';
      radioInput.id = `${fieldName}-radio`;
      radioInput.style.margin = '0 auto';
      radioInput.style.padding = '0';
      radioInput.style.display = 'block';
      radioInput.style.width = '16px';
      radioInput.style.height = '16px';
      radioInput.style.minWidth = '16px';
      radioInput.style.verticalAlign = 'middle';
      radioInput.dataset.fieldType = 'rd';
      radioInput.dataset.fieldName = fieldName;
      
      return radioInput;

    default:
      // Mặc định là text input
      element = document.createElement('input');
      element.type = 'text';
      element.className = 'form-input text-input';
      break;
  }

  element.dataset.fieldType = internalFieldType;
  element.dataset.fieldName = fieldName;
  element.dataset.originalFieldType = fieldType; // Lưu field type gốc từ placeholder pattern

  // Nếu có fieldInfo từ API, lưu luôn API field type
  if (fieldInfo && fieldInfo.fieldType) {
    element.dataset.apiFieldType = fieldInfo.fieldType;
  }

  return element;
};

/**
 * Làm cho các trường có thể chỉnh sửa
 * @param {HTMLElement} containerRef - Tham chiếu đến container chứa form
 * @param {Array} formFields - Danh sách các trường từ API
 * @param {function} updateFormulaFields - Hàm cập nhật các trường công thức
 */
export const makeFieldsEditable = (containerRef, formFields = [], updateFormulaFields) => {
  if (!containerRef) return;

  console.log('makeFieldsEditable called, current formFields:', formFields.length);

  // Kiểm tra xem đã có input elements chưa
  const existingInputs = containerRef.querySelectorAll('.form-input');
  console.log('Existing inputs found:', existingInputs.length);

  if (existingInputs.length > 0 && formFields.length > 0) {
    console.log('Found existing inputs AND formFields, updating select options...');

    // Update existing select elements với data từ formFields
    const selectInputs = containerRef.querySelectorAll('select.form-input');
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
  let htmlContent = containerRef.innerHTML;
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
    console.log('Field info from API:', fieldInfo);
    console.log('DEBUG - About to create input:', {
      placeholderFieldType: fieldType,
      apiFieldType: fieldInfo?.fieldType,
      fieldName: fieldName,
      shouldBeDate: fieldInfo?.fieldType === 'Date'
    });

    // Pass fieldType từ placeholder (d, t, c, etc.) để logic trong createInputElement xử lý đúng
    const inputElement = createInputElement(fieldType, fieldName, fieldInfo, formFields);

    console.log('DEBUG - Created input element:', {
      tagName: inputElement.tagName,
      type: inputElement.type,
      className: inputElement.className,
      fieldType: inputElement.dataset.fieldType
    });

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
  containerRef.innerHTML = htmlContent;
  console.log('Updated HTML content');

  // Post-process: Force convert Date fields to date inputs
  setTimeout(() => {
    if (containerRef && formFields.length > 0) {
      console.log('POST-PROCESS: Converting Date fields to date inputs...');
      console.log('POST-PROCESS: Available formFields:', formFields.map(f => ({ name: f.fieldName, type: f.fieldType })));

      // Tìm tất cả input elements hiện có
      const allInputs = containerRef.querySelectorAll('input[data-field-name]');
      console.log('POST-PROCESS: Found inputs:', Array.from(allInputs).map(input => ({
        name: input.dataset.fieldName,
        type: input.type,
        currentClass: input.className
      })));

      formFields.forEach(field => {
        if (field.fieldType === 'Date') {
          console.log(`POST-PROCESS: Processing Date field: ${field.fieldName}`);

          // Tìm input element cho field này - thử nhiều cách
          let inputs = containerRef.querySelectorAll(`input[data-field-name="${field.fieldName}"]`);

          // Nếu không tìm thấy chính xác, thử tìm bằng partial match
          if (inputs.length === 0) {
            inputs = containerRef.querySelectorAll(`input[data-field-name*="${field.fieldName}"]`);
            console.log(`POST-PROCESS: Used partial match for ${field.fieldName}, found ${inputs.length} inputs`);
          }

          // Nếu vẫn không có, thử tìm bằng field name variations
          if (inputs.length === 0) {
            const variations = [
              field.fieldName.toLowerCase(),
              field.fieldName.replace(/\s+/g, ''),
              field.fieldName.replace(/\s+/g, '').toLowerCase(),
            ];

            for (const variation of variations) {
              inputs = containerRef.querySelectorAll(`input[data-field-name="${variation}"]`);
              if (inputs.length > 0) {
                console.log(`POST-PROCESS: Found ${field.fieldName} using variation: ${variation}`);
                break;
              }
            }
          }

          console.log(`POST-PROCESS: Found ${inputs.length} inputs for ${field.fieldName}`);

          inputs.forEach((input, index) => {
            console.log(`POST-PROCESS: Processing input ${index} for ${field.fieldName}:`, {
              currentType: input.type,
              currentValue: input.value,
              currentClass: input.className
            });

            if (input.type !== 'date') {
              console.log(`POST-PROCESS: Converting ${field.fieldName} from ${input.type} to date`);
              const currentValue = input.value;
              input.type = 'date';
              input.className = 'form-input date-input';
              input.dataset.fieldType = 'dt';

              // Clear invalid values (như chữ "d")
              if (currentValue === 'd' || currentValue === '0' || !currentValue || currentValue.length < 3) {
                input.value = '';
                console.log(`POST-PROCESS: Cleared invalid value "${currentValue}" for ${field.fieldName}`);
              } else {
                // Nếu có giá trị và là định dạng ngày, convert sang YYYY-MM-DD
                try {
                  const date = new Date(currentValue);
                  if (!isNaN(date.getTime())) {
                    input.value = date.toISOString().split('T')[0];
                    console.log(`POST-PROCESS: Converted date value for ${field.fieldName}: ${currentValue} -> ${input.value}`);
                  }
                } catch (e) {
                  console.log('Could not convert date value:', currentValue);
                  input.value = ''; // Clear invalid date
                }
              }

              console.log(`POST-PROCESS: Successfully converted ${field.fieldName} to date input`);
            } else {
              console.log(`POST-PROCESS: ${field.fieldName} already is date input`);
            }
          });
        }
      });

      // Thêm fallback: tìm tất cả inputs có value="d" hoặc "0" và convert thành date nếu tên field chứa "date"
      const suspiciousInputs = containerRef.querySelectorAll('input[type="text"], input[type="number"]');
      suspiciousInputs.forEach(input => {
        const fieldName = input.dataset.fieldName || '';
        const value = input.value || '';

        if ((fieldName.toLowerCase().includes('date') || fieldName.toLowerCase().includes('ngay')) &&
          (value === 'd' || value === '0' || value === '' || input.type === 'number')) {
          console.log(`POST-PROCESS: FALLBACK - Converting suspicious input to date:`, {
            fieldName: fieldName,
            currentType: input.type,
            currentValue: value
          });

          input.type = 'date';
          input.className = 'form-input date-input';
          input.dataset.fieldType = 'dt';
          input.value = '';
        }
      });
    }
  }, 200); // Tăng timeout để chắc chắn form đã render xong

  // Thêm event listeners cho các input elements
  if (updateFormulaFields) {
    setTimeout(() => {
      const inputs = containerRef.querySelectorAll('.form-input');
      inputs.forEach(input => {
        if (input.dataset.fieldType !== 'f') {
          // Sử dụng nhiều events để đảm bảo capture được mọi thay đổi
          const events = ['input', 'change', 'keyup', 'blur'];
          events.forEach(eventType => {
            input.addEventListener(eventType, (e) => {
              console.log(`${eventType} event: ${input.dataset.fieldName} = ${e.target.value}`);
              // Delay để đảm bảo giá trị đã được cập nhật trong DOM
              setTimeout(() => updateFormulaFields(), 50);
            });
          });
        }
      });
    }, 300);
  }
};

export default {
  createInputElement,
  makeFieldsEditable
}; 