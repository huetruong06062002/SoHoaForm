import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spin, Typography, App, Space, Tooltip, Modal, Form, Input, Select, Checkbox, DatePicker } from 'antd';
import { ArrowLeftOutlined, ZoomInOutlined, ZoomOutOutlined, SearchOutlined, DownloadOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { renderAsync } from 'docx-preview';
import formService from '../services/formService';
import AppLayout from '../components/layout/AppLayout';
import './ViewFilledFormPage.css';

const { Title, Text } = Typography;

const ViewFilledFormPage = () => {
  const { userFillFormId } = useParams();
  const navigate = useNavigate();
  const { message: messageApi } = App.useApp();
  
  const [loading, setLoading] = useState(true);
  const [formInfo, setFormInfo] = useState(null);
  const [filledData, setFilledData] = useState(null);
  const [originalWordBlob, setOriginalWordBlob] = useState(null);
  const [processedWordBlob, setProcessedWordBlob] = useState(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editForm] = Form.useForm();
  const [isUpdating, setIsUpdating] = useState(false);
  const containerRef = useRef(null);
  const hasRenderedRef = useRef(false);
  const renderPromiseRef = useRef(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    fetchData();
  }, [userFillFormId]);

  // Cleanup khi component unmount
  useEffect(() => {
    return () => {
      // Cancel any pending render
      renderPromiseRef.current = null;
      hasRenderedRef.current = false;
      
      // Clear container safely với delay để tránh React conflicts
      setTimeout(() => {
        if (containerRef.current) {
          try {
            // Sử dụng removeChild thay vì innerHTML để tránh React conflicts
            while (containerRef.current.firstChild) {
              containerRef.current.removeChild(containerRef.current.firstChild);
            }
          } catch (e) {
            // Fallback to innerHTML nếu removeChild fails
            try {
              containerRef.current.innerHTML = '';
            } catch (e2) {
              console.warn('Error during cleanup:', e2);
            }
          }
        }
      }, 50);
      
      setIsRendering(false);
    };
  }, []);

  const fetchData = async () => {
    if (isFetchingRef.current) {
      console.log('Already fetching, skipping...');
      return;
    }
    
    try {
      isFetchingRef.current = true;
      setLoading(true);
      
      // Bước 1: Lấy dữ liệu đã điền từ API mới
      const filledDataResponse = await formService.getFilledFormData(userFillFormId);
      
      if (filledDataResponse.statusCode !== 200) {
        messageApi.error('Không thể tải dữ liệu form đã điền');
        return;
      }
      
      const filledFormData = filledDataResponse.data;
      setFilledData(filledFormData);
      console.log('Loaded filled form data:', filledFormData);
      
      const formId = filledFormData.formId;
      
      // Bước 2: Fetch form info và Word file
      const [formInfoResponse, wordFile] = await Promise.all([
        formService.getFormInfo(formId),
        formService.getWordFile(formId)
      ]);
      
      // Set form info
      setFormInfo(formInfoResponse.data);
      
      // Bước 3: Set original Word blob và process với dữ liệu thực
      console.log('Word file received, type:', typeof wordFile);
      console.log('Word file size:', wordFile?.size || 'unknown');
      
      // Đảm bảo wordFile là một Blob
      if (wordFile instanceof Blob) {
        setOriginalWordBlob(wordFile);
        await processWordWithData(wordFile, filledFormData.parsedFieldValues);
      } else if (wordFile instanceof ArrayBuffer) {
        const blob = new Blob([wordFile], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        setOriginalWordBlob(blob);
        await processWordWithData(blob, filledFormData.parsedFieldValues);
      } else {
        console.error('Word file format not supported:', wordFile);
        messageApi.error('Định dạng file Word không được hỗ trợ');
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      messageApi.error('Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  // Xử lý Word document với dữ liệu thực sử dụng JSZip
  const processWordWithData = async (wordBlob, fieldValues) => {
    try {
      setIsProcessing(true);
      
      // Check if JSZip is available
      let JSZip;
      try {
        JSZip = (await import('jszip')).default;
      } catch (error) {
        console.error('JSZip not available:', error);
        messageApi.error('Không thể tải thư viện xử lý file Word. Vui lòng thử lại sau.');
        // Fallback to original blob
        setProcessedWordBlob(wordBlob);
      return;
    }

      // Tạo mapping từ fieldName sang value với xử lý đặc biệt cho checkbox
      const fieldMap = {};
      fieldValues.forEach(field => {
        if (field.fieldType === 'c') {
          // Checkbox: true = ☑, false = ☐
          fieldMap[field.fieldName] = field.value === 'true' ? '☑' : '☐';
        } else {
          // Các field type khác: text, date, select, etc.
          fieldMap[field.fieldName] = field.value || '';
        }
      });
      
      console.log('=== WORD PROCESSING DEBUG ===');
      console.log('Field mapping for Word processing:', fieldMap);
      
      // Load Word document as ZIP
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(wordBlob);
      
      // Tìm các file XML trong Word document và thay thế placeholder
      const xmlFiles = [
        'word/document.xml',
        'word/header1.xml', 
        'word/header2.xml',
        'word/header3.xml',
        'word/footer1.xml',
        'word/footer2.xml', 
        'word/footer3.xml'
      ];

      let hasReplacements = false;
      let allPlaceholdersFound = [];
      
      for (const filename of xmlFiles) {
        const file = loadedZip.file(filename);
        if (file) {
          let content = await file.async('text');
          let originalContent = content;
          
          console.log(`Processing ${filename}...`);
          
          // Bước 1: Consolidate broken placeholders bằng cách merge text nodes
          // Tìm pattern {....} có thể bị broken across multiple <w:t> elements
          
          // Regex để tìm placeholder có thể bị broken
          const brokenPlaceholderRegex = /\{[^}]*(?:<\/w:t><\/w:r><w:r[^>]*><w:rPr[^>]*><[^>]*><\/w:rPr><w:t>[^}]*)*\}/g;
          
          // Tìm tất cả placeholder bị broken
          let brokenMatches = content.match(brokenPlaceholderRegex) || [];
          console.log(`Broken placeholders found in ${filename}:`, brokenMatches);
          
          // Fix broken placeholders bằng cách remove XML tags ở giữa
          brokenMatches.forEach(brokenMatch => {
            console.log(`\n--- Processing broken match ---`);
            console.log(`Full broken match: ${brokenMatch}`);
            
            // Approach 1: Extract all text content by removing all XML tags
            // Remove all XML tags and keep only text content
            let cleanText = brokenMatch
              .replace(/<[^>]*>/g, '') // Remove all XML tags
              .trim();
            
            console.log(`Clean text after removing XML tags: "${cleanText}"`);
            
            // Approach 2: Also try regex approach for comparison
            const textParts = brokenMatch.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
            console.log(`Text parts found with regex:`, textParts);
            
            let regexCleanText = '';
            textParts.forEach(part => {
              const textMatch = part.match(/<w:t[^>]*>([^<]*)<\/w:t>/);
              if (textMatch && textMatch[1]) {
                console.log(`Extracted text fragment: "${textMatch[1]}"`);
                regexCleanText += textMatch[1];
              }
            });
            console.log(`Clean text from regex approach: "${regexCleanText}"`);
            
            // Use the approach that gives us a valid placeholder
            if (!cleanText.startsWith('{') || !cleanText.endsWith('}')) {
              console.log(`❌ XML removal approach failed, trying alternative...`);
              
              // Try to reconstruct from the original broken match
              // Look for text before </w:t> and after <w:t>
              const allTextMatches = brokenMatch.match(/>[^<]*</g) || [];
              console.log(`All text matches:`, allTextMatches);
              
              let reconstructedText = '';
              allTextMatches.forEach(match => {
                const text = match.slice(1, -1); // Remove > and <
                if (text.trim()) {
                  reconstructedText += text;
                }
              });
              console.log(`Reconstructed text: "${reconstructedText}"`);
              
              if (reconstructedText.startsWith('{') && reconstructedText.endsWith('}')) {
                cleanText = reconstructedText;
              }
            }
            
            console.log(`Final clean text: "${cleanText}"`);
            
            // Kiểm tra nếu cleanText là một placeholder hợp lệ
            if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
              console.log(`✅ Valid placeholder detected: ${cleanText}`);
              
              // Tìm field tương ứng
              const placeholderContent = cleanText.slice(1, -1); // Remove { và }
              console.log(`Placeholder content (without braces): "${placeholderContent}"`);
              
              let matchedValue = '';
              let matchedFieldName = '';
              
              // Thử các strategy matching
              console.log(`Strategy 1 - Exact match: checking fieldMap["${placeholderContent}"]`);
              if (fieldMap[placeholderContent] !== undefined) {
                matchedValue = fieldMap[placeholderContent];
                matchedFieldName = placeholderContent;
                console.log(`✅ Exact match found: ${placeholderContent} = "${matchedValue}"`);
              } else if (placeholderContent.includes('_')) {
                const withoutPrefix = placeholderContent.split('_').slice(1).join('_');
                console.log(`Strategy 2 - Remove prefix: checking fieldMap["${withoutPrefix}"]`);
                if (fieldMap[withoutPrefix] !== undefined) {
                  matchedValue = fieldMap[withoutPrefix];
                  matchedFieldName = withoutPrefix;
                  console.log(`✅ Match without prefix found: ${withoutPrefix} = "${matchedValue}"`);
                }
              } else {
                // Case insensitive
                const lowerPlaceholder = placeholderContent.toLowerCase();
                console.log(`Strategy 3 - Case insensitive: checking "${lowerPlaceholder}"`);
                for (const [fieldName, value] of Object.entries(fieldMap)) {
                  if (fieldName.toLowerCase() === lowerPlaceholder) {
                    matchedValue = value;
                    matchedFieldName = fieldName;
                    console.log(`✅ Case insensitive match found: ${fieldName} = "${matchedValue}"`);
                    break;
                  }
                }
                
                // Try with prefixes
                if (!matchedValue) {
                  console.log(`Strategy 4 - Add prefixes: trying prefixes for "${placeholderContent}"`);
                  const prefixes = ['t_', 'd_', 'dt_', 'n_', 'c_', 's_'];
                  for (const prefix of prefixes) {
                    const withPrefix = `${prefix}${placeholderContent}`;
                    console.log(`  Checking fieldMap["${withPrefix}"]`);
                    if (fieldMap[withPrefix] !== undefined) {
                      matchedValue = fieldMap[withPrefix];
                      matchedFieldName = withPrefix;
                      console.log(`✅ Match with prefix found: ${withPrefix} = "${matchedValue}"`);
                      break;
                    }
                  }
                }
              }
              
              if (matchedFieldName !== '') {
                console.log(`🎯 FINAL MATCH: Replacing "${cleanText}" with "${matchedValue}" (from field: ${matchedFieldName})`);
                
                // Escape XML special characters (including empty strings)
                const escapedValue = (matchedValue || '')
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&apos;');
                
                // Replace broken placeholder với escaped value (hoặc chuỗi rỗng)
                content = content.replace(brokenMatch, escapedValue);
                hasReplacements = true;
                allPlaceholdersFound.push(cleanText);
              } else {
                console.log(`❌ No match found for placeholder: ${cleanText}`);
                console.log(`Available fields:`, Object.keys(fieldMap));
                allPlaceholdersFound.push(cleanText);
              }
            } else {
              console.log(`❌ Invalid placeholder (missing braces): "${cleanText}"`);
            }
            console.log(`--- End processing broken match ---\n`);
          });
          
          // Bước 2: Xử lý placeholder thông thường (không bị broken)
          const normalPlaceholderRegex = /\{([^}]+)\}/g;
          let normalMatches;
          
          while ((normalMatches = normalPlaceholderRegex.exec(content)) !== null) {
            const fullPlaceholder = normalMatches[0];
            const placeholderContent = normalMatches[1];
            
            // Chỉ process nếu chưa được process trong bước 1
            if (!allPlaceholdersFound.includes(fullPlaceholder)) {
              let matchedValue = '';
              let matchedFieldName = '';
              
              // Apply matching strategies
              if (fieldMap[placeholderContent] !== undefined) {
                matchedValue = fieldMap[placeholderContent];
                matchedFieldName = placeholderContent;
              } else if (placeholderContent.includes('_')) {
                const withoutPrefix = placeholderContent.split('_').slice(1).join('_');
                if (fieldMap[withoutPrefix] !== undefined) {
                  matchedValue = fieldMap[withoutPrefix];
                  matchedFieldName = withoutPrefix;
                }
              } else {
                const lowerPlaceholder = placeholderContent.toLowerCase();
                for (const [fieldName, value] of Object.entries(fieldMap)) {
                  if (fieldName.toLowerCase() === lowerPlaceholder) {
                    matchedValue = value;
                    matchedFieldName = fieldName;
                    break;
                  }
                }
                
                if (!matchedValue) {
                  const prefixes = ['t_', 'd_', 'dt_', 'n_', 'c_', 's_'];
                  for (const prefix of prefixes) {
                    const withPrefix = `${prefix}${placeholderContent}`;
                    if (fieldMap[withPrefix] !== undefined) {
                      matchedValue = fieldMap[withPrefix];
                      matchedFieldName = withPrefix;
                      break;
                    }
                  }
                }
              }
              
              if (matchedFieldName !== '') {
                console.log(`✅ Replacing normal placeholder ${fullPlaceholder} with "${matchedValue}" (from field: ${matchedFieldName})`);
                
                const escapedValue = (matchedValue || '')
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&apos;');
                
                content = content.replace(fullPlaceholder, escapedValue);
                hasReplacements = true;
                allPlaceholdersFound.push(fullPlaceholder);
              } else {
                console.log(`❌ No match found for normal placeholder: ${fullPlaceholder}`);
                allPlaceholdersFound.push(fullPlaceholder);
              }
            }
          }
          
          // Reset regex
          normalPlaceholderRegex.lastIndex = 0;
          
          // Cập nhật file content nếu có thay đổi
          if (content !== originalContent) {
            loadedZip.file(filename, content);
            console.log(`✅ Updated ${filename} with replacements`);
          }
        }
      }
      
      // Debug summary
      console.log('=== PROCESSING SUMMARY ===');
      console.log('All placeholders found in document:', [...new Set(allPlaceholdersFound)]);
      console.log('Available field names from API:', Object.keys(fieldMap));
      console.log('Field values:', fieldMap);
      console.log('Replacements made:', hasReplacements);
      
      if (hasReplacements) {
        console.log('✅ Creating processed Word document with field values');
        
        // Tạo blob mới từ zip đã được xử lý
        const processedBlob = await loadedZip.generateAsync({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        
        // Reset render states for new file
        hasRenderedRef.current = false;
        setIsRendering(false);
        renderPromiseRef.current = null;
        setZoomLevel(100);
        setCurrentPage(1);
        setTotalPages(1);
        
        setProcessedWordBlob(processedBlob);
      } else {
        console.log('❌ No placeholders found to replace, using original document');
        setProcessedWordBlob(wordBlob);
      }
      
    } catch (error) {
      console.error('Error processing Word document:', error);
      messageApi.error('Có lỗi khi xử lý Word document');
      // Fallback to original blob
      setProcessedWordBlob(wordBlob);
    } finally {
      setIsProcessing(false);
    }
  };

  // Render Word document sau khi processed blob đã ready
  useEffect(() => {
    if (processedWordBlob && !hasRenderedRef.current) {
      console.log('Processed Word blob ready, rendering document...');
      
      // Mark as rendered to prevent multiple renders
      hasRenderedRef.current = true;
      setIsRendering(true);
      
      // Use setTimeout để đảm bảo React đã hoàn tất DOM updates
      const timeoutId = setTimeout(() => {
        if (!containerRef.current) {
          console.warn('Container ref not available');
          setIsRendering(false);
          hasRenderedRef.current = false;
          return;
        }
        
        // Cancel any existing render
        if (renderPromiseRef.current) {
          renderPromiseRef.current = null;
        }
        
        // Clear container trước khi render
        try {
          containerRef.current.innerHTML = '';
        } catch (e) {
          console.warn('Error clearing container:', e);
        }
        
        // Render Word document trực tiếp vào container
        const renderPromise = renderAsync(processedWordBlob, containerRef.current, undefined, {
          className: "docx-wrapper",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: true,
          experimental: false,
          trimXmlDeclaration: true,
          useBase64URL: false,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
          debug: false
        });
        
        renderPromiseRef.current = renderPromise;
        
        renderPromise.then(() => {
          console.log('Word document rendered successfully');
          setIsRendering(false);
          
          // Count pages after rendering
          setTimeout(() => {
            if (containerRef.current) {
              const pages = containerRef.current.querySelectorAll('.docx-page, [class*="page"]');
              if (pages.length > 0) {
                setTotalPages(pages.length);
                setCurrentPage(1);
              }
            }
          }, 100);
        }).catch(error => {
          console.error('Error rendering Word document:', error);
          messageApi.error('Có lỗi khi hiển thị Word document');
          setIsRendering(false);
          hasRenderedRef.current = false; // Allow retry on error
        });
        
      }, 100);
      
      // Cleanup timeout nếu component unmount
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [processedWordBlob, messageApi]);

  // Toolbar functions
  const handleZoomIn = () => {
    if (zoomLevel < 200) {
      const newZoom = zoomLevel + 25;
      setZoomLevel(newZoom);
      applyZoom(newZoom);
    }
  };

  const handleZoomOut = () => {
    if (zoomLevel > 50) {
      const newZoom = zoomLevel - 25;
      setZoomLevel(newZoom);
      applyZoom(newZoom);
    }
  };

  const applyZoom = (zoom) => {
    if (containerRef.current) {
      const docElement = containerRef.current.querySelector('.docx-wrapper, .docx');
      if (docElement) {
        docElement.style.transform = `scale(${zoom / 100})`;
        docElement.style.transformOrigin = 'top center';
        docElement.style.transition = 'transform 0.2s ease';
      }
    }
  };

  const handleSearch = () => {
    // Simple search functionality
    const searchTerm = prompt('Tìm kiếm trong document:');
    if (searchTerm && window.find) {
      window.find(searchTerm);
    }
  };

  // Hàm tải về file PDF
  const handleDownloadPdf = async () => {
    if (!processedWordBlob || !filledData) {
      messageApi.error('Không có dữ liệu để tải về');
      return;
    }

    try {
      messageApi.info('Đang tạo file PDF...');
      
      // Phương pháp đơn giản: Sử dụng window.print() để tạo PDF
      try {
        // Tạo một window mới để in
        const printWindow = window.open('', '_blank');
        
        if (!printWindow) {
          throw new Error('Popup bị chặn');
        }
        
        // Lấy nội dung HTML của document
        const element = containerRef.current?.querySelector('.docx-wrapper') || containerRef.current;
        
        if (!element) {
          messageApi.error('Không tìm thấy nội dung để tạo PDF');
          return;
        }
        
        // Tạo HTML cho print window
        const printContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>${filledData.formName} - ${filledData.userName}</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                font-family: Arial, sans-serif;
                background: white;
              }
              .print-content {
                width: 100%;
                max-width: none;
              }
              @media print {
                body { margin: 0; padding: 0; }
                .print-content { page-break-inside: avoid; }
              }
              /* Copy styles from docx-preview */
              .docx { width: 100%; }
              .docx-wrapper { width: 100%; }
              table { border-collapse: collapse; width: 100%; }
              td, th { border: 1px solid #000; padding: 8px; text-align: left; }
            </style>
          </head>
          <body>
            <div class="print-content">
              ${element.innerHTML}
            </div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 1000);
              }
            </script>
          </body>
          </html>
        `;
        
        printWindow.document.write(printContent);
        printWindow.document.close();
        
      } catch (printError) {
        console.error('Print method failed:', printError);
        
        // Phương pháp 2: Tạo PDF đơn giản với jsPDF (không dùng html2canvas)
        try {
          const jsPDF = (await import('jspdf')).default;
          
          // Tạo PDF trống và thêm text thông tin form
          const pdf = new jsPDF('p', 'mm', 'a4');
          
          // Thêm tiêu đề
          pdf.setFontSize(16);
          pdf.text(filledData.formName, 20, 30);
          
          // Thêm thông tin người điền
          pdf.setFontSize(12);
          pdf.text(`Người điền: ${filledData.userName}`, 20, 50);
          pdf.text(`Ngày điền: ${new Date(filledData.createdAt).toLocaleString('vi-VN')}`, 20, 60);
          pdf.text(`Trạng thái: ${filledData.status === 'Draft' ? 'Bản nháp' : 'Hoàn tất'}`, 20, 70);
          
          // Thêm note về việc không thể render đầy đủ
          pdf.setFontSize(10);
          pdf.text('Lưu ý: Do hạn chế kỹ thuật, PDF này chỉ chứa thông tin cơ bản.', 20, 90);
          pdf.text('Để xem đầy đủ nội dung, vui lòng sử dụng tính năng in từ trình duyệt.', 20, 100);
          
          // Thêm danh sách fields và values
          let yPosition = 120;
          pdf.text('Dữ liệu form:', 20, yPosition);
          yPosition += 10;
          
          if (filledData.parsedFieldValues) {
            filledData.parsedFieldValues.forEach((field, index) => {
              if (yPosition > 270) { // Tạo trang mới nếu hết chỗ
                pdf.addPage();
                yPosition = 20;
              }
              
              const text = `${field.label || field.fieldName}: ${field.value || '(trống)'}`;
              // Chia text dài thành nhiều dòng
              const splitText = pdf.splitTextToSize(text, 170);
              pdf.text(splitText, 20, yPosition);
              yPosition += splitText.length * 7 + 3;
            });
          }
          
          // Tạo tên file PDF
          const date = new Date(filledData.createdAt).toLocaleDateString('vi-VN').replace(/\//g, '-');
          const fileName = `${filledData.formName}_${filledData.userName}_${date}.pdf`;
          
          // Tải về PDF
          pdf.save(fileName);
          
          messageApi.success('Đã tải xuống file PDF thành công');
          
        } catch (pdfError) {
          console.error('PDF generation failed:', pdfError);
          
          // Phương pháp 3: Fallback - tải về Word file thay vì PDF
          messageApi.warning('Không thể tạo PDF, đang tải file Word thay thế...');
          
          const url = window.URL.createObjectURL(processedWordBlob);
          const link = document.createElement('a');
          link.href = url;
          
          const date = new Date(filledData.createdAt).toLocaleDateString('vi-VN').replace(/\//g, '-');
          const fileName = `${filledData.formName}_${filledData.userName}_${date}.docx`;
          
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          messageApi.success('Đã tải xuống file Word thành công');
        }
      }
      
    } catch (error) {
      console.error('Error in PDF generation:', error);
      messageApi.error('Có lỗi khi tạo file PDF');
    }
  };

  // Hàm hoàn thành form
  const handleCompleteForm = async () => {
    try {
      setIsCompleting(true);
      
      const response = await formService.completeFilledForm(userFillFormId);
      
      if (response.statusCode === 200) {
        messageApi.success('Hoàn thành form thành công!');
        
        // Cập nhật status trong state
        setFilledData(prev => ({
          ...prev,
          status: 'Complete'
        }));
      } else {
        messageApi.error('Có lỗi xảy ra khi hoàn thành form');
      }
    } catch (error) {
      console.error('Error completing form:', error);
      messageApi.error('Có lỗi xảy ra khi hoàn thành form');
    } finally {
      setIsCompleting(false);
    }
  };

  // Hàm mở modal chỉnh sửa
  const handleEditForm = () => {
    if (!filledData?.parsedFieldValues) {
      messageApi.error('Không có dữ liệu để chỉnh sửa');
      return;
    }

    // Tạo initial values cho form
    const initialValues = {};
    filledData.parsedFieldValues.forEach(field => {
      if (field.fieldType === 'c') {
        // Checkbox
        initialValues[field.fieldName] = field.value === 'true';
      } else if (field.fieldType === 'd' || field.fieldType === 'dt') {
        // Date/DateTime
        initialValues[field.fieldName] = field.value ? dayjs(field.value) : null;
      } else {
        // Text, Number, Select
        initialValues[field.fieldName] = field.value || '';
      }
    });

    editForm.setFieldsValue(initialValues);
    setIsEditModalVisible(true);
  };

  // Hàm cập nhật field values
  // Function để tính toán công thức
  const calculateFormula = (formula, values) => {
    try {
      // Replace field references [fieldName] with their values
      let calculationFormula = formula;
      Object.entries(values).forEach(([fieldName, value]) => {
        const regex = new RegExp(`\\[${fieldName}\\]`, 'g');
        calculationFormula = calculationFormula.replace(regex, value || '0');
      });

      // Evaluate the formula
      const result = eval(calculationFormula);
      return result;
    } catch (error) {
      console.error('Error calculating formula:', error);
      return 0;
    }
  };

  // Function để validate field values
  const validateFieldValues = (values, formFields) => {
    const errors = [];

    formFields.forEach(field => {
      const value = values[field.fieldName];

      // Skip formula fields
      if (field.fieldType === 'Formula') {
        return;
      }

      // Check required fields
      if (field.isRequired && (value === undefined || value === null || value === '')) {
        errors.push(`${field.fieldName} là trường bắt buộc`);
      }

      // Check number fields
      if (field.fieldType === 'Number' && value !== '' && value !== null) {
        if (isNaN(value)) {
          errors.push(`${field.fieldName} phải là số`);
        }
      }
    });

    return errors;
  };

  const handleUpdateFieldValues = async (values) => {
    try {
      setIsUpdating(true);

      // Fetch form fields để lấy thông tin validation và formula
      const formFieldsResponse = await formService.getFormFields(filledData.formId);
      if (formFieldsResponse.statusCode !== 200) {
        throw new Error('Không thể lấy thông tin form fields');
      }

      const formFields = formFieldsResponse.data.fields;

      // Validate field values
      const errors = validateFieldValues(values, formFields);
      if (errors.length > 0) {
        messageApi.error(errors.join(', '));
        return;
      }

      // Calculate formula fields
      const formulaFields = formFields.filter(field => field.fieldType === 'Formula');
      formulaFields.forEach(field => {
        values[field.fieldName] = calculateFormula(field.formula, values);
      });

      // Chuyển đổi values thành format API yêu cầu
      const fieldValues = formFields.map(field => {
        let newValue = values[field.fieldName];

        // Xử lý theo từng field type
        if (field.fieldType === 'c') {
          // Checkbox
          newValue = newValue ? 'true' : 'false';
        } else if (field.fieldType === 'd') {
          // Date
          newValue = newValue ? newValue.format('YYYY-MM-DD') : '';
        } else if (field.fieldType === 'dt') {
          // DateTime
          newValue = newValue ? newValue.format('YYYY-MM-DD HH:mm:ss') : '';
        } else {
          // Text, Number, Select, Formula
          newValue = newValue?.toString() || '';
        }

        return {
          fieldName: field.fieldName,
          fieldType: field.fieldType,
          label: field.fieldDescription || field.fieldName,
          value: newValue
        };
      });

      // Gọi API update
      const response = await formService.updateFieldValues(userFillFormId, fieldValues);

      if (response.statusCode === 200) {
        messageApi.success('Cập nhật dữ liệu thành công!');
        
        // Cập nhật state với dữ liệu mới
        setFilledData(prev => ({
          ...prev,
          parsedFieldValues: fieldValues,
          rawJsonFieldValue: JSON.stringify(fieldValues, null, 2)
        }));

        // Đóng modal
        setIsEditModalVisible(false);
        
        // Reprocess Word document với dữ liệu mới
        if (originalWordBlob) {
          await processWordWithData(originalWordBlob, fieldValues);
        }
      } else {
        messageApi.error('Có lỗi xảy ra khi cập nhật dữ liệu');
      }
    } catch (error) {
      console.error('Error updating field values:', error);
      messageApi.error('Có lỗi xảy ra khi cập nhật dữ liệu');
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <Spin size="large" />
          <span style={{ marginLeft: '12px' }}>Đang tải dữ liệu...</span>
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
          
          {/* Action Buttons */}
          <Space size="middle">
            {filledData?.status === 'Draft' && (
              <>
                <Button 
                  type="default"
                  icon={<EditOutlined />}
                  onClick={handleEditForm}
                  size="large"
                  style={{ 
                    backgroundColor: '#1890ff',
                    borderColor: '#1890ff',
                    color: 'white'
                  }}
                >
                  Chỉnh sửa
                </Button>
                
                <Button 
                  type="default"
                  onClick={handleCompleteForm}
                  loading={isCompleting}
                  size="large"
                  style={{ 
                    backgroundColor: '#52c41a',
                    borderColor: '#52c41a',
                    color: 'white'
                  }}
                >
                  Hoàn thành
                </Button>
              </>
            )}
            
            <Button 
              type="primary" 
              icon={<DownloadOutlined />} 
              onClick={handleDownloadPdf}
              loading={isProcessing}
              disabled={!processedWordBlob}
              size="large"
            >
              Tải xuống PDF
            </Button>
          </Space>
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

        {/* Processing Status */}
        {isProcessing && (
          <div style={{
            marginBottom: '16px',
            padding: '12px 16px',
            background: '#e6f7ff',
            border: '1px solid #91d5ff',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Spin size="small" style={{ marginRight: '8px' }} />
            <Text>Đang xử lý dữ liệu vào Word document...</Text>
          </div>
        )}

        {/* Document Toolbar */}
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          background: '#fafafa',
          borderRadius: '8px',
          border: '1px solid #d9d9d9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              padding: '4px 8px', 
              background: '#f0f0f0', 
              borderRadius: '4px', 
              fontSize: '12px',
              fontWeight: '500'
            }}>
              Trang {currentPage} / {totalPages}
            </span>
          </div>
          
          <Space>
            <Tooltip title="Thu nhỏ">
              <Button 
                icon={<ZoomOutOutlined />} 
                onClick={handleZoomOut}
                disabled={zoomLevel <= 50}
                size="small"
                style={{ width: '32px', height: '32px' }}
              />
            </Tooltip>
            
            <span style={{ 
              minWidth: '50px', 
              textAlign: 'center', 
              fontSize: '12px',
              fontWeight: '500'
            }}>
              {zoomLevel}%
            </span>
            
            <Tooltip title="Phóng to">
              <Button 
                icon={<ZoomInOutlined />} 
                onClick={handleZoomIn}
                disabled={zoomLevel >= 200}
                size="small"
                style={{ width: '32px', height: '32px' }}
              />
            </Tooltip>
            
            <Tooltip title="Tìm kiếm">
              <Button 
                icon={<SearchOutlined />} 
                onClick={handleSearch}
                size="small"
                style={{ width: '32px', height: '32px' }}
              />
            </Tooltip>
          </Space>
        </div>

        {/* Word Document Viewer */}
        <div 
          style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: '8px', 
            padding: '24px',
            backgroundColor: 'white',
            minHeight: '500px',
            position: 'relative',
            overflow: 'auto'
          }}
        >
          {(isRendering || isProcessing) && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '200px',
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10
            }}>
              <Spin size="large" />
              <span style={{ marginLeft: '12px' }}>
                {isProcessing ? 'Đang xử lý dữ liệu...' : 'Đang tải Word document...'}
              </span>
            </div>
          )}
          {/* Container cho docx-preview - sử dụng key để force re-render */}
          <div 
            key={processedWordBlob ? 'has-processed-blob' : 'no-processed-blob'}
            ref={containerRef}
            style={{ 
              width: '100%',
              minHeight: '400px',
              opacity: (isRendering || isProcessing) ? 0.3 : 1,
              transition: 'opacity 0.3s'
            }}
          />
        </div>

        {/* Edit Modal */}
        <Modal
          title="Chỉnh sửa dữ liệu form"
          open={isEditModalVisible}
          onCancel={() => setIsEditModalVisible(false)}
          footer={null}
          width={800}
          maskClosable={false}
        >
          <Form
            form={editForm}
            layout="vertical"
            onFinish={handleUpdateFieldValues}
            style={{ maxHeight: '500px', overflowY: 'auto' }}
            onValuesChange={(changedValues, allValues) => {
              // Fetch form fields để lấy thông tin formula
              formService.getFormFields(filledData.formId).then(response => {
                if (response.statusCode === 200) {
                  const formFields = response.data.fields;
                  const formulaFields = formFields.filter(field => field.fieldType === 'Formula');
                  
                  // Tính toán giá trị cho các trường formula
                  const newValues = { ...allValues };
                  formulaFields.forEach(field => {
                    newValues[field.fieldName] = calculateFormula(field.formula, allValues);
                  });
                  
                  // Cập nhật form với các giá trị mới
                  editForm.setFieldsValue(newValues);
                }
              });
            }}
          >
            {filledData?.parsedFieldValues?.map((field, index) => {
              const renderField = () => {
                switch (field.fieldType) {
                  case 'c': // Checkbox
                    return (
                      <Form.Item
                        key={field.fieldName}
                        name={field.fieldName}
                        label={field.label || field.fieldName}
                        valuePropName="checked"
                      >
                        <Checkbox>{field.label || field.fieldName}</Checkbox>
                      </Form.Item>
                    );
                  
                  case 'd': // Date
                    return (
                      <Form.Item
                        key={field.fieldName}
                        name={field.fieldName}
                        label={field.label || field.fieldName}
                      >
                        <DatePicker 
                          style={{ width: '100%' }}
                          format="DD/MM/YYYY"
                          placeholder="Chọn ngày"
                        />
                      </Form.Item>
                    );
                  
                  case 'dt': // DateTime
                    return (
                      <Form.Item
                        key={field.fieldName}
                        name={field.fieldName}
                        label={field.label || field.fieldName}
                      >
                        <DatePicker 
                          showTime
                          style={{ width: '100%' }}
                          format="DD/MM/YYYY HH:mm"
                          placeholder="Chọn ngày và giờ"
                        />
                      </Form.Item>
                    );
                  
                  case 'n': // Number
                    return (
                      <Form.Item
                        key={field.fieldName}
                        name={field.fieldName}
                        label={field.label || field.fieldName}
                      >
                        <Input 
                          type="number" 
                          placeholder={`Nhập ${field.label || field.fieldName}`}
                        />
                      </Form.Item>
                    );
                  
                  case 's': // Select
                    return (
                      <Form.Item
                        key={field.fieldName}
                        name={field.fieldName}
                        label={field.label || field.fieldName}
                      >
                        <Select 
                          placeholder={`Chọn ${field.label || field.fieldName}`}
                          allowClear
                        >
                          {/* Tạm thời để trống, có thể cần thêm options từ API */}
                          <Select.Option value={field.value}>{field.value}</Select.Option>
                        </Select>
                      </Form.Item>
                    );
                  
                  case 'Formula': // Formula field
                    return (
                      <Form.Item
                        key={field.fieldName}
                        name={field.fieldName}
                        label={field.fieldDescription || field.fieldName}
                      >
                        <Input 
                          readOnly
                          style={{ backgroundColor: '#f5f5f5' }}
                        />
                      </Form.Item>
                    );
                  
                  default: // Text
                    return (
                      <Form.Item
                        key={field.fieldName}
                        name={field.fieldName}
                        label={field.label || field.fieldName}
                      >
                        <Input 
                          placeholder={`Nhập ${field.label || field.fieldName}`}
                        />
                      </Form.Item>
                    );
                }
              };

              return renderField();
            })}
            
            <Form.Item style={{ marginTop: '24px', textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setIsEditModalVisible(false)}>
                  Hủy
                </Button>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={isUpdating}
                >
                  Cập nhật
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AppLayout>
  );
};

export default ViewFilledFormPage; 