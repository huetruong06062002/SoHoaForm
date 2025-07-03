import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spin, Typography, App, Space, Tooltip, Modal, Form, Input, Select, Checkbox, DatePicker, message as antMessage } from 'antd';
import { ArrowLeftOutlined, ZoomInOutlined, ZoomOutOutlined, SearchOutlined, DownloadOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm] = Form.useForm();
  const [fieldMappings, setFieldMappings] = useState({});
  const [editableFields, setEditableFields] = useState([]);
  const containerRef = useRef(null);
  const hasRenderedRef = useRef(false);
  const renderPromiseRef = useRef(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    fetchData();
  }, [userFillFormId]);

  // Thêm useEffect để fetch thông tin fields từ API
  useEffect(() => {
    if (filledData?.formId) {
      fetchFormFields(filledData.formId);
    }
  }, [filledData?.formId]);

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

  // Hàm fetch thông tin fields từ API
  const fetchFormFields = async (formId) => {
    try {
      const response = await formService.getFormFields(formId);
      if (response.statusCode === 200) {
        console.log("Form fields data:", response.data);
        setFormInfo(prevInfo => ({
          ...prevInfo,
          fields: response.data.fields
        }));
      }
    } catch (error) {
      console.error("Error fetching form fields:", error);
    }
  };

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
  const processWordWithData = async (wordBlob, fieldValues, makeEditable = false) => {
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
      const mappedFields = {};
      
      fieldValues.forEach(field => {
        if (field.fieldType === 'c') {
          // Checkbox: true = ☑, false = ☐
          fieldMap[field.fieldName] = field.value === 'true' ? '☑' : '☐';
        } else {
          // Các field type khác: text, date, select, etc.
          fieldMap[field.fieldName] = field.value || '';
        }
        // Store field information for editing later
        mappedFields[field.fieldName] = {
          fieldType: field.fieldType,
          label: field.label || field.fieldName,
          value: field.value
        };
      });
      
      // Save field mappings for later use in edit mode
      setFieldMappings(mappedFields);
      
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
      // Tracking all replacements for edit mode
      const replacements = [];
      
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
                
                // Add to replacements for edit mode
                if (makeEditable) {
                  replacements.push({
                    placeholder: cleanText,
                    fieldName: matchedFieldName,
                    value: matchedValue,
                    fieldType: mappedFields[matchedFieldName]?.fieldType || 'text'
                  });
                }
                
                // Escape XML special characters (including empty strings)
                const escapedValue = (matchedValue || '')
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&apos;');
                
                // For editable mode, we add data attributes
                const replacement = makeEditable 
                  ? `<span data-field="${matchedFieldName}" data-placeholder="${cleanText}">${escapedValue}</span>`
                  : escapedValue;
                
                // Replace broken placeholder với escaped value (hoặc chuỗi rỗng)
                content = content.replace(brokenMatch, replacement);
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
                
                // Add to replacements for edit mode
                if (makeEditable) {
                  replacements.push({
                    placeholder: fullPlaceholder,
                    fieldName: matchedFieldName,
                    value: matchedValue,
                    fieldType: mappedFields[matchedFieldName]?.fieldType || 'text'
                  });
                }
                
                const escapedValue = (matchedValue || '')
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&apos;');
                
                // For editable mode, we add data attributes
                const replacement = makeEditable 
                  ? `<span data-field="${matchedFieldName}" data-placeholder="${fullPlaceholder}">${escapedValue}</span>`
                  : escapedValue;
                
                content = content.replace(fullPlaceholder, replacement);
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
        
        // Store replacements for edit mode
        if (makeEditable) {
          setEditableFields(replacements);
        }
        
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
              
              // If in edit mode, make the spans editable
              if (isEditMode) {
                makeSpansEditable();
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
  }, [processedWordBlob, messageApi, isEditMode]);
  
  // Hàm để làm cho các spans có thể chỉnh sửa được
  const makeSpansEditable = () => {
    if (!containerRef.current) return;
    
    // Tìm tất cả spans có data-field attribute
    const spans = containerRef.current.querySelectorAll('span[data-field]');
    console.log(`Found ${spans.length} editable spans`);
    
    spans.forEach(span => {
      const fieldName = span.getAttribute('data-field');
      const fieldInfo = fieldMappings[fieldName];
      
      if (fieldInfo) {
        // Thêm style để nhận biết được phần tử có thể chỉnh sửa
        span.style.backgroundColor = '#f0f8ff';
        span.style.border = '1px dashed #1890ff';
        span.style.padding = '2px 4px';
        span.style.margin = '0 2px';
        span.style.borderRadius = '3px';
        span.style.cursor = 'pointer';
        
        // Thêm contentEditable cho phép chỉnh sửa trực tiếp
        span.contentEditable = true;
        
        // Thêm tooltip để hiển thị thông tin field
        span.title = `${fieldInfo.label} - Click để chỉnh sửa`;
        
        // Thêm event listeners
        span.addEventListener('focus', () => {
          span.style.backgroundColor = '#e6f7ff';
          span.style.border = '1px solid #1890ff';
        });
        
        span.addEventListener('blur', () => {
          span.style.backgroundColor = '#f0f8ff';
          span.style.border = '1px dashed #1890ff';
        });
      }
    });
    
    // Hiển thị thông báo hướng dẫn
    messageApi.info('Click vào các trường có viền màu xanh để chỉnh sửa trực tiếp');
  };
  
  // Hàm thu thập các giá trị đã chỉnh sửa
  const collectEditedValues = () => {
    if (!containerRef.current) return {};
    
    const editedValues = {};
    
    // Thu thập từ danh sách editableFields đã lưu
    editableFields.forEach(field => {
      const { element, fieldName, isFormula } = field;
      
      // Chỉ thu thập giá trị từ các phần tử có thể chỉnh sửa và các trường công thức
      const value = element.textContent.trim();
      editedValues[fieldName] = value;
    });
    
    return editedValues;
  };

  // Hàm lưu các chỉnh sửa trực tiếp trên document
  const handleSaveInlineEdit = async () => {
    try {
      setIsUpdating(true);
      
      // Thu thập giá trị đã chỉnh sửa
      const editedValues = collectEditedValues();
      console.log('Edited values:', editedValues);
      
      if (Object.keys(editedValues).length === 0) {
        messageApi.info('Không có thay đổi nào để lưu');
        setIsEditMode(false);
        removeEditableElements();
        return;
      }
      
      // Chuyển đổi các giá trị thu thập được thành format API yêu cầu
      const updatedFieldValues = filledData.parsedFieldValues.map(field => {
        const newValue = editedValues[field.fieldName] !== undefined 
          ? editedValues[field.fieldName] 
          : field.value;
        
        return {
          ...field,
          value: newValue
        };
      });
      
      // Gọi API update
      const response = await formService.updateFieldValues(userFillFormId, updatedFieldValues);
      
      if (response.statusCode === 200) {
        messageApi.success('Cập nhật dữ liệu thành công!');
        
        // Cập nhật state với dữ liệu mới
        setFilledData(prev => ({
          ...prev,
          parsedFieldValues: updatedFieldValues,
          rawJsonFieldValue: JSON.stringify(updatedFieldValues, null, 2)
        }));
        
        // Tắt chế độ chỉnh sửa
        setIsEditMode(false);
        removeEditableElements();
        
        // Reprocess Word document với dữ liệu mới
        if (originalWordBlob) {
          await processWordWithData(originalWordBlob, updatedFieldValues);
        }
      } else {
        messageApi.error('Có lỗi xảy ra khi cập nhật dữ liệu');
      }
    } catch (error) {
      console.error('Error saving inline edits:', error);
      messageApi.error('Có lỗi xảy ra khi lưu chỉnh sửa');
    } finally {
      setIsUpdating(false);
    }
  };

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

  // Hàm chuyển sang chế độ chỉnh sửa
  const handleEditForm = () => {
    if (!filledData?.parsedFieldValues) {
      messageApi.error('Không có dữ liệu để chỉnh sửa');
      return;
    }

    setIsEditMode(true);
    
    // Không cần tạo lại document, chỉ cần đánh dấu các phần tử có thể chỉnh sửa
    setTimeout(() => {
      makeDocumentEditable();
    }, 500);
  };

  // Hàm hủy chế độ chỉnh sửa
  const handleCancelEdit = () => {
    setIsEditMode(false);
    
    // Loại bỏ các phần tử có thể chỉnh sửa
    removeEditableElements();
    
    // Render lại document không chỉnh sửa
    hasRenderedRef.current = false;
    if (originalWordBlob) {
      processWordWithData(originalWordBlob, filledData.parsedFieldValues);
    }
  };
  
  // Hàm để loại bỏ các phần tử có thể chỉnh sửa
  const removeEditableElements = () => {
    if (!containerRef.current) return;
    
    // Tìm tất cả các phần tử đã được đánh dấu để chỉnh sửa
    const editableElements = containerRef.current.querySelectorAll('.editable-field');
    
    editableElements.forEach(element => {
      // Loại bỏ contentEditable và các style
      element.contentEditable = false;
      element.classList.remove('editable-field');
      element.style.backgroundColor = '';
      element.style.border = '';
      element.style.padding = '';
      element.style.margin = '';
      element.style.borderRadius = '';
      element.style.cursor = '';
    });
  };
  
  // Hàm để làm cho document có thể chỉnh sửa
  const makeDocumentEditable = () => {
    if (!containerRef.current || !filledData?.parsedFieldValues) return;
    
    try {
      // Thêm CSS cho các phần tử có thể chỉnh sửa
      const style = document.createElement('style');
      style.innerHTML = `
        .editable-field {
          background-color: #f0f8ff !important;
          border: 1px dashed #1890ff !important;
          padding: 2px 4px !important;
          margin: 0 2px !important;
          border-radius: 3px !important;
          cursor: pointer !important;
          display: inline-block !important;
          min-width: 10px !important;
        }
        .editable-field:focus {
          background-color: #e6f7ff !important;
          border: 1px solid #1890ff !important;
          outline: none !important;
        }
        .formula-field {
          background-color: #f5f5f5 !important;
          border: 1px dashed #d9d9d9 !important;
          padding: 2px 4px !important;
          margin: 0 2px !important;
          border-radius: 3px !important;
          cursor: default !important;
          display: inline-block !important;
          min-width: 10px !important;
          color: #666 !important;
        }
        
        /* Sửa lỗi layout cho bảng */
        td .editable-field, td .formula-field {
          display: inline !important;
          width: 100% !important;
        }
        
        /* Đảm bảo các ô trong bảng không bị vỡ layout */
        td {
          position: relative !important;
        }
        
        /* Cho phép chỉnh sửa toàn bộ nội dung của ô */
        td.editable-cell {
          background-color: #f0f8ff !important;
          border: 1px dashed #1890ff !important;
          cursor: pointer !important;
        }
      `;
      document.head.appendChild(style);
      
      // Map field values từ API để dễ tìm kiếm
      const fieldValues = {};
    filledData.parsedFieldValues.forEach(field => {
        fieldValues[field.fieldName] = {
          value: field.value,
          fieldType: field.fieldType,
          label: field.label || field.fieldName
        };
      });
      
      // Tìm các trường formula từ API
      const formulaFields = formInfo?.fields?.filter(field => field.fieldType === 'Formula') || [];
      // Nếu không có dữ liệu từ API fields, sử dụng dữ liệu từ parsedFieldValues
      if (formulaFields.length === 0) {
        const formulaFieldsFromValues = filledData.parsedFieldValues.filter(field => field.fieldType === 'Formula');
        formulaFields.push(...formulaFieldsFromValues.map(field => ({
          fieldName: field.fieldName,
          fieldType: 'Formula',
          formula: '' // Không có công thức cụ thể
        })));
      }
      
      const formulaFieldNames = new Set(formulaFields.map(field => field.fieldName));
      
      console.log("Mapped field values:", fieldValues);
      console.log("Formula fields:", formulaFields);
      
      // Set để theo dõi các giá trị đã xử lý
      const processedValues = new Set();
      const processedFieldNames = new Set();
      
      // Danh sách các phần tử đã chỉnh sửa để theo dõi
      const editableElements = [];

      // PHƯƠNG PHÁP 0: Tìm kiếm trực tiếp các trường dựa trên fieldName trong các phần tử có data-field
      console.log("Tìm kiếm các phần tử có data-field attribute...");
      const dataFieldElements = containerRef.current.querySelectorAll('[data-field]');
      if (dataFieldElements.length > 0) {
        console.log(`Tìm thấy ${dataFieldElements.length} phần tử có data-field attribute`);
        dataFieldElements.forEach(element => {
          const fieldName = element.getAttribute('data-field');
          if (fieldName && fieldValues[fieldName] && !processedFieldNames.has(fieldName)) {
            const fieldInfo = fieldValues[fieldName];
            console.log(`Tìm thấy phần tử với data-field="${fieldName}"`);
            
            // Kiểm tra nếu là trường formula
            if (formulaFieldNames.has(fieldName) || fieldInfo.fieldType === 'Formula') {
              element.classList.add('formula-field');
              element.contentEditable = false;
              element.dataset.fieldName = fieldName;
              element.dataset.originalValue = fieldInfo.value;
              element.dataset.isFormula = 'true';
              element.title = `${fieldInfo.label} - Trường tự động tính toán`;
              
              // Tìm công thức tương ứng
              const formulaField = formulaFields.find(f => f.fieldName === fieldName);
              if (formulaField) {
                element.dataset.formula = formulaField.formula || '';
              }
              
              editableElements.push({
                element,
                fieldName,
                originalValue: fieldInfo.value,
                isFormula: true,
                formula: formulaField?.formula || ''
              });
      } else {
              element.classList.add('editable-field');
              element.contentEditable = true;
              element.dataset.fieldName = fieldName;
              element.dataset.originalValue = fieldInfo.value;
              element.title = `${fieldInfo.label} - Click để chỉnh sửa`;
              
              editableElements.push({
                element,
                fieldName,
                originalValue: fieldInfo.value
              });
            }
            
            processedFieldNames.add(fieldName);
            if (fieldInfo.value) {
              processedValues.add(fieldInfo.value.trim());
            }
          }
        });
      }
      
      // PHƯƠNG PHÁP 1: Duyệt qua tất cả các phần tử văn bản
      // Sử dụng selector mở rộng để bắt nhiều loại phần tử hơn
      const textElements = containerRef.current.querySelectorAll('p, span, td, div, text, label, h1, h2, h3, h4, h5, h6, strong, em, b, i');
      console.log(`Found ${textElements.length} potential text elements to check`);
      
      // Lọc qua tất cả các phần tử text
      textElements.forEach(element => {
        // Bỏ qua các phần tử không có nội dung text hoặc đã có class editable-field
        if (!element.textContent || element.textContent.trim() === '' || 
            element.classList?.contains('editable-field') || 
            element.classList?.contains('formula-field') || 
            element.querySelector('.editable-field') || 
            element.querySelector('.formula-field')) return;
        
        // Kiểm tra nếu phần tử này chứa chính xác một giá trị từ field values
        Object.entries(fieldValues).forEach(([fieldName, fieldInfo]) => {
          // Bỏ qua nếu field này đã được xử lý
          if (processedFieldNames.has(fieldName)) return;
          
          const fieldValue = fieldInfo.value?.trim();
          
          // Bỏ qua trường hợp không có giá trị hoặc giá trị rỗng hoặc đã xử lý
          if (!fieldValue || fieldValue === '' || processedValues.has(fieldValue)) return;
          
          // So sánh chính xác text content với field value
          if (element.textContent.trim() === fieldValue) {
            console.log(`Found match for field ${fieldName}: "${fieldValue}"`);
            
            // Kiểm tra nếu là trường formula
            if (formulaFieldNames.has(fieldName) || fieldInfo.fieldType === 'Formula') {
              // Đánh dấu là trường formula (chỉ đọc)
              element.classList.add('formula-field');
              element.contentEditable = false;
              element.dataset.fieldName = fieldName;
              element.dataset.originalValue = fieldValue;
              element.dataset.isFormula = 'true';
              element.title = `${fieldInfo.label} - Trường tự động tính toán`;
              
              // Xử lý đặc biệt nếu element là td hoặc nằm trong td
              const parentTd = element.tagName === 'TD' ? element : element.closest('td');
              if (parentTd) {
                parentTd.classList.add('formula-cell');
              }
              
              // Tìm công thức tương ứng
              const formulaField = formulaFields.find(f => f.fieldName === fieldName);
              if (formulaField) {
                element.dataset.formula = formulaField.formula || '';
              }
              
              // Thêm vào danh sách để theo dõi
              editableElements.push({
                element,
                fieldName,
                originalValue: fieldValue,
                isFormula: true,
                formula: formulaField?.formula || ''
              });
            } else {
              // Đánh dấu phần tử này có thể chỉnh sửa
              element.classList.add('editable-field');
              element.contentEditable = true;
              element.dataset.fieldName = fieldName;
              element.dataset.originalValue = fieldValue;
              element.title = `${fieldInfo.label} - Click để chỉnh sửa`;
              
              // Xử lý đặc biệt nếu element là td hoặc nằm trong td
              const parentTd = element.tagName === 'TD' ? element : element.closest('td');
              if (parentTd) {
                parentTd.classList.add('editable-cell');
              }
              
              // Thêm vào danh sách để theo dõi
              editableElements.push({
                element,
                fieldName,
                originalValue: fieldValue
              });
            }
            
            // Đánh dấu đã xử lý
            processedValues.add(fieldValue);
            processedFieldNames.add(fieldName);
            
            // Debug log để xác nhận
            console.log(`Made ${formulaFieldNames.has(fieldName) || fieldInfo.fieldType === 'Formula' ? 'formula' : 'editable'}: ${fieldName} = "${fieldValue}"`);
          }
          // Xử lý trường hợp đặc biệt cho các trường hiển thị trong bảng
          else if (element.tagName === 'TD' && element.textContent.includes(fieldValue) && 
                  !processedValues.has(fieldValue)) {
            const text = element.textContent;
            if (text === fieldValue) {
              // Kiểm tra nếu là trường formula
              if (formulaFieldNames.has(fieldName) || fieldInfo.fieldType === 'Formula') {
                element.classList.add('formula-field');
                element.contentEditable = false;
                element.dataset.fieldName = fieldName;
                element.dataset.originalValue = fieldValue;
                element.dataset.isFormula = 'true';
                element.title = `${fieldInfo.label} - Trường tự động tính toán`;
                element.classList.add('formula-cell');
                
                // Tìm công thức tương ứng
                const formulaField = formulaFields.find(f => f.fieldName === fieldName);
                if (formulaField) {
                  element.dataset.formula = formulaField.formula || '';
                }
                
                editableElements.push({
                  element,
                  fieldName,
                  originalValue: fieldValue,
                  isFormula: true,
                  formula: formulaField?.formula || ''
                });
              } else {
                element.classList.add('editable-field');
                element.contentEditable = true;
                element.dataset.fieldName = fieldName;
                element.dataset.originalValue = fieldValue;
                element.title = `${fieldInfo.label} - Click để chỉnh sửa`;
                element.classList.add('editable-cell');
                
                editableElements.push({
                  element,
                  fieldName,
                  originalValue: fieldValue
                });
              }
              
              // Đánh dấu đã xử lý
              processedValues.add(fieldValue);
              processedFieldNames.add(fieldName);
              
              console.log(`Made table cell ${formulaFieldNames.has(fieldName) || fieldInfo.fieldType === 'Formula' ? 'formula' : 'editable'}: ${fieldName} = "${fieldValue}"`);
            }
          }
          // Thêm kiểm tra cho trường hợp số trong ô bảng
          else if (element.tagName === 'TD' && element.textContent.trim() === fieldValue) {
            console.log(`Found exact match in TD for field ${fieldName}: "${fieldValue}"`);
            
            // Kiểm tra nếu là trường formula
            if (formulaFieldNames.has(fieldName) || fieldInfo.fieldType === 'Formula') {
              element.classList.add('formula-field');
              element.contentEditable = false;
              element.dataset.fieldName = fieldName;
              element.dataset.originalValue = fieldValue;
              element.dataset.isFormula = 'true';
              element.title = `${fieldInfo.label} - Trường tự động tính toán`;
              element.classList.add('formula-cell');
            } else {
              element.classList.add('editable-field');
              element.contentEditable = true;
              element.dataset.fieldName = fieldName;
              element.dataset.originalValue = fieldValue;
              element.title = `${fieldInfo.label} - Click để chỉnh sửa`;
              element.classList.add('editable-cell');
            }
            
            editableElements.push({
              element,
              fieldName,
              originalValue: fieldValue,
              isFormula: formulaFieldNames.has(fieldName) || fieldInfo.fieldType === 'Formula'
            });
            
            // Đánh dấu đã xử lý
            processedValues.add(fieldValue);
            processedFieldNames.add(fieldName);
          }
        });
      });
      
      // PHƯƠNG PHÁP 2: Tìm kiếm text nodes trực tiếp (chỉ nếu còn trường chưa xử lý)
      const remainingFields = Object.keys(fieldValues).filter(fieldName => !processedFieldNames.has(fieldName));
      
      if (remainingFields.length > 0) {
        console.log(`Still have ${remainingFields.length} fields to process, trying text nodes method...`);
        
        // Tìm tất cả text nodes trong document
        const findTextNodes = (element) => {
          let textNodes = [];
          if (element) {
            if (element.nodeType === Node.TEXT_NODE && element.nodeValue.trim() !== '') {
              textNodes.push(element);
            } else {
              // Bỏ qua phần tử đã có class editable-field hoặc formula-field
              if (element.classList && (element.classList.contains('editable-field') || element.classList.contains('formula-field'))) {
                return [];
              }
              
              const children = element.childNodes;
              for (let i = 0; i < children.length; i++) {
                textNodes = textNodes.concat(findTextNodes(children[i]));
              }
            }
          }
          return textNodes;
        };
        
        const textNodes = findTextNodes(containerRef.current);
        console.log(`Found ${textNodes.length} text nodes`);
        
        // Kiểm tra từng text node
        textNodes.forEach(node => {
          const nodeValue = node.nodeValue.trim();
          if (nodeValue === '') return;
          
          // Kiểm tra nếu giá trị đã được xử lý
          if (processedValues.has(nodeValue)) return;
          
          // Tìm kiếm giá trị trùng khớp trong các trường còn lại
          remainingFields.forEach(fieldName => {
            // Bỏ qua nếu field này đã được xử lý
            if (processedFieldNames.has(fieldName)) return;
            
            const fieldInfo = fieldValues[fieldName];
            const fieldValue = fieldInfo.value?.trim();
            
            // Bỏ qua nếu không có giá trị hoặc đã xử lý
            if (!fieldValue || processedValues.has(fieldValue)) return;
            
            // Chỉ xử lý nếu nodeValue khớp chính xác với fieldValue
            if (nodeValue === fieldValue) {
              console.log(`Found text node match for ${fieldName}: "${fieldValue}"`);
              
              // Kiểm tra nếu node này là con của một phần tử editable-field hoặc formula-field
              let parent = node.parentNode;
              let isChildOfEditable = false;
              while (parent) {
                if (parent.classList && (parent.classList.contains('editable-field') || parent.classList.contains('formula-field'))) {
                  isChildOfEditable = true;
                  break;
                }
                parent = parent.parentNode;
              }
              
              // Chỉ xử lý nếu không phải là con của phần tử editable-field hoặc formula-field
              if (!isChildOfEditable) {
                // Tạo span để bao bọc text node
                const span = document.createElement('span');
                span.textContent = nodeValue;
                
                // Kiểm tra nếu là trường formula
                if (formulaFieldNames.has(fieldName) || fieldInfo.fieldType === 'Formula') {
                  span.classList.add('formula-field');
                  span.contentEditable = false;
                  span.dataset.fieldName = fieldName;
                  span.dataset.originalValue = fieldValue;
                  span.dataset.isFormula = 'true';
                  span.title = `${fieldInfo.label} - Trường tự động tính toán`;
                  
                  // Tìm công thức tương ứng
                  const formulaField = formulaFields.find(f => f.fieldName === fieldName);
                  if (formulaField) {
                    span.dataset.formula = formulaField.formula || '';
                  }
                  
                  // Thay thế text node bằng span
                  if (node.parentNode) {
                    node.parentNode.replaceChild(span, node);
                    
                    editableElements.push({
                      element: span,
                      fieldName,
                      originalValue: fieldValue,
                      isFormula: true,
                      formula: formulaField?.formula || ''
                    });
                    
                    // Đánh dấu đã xử lý
                    processedValues.add(fieldValue);
                    processedFieldNames.add(fieldName);
                    
                    console.log(`Wrapped text node as formula span: ${fieldName} = "${fieldValue}"`);
                  }
                } else {
                  span.classList.add('editable-field');
                  span.contentEditable = true;
                  span.dataset.fieldName = fieldName;
                  span.dataset.originalValue = fieldValue;
                  span.title = `${fieldInfo.label} - Click để chỉnh sửa`;
                  
                  // Thay thế text node bằng span
                  if (node.parentNode) {
                    node.parentNode.replaceChild(span, node);
                    
                    editableElements.push({
                      element: span,
                      fieldName,
                      originalValue: fieldValue
                    });
                    
                    // Đánh dấu đã xử lý
                    processedValues.add(fieldValue);
                    processedFieldNames.add(fieldName);
                    
                    console.log(`Wrapped text node as editable span: ${fieldName} = "${fieldValue}"`);
                  }
                }
              }
            }
          });
        });
      }
      
      // PHƯƠNG PHÁP 3: Sử dụng XPath (chỉ nếu vẫn còn trường chưa xử lý)
      const finalRemainingFields = Object.keys(fieldValues).filter(fieldName => !processedFieldNames.has(fieldName));
      
      if (finalRemainingFields.length > 0) {
        console.log(`Still have ${finalRemainingFields.length} fields, trying XPath approach...`);
        
        finalRemainingFields.forEach(fieldName => {
          const fieldInfo = fieldValues[fieldName];
          const fieldValue = fieldInfo.value?.trim();
          
          // Bỏ qua nếu không có giá trị hoặc đã xử lý
          if (!fieldValue || fieldValue === '' || processedValues.has(fieldValue)) return;
          
          try {
            // Tìm tất cả phần tử chứa chính xác text này
            const xpath = `//text()[normalize-space(.) = '${fieldValue}']`;
            const result = document.evaluate(xpath, containerRef.current, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            
            // Chỉ xử lý node đầu tiên tìm thấy
            if (result.snapshotLength > 0) {
              const textNode = result.snapshotItem(0);
              
              // Kiểm tra nếu node này là con của một phần tử editable-field hoặc formula-field
              let parent = textNode.parentNode;
              let isChildOfEditable = false;
              while (parent) {
                if (parent.classList && (parent.classList.contains('editable-field') || parent.classList.contains('formula-field'))) {
                  isChildOfEditable = true;
                  break;
                }
                parent = parent.parentNode;
              }
              
              // Chỉ xử lý nếu không phải là con của phần tử editable-field hoặc formula-field
              if (!isChildOfEditable) {
                console.log(`Found XPath match for ${fieldName}: "${fieldValue}"`);
                
                // Kiểm tra nếu là text node và có parent
                if (textNode.nodeType === Node.TEXT_NODE && textNode.parentNode) {
                  // Tạo span để bao bọc text node
                  const span = document.createElement('span');
                  span.textContent = textNode.nodeValue;
                  
                  // Kiểm tra nếu là trường formula
                  if (formulaFieldNames.has(fieldName) || fieldInfo.fieldType === 'Formula') {
                    span.classList.add('formula-field');
                    span.contentEditable = false;
                    span.dataset.fieldName = fieldName;
                    span.dataset.originalValue = fieldValue;
                    span.dataset.isFormula = 'true';
                    span.title = `${fieldInfo.label} - Trường tự động tính toán`;
                    
                    // Tìm công thức tương ứng
                    const formulaField = formulaFields.find(f => f.fieldName === fieldName);
                    if (formulaField) {
                      span.dataset.formula = formulaField.formula || '';
                    }
                    
                    // Thay thế text node bằng span
                    textNode.parentNode.replaceChild(span, textNode);
                    
                    editableElements.push({
                      element: span,
                      fieldName,
                      originalValue: fieldValue,
                      isFormula: true,
                      formula: formulaField?.formula || ''
                    });
                  } else {
                    span.classList.add('editable-field');
                    span.contentEditable = true;
                    span.dataset.fieldName = fieldName;
                    span.dataset.originalValue = fieldValue;
                    span.title = `${fieldInfo.label} - Click để chỉnh sửa`;
                    
                    // Thay thế text node bằng span
                    textNode.parentNode.replaceChild(span, textNode);
                    
                    editableElements.push({
                      element: span,
                      fieldName,
                      originalValue: fieldValue
                    });
                  }
                  
                  // Đánh dấu đã xử lý
                  processedValues.add(fieldValue);
                  processedFieldNames.add(fieldName);
                  
                  console.log(`XPath wrapped text node as ${formulaFieldNames.has(fieldName) || fieldInfo.fieldType === 'Formula' ? 'formula' : 'editable'}: ${fieldName} = "${fieldValue}"`);
                }
              }
            }
          } catch (error) {
            console.error(`Error using XPath for ${fieldName}:`, error);
          }
        });
      }
      
      // PHƯƠNG PHÁP 4: Tạo phần tử mới cho các trường còn lại
      // Cập nhật danh sách trường còn lại sau khi đã áp dụng tất cả các phương pháp khác
      const remainingFieldsAfterXPath = Object.keys(fieldValues).filter(fieldName => !processedFieldNames.has(fieldName));
      
      // Chỉ hiển thị phần "Các trường bổ sung" nếu còn trường chưa được xử lý
      // và trường đó không phải là trường đã được hiển thị trong tài liệu
      if (remainingFieldsAfterXPath.length > 0) {
        console.log(`Vẫn còn ${remainingFieldsAfterXPath.length} trường thực sự chưa được xử lý, tạo phần tử mới...`);
        
        // Kiểm tra xem các trường còn lại có thực sự cần hiển thị không
        const fieldsToShow = remainingFieldsAfterXPath.filter(fieldName => {
          // Kiểm tra xem giá trị của trường này có xuất hiện trong tài liệu không
          const fieldValue = fieldValues[fieldName].value?.trim();
          if (!fieldValue) return true; // Nếu không có giá trị, vẫn hiển thị
          
          // Tìm kiếm tất cả text nodes trong document
          const allTextContent = containerRef.current.textContent || '';
          
          // Nếu giá trị không xuất hiện trong tài liệu, hiển thị nó
          return !allTextContent.includes(fieldValue);
        });
        
        // Chỉ tạo container nếu có trường cần hiển thị
        if (fieldsToShow.length > 0) {
          // Tạo một div container để chứa các trường còn lại
          const missingFieldsContainer = document.createElement('div');
          missingFieldsContainer.className = 'missing-fields-container';
          missingFieldsContainer.style.marginTop = '20px';
          missingFieldsContainer.style.padding = '15px';
          missingFieldsContainer.style.border = '1px solid #f0f0f0';
          missingFieldsContainer.style.borderRadius = '8px';
          missingFieldsContainer.style.backgroundColor = '#fafafa';
          
          const missingFieldsTitle = document.createElement('h3');
          missingFieldsTitle.textContent = 'Các trường bổ sung';
          missingFieldsTitle.style.marginBottom = '15px';
          missingFieldsContainer.appendChild(missingFieldsTitle);
          
          // Tạo phần tử cho từng trường còn lại
          let hasAddedFields = false;
          fieldsToShow.forEach(fieldName => {
            const fieldInfo = fieldValues[fieldName];
            
            const fieldContainer = document.createElement('div');
            fieldContainer.style.marginBottom = '10px';
            fieldContainer.style.display = 'flex';
            fieldContainer.style.alignItems = 'center';
            
            const fieldLabel = document.createElement('label');
            fieldLabel.textContent = `${fieldInfo.label || fieldName}: `;
            fieldLabel.style.marginRight = '10px';
            fieldLabel.style.fontWeight = 'bold';
            fieldLabel.style.minWidth = '150px';
            
            fieldContainer.appendChild(fieldLabel);
            
            // Kiểm tra nếu là trường formula
            if (formulaFieldNames.has(fieldName) || fieldInfo.fieldType === 'Formula') {
              const formulaSpan = document.createElement('span');
              formulaSpan.textContent = fieldInfo.value || '';
              formulaSpan.classList.add('formula-field');
              formulaSpan.contentEditable = false;
              formulaSpan.dataset.fieldName = fieldName;
              formulaSpan.dataset.originalValue = fieldInfo.value || '';
              formulaSpan.dataset.isFormula = 'true';
              formulaSpan.title = `${fieldInfo.label} - Trường tự động tính toán`;
              
              // Tìm công thức tương ứng
              const formulaField = formulaFields.find(f => f.fieldName === fieldName);
              if (formulaField) {
                formulaSpan.dataset.formula = formulaField.formula || '';
              }
              
              fieldContainer.appendChild(formulaSpan);
              
              editableElements.push({
                element: formulaSpan,
                fieldName,
                originalValue: fieldInfo.value || '',
                isFormula: true,
                formula: formulaField?.formula || ''
              });
        } else {
              const editableSpan = document.createElement('span');
              editableSpan.textContent = fieldInfo.value || '';
              editableSpan.classList.add('editable-field');
              editableSpan.contentEditable = true;
              editableSpan.dataset.fieldName = fieldName;
              editableSpan.dataset.originalValue = fieldInfo.value || '';
              editableSpan.title = `${fieldInfo.label} - Click để chỉnh sửa`;
              
              fieldContainer.appendChild(editableSpan);
              
              editableElements.push({
                element: editableSpan,
                fieldName,
                originalValue: fieldInfo.value || ''
              });
            }
            
            missingFieldsContainer.appendChild(fieldContainer);
            processedFieldNames.add(fieldName);
            if (fieldInfo.value) {
              processedValues.add(fieldInfo.value.trim());
            }
            
            hasAddedFields = true;
          });
          
          // Chỉ thêm container vào document nếu có trường được thêm vào
          if (hasAddedFields) {
            containerRef.current.appendChild(missingFieldsContainer);
          }
        } else {
          console.log('Tất cả các trường đã xuất hiện trong tài liệu, không cần hiển thị phần bổ sung');
        }
      }
      
      // Tóm tắt kết quả
      const formulaCount = editableElements.filter(el => el.isFormula).length;
      const editableCount = editableElements.length - formulaCount;
      
      console.log(`Tổng cộng ${editableElements.length} phần tử được xử lý (${editableCount} có thể chỉnh sửa, ${formulaCount} trường công thức)`);
      console.log(`Đã xử lý ${processedFieldNames.size}/${Object.keys(fieldValues).length} trường`);
      
      if (editableElements.length > 0) {
        messageApi.success(`Đã tìm thấy ${editableCount} trường có thể chỉnh sửa trực tiếp${formulaCount > 0 ? ` và ${formulaCount} trường công thức` : ''}`);
      } else {
        messageApi.warning('Không tìm thấy trường nào có thể chỉnh sửa trực tiếp. Vui lòng thử lại.');
      }
      
      // Lưu lại danh sách các phần tử đã chỉnh sửa để sau này thu thập giá trị
      setEditableFields(editableElements);
      
      // Thêm sự kiện lắng nghe cho các trường có thể chỉnh sửa để cập nhật công thức
      setupFormulaListeners(editableElements, formulaFields);
      
    } catch (error) {
      console.error('Lỗi khi làm document có thể chỉnh sửa:', error);
      messageApi.error('Có lỗi khi bật chế độ chỉnh sửa');
    }
  };
  
  // Hàm thiết lập listeners để cập nhật giá trị công thức khi các trường liên quan thay đổi
  const setupFormulaListeners = (editableElements, formulaFields) => {
    if (!formulaFields || formulaFields.length === 0) return;
    
    // Tạo map các phần tử theo fieldName để dễ truy cập
    const elementsMap = {};
    editableElements.forEach(item => {
      elementsMap[item.fieldName] = item;
    });
    
    // Với mỗi trường công thức, tìm các trường liên quan và thiết lập listeners
    formulaFields.forEach(formulaField => {
      const formula = formulaField.formula;
      const fieldName = formulaField.fieldName;
      
      // Bỏ qua nếu không có công thức
      if (!formula) return;
      
      // Phân tích công thức để tìm các trường liên quan
      // Tìm tất cả các mẫu [FieldName] trong công thức
      const dependentFieldsMatch = formula.match(/\[([^\]]+)\]/g) || [];
      const dependentFields = dependentFieldsMatch.map(match => match.slice(1, -1));
      
      console.log(`Formula ${fieldName} depends on:`, dependentFields);
      
      // Thiết lập listeners cho các trường liên quan
      dependentFields.forEach(depField => {
        const depElement = elementsMap[depField]?.element;
        if (depElement) {
          // Thêm event listener để cập nhật giá trị công thức khi trường liên quan thay đổi
          depElement.addEventListener('input', () => {
            updateFormulaValue(fieldName, formula, elementsMap);
          });
          
          depElement.addEventListener('blur', () => {
            updateFormulaValue(fieldName, formula, elementsMap);
          });
        }
      });
    });
  };
  
  // Hàm tính toán và cập nhật giá trị cho trường công thức
  const updateFormulaValue = (formulaFieldName, formula, elementsMap) => {
    try {
      // Lấy phần tử công thức cần cập nhật
      const formulaElement = elementsMap[formulaFieldName]?.element;
      if (!formulaElement) return;
      
      // Tạo một bản sao của công thức để thay thế các giá trị
      let calculationFormula = formula;
      
      // Thay thế tất cả các [FieldName] bằng giá trị thực tế
      const fieldMatches = formula.match(/\[([^\]]+)\]/g) || [];
      
      fieldMatches.forEach(match => {
        const fieldName = match.slice(1, -1); // Loại bỏ [ và ]
        const fieldElement = elementsMap[fieldName]?.element;
        
        if (fieldElement) {
          const fieldValue = fieldElement.textContent.trim();
          // Chỉ thay thế nếu là số hợp lệ
          const numValue = parseFloat(fieldValue);
          
          if (!isNaN(numValue)) {
            calculationFormula = calculationFormula.replace(match, numValue);
      } else {
            calculationFormula = calculationFormula.replace(match, 0);
          }
        } else {
          // Nếu không tìm thấy phần tử, thay thế bằng 0
          calculationFormula = calculationFormula.replace(match, 0);
        }
      });
      
      console.log(`Calculating formula: ${calculationFormula}`);
      
      // Tính toán kết quả (sử dụng eval với cẩn trọng)
      // eslint-disable-next-line no-eval
      const result = eval(calculationFormula);
      
      // Làm tròn đến 2 chữ số thập phân
      const roundedResult = Math.round(result * 100) / 100;
      
      // Cập nhật giá trị hiển thị
      formulaElement.textContent = roundedResult.toString();
      
      console.log(`Updated formula ${formulaFieldName} to ${roundedResult}`);
      
    } catch (error) {
      console.error(`Error updating formula ${formulaFieldName}:`, error);
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
              {filledData.formName} - {isEditMode ? 'Đang chỉnh sửa' : 'Đã điền'}
            </Title>
          </div>
          
          {/* Action Buttons */}
          <Space size="middle">
            {filledData?.status === 'Draft' && !isEditMode && (
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
            
            {isEditMode && (
              <>
                <Button 
                  onClick={handleCancelEdit}
                  size="large"
                >
                  Hủy
                </Button>
                <Button 
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSaveInlineEdit}
                  loading={isUpdating}
                  size="large"
                >
                  Lưu thay đổi
                </Button>
              </>
            )}
            
            {!isEditMode && (
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
            )}
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

        {isEditMode && (
          <div style={{
            marginBottom: '16px',
            padding: '12px 16px',
            background: '#fffbe6',
            border: '1px solid #ffe58f',
            borderRadius: '8px',
          }}>
            <Text>
              <strong>Chỉ dẫn: </strong>
              Click vào các trường có viền màu xanh để chỉnh sửa trực tiếp. Sau khi hoàn thành, nhấn "Lưu thay đổi" để cập nhật.
            </Text>
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
      </div>
    </AppLayout>
  );
};

export default ViewFilledFormPage; 