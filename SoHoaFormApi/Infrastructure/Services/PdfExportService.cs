using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using System.Runtime.InteropServices;
using SoHoaFormApi.Models.DTO;
using SoHoaFormApi.Models.ViewModel.Response;
using SoHoaFormApi.Models.DbSoHoaForm;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Linq;
using Microsoft.AspNetCore.Hosting;

// Conditional imports for Windows
#if WINDOWS
using Microsoft.Office.Interop.Word;
using Application = Microsoft.Office.Interop.Word.Application;
using Document = Microsoft.Office.Interop.Word.Document;
using Cell = Microsoft.Office.Interop.Word.Cell;
#endif

// Spire.Doc imports
using Spire.Doc;
using Spire.Doc.Documents;
using Spire.Doc.Fields;

namespace SoHoaFormApi.Infrastructure.Services
{
    public interface IPdfExportService
    {
        Task<byte[]> ExportFormToPdfAsync(Guid formId, List<FieldValueDto> fieldValues);
        Task<HTTPResponseClient<PdfExportResponse>> GenerateFormPdfWithDataAsync(Guid formId);
    }

    public class PdfExportService : IPdfExportService
    {
        private readonly SoHoaFormContext _context;
        private readonly IWebHostEnvironment _environment;
        private readonly IUserService _userService;
        private readonly bool _useOfficeInterop;

        public PdfExportService(SoHoaFormContext context, IWebHostEnvironment environment, IUserService userService)
        {
            _context = context;
            _environment = environment;
            _userService = userService;

            _useOfficeInterop = CheckOfficeAvailability();

            Console.WriteLine(_useOfficeInterop
                ? "✅ Sử dụng Microsoft Office Interop để xuất PDF"
                : "⚠️ Microsoft Office không khả dụng, sử dụng Spire.Doc");
        }

        private bool CheckOfficeAvailability()
        {
            try
            {
#if WINDOWS
                var testApp = new Application();
                testApp.Quit();
                Marshal.ReleaseComObject(testApp);
                return true;
#else
                return false;
#endif
            }
            catch
            {
                return false;
            }
        }

