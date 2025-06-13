import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Button, message, Spin, Switch } from 'antd';
import mammoth from 'mammoth';
import formService from '../services/formService';
import AppLayout from '../components/layout/AppLayout';
import './PreviewFormPage.css';

const PreviewFormPage = () => {
  const { formId } = useParams();
  const [loading, setLoading] = useState(true);
  const [isWordMode, setIsWordMode] = useState(false);
  const [wordContent, setWordContent] = useState('');
  const containerRef = useRef(null);

  const makeFieldsEditable = () => {
    if (!containerRef.current) return;

    // Tìm tất cả text nodes có chứa placeholder
    const walk = document.createTreeWalker(
      containerRef.current,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          return node.textContent.match(/\{[a-z]_[^}]+\}/i)
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

    // Thay thế các placeholder bằng input
    placeholders.forEach(({ node, text }) => {
      const matches = text.match(/\{([a-z])_([^}]+)\}/i);
      if (!matches) return;

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'form-input';
      input.dataset.fieldType = matches[1];
      input.dataset.fieldName = matches[2];

      // Nếu placeholder nằm trong text node có nhiều nội dung khác
      if (text.length > matches[0].length) {
        const span = document.createElement('span');
        span.className = 'input-wrapper';
        span.innerHTML = text.replace(matches[0], '');
        span.appendChild(input);
        node.parentNode.replaceChild(span, node);
      } else {
        // Nếu text node chỉ chứa mỗi placeholder
        const span = document.createElement('span');
        span.className = 'input-wrapper';
        span.appendChild(input);
        node.parentNode.replaceChild(span, node);
      }
    });

    // Lấy tất cả các cell có text cố định và thêm vào formFields
    const cells = containerRef.current.querySelectorAll('td');
    cells.forEach(cell => {
      const text = cell.textContent.trim();
      if (text && !text.match(/\{[a-z]_[^}]+\}/i)) {
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
        // Fetch Word file
        const wordFile = await formService.getWordFile(formId);
        
        // Convert Word to HTML using mammoth
        const result = await mammoth.convertToHtml({ arrayBuffer: wordFile });
        setWordContent(result.value);
        
        if (containerRef.current) {
          containerRef.current.innerHTML = result.value;
          makeFieldsEditable();
        }
      } catch (err) {
        console.error('Error fetching word file:', err);
        message.error('Lỗi khi tải file word');
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
        const value = input.value || '';
        formData.push(`${label}: "${value}"`);
      });
      
      // Log dữ liệu dạng mảng với fieldName và value
      console.log('[' + formData.join(', ') + ']');
      message.success('Đã lưu dữ liệu form');
    } catch (err) {
      console.error('Error saving form:', err);
      message.error('Lỗi khi lưu dữ liệu form');
    }
  };

  const handleExportPDF = () => {
    message.info('Tính năng đang được phát triển');
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
              Xem trước form
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