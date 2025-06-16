import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spin, Typography, App } from 'antd';
import { ArrowLeftOutlined, FilePdfOutlined } from '@ant-design/icons';
import mammoth from 'mammoth';
import formService from '../services/formService';
import AppLayout from '../components/layout/AppLayout';

const { Title, Text } = Typography;

const ViewFilledFormPage = () => {
  const { userFillFormId } = useParams();
  const navigate = useNavigate();
  const { message: messageApi } = App.useApp();
  
  const [loading, setLoading] = useState(true);
  const [wordContent, setWordContent] = useState('');
  const [formInfo, setFormInfo] = useState(null);
  const [formFields, setFormFields] = useState([]);
  const [filledData, setFilledData] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    fetchAllData();
  }, [userFillFormId]);

  // useEffect để đảm bảo dữ liệu được populate sau khi formFields sẵn sàng
  useEffect(() => {
    if (formFields.length > 0 && filledData && containerRef.current && wordContent) {
      console.log('FormFields and filledData ready, re-replacing patterns...');
      
      // Re-replace patterns với dữ liệu mới
      const updatedContent = replaceFieldPatterns(wordContent, filledData.parsedFieldValues);
      containerRef.current.innerHTML = updatedContent;
    }
  }, [formFields, filledData, wordContent]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Bước 1: Lấy dữ liệu đã điền để có formId
      const filledDataResponse = await formService.getFilledFormData(userFillFormId);
      
      if (filledDataResponse.statusCode !== 200) {
        messageApi.error('Không thể tải dữ liệu form đã điền');
        return;
      }
      
      const filledFormData = filledDataResponse.data;
      setFilledData(filledFormData);
      
      const formId = filledFormData.formId;
      
      // Bước 2: Fetch form info, form fields và Word file song song
      const [formInfoResponse, formFieldsResponse, wordFile] = await Promise.all([
        formService.getFormInfo(formId),
        formService.getFormFields(formId),
        formService.getWordFile(formId)
      ]);
      
      // Set form info và fields
      setFormInfo(formInfoResponse.data);
      const fieldsData = formFieldsResponse.data?.fields || [];
      setFormFields(fieldsData);
      
      // Bước 3: Convert Word to HTML
      const result = await mammoth.convertToHtml({ arrayBuffer: wordFile });
      let htmlContent = result.value;
      
      console.log('Original Word HTML content:', htmlContent);
      console.log('Parsed field values:', filledFormData.parsedFieldValues);
      
      // Bước 4: Thay thế patterns [fieldName] bằng giá trị đã điền
      htmlContent = replaceFieldPatterns(htmlContent, filledFormData.parsedFieldValues);
      
      setWordContent(htmlContent);
      
      // Bước 5: Hiển thị HTML đã được thay thế
      if (containerRef.current) {
        containerRef.current.innerHTML = htmlContent;
        console.log('Final HTML content:', htmlContent);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      messageApi.error('Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };



  const handleExportPDF = () => {
    if (!filledData || !wordContent) {
      messageApi.warning('Không có dữ liệu để xuất PDF');
      return;
    }

    // Tạo HTML content cho PDF
    const htmlContent = generatePDFContent();
    
    // Mở tab mới với kích thước fullscreen
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      // Thiết lập kích thước fullscreen
      newWindow.moveTo(0, 0);
      newWindow.resizeTo(screen.width, screen.height);
      
      // Tính toán zoom level dựa trên kích thước màn hình
      let zoomLevel = '1.3';
      if (screen.width >= 1920) zoomLevel = '1.7';
      else if (screen.width >= 1600) zoomLevel = '1.5';
      else if (screen.width >= 1366) zoomLevel = '1.4';
      
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Form - ${filledData.formName}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
              background-color: #2f2f2f;
              display: flex;
              flex-direction: column;
              align-items: center;
              min-height: 100vh;
            }
            
            .controls {
              position: fixed;
              top: 10px;
              right: 10px;
              z-index: 1000;
              display: flex;
              gap: 10px;
            }
            
            .control-btn {
              padding: 8px 16px;
              background: #1890ff;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
            }
            
            .control-btn:hover {
              background: #40a9ff;
            }
            
            .pdf-container {
              background: white;
              box-shadow: 0 4px 20px rgba(0,0,0,0.3);
              margin: 20px auto;
              transform: scale(${zoomLevel});
              transform-origin: top center;
              border-radius: 8px;
              overflow: hidden;
            }
            
            .pdf-content {
              width: 210mm;
              min-height: 297mm;
              padding: 20mm;
              box-sizing: border-box;
              background: white;
            }
            
            @media print {
              body {
                background: white;
                padding: 0;
              }
              .controls {
                display: none;
              }
              .pdf-container {
                transform: none;
                box-shadow: none;
                margin: 0;
                border-radius: 0;
              }
              .pdf-content {
                width: 100%;
                min-height: auto;
                padding: 15mm;
              }
            }
            
            .readonly-input {
              border: 1px solid #d9d9d9 !important;
              background-color: white !important;
              padding: 4px 8px !important;
              border-radius: 4px !important;
            }
            
            input[type="checkbox"]:disabled {
              opacity: 1;
            }
          </style>
        </head>
        <body>
          <div class="controls">
            <button class="control-btn" onclick="window.print()">📄 Tải PDF</button>
            <button class="control-btn" onclick="window.print()">🖨️ In</button>
            <button class="control-btn" onclick="toggleFullscreen()">⛶ Toàn màn hình</button>
            <button class="control-btn" onclick="window.close()">✕ Đóng</button>
          </div>
          
          <div class="pdf-container">
            <div class="pdf-content">
              ${htmlContent}
            </div>
          </div>
          
          <script>
            function toggleFullscreen() {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
              } else {
                document.exitFullscreen();
              }
            }
            
            // Auto resize on window resize
            window.addEventListener('resize', function() {
              let zoomLevel = '1.3';
              if (window.innerWidth >= 1920) zoomLevel = '1.7';
              else if (window.innerWidth >= 1600) zoomLevel = '1.5';
              else if (window.innerWidth >= 1366) zoomLevel = '1.4';
              
              document.querySelector('.pdf-container').style.transform = 'scale(' + zoomLevel + ')';
            });
          </script>
        </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  const generatePDFContent = () => {
    if (!containerRef.current) return '';
    
    // Clone the content và clean up
    const clonedContent = containerRef.current.cloneNode(true);
    
    // Thêm thông tin header
    const headerInfo = `
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1890ff; padding-bottom: 15px;">
        <h1 style="color: #1890ff; margin: 0 0 10px 0;">${filledData.formName}</h1>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
          <div><strong>Người điền:</strong> ${filledData.userName}</div>
          <div><strong>Ngày điền:</strong> ${new Date(filledData.createdAt).toLocaleString('vi-VN')}</div>
          <div><strong>Trạng thái:</strong> ${filledData.status === 'Draft' ? 'Bản nháp' : 'Hoàn tất'}</div>
          <div><strong>Tổng số trường:</strong> ${filledData.fieldCount} trường</div>
        </div>
      </div>
    `;
    
    return headerInfo + clonedContent.innerHTML;
  };

  // Function để thay thế patterns [fieldName] bằng giá trị đã điền
  const replaceFieldPatterns = (htmlContent, parsedFieldValues) => {
    if (!parsedFieldValues || parsedFieldValues.length === 0) {
      return htmlContent;
    }
    
    let modifiedContent = htmlContent;
    console.log('=== DEBUGGING PATTERN REPLACEMENT ===');
    console.log('Original HTML content:', htmlContent);
    console.log('Parsed field values:', parsedFieldValues);
    
    // Tìm tất cả patterns có trong HTML content
    const allPatternsInHTML = [];
    const bracketMatches = htmlContent.match(/\{[^}]+\}/g) || [];
    const squareMatches = htmlContent.match(/\[[^\]]+\]/g) || [];
    allPatternsInHTML.push(...bracketMatches, ...squareMatches);
    console.log('All patterns found in HTML:', allPatternsInHTML);
    
    // Mapping field types từ API sang HTML template
    const getHtmlFieldType = (apiFieldType) => {
      const mapping = {
        't': 'n',  // text -> number (trong HTML template)
        'n': 'n',  // number -> number
        'f': 'f',  // formula -> formula
        'c': 'c',  // checkbox -> checkbox
        's': 's',  // select -> select
        'dt': 'd'  // date -> date (dt từ API, d trong HTML)
      };
      return mapping[apiFieldType] || apiFieldType;
    };
    
    // Thay thế từng field pattern
    parsedFieldValues.forEach(field => {
      console.log(`\n--- Processing field: ${field.fieldName}, type: ${field.fieldType}, value: ${field.value} ---`);
      
      // Lấy field type cho HTML template
      const htmlFieldType = getHtmlFieldType(field.fieldType);
      console.log(`API field type: ${field.fieldType} -> HTML field type: ${htmlFieldType}`);
      
      // Thử nhiều pattern formats khác nhau với cả [] và {}
      const patterns = [
        // Square brackets []
        `[${field.fieldName}]`,                    // [so1]
        `[${htmlFieldType}_${field.fieldName}]`,   // [n_so1], [f_so3]
        `[${htmlFieldType.toUpperCase()}_${field.fieldName}]`, // [N_so1], [F_so3]
        `[${field.fieldName.toUpperCase()}]`,      // [SO1]
        // Curly braces {}
        `{${field.fieldName}}`,                    // {so1}
        `{${htmlFieldType}_${field.fieldName}}`,   // {n_so1}, {f_so3}
        `{${htmlFieldType.toUpperCase()}_${field.fieldName}}`, // {N_so1}, {F_so3}
        `{${field.fieldName.toUpperCase()}}`,      // {SO1}
        // Thêm patterns với API field type gốc (backup)
        `{${field.fieldType}_${field.fieldName}}`, // {t_so1}
        `[${field.fieldType}_${field.fieldName}]`, // [t_so1]
      ];
      
      console.log(`Patterns to check for ${field.fieldName}:`, patterns);
      
      // Kiểm tra xem có pattern nào của field này trong HTML không
      const foundPatterns = allPatternsInHTML.filter(htmlPattern => 
        patterns.some(checkPattern => htmlPattern === checkPattern)
      );
      console.log(`Patterns found in HTML for ${field.fieldName}:`, foundPatterns);
      
      patterns.forEach(pattern => {
        // Kiểm tra xem pattern có tồn tại trong content không
        if (modifiedContent.includes(pattern)) {
          console.log(`✓ Found pattern: ${pattern} for field ${field.fieldName}`);
          
          // Tạo regex an toàn cho curly braces và square brackets
          let escapedPattern;
          if (pattern.includes('{') && pattern.includes('}')) {
            // Escape curly braces đặc biệt
            escapedPattern = pattern.replace(/\{/g, '\\{').replace(/\}/g, '\\}');
          } else {
            // Escape square brackets và các ký tự đặc biệt khác
            escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          }
          
          const regex = new RegExp(escapedPattern, 'g');
          console.log(`Using regex: ${regex}`);
          
          // Tạo giá trị hiển thị dựa trên field type
          let displayValue = '';
          switch (field.fieldType?.toLowerCase()) {
            case 'c': // checkbox
              displayValue = field.value === 'true' ? '☑' : '☐';
              break;
            case 'f': // formula
              displayValue = `<span style="color: #1890ff; font-weight: bold; background-color: #f0f9ff; padding: 2px 6px; border-radius: 3px;">${field.value || '0'}</span>`;
              break;
            case 's': // select
              displayValue = field.value || 'Chưa chọn';
              break;
            case 'dt': // date
              displayValue = field.value ? new Date(field.value).toLocaleDateString('vi-VN') : 'Chưa nhập';
              break;
            case 't': // text (from API)
            case 'n': // number
            default:
              displayValue = field.value || 'Chưa nhập';
              break;
          }
          
          console.log(`Replacing ${pattern} with: ${displayValue}`);
          const beforeReplace = modifiedContent;
          modifiedContent = modifiedContent.replace(regex, displayValue);
          console.log(`Replace successful: ${beforeReplace !== modifiedContent}`);
        } else {
          console.log(`✗ Pattern not found: ${pattern}`);
        }
      });
    });
    
    console.log('=== END DEBUGGING ===');
    console.log('Final HTML content:', modifiedContent);
    return modifiedContent;
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <Spin size="large" />
        </div>
      </AppLayout>
    );
  }

  if (!filledData) {
    return (
      <AppLayout>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Text>Không tìm thấy dữ liệu form</Text>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ padding: '24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate(-1)}
              style={{ marginRight: '16px' }}
            >
              Quay lại
            </Button>
            <Title level={2} style={{ display: 'inline', margin: 0 }}>
              {filledData.formName} - Đã điền
            </Title>
          </div>
          <Button 
            type="primary" 
            icon={<FilePdfOutlined />}
            onClick={handleExportPDF}
            size="large"
          >
            Xuất PDF
          </Button>
        </div>

        {/* Form Info */}
        <div style={{ 
          marginBottom: '24px', 
          padding: '16px', 
          background: '#f5f5f5', 
          borderRadius: '8px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px'
        }}>
          <div><Text strong>Người điền: </Text><Text>{filledData.userName}</Text></div>
          <div><Text strong>Ngày điền: </Text><Text>{new Date(filledData.createdAt).toLocaleString('vi-VN')}</Text></div>
          <div>
            <Text strong>Trạng thái: </Text>
            <Text style={{ 
              color: filledData.status === 'Draft' ? '#fa8c16' : '#52c41a',
              fontWeight: 'bold'
            }}>
              {filledData.status === 'Draft' ? 'Bản nháp' : 'Hoàn tất'}
            </Text>
          </div>
          <div><Text strong>Tổng số trường: </Text><Text>{filledData.fieldCount} trường</Text></div>
        </div>

        {/* Word Content */}
        <div 
          ref={containerRef}
          style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: '8px', 
            padding: '24px',
            backgroundColor: 'white',
            minHeight: '500px'
          }}
        >
          {/* Content sẽ được populate bởi mammoth */}
        </div>
      </div>
    </AppLayout>
  );
};

export default ViewFilledFormPage; 