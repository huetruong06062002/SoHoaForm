/**
 * Module xử lý validation form
 */
import { getDisplayFieldName } from './utils';

/**
 * Hiển thị lỗi validation
 * @param {Array} errors - Danh sách lỗi
 * @param {Object} modal - Modal từ Ant Design
 */
export const showValidationErrors = (errors, modal) => {
  if (!modal) return;
  
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

/**
 * Debug form state
 * @param {HTMLElement} containerRef - Tham chiếu đến container chứa form
 * @param {Array} formFields - Danh sách các trường từ API
 */
export const debugFormState = (containerRef, formFields = []) => {
  console.log('\n🔍 DEBUGGING FORM STATE');
  console.log('Container ref:', !!containerRef);

  if (containerRef) {
    const allInputs = containerRef.querySelectorAll('.form-input');
    console.log(`Found ${allInputs.length} inputs in DOM:`);

    allInputs.forEach((input, i) => {
      console.log(`  ${i}: ${input.dataset.fieldName} (${input.dataset.fieldType}) = "${input.value}"`);
    });

    console.log(`\nForm fields from API (${formFields.length}):`);
    formFields.forEach((field, i) => {
      console.log(`  ${i}: ${field.fieldName} (${field.fieldType}) required: ${field.isRequired}`);
    });
  }
  console.log('End debug\n');
};

/**
 * Validate form trước khi lưu
 * @param {HTMLElement} containerRef - Tham chiếu đến container chứa form
 * @param {Array} formFields - Danh sách các trường từ API
 * @param {string} wordContent - Nội dung HTML của Word
 * @returns {Object} Kết quả validation
 */
export const validateForm = (containerRef, formFields = [], wordContent = '') => {
  const errors = [];
  if (!containerRef) {
    return { isValid: false, errors: ['Container không tồn tại'] };
  }
  
  const inputs = containerRef.querySelectorAll('.form-input');

  console.log('=== VALIDATION START ===');
  console.log('Total inputs found:', inputs.length);

  // Tạo map để dễ tra cứu giá trị
  const fieldValueMap = new Map();
  inputs.forEach((input, index) => {
    const fieldName = input.dataset.fieldName;
    let value = '';

    // Debug each input element
    console.log(`Input ${index}:`, {
      tagName: input.tagName,
      type: input.type,
      fieldName: fieldName,
      fieldType: input.dataset.fieldType,
      rawValue: input.value,
      checked: input.checked,
      selectedIndex: input.selectedIndex,
      hasOptions: input.options?.length
    });

    switch (input.dataset.fieldType?.toLowerCase()) {
      case 'c': // checkbox
        value = input.checked;
        console.log(`  Checkbox value: ${value}`);
        break;
      case 'rd': // radio
        if (input.type === 'radio') {
          value = input.checked ? input.value : '';
          console.log(`  Radio input value: "${value}" (checked: ${input.checked})`);
        } else if (input.classList.contains('radio-group')) {
          // For radio group containers, find checked radio
          const checkedRadio = input.querySelector('input[type="radio"]:checked');
          value = checkedRadio ? checkedRadio.value : '';
          console.log(`  Radio group value: "${value}" (has selection: ${!!checkedRadio})`);
        }
        break;
      case 's': // select
        value = input.value;
        console.log(`  Select value: "${value}" (selectedIndex: ${input.selectedIndex})`);
        break;
      case 'dt': // date
        value = input.value?.trim() || '';
        console.log(`  Date value: "${value}"`);
        break;
      case 'd': // number
        value = input.value?.trim() || '';
        console.log(`  Number value: "${value}"`);
        break;
      case 't': // text
        value = input.value?.trim() || '';
        console.log(`  Text value: "${value}"`);
        break;
      case 'f': // formula
        value = input.value?.trim() || '';
        console.log(`  Formula value: "${value}"`);
        break;
      default:
        value = input.value?.trim() || '';
        console.log(`  Default value: "${value}"`);
        break;
    }

    fieldValueMap.set(fieldName, value);
    console.log(`  Final mapped: ${fieldName} (${input.dataset.fieldType}) = "${value}"`);
  });

  console.log('fieldValueMap size:', fieldValueMap.size);
  console.log('fieldValueMap entries:', Array.from(fieldValueMap.entries()));

  // Validate từng field
  console.log('formFields to validate:', formFields.length);
  formFields.forEach((fieldInfo, index) => {
    const originalFieldName = fieldInfo.fieldName;
    let fieldName = originalFieldName;
    let fieldValue = fieldValueMap.get(fieldName);
    let actualDomFieldName = fieldName; // Track the actual DOM field name

    // If exact match not found, try case-insensitive match
    if (fieldValue === undefined) {
      console.log(`Exact match not found for ${fieldName}, trying case-insensitive...`);
      for (const [mapKey, mapValue] of fieldValueMap.entries()) {
        if (mapKey && fieldName && mapKey.toLowerCase() === fieldName.toLowerCase()) {
          fieldValue = mapValue;
          actualDomFieldName = mapKey; // Use the actual DOM field name
          console.log(`Found case-insensitive match: ${mapKey} -> ${fieldName}`);
          console.log(`Will use DOM field name: ${actualDomFieldName}`);
          break;
        }
      }
    }

    console.log(`\n--- Validating field ${index}: ${originalFieldName} ---`);
    console.log('Field info:', {
      originalFieldName: fieldInfo.fieldName,
      actualDomFieldName: actualDomFieldName,
      fieldType: fieldInfo.fieldType,
      isRequired: fieldInfo.isRequired,
      formula: fieldInfo.formula,
      fieldDescription: fieldInfo.fieldDescription
    });
    console.log('Field value from map:', fieldValue);
    console.log('Value type:', typeof fieldValue);
    console.log('Value === "":', fieldValue === '');
    console.log('!fieldValue:', !fieldValue);

    // Debug: check if field exists in DOM using the actual DOM field name
    const domInput = containerRef.querySelector(`[data-field-name="${actualDomFieldName}"]`);
    if (domInput) {
      console.log('DOM input found:', {
        tagName: domInput.tagName,
        type: domInput.type,
        value: domInput.value,
        checked: domInput.checked,
        fieldType: domInput.dataset.fieldType
      });
    } else {
      console.log('❌ DOM input NOT FOUND for field:', actualDomFieldName);

      // Try to find with partial match
      const allInputs = containerRef.querySelectorAll('.form-input') || [];
      const similarInputs = Array.from(allInputs).filter(inp =>
        inp.dataset.fieldName?.toLowerCase().includes(originalFieldName.toLowerCase()) ||
        originalFieldName.toLowerCase().includes(inp.dataset.fieldName?.toLowerCase() || '')
      );
      console.log('Similar inputs found:', similarInputs.map(inp => ({
        fieldName: inp.dataset.fieldName,
        value: inp.value
      })));
    }

    // Skip validation if field doesn't exist in DOM (might be hidden/not rendered)
    if (!domInput) {
      console.log(`⚠️ Skipping validation for ${originalFieldName} (DOM: ${actualDomFieldName}) - no DOM input found`);
      return; // Skip this field entirely
    }

    // 1. Validate isRequired
    if (fieldInfo.isRequired) {
      console.log(`Field ${originalFieldName} (DOM: ${actualDomFieldName}) is required, checking...`);
      let isEmpty = false;

      if (fieldInfo.fieldType?.toLowerCase() === 'boolean') {
        // Boolean field required nghĩa là phải được check (true)
        isEmpty = !fieldValue; // false = empty, true = not empty
        console.log(`Boolean field ${originalFieldName} required check - checked: ${fieldValue}, isEmpty: ${isEmpty}`);
      } else {
        isEmpty = !fieldValue || fieldValue === '';
        console.log(`Non-boolean field ${originalFieldName} required check - value: "${fieldValue}", isEmpty: ${isEmpty}`);
      }

      if (isEmpty) {
        // Use actualDomFieldName for display as it matches what user sees
        const errorMsg = `${getDisplayFieldName(actualDomFieldName, wordContent, formFields)} là bắt buộc`;
        console.log(`❌ Adding required error: ${errorMsg}`);
        errors.push(errorMsg);
      } else {
        console.log(`✅ Field ${originalFieldName} has valid value: "${fieldValue}"`);
      }
    } else {
      console.log(`Field ${originalFieldName} is not required, skipping`);
    }

    // 2. Validate isUpperCase cho Text fields
    if (fieldInfo.isUpperCase &&
      (fieldInfo.fieldType?.toLowerCase() === 'text') &&
      fieldValue && fieldValue !== '') {
      if (fieldValue !== fieldValue.toUpperCase()) {
        errors.push(`${getDisplayFieldName(actualDomFieldName, wordContent, formFields)} phải viết HOA`);
      }
    }

    // 3. Validate dependencies cho Boolean fields có formula phụ thuộc
    if (fieldInfo.fieldType?.toLowerCase() === 'boolean' &&
      fieldInfo.formula &&
      !fieldInfo.formula.match(/^\{c_.*\}$/)) {

      console.log(`Processing Boolean dependency for ${originalFieldName}:`, {
        formula: fieldInfo.formula,
        fieldValue: fieldValue,
        isChecked: !!fieldValue
      });

      // CHỈ kiểm tra dependencies khi Boolean field được check (true)
      if (fieldValue) {
        console.log(`${originalFieldName} is checked, validating dependencies...`);

        // Parse dependencies từ formula đơn giản: "TraineeName, TraineeID"
        const dependencies = fieldInfo.formula.split(',').map(f => f.trim()).filter(f => f.length > 0);
        console.log(`Dependencies for ${originalFieldName}:`, dependencies);

        // Kiểm tra từng dependency
        dependencies.forEach(depFieldName => {
          const depValue = fieldValueMap.get(depFieldName);
          console.log(`Checking dependency ${depFieldName}: value = "${depValue}"`);

          if (!depValue || depValue === '') {
            const errorMsg = `${getDisplayFieldName(depFieldName, wordContent, formFields)} phải có giá trị vì liên quan đến ${getDisplayFieldName(actualDomFieldName, wordContent, formFields)}`;
            console.log(`Adding dependency error: ${errorMsg}`);
            errors.push(errorMsg);
          }
        });
      } else {
        console.log(`${originalFieldName} is not checked, skipping dependency validation`);
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

export default {
  showValidationErrors,
  debugFormState,
  validateForm
}; 