import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Button, message, Spin, Switch, DatePicker } from 'antd';
import mammoth from 'mammoth';
import html2pdf from 'html2pdf.js';
import formService from '../services/formService';
import AppLayout from '../components/layout/AppLayout';
import './PreviewFormPage.css';

const PreviewFormPage = () => {
  const { formId } = useParams();
  const [loading, setLoading] = useState(true);
  const [isWordMode, setIsWordMode] = useState(false);
  const [wordContent, setWordContent] = useState('');
  const [formInfo, setFormInfo] = useState(null);
  const containerRef = useRef(null);

    const createInputElement = (fieldType, fieldName) => {
    let element;
    console.log('Creating input element:', { fieldType, fieldName }); // Debug log
    
    // Kiểm tra nếu fieldName chứa "date" thì tạo date input
    const isDateField = fieldName.toLowerCase().includes('date') || 
                       fieldName.toLowerCase().includes('ngay') ||
                       fieldType.toLowerCase() === 'dt';
    
    switch (fieldType.toLowerCase()) {
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
        element.placeholder = 'Nhập công thức';
        break;
        
      default:
        // Mặc định là text input
        element = document.createElement('input');
        element.type = 'text';
        element.className = 'form-input text-input';
        break;
    }
    
    element.dataset.fieldType = fieldType;
    element.dataset.fieldName = fieldName;
    
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
      const inputElement = createInputElement(fieldType, fieldName);

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
        // Fetch form information và Word file song song
        const [formInfoResponse, wordFile] = await Promise.all([
          formService.getFormInfo(formId),
          formService.getWordFile(formId)
        ]);
        
        // Set form info
        setFormInfo(formInfoResponse.data);
        
        // Convert Word to HTML using mammoth
        const result = await mammoth.convertToHtml({ arrayBuffer: wordFile });
        setWordContent(result.value);
        
        if (containerRef.current) {
          containerRef.current.innerHTML = result.value;
          makeFieldsEditable();
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

  const handleSave = async () => {
    try {
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
      
      // Log dữ liệu dạng object với thông tin chi tiết
      console.log('Form Data:', formData);
      message.success('Đã lưu dữ liệu form');
    } catch (err) {
      console.error('Error saving form:', err);
      message.error('Lỗi khi lưu dữ liệu form');
    }
  };

  const handleExportPDF = async () => {
    try {
      message.loading('Đang tạo file PDF...', 0);
      
      // Tạo một bản copy của nội dung để xuất PDF
      const printContent = containerRef.current.cloneNode(true);
      
      // Tạo container tạm thời cho PDF
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.width = '210mm'; // A4 width
      tempContainer.style.padding = '20mm';
      tempContainer.style.backgroundColor = 'white';
      tempContainer.style.fontFamily = 'Arial, sans-serif';
      tempContainer.style.fontSize = '12px';
      tempContainer.style.lineHeight = '1.4';
      
      // Style cho bảng trong PDF
      const tables = printContent.querySelectorAll('table');
      tables.forEach(table => {
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginBottom = '10px';
        
        const cells = table.querySelectorAll('td, th');
        cells.forEach(cell => {
          cell.style.border = '1px solid #000';
          cell.style.padding = '8px';
          cell.style.verticalAlign = 'middle';
          cell.style.fontSize = '12px';
        });
      });
      
      // Style cho input fields trong PDF
      const inputs = printContent.querySelectorAll('.form-input');
      inputs.forEach(input => {
        let value = '';
        if (input.type === 'checkbox') {
          value = input.checked ? '☑' : '☐';
        } else if (input.type === 'date') {
          // Format date cho PDF (dd/mm/yyyy)
          if (input.value) {
            const date = new Date(input.value);
            value = date.toLocaleDateString('vi-VN');
          }
        } else {
          value = input.value || '';
        }
        
        const span = document.createElement('span');
        span.textContent = value;
        span.style.borderBottom = '1px solid #000';
        span.style.minWidth = '100px';
        span.style.display = 'inline-block';
        span.style.padding = '2px 4px';
        input.parentNode.replaceChild(span, input);
      });
      
      tempContainer.appendChild(printContent);
      document.body.appendChild(tempContainer);
      
      // Cấu hình PDF
      const formName = formInfo?.formName || 'form';
      const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${formName}_${timestamp}.pdf`,
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
      
      // Tạo và tải xuống PDF
      await html2pdf().set(opt).from(tempContainer).save();
      
      // Cleanup
      document.body.removeChild(tempContainer);
      message.destroy();
      message.success('Đã xuất PDF thành công!');
      
    } catch (error) {
      console.error('Error exporting PDF:', error);
      message.destroy();
      message.error('Lỗi khi xuất PDF');
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