        public async Task<HTTPResponseClient<PdfExportResponse>> GenerateFormPdfWithDataAsync(Guid formId)
        {
            try
            {
                var form = await _context.Forms
                    .Include(f => f.Category)
                    .FirstOrDefaultAsync(f => f.Id == formId);

                if (form == null)
                {
                    return new HTTPResponseClient<PdfExportResponse>
                    {
                        StatusCode = 404,
                        Message = "Không tìm thấy form",
                        Data = null,
                        DateTime = DateTime.Now
                    };
                }

                // 🔍 DEBUG: Lấy field values từ API với logging chi tiết
                List<FieldValueDto> fieldValues = new List<FieldValueDto>();
                try
                {
                    Console.WriteLine($"🔍 Đang gọi API để lấy data cho FormId: {formId}");

                    var latestDataResult = await _userService.GetLatestFieldValuesByFormIdAsync(formId);

                    Console.WriteLine($"📡 API Response Status: {latestDataResult?.StatusCode}");
                    Console.WriteLine($"📡 API Response Message: {latestDataResult?.Message}");
                    Console.WriteLine($"📡 API Response Data: {(latestDataResult?.Data != null ? "NOT NULL" : "NULL")}");

                    if (latestDataResult.StatusCode == 200 && latestDataResult.Data != null)
                    {
                        // 🔍 DEBUG: Serialize để xem raw data
                        var responseData = latestDataResult.Data;
                        var responseJson = JsonSerializer.Serialize(responseData, new JsonSerializerOptions
                        {
                            WriteIndented = true,
                            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                        });

                        Console.WriteLine($"📋 Raw API Response JSON:");
                        Console.WriteLine(responseJson);

                        // Parse JSON
                        var responseObj = JsonSerializer.Deserialize<JsonElement>(responseJson);

                        // 🔍 DEBUG: Check các properties có trong response
                        Console.WriteLine("🔍 Available properties in response:");
                        foreach (var prop in responseObj.EnumerateObject())
                        {
                            Console.WriteLine($"  - {prop.Name}: {prop.Value.ValueKind}");
                        }

                        // Thử parse fieldValues
                        if (responseObj.TryGetProperty("fieldValues", out var fieldValuesElement))
                        {
                            Console.WriteLine($"✅ Found fieldValues property with {fieldValuesElement.GetArrayLength()} items");

                            fieldValues = JsonSerializer.Deserialize<List<FieldValueDto>>(
                                fieldValuesElement.GetRawText(),
                                new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
                            ) ?? new List<FieldValueDto>();

                            Console.WriteLine($"📊 Parsed {fieldValues.Count} field values successfully");
                        }
                        else
                        {
                            Console.WriteLine("❌ fieldValues property not found in response");

                            // 🔧 FALLBACK: Thử parse trực tiếp từ Data object
                            try
                            {
                                var dataElement = JsonSerializer.Deserialize<JsonElement>(responseJson);

                                // Có thể data nằm trong nested object
                                if (dataElement.TryGetProperty("data", out var nestedData) &&
                                    nestedData.TryGetProperty("fieldValues", out var nestedFieldValues))
                                {
                                    fieldValues = JsonSerializer.Deserialize<List<FieldValueDto>>(
                                        nestedFieldValues.GetRawText(),
                                        new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
                                    ) ?? new List<FieldValueDto>();

                                    Console.WriteLine($"✅ Found nested fieldValues: {fieldValues.Count} items");
                                }
                                else
                                {
                                    Console.WriteLine("❌ Could not find fieldValues in nested structure either");
                                }
                            }
                            catch (Exception fallbackEx)
                            {
                                Console.WriteLine($"❌ Fallback parsing failed: {fallbackEx.Message}");
                            }
                        }
                    }
                    else
                    {
                        Console.WriteLine($"❌ API call failed or returned no data. Status: {latestDataResult?.StatusCode}");
                    }

                    // 🔍 DEBUG: Log field values details
                    if (fieldValues.Any())
                    {
                        Console.WriteLine($"📊 Successfully loaded {fieldValues.Count} field values:");
                        for (int i = 0; i < Math.Min(fieldValues.Count, 10); i++) // Show first 10
                        {
                            var field = fieldValues[i];
                            Console.WriteLine($"  [{i + 1}] {field.FieldName} ({field.FieldType}): '{field.Value}' | Label: '{field.Label}'");
                        }

                        if (fieldValues.Count > 10)
                        {
                            Console.WriteLine($"  ... and {fieldValues.Count - 10} more fields");
                        }
                    }
                    else
                    {
                        Console.WriteLine("⚠️ No field values found - PDF will be generated without data fill");

                        // 🔧 CREATE TEST DATA FOR DEBUGGING
                        Console.WriteLine("🧪 Creating test data for debugging...");

                        Console.WriteLine($"🧪 Created {fieldValues.Count} test field values");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"❌ Exception when getting field values: {ex.Message}");
                    Console.WriteLine($"❌ Stack trace: {ex.StackTrace}");

                    // 🔧 CREATE TEST DATA ON ERROR
                    Console.WriteLine("🧪 Creating test data due to error...");

                }

                // Tạo PDF với dữ liệu đã fill
                var pdfBytes = await ExportFormToPdfAsync(formId, fieldValues);

                var fileName = $"{SanitizeFileName(form.Name ?? "Form")}_{DateTime.Now:yyyyMMdd_HHmmss}.pdf";

                var response = new PdfExportResponse
                {
                    FormId = formId,
                    FormName = form.Name ?? "Unknown",
                    CategoryName = form.Category?.CategoryName ?? "Unknown",
                    PdfContent = pdfBytes,
                    PdfPath = $"/exports/pdf/{fileName}",
                    FileName = fileName,
                    ContentType = "application/pdf",
                    FileSize = pdfBytes.Length,
                    FieldCount = fieldValues.Count,
                    GeneratedAt = DateTime.Now
                };

                return new HTTPResponseClient<PdfExportResponse>
                {
                    StatusCode = 200,
                    Message = $"✅ Xuất PDF thành công với {fieldValues.Count} field data được fill vào template ({(_useOfficeInterop ? "Office Interop" : "Spire.Doc")})",
                    Data = response,
                    DateTime = DateTime.Now
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error in GenerateFormPdfWithDataAsync: {ex.Message}");
                Console.WriteLine($"❌ Stack trace: {ex.StackTrace}");

                return new HTTPResponseClient<PdfExportResponse>
                {
                    StatusCode = 500,
                    Message = $"Lỗi khi tạo PDF: {ex.Message}",
                    Data = null,
                    DateTime = DateTime.Now
                };
            }
        }


        public async Task<byte[]> ExportFormToPdfAsync(Guid formId, List<FieldValueDto> fieldValues)
        {
            try
            {
                var form = await _context.Forms
                    .Include(f => f.Category)
                    .FirstOrDefaultAsync(f => f.Id == formId);

                if (form == null || string.IsNullOrEmpty(form.WordFilePath))
                {
                    return await CreatePdfFromDataOnlyAsync(form, fieldValues);
                }

                var fullPath = Path.Combine(_environment.WebRootPath ?? "", form.WordFilePath.TrimStart('/'));

                if (!File.Exists(fullPath))
                {
                    return await CreatePdfFromDataOnlyAsync(form, fieldValues);
                }

                Console.WriteLine($"📄 Đang xử lý Word template: {fullPath}");

                // Chọn phương pháp convert và FILL DATA
                if (_useOfficeInterop)
                {
#if WINDOWS
                    return await ConvertWordToPdfWithOfficeAsync(fullPath, form, fieldValues);
#else
                    return await ConvertWordToPdfWithSpireAsync(fullPath, form, fieldValues);
#endif
                }
                else
                {
                    return await ConvertWordToPdfWithSpireAsync(fullPath, form, fieldValues);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in ExportFormToPdfAsync: {ex.Message}");
                return await CreatePdfFromDataOnlyAsync(null, fieldValues);
            }
        }

        #region Microsoft Office Interop Methods

#if WINDOWS
        private async Task<byte[]> ConvertWordToPdfWithOfficeAsync(string wordFilePath, Form form, List<FieldValueDto> fieldValues)
        {
            Application wordApp = null;
            Document doc = null;
            
            try
            {
                Console.WriteLine("🔄 Sử dụng Microsoft Office Interop để fill data...");
                
                wordApp = new Application
                {
                    Visible = false,
                    DisplayAlerts = WdAlertLevel.wdAlertsNone
                };

                doc = wordApp.Documents.Open(wordFilePath, ReadOnly: false);

                // 🎯 FILL DATA VÀO WORD TEMPLATE
                if (fieldValues.Any())
                {
                    await Task.Run(() => FillWordTemplateWithOffice(doc, fieldValues));
                    await Task.Run(() => AddDataToWordDocumentWithOffice(doc, form, fieldValues));
                }

                var tempPdfPath = Path.Combine(Path.GetTempPath(), $"temp_office_export_{Guid.NewGuid()}.pdf");

                doc.ExportAsFixedFormat(
                    OutputFileName: tempPdfPath,
                    ExportFormat: WdExportFormat.wdExportFormatPDF,
                    OpenAfterExport: false,
                    OptimizeFor: WdExportOptimizeFor.wdExportOptimizeForQuality,
                    BitmapMissingFonts: true,
                    DocStructureTags: true
                );

                var pdfBytes = await File.ReadAllBytesAsync(tempPdfPath);

                if (File.Exists(tempPdfPath))
                    File.Delete(tempPdfPath);

                Console.WriteLine("✅ Microsoft Office conversion với data fill thành công");
                return pdfBytes;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error with Office Interop: {ex.Message}");
                throw;
            }
            finally
            {
                CleanupOfficeObjects(doc, wordApp);
            }
        }

        private void FillWordTemplateWithOffice(Document doc, List<FieldValueDto> fieldValues)
        {
            try
            {
                Console.WriteLine("🎯 Đang fill data vào Word template...");

                // Tạo dictionary để lookup nhanh
                var fieldDict = fieldValues.ToDictionary(f => f.FieldName, f => f.Value?.ToString() ?? "");

                // Fill Find & Replace cho các placeholder
                foreach (var field in fieldValues)
                {
                    try
                    {
                        var placeholder = $"{{{field.FieldName}}}"; // {TraineeName}, {TraineeID}, etc.
                        var value = FormatFieldValue(field);

                        // Find & Replace
                        doc.Content.Find.ClearFormatting();
                        doc.Content.Find.Replacement.ClearFormatting();

                        if (doc.Content.Find.Execute(
                            FindText: placeholder,
                            ReplaceWith: value,
                            Replace: WdReplace.wdReplaceAll))
                        {
                            Console.WriteLine($"  ✅ Replaced {placeholder} = {value}");
                        }
                        else
                        {
                            Console.WriteLine($"  ⚠️ Placeholder {placeholder} not found");
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"  ❌ Error replacing {field.FieldName}: {ex.Message}");
                    }
                }

                // Fill special checkbox logic
                FillCheckboxLogicWithOffice(doc, fieldDict);

                Console.WriteLine("✅ Word template fill completed");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error filling Word template: {ex.Message}");
                throw;
            }
        }

        private void FillCheckboxLogicWithOffice(Document doc, Dictionary<string, string> fieldDict)
        {
            try
                {
                    Console.WriteLine("🎯 Starting dynamic checkbox logic fill with Office...");

                    // 1. TÌM TẤT CẢ PLACEHOLDER PATTERNS TRONG DOCUMENT  
                    var documentText = doc.Content.Text;
                    var placeholderPattern = @"\{([^}]+)\}";
                    var regex = new System.Text.RegularExpressions.Regex(placeholderPattern);
                    var matches = regex.Matches(documentText);

                    var processedPlaceholders = new HashSet<string>();

                    foreach (System.Text.RegularExpressions.Match match in matches)
                    {
                        var placeholder = match.Value; // Full placeholder như {c_Purser}
                        var fieldKey = match.Groups[1].Value; // Chỉ lấy phần trong {} như c_Purser

                        // Bỏ qua nếu đã xử lý
                        if (processedPlaceholders.Contains(placeholder))
                            continue;

                        Console.WriteLine($"🔍 Found placeholder: {placeholder}");

                        // 2. PHÂN TÍCH LOẠI PLACEHOLDER - LUÔN LẤY GIÁ TRỊ THAY THẾ
                        var replacementValue = GetReplacementValue(fieldKey, fieldDict);

                        // THAY ĐỖI: Luôn thay thế, không kiểm tra IsNullOrEmpty
                        ReplaceTextInDocument(doc, placeholder, replacementValue);
                        Console.WriteLine($"  ✅ Replaced {placeholder} → '{replacementValue}'");

                        processedPlaceholders.Add(placeholder);
                    }

               

                    Console.WriteLine("✅ Dynamic checkbox logic fill completed with Office");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"❌ Error in dynamic checkbox logic fill with Office: {ex.Message}");
                }
        }


        private void ReplaceTextInDocument(Document doc, string findText, string replaceText)
        {
            try
            {
                doc.Content.Find.ClearFormatting();
                doc.Content.Find.Replacement.ClearFormatting();
                
                doc.Content.Find.Execute(
                    FindText: findText,
                    ReplaceWith: replaceText,
                    Replace: WdReplace.wdReplaceAll);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error replacing text: {ex.Message}");
            }
        }

        private void AddDataToWordDocumentWithOffice(Document doc, Form form, List<FieldValueDto> fieldValues)
        {
            try
            {
                var range = doc.Content;
                range.Collapse(WdCollapseDirection.wdCollapseEnd);

                // Page break
                range.InsertBreak(WdBreakType.wdPageBreak);

                // Title
                range.Text = $"\nDỮ LIỆU FORM: {form?.Name ?? "Unknown"}\n";
                range.Font.Name = "Times New Roman";
                range.Font.Size = 16;
                range.Font.Bold = 1;
                range.ParagraphFormat.Alignment = WdParagraphAlignment.wdAlignParagraphCenter;
                range.Collapse(WdCollapseDirection.wdCollapseEnd);

                // Form info
                range.Text = $"Category: {form?.Category?.CategoryName ?? "Unknown"} | Date: {DateTime.Now:dd/MM/yyyy HH:mm}\n\n";
                range.Font.Size = 12;
                range.Font.Bold = 0;
                range.ParagraphFormat.Alignment = WdParagraphAlignment.wdAlignParagraphCenter;
                range.Collapse(WdCollapseDirection.wdCollapseEnd);

                range.ParagraphFormat.Alignment = WdParagraphAlignment.wdAlignParagraphLeft;

                // Create table
                var table = doc.Tables.Add(range, fieldValues.Count + 1, 3);
                table.Borders.Enable = 1;
                table.Range.Font.Name = "Times New Roman";
                table.Range.Font.Size = 11;

                // Header row
                table.Cell(1, 1).Range.Text = "STT";
                table.Cell(1, 2).Range.Text = "Tên trường";
                table.Cell(1, 3).Range.Text = "Giá trị";

                var headerRow = table.Rows[1];
                headerRow.Range.Font.Bold = 1;
                headerRow.Shading.BackgroundPatternColor = WdColor.wdColorGray25;

                // Data rows
                for (int i = 0; i < fieldValues.Count; i++)
                {
                    var field = fieldValues[i];
                    var rowIndex = i + 2;

                    table.Cell(rowIndex, 1).Range.Text = (i + 1).ToString();
                    table.Cell(rowIndex, 2).Range.Text = field.FieldName ?? "";
                    table.Cell(rowIndex, 3).Range.Text = TruncateText(field.Value?.ToString() ?? "", 500);
                }

                table.AutoFitBehavior(WdAutoFitBehavior.wdAutoFitContent);

                // Apply table style safely
                try
                {
                    object tableStyle = "Table Grid";
                    table.set_Style(ref tableStyle);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Warning: Could not apply table style: {ex.Message}");
                }

                // Add cell padding
                foreach (Cell cell in table.Range.Cells)
                {
                    cell.TopPadding = 3;
                    cell.BottomPadding = 3;
                    cell.LeftPadding = 5;
                    cell.RightPadding = 5;
                    cell.VerticalAlignment = WdCellVerticalAlignment.wdCellAlignVerticalCenter;
                }

                if (fieldValues.Count > 100)
                {
                    range = doc.Content;
                    range.Collapse(WdCollapseDirection.wdCollapseEnd);
                    range.Text = $"\n... và {fieldValues.Count - 100} trường dữ liệu khác";
                    range.Font.Italic = 1;
                    range.Font.Size = 10;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error adding data to Office document: {ex.Message}");
                throw;
            }
        }

        private async Task<byte[]> CreatePdfFromDataOnlyWithOfficeAsync(Form form, List<FieldValueDto> fieldValues)
        {
            Application wordApp = null;
            Document doc = null;

            try
            {
                wordApp = new Application
                {
                    Visible = false,
                    DisplayAlerts = WdAlertLevel.wdAlertsNone
                };

                doc = wordApp.Documents.Add();

                await Task.Run(() =>
                {
                    var range = doc.Content;

                    // Title
                    range.Text = $"FORM: {form?.Name ?? "Unknown"}\n";
                    range.Font.Name = "Times New Roman";
                    range.Font.Size = 18;
                    range.Font.Bold = 1;
                    range.ParagraphFormat.Alignment = WdParagraphAlignment.wdAlignParagraphCenter;
                    range.Collapse(WdCollapseDirection.wdCollapseEnd);

                    // Form info
                    range.Text = $"Category: {form?.Category?.CategoryName ?? "Unknown"}\nDate: {DateTime.Now:dd/MM/yyyy HH:mm}\n\n";
                    range.Font.Size = 12;
                    range.Font.Bold = 0;
                    range.Collapse(WdCollapseDirection.wdCollapseEnd);

                    range.ParagraphFormat.Alignment = WdParagraphAlignment.wdAlignParagraphLeft;

                    if (fieldValues.Any())
                    {
                        range.Text = "Dữ liệu đã nhập:\n\n";
                        range.Font.Size = 14;
                        range.Font.Bold = 1;
                        range.Collapse(WdCollapseDirection.wdCollapseEnd);

                        var table = doc.Tables.Add(range, fieldValues.Count + 1, 3);
                        table.Borders.Enable = 1;
                        table.Range.Font.Name = "Times New Roman";
                        table.Range.Font.Size = 11;

                        // Header
                        table.Cell(1, 1).Range.Text = "STT";
                        table.Cell(1, 2).Range.Text = "Tên trường";
                        table.Cell(1, 3).Range.Text = "Giá trị";

                        var headerRow = table.Rows[1];
                        headerRow.Range.Font.Bold = 1;
                        headerRow.Shading.BackgroundPatternColor = WdColor.wdColorGray25;

                        // Data
                        for (int i = 0; i < fieldValues.Count; i++)
                        {
                            var field = fieldValues[i];
                            var rowIndex = i + 2;

                            table.Cell(rowIndex, 1).Range.Text = (i + 1).ToString();
                            table.Cell(rowIndex, 2).Range.Text = field.FieldName ?? "";
                            table.Cell(rowIndex, 3).Range.Text = TruncateText(field.Value?.ToString() ?? "", 500);
                        }

                        table.AutoFitBehavior(WdAutoFitBehavior.wdAutoFitContent);
                    }
                    else
                    {
                        range.Text = "Chưa có dữ liệu nhập.";
                        range.Font.Italic = 1;
                    }
                });

                var tempPdfPath = Path.Combine(Path.GetTempPath(), $"temp_data_only_office_{Guid.NewGuid()}.pdf");

                doc.ExportAsFixedFormat(
                    OutputFileName: tempPdfPath,
                    ExportFormat: WdExportFormat.wdExportFormatPDF,
                    OpenAfterExport: false,
                    OptimizeFor: WdExportOptimizeFor.wdExportOptimizeForQuality
                );

                var pdfBytes = await File.ReadAllBytesAsync(tempPdfPath);

                if (File.Exists(tempPdfPath))
                    File.Delete(tempPdfPath);

                return pdfBytes;
            }
            finally
            {
                CleanupOfficeObjects(doc, wordApp);
            }
        }

        private void CleanupOfficeObjects(Document doc, Application wordApp)
        {
            try
            {
                if (doc != null)
                {
                    doc.Close(SaveChanges: false);
                    Marshal.ReleaseComObject(doc);
                }

                if (wordApp != null)
                {
                    wordApp.Quit();
                    Marshal.ReleaseComObject(wordApp);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error cleaning up COM objects: {ex.Message}");
            }

            GC.Collect();
            GC.WaitForPendingFinalizers();
        }
#endif

        #endregion

        #region Spire.Doc Methods

        private async Task<byte[]> ConvertWordToPdfWithSpireAsync(string wordFilePath, Form form, List<FieldValueDto> fieldValues)
        {
            try
            {
                Console.WriteLine("🔄 Sử dụng Spire.Doc để fill data...");

                var document = new Spire.Doc.Document();
                document.LoadFromFile(wordFilePath);

                // 🎯 FILL DATA VÀO WORD TEMPLATE
                if (fieldValues.Any())
                {
                    await Task.Run(() => FillWordTemplateWithSpire(document, fieldValues));
                    await Task.Run(() => AddDataToWordDocumentWithSpire(document, form, fieldValues));
                }

                using (var stream = new MemoryStream())
                {
                    document.SaveToStream(stream, FileFormat.PDF);
                    Console.WriteLine("✅ Spire.Doc conversion với data fill thành công");
                    return stream.ToArray();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error with Spire.Doc: {ex.Message}");
                throw;
            }
        }

        private void FillWordTemplateWithSpire(Spire.Doc.Document document, List<FieldValueDto> fieldValues)
        {
            try
            {
                Console.WriteLine($"🎯 Starting to fill Word template with {fieldValues.Count} field values...");

                // Tạo dictionary để lookup nhanh
                var fieldDict = fieldValues.ToDictionary(f => f.FieldName, f => f.Value?.ToString() ?? "");

                Console.WriteLine($"📚 Created field dictionary with {fieldDict.Count} entries");

                // Fill Find & Replace cho các placeholder
                int successCount = 0;
                int failCount = 0;

                foreach (var field in fieldValues)
                {
                    try
                    {
                        var placeholder = $"{{{field.FieldName}}}"; // {TraineeName}, {TraineeID}, etc.
                        var value = FormatFieldValue(field);

                        Console.WriteLine($"🔍 Attempting to replace: {placeholder} → {value}");

                        // Find & Replace với Spire.Doc
                        var replaceCount = document.Replace(placeholder, value, true, true);

                        if (replaceCount > 0)
                        {
                            Console.WriteLine($"  ✅ Successfully replaced {placeholder} = {value} ({replaceCount} replacements)");
                            successCount++;
                        }
                        else
                        {
                            Console.WriteLine($"  ⚠️ Placeholder {placeholder} not found in document");
                            failCount++;
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"  ❌ Error replacing {field.FieldName}: {ex.Message}");
                        failCount++;
                    }
                }

                Console.WriteLine($"📊 Replacement summary: {successCount} success, {failCount} failed");

                // Fill special checkbox logic
                FillCheckboxLogicWithSpire(document, fieldDict);

                Console.WriteLine("✅ Spire.Doc template fill completed");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error filling Word template with Spire.Doc: {ex.Message}");
                Console.WriteLine($"❌ Stack trace: {ex.StackTrace}");
                throw;
            }
        }

        private void FillCheckboxLogicWithSpire(Spire.Doc.Document document, Dictionary<string, string> fieldDict)
        {
            try
            {
                Console.WriteLine("🎯 Starting dynamic checkbox logic fill...");

                // 1. TÌM TẤT CẢ PLACEHOLDER PATTERNS TRONG DOCUMENT
                var documentText = document.GetText();
                var placeholderPattern = @"\{([^}]+)\}";
                var regex = new System.Text.RegularExpressions.Regex(placeholderPattern);
                var matches = regex.Matches(documentText);

                var processedPlaceholders = new HashSet<string>();

                foreach (System.Text.RegularExpressions.Match match in matches)
                {
                    var placeholder = match.Value; // Full placeholder như {c_Purser}
                    var fieldKey = match.Groups[1].Value; // Chỉ lấy phần trong {} như c_Purser

                    // Bỏ qua nếu đã xử lý
                    if (processedPlaceholders.Contains(placeholder))
                        continue;

                    Console.WriteLine($"🔍 Found placeholder: {placeholder}");

                    // 2. PHÂN TÍCH LOẠI PLACEHOLDER - LUÔN LẤY GIÁ TRỊ THAY THẾ
                    var replacementValue = GetReplacementValue(fieldKey, fieldDict);

                    // THAY ĐỖI: Luôn thay thế, không kiểm tra IsNullOrEmpty
                    var replaceCount = document.Replace(placeholder, replacementValue, true, true);

                    if (replaceCount > 0)
                    {
                        Console.WriteLine($"  ✅ Replaced {placeholder} → '{replacementValue}' ({replaceCount} times)");
                    }
                    else
                    {
                        Console.WriteLine($"  ⚠️ Could not replace {placeholder}");
                    }

                    processedPlaceholders.Add(placeholder);
                }



                Console.WriteLine("✅ Dynamic checkbox logic fill completed");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error in dynamic checkbox logic fill: {ex.Message}");
            }
        }
        private string GetReplacementValue(string fieldKey, Dictionary<string, string> fieldDict)
        {
            try
            {
                // Phân tích prefix để xác định loại field
                if (fieldKey.StartsWith("c_") || fieldKey.StartsWith("b_"))
                {
                    // Checkbox/Boolean field
                    var actualFieldName = fieldKey.Substring(2); // Bỏ "c_" hoặc "b_"
                    var value = fieldDict.GetValueOrDefault(actualFieldName, "false");
                    return value.ToLower() == "true" ? "☑" : "☐";
                }
                else if (fieldKey.StartsWith("t_"))
                {
                    // Text field
                    var actualFieldName = fieldKey.Substring(2); // Bỏ "t_"
                    return fieldDict.GetValueOrDefault(actualFieldName, ""); // Luôn trả về, có thể rỗng
                }
                else if (fieldKey.StartsWith("n_"))
                {
                    // Number/Numeric field
                    var actualFieldName = fieldKey.Substring(2); // Bỏ "n_"
                    return fieldDict.GetValueOrDefault(actualFieldName, ""); // Luôn trả về, có thể rỗng
                }
                else if (fieldKey.StartsWith("f_"))
                {
                    var actualFieldName = fieldKey.Substring(2); // Bỏ "f_"
                    return fieldDict.GetValueOrDefault(actualFieldName, ""); // Luôn trả về, có thể rỗng
                }
                else if (fieldKey.StartsWith("dt_") || fieldKey.StartsWith("d_"))
                {
                    // Date field
                    var actualFieldName = fieldKey.Substring(fieldKey.IndexOf('_') + 1);
                    var dateValue = fieldDict.GetValueOrDefault(actualFieldName, "");

                    if (!string.IsNullOrEmpty(dateValue) && DateTime.TryParse(dateValue, out var date))
                    {
                        return date.ToString("dd/MM/yyyy");
                    }
                    return ""; // Trả về rỗng thay vì giá trị gốc
                }
                else if (fieldKey.StartsWith("s_"))
                {
                    // Select field
                    var actualFieldName = fieldKey.Substring(2);
                    return fieldDict.GetValueOrDefault(actualFieldName, ""); // Luôn trả về, có thể rỗng
                }
                else
                {
                    // Không có prefix, thử trực tiếp
                    return fieldDict.GetValueOrDefault(fieldKey, ""); // Luôn trả về, có thể rỗng
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error getting replacement for {fieldKey}: {ex.Message}");
                return ""; // Trả về rỗng khi có lỗi
            }
        }

    
        private void AddDataToWordDocumentWithSpire(Spire.Doc.Document document, Form form, List<FieldValueDto> fieldValues)
        {
            try
            {
                var section = document.Sections[document.Sections.Count - 1];

                // Page break
                var pageBreakPara = section.AddParagraph();
                pageBreakPara.AppendBreak(BreakType.PageBreak);

                // Title
                var titlePara = section.AddParagraph();
                titlePara.Format.HorizontalAlignment = HorizontalAlignment.Center;
                var titleText = titlePara.AppendText($"\nDỮ LIỆU FORM: {form?.Name ?? "Unknown"}\n");
                titleText.CharacterFormat.FontName = "Times New Roman";
                titleText.CharacterFormat.FontSize = 16;
                titleText.CharacterFormat.Bold = true;

                // Form info
                var infoPara = section.AddParagraph();
                infoPara.Format.HorizontalAlignment = HorizontalAlignment.Center;
                var infoText = infoPara.AppendText($"Category: {form?.Category?.CategoryName ?? "Unknown"} | Date: {DateTime.Now:dd/MM/yyyy HH:mm}\n\n");
                infoText.CharacterFormat.FontName = "Times New Roman";
                infoText.CharacterFormat.FontSize = 12;

                // Create table
                var table = section.AddTable(true);
                table.ResetCells(fieldValues.Count + 1, 3);
                table.TableFormat.Borders.BorderType = BorderStyle.Single;
                table.TableFormat.Borders.Color = System.Drawing.Color.Black;

                // Header row
                var headerRow = table.Rows[0];
                headerRow.Cells[0].AddParagraph().AppendText("STT");
                headerRow.Cells[1].AddParagraph().AppendText("Tên trường");
                headerRow.Cells[2].AddParagraph().AppendText("Giá trị");

                foreach (TableCell cell in headerRow.Cells)
                {
                    cell.CellFormat.BackColor = System.Drawing.Color.LightGray;
                    foreach (Paragraph para in cell.Paragraphs)
                    {
                        para.Format.HorizontalAlignment = HorizontalAlignment.Center;
                        foreach (var item in para.ChildObjects)
                        {
                            if (item is TextRange textRange)
                            {
                                textRange.CharacterFormat.Bold = true;
                                textRange.CharacterFormat.FontName = "Times New Roman";
                                textRange.CharacterFormat.FontSize = 11;
                            }
                        }
                    }
                }

                // Data rows
                for (int i = 0; i < fieldValues.Count; i++)
                {
                    var field = fieldValues[i];
                    var row = table.Rows[i + 1];

                    row.Cells[0].AddParagraph().AppendText((i + 1).ToString());
                    row.Cells[1].AddParagraph().AppendText(field.FieldName ?? "");
                    row.Cells[2].AddParagraph().AppendText(TruncateText(field.Value?.ToString() ?? "", 500));

                    foreach (TableCell cell in row.Cells)
                    {
                        foreach (Paragraph para in cell.Paragraphs)
                        {
                            foreach (var item in para.ChildObjects)
                            {
                                if (item is TextRange textRange)
                                {
                                    textRange.CharacterFormat.FontName = "Times New Roman";
                                    textRange.CharacterFormat.FontSize = 11;
                                }
                            }
                        }
                    }
                }

                table.AutoFit(AutoFitBehaviorType.AutoFitToContents);

                if (fieldValues.Count > 100)
                {
                    var summaryPara = section.AddParagraph();
                    var summaryText = summaryPara.AppendText($"\n... và {fieldValues.Count - 100} trường dữ liệu khác");
                    summaryText.CharacterFormat.Italic = true;
                    summaryText.CharacterFormat.FontSize = 10;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error adding data to Spire document: {ex.Message}");
                throw;
            }
        }

        private async Task<byte[]> CreatePdfFromDataOnlyWithSpireAsync(Form form, List<FieldValueDto> fieldValues)
        {
            try
            {
                var document = new Spire.Doc.Document();
                var section = document.AddSection();

                // Title
                var titlePara = section.AddParagraph();
                titlePara.Format.HorizontalAlignment = HorizontalAlignment.Center;
                var titleText = titlePara.AppendText($"FORM: {form?.Name ?? "Unknown"}");
                titleText.CharacterFormat.FontName = "Times New Roman";
                titleText.CharacterFormat.FontSize = 18;
                titleText.CharacterFormat.Bold = true;

                // Form info
                var infoPara = section.AddParagraph();
                infoPara.Format.HorizontalAlignment = HorizontalAlignment.Center;
                var infoText = infoPara.AppendText($"Category: {form?.Category?.CategoryName ?? "Unknown"}\nDate: {DateTime.Now:dd/MM/yyyy HH:mm}");
                infoText.CharacterFormat.FontName = "Times New Roman";
                infoText.CharacterFormat.FontSize = 12;

                section.AddParagraph();

                if (fieldValues.Any())
                {
                    var dataTitlePara = section.AddParagraph();
                    var dataTitleText = dataTitlePara.AppendText("Dữ liệu đã nhập:");
                    dataTitleText.CharacterFormat.FontName = "Times New Roman";
                    dataTitleText.CharacterFormat.FontSize = 14;
                    dataTitleText.CharacterFormat.Bold = true;

                    section.AddParagraph();

                    var table = section.AddTable(true);
                    table.ResetCells(fieldValues.Count + 1, 3);
                    table.TableFormat.Borders.BorderType = BorderStyle.Single;

                    // Header
                    var headerRow = table.Rows[0];
                    headerRow.Cells[0].AddParagraph().AppendText("STT");
                    headerRow.Cells[1].AddParagraph().AppendText("Tên trường");
                    headerRow.Cells[2].AddParagraph().AppendText("Giá trị");

                    for (int j = 0; j < headerRow.Cells.Count; j++)
                    {
                        ((TableCell)headerRow.Cells[j]).CellFormat.BackColor = System.Drawing.Color.LightGray;
                    }

                    // Data
                    for (int i = 0; i < fieldValues.Count; i++)
                    {
                        var field = fieldValues[i];
                        var row = table.Rows[i + 1];

                        row.Cells[0].AddParagraph().AppendText((i + 1).ToString());
                        row.Cells[1].AddParagraph().AppendText(field.FieldName ?? "");
                        row.Cells[2].AddParagraph().AppendText(TruncateText(field.Value?.ToString() ?? "", 500));
                    }

                    table.AutoFit(AutoFitBehaviorType.AutoFitToContents);
                }
                else
                {
                    var emptyPara = section.AddParagraph();
                    var emptyText = emptyPara.AppendText("Chưa có dữ liệu nhập.");
                    emptyText.CharacterFormat.Italic = true;
                }

                using (var stream = new MemoryStream())
                {
                    document.SaveToStream(stream, FileFormat.PDF);
                    return stream.ToArray();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating PDF with Spire.Doc: {ex.Message}");
                throw;
            }
        }

        #endregion

        #region Common Methods

        private string FormatFieldValue(FieldValueDto field)
        {
            try
            {
                var value = field.Value?.ToString() ?? "";

                Console.WriteLine($"🔧 Formatting field: {field.FieldName} ({field.FieldType}) = '{value}'");

                switch (field.FieldType?.ToLower())
                {
                    case "dt": // Date
                        if (DateTime.TryParse(value, out var date))
                        {
                            var formatted = date.ToString("dd/MM/yyyy");
                            Console.WriteLine($"  📅 Date formatted: {value} → {formatted}");
                            return formatted;
                        }
                        Console.WriteLine($"  ❌ Could not parse date: {value}");
                        return value;

                    case "c": // Checkbox
                        var isChecked = value.ToLower() == "true";
                        var checkboxResult = isChecked ? "☑" : "☐";
                        Console.WriteLine($"  ☑ Checkbox formatted: {value} → {checkboxResult}");
                        return checkboxResult;

                    case "s": // Select
                        Console.WriteLine($"  📋 Select value: {value}");
                        return value;

                    case "t": // Text
                    default:
                        Console.WriteLine($"  📝 Text value: {value}");
                        return value;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error formatting field {field.FieldName}: {ex.Message}");
                return field.Value?.ToString() ?? "";
            }
        }

        private async Task<byte[]> CreatePdfFromDataOnlyAsync(Form form, List<FieldValueDto> fieldValues)
        {
            if (_useOfficeInterop)
            {
#if WINDOWS
                return await CreatePdfFromDataOnlyWithOfficeAsync(form, fieldValues);
#else
                return await CreatePdfFromDataOnlyWithSpireAsync(form, fieldValues);
#endif
            }
            else
            {
                return await CreatePdfFromDataOnlyWithSpireAsync(form, fieldValues);
            }
        }

        private string TruncateText(string text, int maxLength)
        {
            if (string.IsNullOrEmpty(text)) return "";
            return text.Length <= maxLength ? text : text.Substring(0, maxLength) + "...";
        }

        private string SanitizeFileName(string fileName)
        {
            var invalid = Path.GetInvalidFileNameChars();
            return string.Join("_", fileName.Split(invalid, StringSplitOptions.RemoveEmptyEntries));
        }

        #endregion
    }
}