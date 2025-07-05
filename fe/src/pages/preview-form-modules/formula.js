/**
 * Module xử lý các công thức trong form
 */

/**
 * Tính toán công thức
 * @param {string} formula - Công thức cần tính
 * @param {Object} fieldValues - Giá trị các trường
 * @param {Array} formFieldsData - Danh sách các trường từ API
 * @returns {string|number} Kết quả tính toán
 */
export const calculateFormula = (formula, fieldValues, formFieldsData = []) => {
  try {
    if (!formula) return '';

    console.log('Calculating formula:', formula, 'with values:', fieldValues);

    let calculatedFormula = formula;

    // Thay thế các biến có dấu [] bằng giá trị thực
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
    // Nếu không có biến dạng [fieldName], thử xem có phải dạng tham chiếu trực tiếp không (ví dụ: so1 + so2)
    else {
      // Lấy danh sách tất cả field names
      const fieldNames = formFieldsData
        .filter(f => f.fieldType !== 'Formula')
        .map(f => f.fieldName);
      
      // Sắp xếp theo chiều dài giảm dần để tránh thay thế tên biến ngắn trong tên biến dài
      fieldNames.sort((a, b) => b.length - a.length);
      
      for (const fieldName of fieldNames) {
        // Thay thế chính xác fieldName bằng giá trị
        // Sử dụng regex để khớp với tên biến đầy đủ (không phải phần của biến khác)
        const regex = new RegExp(`\\b${fieldName}\\b`, 'g');
        
        if (regex.test(calculatedFormula)) {
          let value = fieldValues[fieldName];
          
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
          
          calculatedFormula = calculatedFormula.replace(regex, value);
          console.log(`Replaced direct reference to ${fieldName} with ${value}`);
        }
      }
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

// Biến để lưu trữ trạng thái trước đó của các trường
let previousFieldValues = {};

/**
 * Cập nhật tất cả các trường công thức
 * @param {HTMLElement} containerRef - Tham chiếu đến container chứa form
 * @param {Array} formFields - Danh sách các trường từ API
 * @param {function} setFieldValues - Hàm cập nhật state fieldValues
 */
export const updateFormulaFields = (containerRef, formFields = [], setFieldValues) => {
  if (!containerRef) return;

  console.log('Updating formula fields...');

  // Lấy tất cả giá trị hiện tại từ form
  const newFieldValues = {};
  const inputs = containerRef.querySelectorAll('.form-input');
  inputs.forEach(input => {
    const fieldName = input.dataset.fieldName;
    if (fieldName && input.dataset.fieldType !== 'f') {
      let value = '';

      switch (input.dataset.fieldType?.toLowerCase()) {
        case 'c': // checkbox
          value = input.checked ? 1 : 0;
          console.log(`Checkbox ${fieldName} value: ${input.checked} -> ${value}`);
          break;
        case 'rd': // radio
          // For radio buttons, only include checked ones
          if (input.type === 'radio') {
            value = input.checked ? 'true' : '';
            if (input.checked) {
              console.log(`Radio ${fieldName} is checked with value: ${value}`);
            }
          }
          break;
        case 'n': // number
          const numberValue = parseFloat(input.value);
          value = isNaN(numberValue) ? 0 : numberValue;
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
          const textNumValue = parseFloat(value);
          if (!isNaN(textNumValue) && value.trim() !== '') {
            value = textNumValue;
          }
          break;
      }

      newFieldValues[fieldName] = value;
    }
  });

  // Kiểm tra xem có thay đổi giá trị so với lần cập nhật trước không
  let hasChanged = false;
  
  // So sánh các giá trị mới với các giá trị trước đó
  for (const fieldName in newFieldValues) {
    if (previousFieldValues[fieldName] !== newFieldValues[fieldName]) {
      hasChanged = true;
      break;
    }
  }
  
  // Kiểm tra nếu có fields mới được thêm vào
  for (const fieldName in previousFieldValues) {
    if (newFieldValues[fieldName] === undefined) {
      hasChanged = true;
      break;
    }
  }

  // Nếu không có sự thay đổi, không cần cập nhật lại
  if (!hasChanged) {
    console.log('No field values changed, skipping formula update');
    return;
  }

  // Lưu trạng thái hiện tại để so sánh lần sau
  previousFieldValues = {...newFieldValues};

  // Cập nhật state fieldValues nếu có hàm setFieldValues
  if (setFieldValues) {
    setFieldValues(newFieldValues);
  }
  
  console.log('Current field values:', newFieldValues);

  // Cập nhật các formula fields
  const formulaInputs = containerRef.querySelectorAll('.form-input[data-field-type="f"]');
  console.log('Found formula inputs:', formulaInputs.length);

  formulaInputs.forEach(input => {
    const fieldName = input.dataset.fieldName;
    console.log('Processing formula field:', fieldName);

    const fieldInfo = formFields.find(f => f.fieldName === fieldName);

    if (fieldInfo && fieldInfo.formula) {
      console.log('Found field info with formula:', fieldInfo.formula);
      const result = calculateFormula(fieldInfo.formula, newFieldValues, formFields);
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
    }
  });
};

/**
 * Populate dữ liệu đã lưu vào form
 * @param {Object} savedData - Dữ liệu đã lưu
 * @param {HTMLElement} containerRef - Tham chiếu đến container chứa form
 * @param {function} updateFormulaFieldsFunc - Hàm cập nhật các trường công thức
 */
export const populateFormData = (savedData, containerRef, updateFormulaFieldsFunc) => {
  if (!containerRef || !savedData || !savedData.fieldValues) return;

  console.log('Populating form with saved data:', savedData);

  const inputs = containerRef.querySelectorAll('.form-input');
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
          break;
        case 'rd': // radio
          // Chỉ checked nếu value là true hoặc "true"
          if (input.type === 'radio') {
            input.checked = savedField.value === true || savedField.value === 'true';
          }
          break;
        case 'n': // number
          input.value = savedField.value;
          break;
        case 'dt': // date
          input.value = savedField.value;
          break;
        case 's': // select
          input.value = savedField.value;
          break;
        case 'f': // formula
          input.value = savedField.value;
          break;
        case 't': // text
        default:
          input.value = savedField.value;
          break;
      }
    }
  });

  // Cập nhật các trường công thức sau khi populate form
  if (typeof updateFormulaFieldsFunc === 'function') {
    setTimeout(() => updateFormulaFieldsFunc(), 300);
  }
};

export default {
  calculateFormula,
  updateFormulaFields,
  populateFormData
}; 