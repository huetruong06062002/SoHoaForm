using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using SoHoaFormApi.Models.DTO;
using SoHoaFormApi.Models.ViewModel.Response;

namespace SoHoaFormApi.Infrastructure.Services
{
    public interface IWordReaderService
    {
        Task<WordContentResponse> ReadWordContentAsync(string filePath);
    }

    public class WordReaderService : IWordReaderService
    {
        public async Task<WordContentResponse> ReadWordContentAsync(string filePath)
        {
            // Validate file path
            if (string.IsNullOrEmpty(filePath))
            {
                throw new FileNotFoundException("File path is empty or null");
            }

            // Build full file path
            string fullFilePath;
            
            if (Path.IsPathRooted(filePath))
            {
                // Nếu là absolute path nhưng không có project directory
                if (!filePath.Contains(Directory.GetCurrentDirectory()))
                {
                    // Extract filename và nối với project directory
                    var fileName = Path.GetFileName(filePath);
                    var projectDirectory = Directory.GetCurrentDirectory(); // D:\SoHoaForm\SoHoaFormApi
                    fullFilePath = Path.Combine(projectDirectory, "uploads", "forms", fileName);
                }
                else
                {
                    fullFilePath = filePath;
                }
            }
            else
            {
                // Nếu là relative path
                var projectDirectory = Directory.GetCurrentDirectory();
                fullFilePath = Path.Combine(projectDirectory, filePath);
            }

            // Validate file exists at full path
            if (!File.Exists(fullFilePath))
            {
                throw new FileNotFoundException($"Word file not found at path: {fullFilePath}");
            }

            var response = new WordContentResponse();
            
            try
            {
                using (WordprocessingDocument doc = WordprocessingDocument.Open(fullFilePath, false))
                {
                    Body body = doc.MainDocumentPart.Document.Body;
                    
                    // Đọc tables
                    var tables = body.Elements<Table>().ToList();
                    response.Tables = ExtractTables(tables);
                    
                    // Đọc paragraphs (text content)
                    var paragraphs = body.Elements<Paragraph>().ToList();
                    response.Paragraphs = ExtractParagraphs(paragraphs);
                    
                    // Đọc headers/footers nếu cần
                    response.Headers = ExtractHeaders(doc);
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Error reading Word file at {fullFilePath}: {ex.Message}", ex);
            }
            
            return response;
        }

        private List<WordTableDto> ExtractTables(List<Table> tables)
        {
            var result = new List<WordTableDto>();
            
            foreach (var table in tables)
            {
                var tableDto = new WordTableDto();
                var rows = table.Elements<TableRow>().ToList();
                
                foreach (var row in rows)
                {
                    var rowDto = new WordRowDto();
                    var cells = row.Elements<TableCell>().ToList();
                    
                    foreach (var cell in cells)
                    {
                        var cellText = cell.InnerText.Trim();
                        var cellDto = new WordCellDto
                        {
                            Text = cellText,
                            IsField = IsFieldPattern(cellText),
                            FieldName = ExtractFieldName(cellText)
                        };
                        rowDto.Cells.Add(cellDto);
                    }
                    tableDto.Rows.Add(rowDto);
                }
                result.Add(tableDto);
            }
            
            return result;
        }

        private List<WordParagraphDto> ExtractParagraphs(List<Paragraph> paragraphs)
        {
            var result = new List<WordParagraphDto>();
            
            foreach (var para in paragraphs)
            {
                var text = para.InnerText.Trim();
                if (!string.IsNullOrEmpty(text))
                {
                    result.Add(new WordParagraphDto
                    {
                        Text = text,
                        IsField = IsFieldPattern(text),
                        FieldName = ExtractFieldName(text)
                    });
                }
            }
            
            return result;
        }

        private List<string> ExtractHeaders(WordprocessingDocument doc)
        {
            var headers = new List<string>();
            
            foreach (var headerPart in doc.MainDocumentPart.HeaderParts)
            {
                var headerText = headerPart.Header.InnerText.Trim();
                if (!string.IsNullOrEmpty(headerText))
                {
                    headers.Add(headerText);
                }
            }
            
            return headers;
        }

        private bool IsFieldPattern(string text)
        {
            return text.Contains("[") && text.Contains("]") ||
                   text.Contains("{") && text.Contains("}") ||
                   text.Contains("____") ||
                   text.Contains("....");
        }

        private string ExtractFieldName(string text)
        {
            if (text.Contains("[") && text.Contains("]"))
            {
                var start = text.IndexOf("[") + 1;
                var end = text.IndexOf("]");
                return text.Substring(start, end - start);
            }
            
            if (text.Contains("{") && text.Contains("}"))
            {
                var start = text.IndexOf("{") + 1;
                var end = text.IndexOf("}");
                return text.Substring(start, end - start);
            }
            
            return null;
        }
    }
}