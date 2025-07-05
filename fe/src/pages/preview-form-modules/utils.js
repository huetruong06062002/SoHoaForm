/**
 * Các hàm tiện ích cho PreviewFormPage
 */

/**
 * Giữ nguyên định dạng danh sách đánh số từ file Word
 * @param {HTMLElement} containerRef - Tham chiếu đến container chứa form
 */
export const fixNumberedLists = (containerRef) => {
  if (!containerRef) return;
  console.log('Giữ nguyên định dạng danh sách từ file Word...');
  return; // Không làm gì để giữ nguyên định dạng từ file Word
};

/**
 * Tạo danh sách đánh số từ mảng các mục - giữ nguyên định dạng gốc
 * @param {Array} items - Mảng các mục cần đánh số
 * @returns {string} HTML của danh sách đánh số
 */
export const createNumberedList = (items) => {
  if (!items || items.length === 0) return '';
  
  // Thay vì tạo <ol>, chỉ tạo các đoạn văn bản riêng biệt để giữ định dạng gốc
  let html = '';
  
  // Add each item without numbering to preserve original format
  items.forEach((item) => {
    html += `<div style="margin-bottom: 8px; line-height: 1.4;">${item}</div>`;
  });
  
  return html;
};

/**
 * Tiền xử lý nội dung HTML để giữ nguyên định dạng từ file Word
 * @param {string} html - Nội dung HTML cần xử lý
 * @returns {string} Nội dung HTML đã được xử lý
 */
export const preprocessHtmlContent = (html) => {
  console.log('Giữ nguyên định dạng HTML từ file Word...');
  return html; // Giữ nguyên nội dung HTML từ file Word
};

/**
 * Sửa layout cho các field cùng dòng
 * @param {HTMLElement} containerRef - Tham chiếu đến container chứa form
 */
export const fixInlineLayout = (containerRef) => {
  if (!containerRef) return;

  console.log('Fixing inline layout...');

  // Method: Tìm các field cần ghép và restructure DOM
  const content = containerRef;

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

/**
 * Chuyển đổi fieldName thành tên hiển thị dễ hiểu
 * @param {string} fieldName - Tên trường
 * @param {string} wordContent - Nội dung HTML của Word
 * @param {Array} formFields - Danh sách các trường từ API
 * @returns {string} Tên hiển thị của trường
 */
export const getDisplayFieldName = (fieldName, wordContent, formFields) => {
  // Tìm label từ Word content dựa trên pattern TRƯỚC (ưu tiên cao hơn)
  if (wordContent && fieldName) {
    const labelFromWord = extractLabelFromWordContent(fieldName, wordContent, formFields);
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

/**
 * Extract label từ Word content
 * @param {string} fieldName - Tên trường
 * @param {string} wordContent - Nội dung HTML của Word
 * @param {Array} formFields - Danh sách các trường từ API
 * @returns {string|null} Label được trích xuất hoặc null
 */
export const extractLabelFromWordContent = (fieldName, wordContent, formFields) => {
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
      label = extractTableColumnLabel(fieldName, wordContent, formFields);
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

/**
 * Extract table column label cho các field trong table
 * @param {string} fieldName - Tên trường
 * @param {string} content - Nội dung HTML
 * @param {Array} formFields - Danh sách các trường từ API
 * @returns {string|null} Label được trích xuất hoặc null
 */
export const extractTableColumnLabel = (fieldName, content, formFields) => {
  if (!content || !fieldName) return null;

  // Tìm field pattern trong content
  const fieldInfo = formFields.find(f => f.fieldName === fieldName);
  if (!fieldInfo || !fieldInfo.formula) return null;

  const patternMatch = fieldInfo.formula.match(/^\{([a-z]_.*)\}$/);
  if (!patternMatch) return null;

  const fullPattern = patternMatch[1]; // "s_1A", "s_2C", etc.

  const escapedPattern = fullPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Tìm vị trí của field trong content
  const fieldRegex = new RegExp(`\\{${escapedPattern}\\}`, 'i');
  const fieldMatch = content.search(fieldRegex);

  if (fieldMatch === -1) return null;

  // Lấy phần content từ đầu đến field
  const beforeField = content.substring(0, fieldMatch);

  // Tìm table gần nhất chứa field này
  const tableStart = beforeField.lastIndexOf('<table');
  if (tableStart === -1) return null;

  // Lấy table content rộng hơn để có đủ headers
  const tableEnd = content.indexOf('</table>', tableStart);
  const tableContent = tableEnd !== -1 ?
    content.substring(tableStart, tableEnd + 8) :
    content.substring(tableStart, fieldMatch + 500);

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
  }

  const columnIndex = columnIndexInRow > 0 ? columnIndexInRow : tdMatches.length;

  // Tìm tất cả table headers - thử nhiều cách khác nhau
  let headerMatches = tableContent.match(/<th[^>]*>.*?<\/th>/gi);

  // Nếu không có <th>, thử tìm <td> trong row đầu tiên (có thể là header row)
  if (!headerMatches) {
    // Tìm row đầu tiên trong table
    const firstRowMatch = tableContent.match(/<tr[^>]*>(.*?)<\/tr>/i);
    if (firstRowMatch && firstRowMatch[1]) {
      headerMatches = firstRowMatch[1].match(/<td[^>]*>.*?<\/td>/gi);
    }
  }

  // Nếu vẫn không có, thử tìm tất cả <td> có text trong table
  if (!headerMatches) {
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
  }

  if (!headerMatches || headerMatches.length === 0) return null;

  // Extract text từ headers
  const headers = headerMatches.map(header => {
    // Bỏ HTML tags và lấy text
    return header.replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  });

  // Lấy header tương ứng với column index
  if (headers[columnIndex]) {
    let columnTitle = headers[columnIndex];

    // Clean up column title
    columnTitle = columnTitle
      .replace(/^\W+|\W+$/g, '') // Remove leading/trailing punctuation
      .trim();

    // Validate và return
    if (columnTitle &&
      columnTitle.length > 2 &&
      columnTitle.length < 100 &&
      !columnTitle.includes('{') &&
      !columnTitle.includes('}')) {
      return columnTitle;
    }
  }

  return null;
};

export default {
  fixNumberedLists,
  createNumberedList,
  preprocessHtmlContent,
  fixInlineLayout,
  getDisplayFieldName,
  extractLabelFromWordContent,
  extractTableColumnLabel
}; 