using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.VisualBasic.FileIO;
using SoHoaFormApi.Infrastructure.Services;
using SoHoaFormApi.Models.Config;
using SoHoaFormApi.Models.DbSoHoaForm;
using SoHoaFormApi.Models.DTO;
using SoHoaFormApi.Models.Enums;
using SoHoaFormApi.Models.Helper;
using SoHoaFormApi.Models.ViewModel.Request;
using SoHoaFormApi.Models.ViewModel.Response;
using Xceed.Words.NET;

public interface IAdminService
{
  Task<HTTPResponseClient<CreateFormResponse>> CreateFormAsync(CreateFormRequest request, ClaimsPrincipal user);
  Task<HTTPResponseClient<FormPreviewResponse>> GetFormFieldsAsync(Guid formId);

  Task<HTTPResponseClient<UpdateFormulaResponse>> UpdateFormulaAsync(Guid formId, Guid fieldId, UpdateFormulaRequest request);

  Task<HTTPResponseClient<DeleteFormResponse>> DeleteFormAsync(Guid formId);

  Task<HTTPResponseClient<UpdateSelectOptionsResponse>> UpdateSelectOptionsAsync(Guid formId, Guid fieldId, UpdateSelectOptionsRequest request);

  Task<HTTPResponseClient<UpdateBooleanFormulaResponse>> UpdateBooleanFormulaAsync(Guid formId, Guid fieldId, UpdateBooleanFormulaRequest request);

  Task<HTTPResponseClient<UpdateFieldRequiredResponse>> ToggleFieldRequiredAsync(Guid formId, Guid fieldId);

  Task<HTTPResponseClient<UpdateFieldUpperCaseResponse>> ToggleFieldUpperCaseAsync(Guid formId, Guid fieldId);
}

public class AdminService : IAdminService
{
  private readonly IUnitOfWork _unitOfWork;
  private readonly IWebHostEnvironment _environment;

  private readonly IFileService _fileService;
  private readonly SoHoaFormContext _context;

  public AdminService(IUnitOfWork unitOfWork, IWebHostEnvironment environment, SoHoaFormContext context, IFileService fileService)
  {
    _unitOfWork = unitOfWork;
    _environment = environment;
    _context = context;
    _fileService = fileService;
  }

  public async Task<HTTPResponseClient<CreateFormResponse>> CreateFormAsync(CreateFormRequest request, ClaimsPrincipal user)
  {
    try
    {

      await _unitOfWork.BeginTransaction();


      //Lấy thông tin user từ token
      var userIdClaim = user.FindFirst("UserId");
      var currentUserId = userIdClaim?.Value.ToString();
      if (currentUserId == null)
      {
        return new HTTPResponseClient<CreateFormResponse>
        {
          Message = "Không tìm thấy thông tin người dùng.",
          StatusCode = 400,
          Data = null,
          DateTime = DateTime.Now
        };
      }

      if (!Guid.TryParse(currentUserId, out var userGuid))
      {
        return new HTTPResponseClient<CreateFormResponse>
        {
          Message = "ID người dùng không hợp lệ.",
          StatusCode = 400,
          Data = null,
          DateTime = DateTime.Now
        };
      }

      var dbUser = await _unitOfWork._userRepository.SingleOrDefaultAsync(u => u.Id == userGuid);
      if (dbUser == null)
      {
        return new HTTPResponseClient<CreateFormResponse>
        {
          Message = "Người dùng không tồn tại.",
          StatusCode = 404,
          Data = null,
          DateTime = DateTime.Now
        };
      }

      //Tìm hoặc tạo category
      var existingCategory = await _unitOfWork._formCategoryRepository.SingleOrDefaultAsync(c => c.CategoryName.ToLower() == request.CategoryName.ToLower());
      FormCategory category;

      if (existingCategory == null)
      {
        //Tạo category mới
        category = new FormCategory
        {
          Id = Guid.NewGuid(),
          CategoryName = request.CategoryName,
        };
        await _unitOfWork._formCategoryRepository.AddAsync(category);
      }
      else
      {
        category = existingCategory;
      }
      //Xử lý upload file word
      string? wordFilePath = null;
      if (request.WordFile != null)
      {
        wordFilePath = await SaveWordFileAsync(request.WordFile);
        if (wordFilePath == null)
        {
          await _unitOfWork.RollBack();
          return new HTTPResponseClient<CreateFormResponse>
          {
            Message = "Định dạng file không hợp lệ. Chỉ hỗ trợ .doc, .docx, .pdf",
            StatusCode = 400,
            Data = null,
            DateTime = DateTime.Now,
          };
        }
      }
      //Tạo form mới
      var newForm = new Form
      {
        Id = Guid.NewGuid(),
        Name = request.Name,
        CategoryId = category.Id,
        UserId = userGuid,
        WordFilePath = wordFilePath,
        Status = "Active",
        CreatedAt = DateTime.Now,
      };

      await _unitOfWork._formRepository.AddAsync(newForm);
      await _unitOfWork.SaveChangesAsync();
      var formFieldsCreated = await ProcessWordFileAndCreateFields(request.WordFile, newForm.Id);
      await _unitOfWork.SaveChangesAsync();
      await _unitOfWork.CommitTransaction();

      var response = new CreateFormResponse
      {
        FormId = newForm.Id,
        Name = newForm.Name,
        CategoryId = category.Id,
        CategoryName = category.CategoryName,
        WordFilePath = newForm.WordFilePath ?? "",
        Status = newForm.Status ?? "",
        CreatedAt = newForm.CreatedAt ?? DateTime.Now,
        Success = true,
        Message = "Tạo form thành công"
      };

      return new HTTPResponseClient<CreateFormResponse>
      {
        Message = "Tạo form thành công",
        StatusCode = 200,
        Data = response,
        DateTime = DateTime.Now
      };
    }
    catch (System.Exception ex)
    {
      await _unitOfWork.RollBack();
      return new HTTPResponseClient<CreateFormResponse>
      {
        Message = $"Lỗi khi tạo form: {ex.Message}",
        StatusCode = 500,
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  //Xử lý đọc file word và tạo feilds
  private async Task<int>  ProcessWordFileAndCreateFields(IFormFile wordFile, Guid formId)
  {
    try
    {
       Console.WriteLine($"🔧 Starting ProcessWordFileAndCreateFields for FormId: {formId}");
      var fieldsCreated = 0;
      var tempFilePath = Path.GetTempFileName();
      Console.WriteLine($"💾 Created temp file: {tempFilePath}");
      // Lưu file tạm để đọc
      using (var stream = new FileStream(tempFilePath, FileMode.Create))
      {
        await wordFile.CopyToAsync(stream);
      }
       Console.WriteLine($"📄 Copied {wordFile.Length} bytes to temp file");

      // Đọc file Word bằng DocX
      using (var document = DocX.Load(tempFilePath))
      {
         Console.WriteLine("📖 Word document loaded successfully");
        // Tìm các placeholder hoặc form fields trong Word
        var fieldPatterns = ExtractFieldsFromDocument(document);
        Console.WriteLine($"🔍 Extracted {fieldPatterns.Count} field patterns");

               if (fieldPatterns.Count == 0)
            {
                Console.WriteLine("⚠️ No field patterns found in document");
                return 0;
            }

        foreach (var pattern in fieldPatterns)
        {
          Console.WriteLine($"🔧 Processing pattern: {pattern.Name} (Type: {pattern.Type})");

          // xác định type
          var fieldType = DetermineFieldType(pattern.Name);


          var field = new Field
          {
            Id = Guid.NewGuid(), // ✅ Luôn tạo ID mới
            Name = pattern.Name,
            Type = fieldType,
            Description = GenerateFieldDescription(pattern.Name, fieldType, pattern.Formula),
            IsRequired = pattern.IsRequired,
            IsUpperCase = pattern.IsUpperCase
          };
          await _unitOfWork._fieldRepository.AddAsync(field);


          // Tạo FormField với order
          var formField = new FormField
          {
            Id = Guid.NewGuid(),
            FormId = formId,
            FieldId = field.Id,
            Formula = pattern.Formula
          };

          await _unitOfWork._formFieldRepository.AddAsync(formField);
          fieldsCreated++;
        }
        await _unitOfWork.SaveChangesAsync();
      }

      // Xóa file tạm
      if (File.Exists(tempFilePath))
      {
        File.Delete(tempFilePath);
      }

      return fieldsCreated;
    }
    catch (Exception ex)
    {
      throw new Exception($"Lỗi khi xử lý file Word: {ex.Message}");
    }
  }

  //Lấy các fields từ file Word document
  private List<FieldPattern> ExtractFieldsFromDocument(DocX document)
  {
    var patterns = new List<FieldPattern>();

    try
    {
        var documentText = document.Text;
        Console.WriteLine($"🔍 Document text preview: {documentText.Substring(0, Math.Min(500, documentText.Length))}");

        var placeholderRegex = new System.Text.RegularExpressions.Regex(@"\{([^}]+)\}|\[([^\]]+)\]|\{\{([^}]+)\}\}");
        var matches = placeholderRegex.Matches(documentText);

        Console.WriteLine($"🔍 Found {matches.Count} placeholders:");

        var order = 0;
        var seenFields = new HashSet<string>(); // Track để tránh duplicate

        foreach (System.Text.RegularExpressions.Match match in matches)
        {
            var fieldName = match.Groups[1].Value ?? match.Groups[2].Value ?? match.Groups[3].Value;

            if (!string.IsNullOrEmpty(fieldName))
            {
                // ✅ KHÔNG TRIM HOẶC MODIFY TÊN FIELD
                var cleanFieldName = fieldName.Trim();
                
                Console.WriteLine($"  - Found field: '{cleanFieldName}'");

                // ✅ KIỂM TRA DUPLICATE BẰNG EXACT NAME
                if (!seenFields.Contains(cleanFieldName))
                {
                    var isRequired = cleanFieldName.Contains("*") || cleanFieldName.ToLower().Contains("required");
                    var fieldType = DetermineFieldType(cleanFieldName, match.Value);

                    patterns.Add(new FieldPattern
                    {
                        Name = cleanFieldName, // ✅ GIỮ NGUYÊN TÊN CHÍNH XÁC
                        Type = fieldType,
                        Description = $"Trường {cleanFieldName} từ file Word",
                        IsRequired = isRequired,
                        IsUpperCase = cleanFieldName.Contains("UPPER") || cleanFieldName.ToLower().Contains("upper"),
                        Formula = match.Value,
                        Order = order++
                    });

                    seenFields.Add(cleanFieldName);
                    Console.WriteLine($"    ✅ Added field: '{cleanFieldName}' (Type: {fieldType})");
                }
                else
                {
                    Console.WriteLine($"    ⚠️ Duplicate field ignored: '{cleanFieldName}'");
                }
            }
        }

        Console.WriteLine($"📊 Total unique fields extracted: {patterns.Count}");
        return patterns;
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Error extracting fields: {ex.Message}");
        return patterns;
    }
  }

  //Xác định type của field dựa trên tên
  private string DetermineFieldType(string fieldName, string formula = "")
  {
    //Ưu tiên phân tích theo formula pattern
    if (!string.IsNullOrEmpty(formula))
    {
      if (formula.Contains("{f_")) return "Formula";
      if (formula.Contains("{c_")) return "Boolean";        // c_ = checkbox/boolean
      if (formula.Contains("{d_")) return "Date";           // d_ = date  
      if (formula.Contains("{t_")) return "Text";           // t_ = text
      if (formula.Contains("{n_")) return "Number";         // n_ = number
      if (formula.Contains("{b_")) return "Boolean";        // b_ = boolean
      if (formula.Contains("{rd_")) return "Radio";           // rd_ = radio
    }

    var name = fieldName.ToLower();

    //Phân tích theo prefix trong field name TRƯỚC (ưu tiên cao nhất)**
    if (name.StartsWith("f_")) return "Formula";     // f_ = formula
    if (name.StartsWith("n_")) return "Number";      // n_ = number  
    if (name.StartsWith("t_")) return "Text";        // t_ = text
    if (name.StartsWith("d_")) return "Date";        // d_ = date
    if (name.StartsWith("c_") || name.StartsWith("b_")) return "Boolean"; // c_/b_ = boolean
    if (name.StartsWith("s_")) return "Select";      // s_ = select/dropdown
    if (name.StartsWith("rd_")) return "Radio";      // rd_ = radio 

    // 1. Phân tích Number fields trước 
    if (name.Contains("score") || name.Contains("duration") ||
        name.Contains("grade") || name.Contains("number") ||
        name.Contains("so") || name.StartsWith("so")) return "Number";

    // 2. Phân tích Date fields
    if (name.Contains("date") || name.Contains("ngay")) return "Date";

    // 3. Phân tích Boolean fields (Pass/Fail)
    if (name.Contains("pass") || name.Contains("fail") ||
        name.Contains("initial") || name.Contains("recurrent") ||
        name.Contains("requalification")) return "Boolean";

    // 4. Phân tích Textarea fields (Remark/Note)
    // if (name.Contains("remark") || name.Contains("note")) return "Textarea";

    // 5. Các loại khác
    if (name.Contains("email")) return "Email";
    if (name.Contains("phone") || name.Contains("sdt")) return "Phone";
    if (name.Contains("checkbox") || name.Contains("check")) return "Checkbox";
    if (name.Contains("select") || name.Contains("dropdown")) return "Dropdown";


    // Phân tích dựa trên tên field
    if (name.Contains("score") || name.Contains("duration")) return "Number";
    if (name.Contains("date") || name.Contains("ngay")) return "Date";
    if (name.Contains("email")) return "Email";
    if (name.Contains("phone") || name.Contains("sdt")) return "Phone";
    // if (name.Contains("remark") || name.Contains("note")) return "Textarea";

    // Phân tích Boolean fields
    if (name.Contains("pass") || name.Contains("fail") ||
        name.Contains("initial") || name.Contains("recurrent") ||
        name.Contains("requalification")) return "Boolean";

    if (name.Contains("checkbox") || name.Contains("check")) return "Checkbox";
    if (name.Contains("select") || name.Contains("dropdown")) return "Dropdown";
    if (name.Contains("radio") || name.Contains("option")) return "Radio";

    return "Text"; //Mặc định là Text nếu không xác định được type
  }

  //Tạo mô tả field dựa trên type và formula
  private string GenerateFieldDescription(string fieldName, string fieldType, string formula = "")
  {
    var description = fieldType switch
    {
      "Text" => "Văn bản tự do",
      "Formula" => "Công thức tính",
      "Checkbox" => "Đánh dấu",
      "Dropdown" => "Danh sách lựa chọn",
      "Date" => "Ngày tháng",
      "Email" => "Địa chỉ email",
      "Phone" => "Số điện thoại",
      "Number" => "Nhập số",
      "Boolean" => "Lựa chọn (Có/Không)",
      "Select" => "Lựa chọn",
      // "Textarea" => "Văn bản nhiều dòng",
      _ => "Văn bản tự do"
    };

    //Thêm thông tin đặc biệt cho Formula
    if (fieldType == "Formula" && !string.IsNullOrEmpty(formula))
    {
      // Phân tích công thức dựa trên field name
      if (fieldName.ToLower().Contains("so3"))
      {
        description = "Công thức tính: [so1] + [so2]";
      }
      else if (fieldName.ToLower().Contains("total") || fieldName.ToLower().Contains("sum"))
      {
        description = "Công thức tính tổng";
      }
      else if (fieldName.ToLower().Contains("avg") || fieldName.ToLower().Contains("average"))
      {
        description = "Công thức tính trung bình";
      }
    }

    //Thêm buộc nếu có
    var isRequired = fieldName.Contains("*") || fieldName.ToLower().Contains("required");
    if (isRequired)
      description += " (Bắt buộc)";

    return description;
  }

  public async Task<HTTPResponseClient<FormPreviewResponse>> GetFormFieldsAsync(Guid formId)
  {
    try
    {
      // Lấy thông tin form trước để lấy WordFilePath 
      var form = await _context.Forms
                .Where(f => f.Id == formId).FirstOrDefaultAsync();

      if (form == null)
      {
        return new HTTPResponseClient<FormPreviewResponse>
        {
          Message = "Form không tồn tại",
          StatusCode = 404,
          Data = null,
          DateTime = DateTime.Now
        };
      }

      //Lấy FormFields với Include Field  
      var formFields = await _context.FormFields
          .Where(ff => ff.FormId == formId)
          .Include(ff => ff.Field)
          .ToListAsync();

      if (!formFields.Any())
      {
        return new HTTPResponseClient<FormPreviewResponse>
        {
          Message = "Không tìm thấy fields cho form này",
          StatusCode = 404,
          Data = null,
          DateTime = DateTime.Now
        };
      }

      //Phân tích tích template type từ Word file
      var templateType = await AnalyzeFormTemplate(form.WordFilePath);

      // Lấy thứ tự từ Word file để sắp xếp
      var fieldOrderMap = await GetFieldOrderFromWordFile(form.WordFilePath);
      // Group by FieldId để tránh trùng lặp 
      var groupedFields = formFields
               .GroupBy(ff => ff.FieldId)
               .Select(group => group.First())
               .Select(ff =>
               {
                 var fieldName = ff.Field?.Name?.Contains('_') == true
                    ? ff.Field.Name.Substring(ff.Field.Name.IndexOf('_') + 1)
                    : (ff.Field?.Name ?? "Unknown");



                 // **Sử dụng Type từ database TRƯỚC, nếu không có thì mới phân tích**
                 var fieldType = ff.Field?.Type ?? "Text";

                 // Chỉ re-analyze nếu type trong DB là null/empty hoặc không hợp lệ
                 if (string.IsNullOrEmpty(fieldType) || fieldType == "Unknown")
                 {
                   fieldType = DetermineFieldType(ff.Field?.Name ?? "", ff.Formula ?? "");
                 }

                 return new FormFieldDto
                 {
                   FormFieldId = ff.Id,
                   FieldId = ff.FieldId,
                   FieldName = fieldName,
                   FieldType = fieldType, // Sử dụng type đã phân tích
                   FieldDescription = GenerateFieldDescription(fieldName, fieldType, ff.Formula ?? ""),
                   IsRequired = ff.Field?.IsRequired ?? false,
                   IsUpperCase = ff.Field?.IsUpperCase ?? false,
                   Formula = ff.Formula ?? "",
                   FormId = ff.FormId
                 };
               })
                .OrderBy(f => fieldOrderMap.ContainsKey(f.FieldName) ? fieldOrderMap[f.FieldName] : int.MaxValue) //Sắp xếp theo thứ tự trong Word file
                .ThenBy(f => f.FieldName) // Fallback sort by name
               .ToList();

      //Tạo layout config 
      var layoutConfig = GenerateLayoutConfig(templateType, groupedFields);

      var response = new FormPreviewResponse
      {
        FormId = formId,
        FormName = form.Name ?? "",
        TemplateType = templateType,
        Fields = groupedFields,
        LayoutConfig = layoutConfig
      };
      return new HTTPResponseClient<FormPreviewResponse>
      {
        Message = $"Lấy form preview với {groupedFields.Count} fields thành công",
        StatusCode = 200,
        Data = response,
        DateTime = DateTime.Now
      };
    }
    catch (System.Exception ex)
    {
      return new HTTPResponseClient<FormPreviewResponse>
      {
        Message = $"Lỗi khi lấy form fields: {ex.Message}",
        StatusCode = 500,
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  private async Task<string?> SaveWordFileAsync(IFormFile wordFile)
  {
    //Kiểm tra định dạng file
    var allowedExtensions = new[] { ".doc", ".docx", ".pdf" };

    //Lấy đuôi file
    var fileExtension = Path.GetExtension(wordFile.FileName).ToLower();
    if (!allowedExtensions.Contains(fileExtension))
    {
      return null;
    }
    //Tạo thư mục uploads nếu chưa có
    var uploadsFolder = Path.Combine(_environment.WebRootPath ?? "", "uploads", "forms");
    if (!Directory.Exists(uploadsFolder))
    {
      Directory.CreateDirectory(uploadsFolder);
    }

    //Tạo tên file unique
    var fileName = $"{Guid.NewGuid()}{fileExtension}";
    var filePath = Path.Combine(uploadsFolder, fileName);

    //Lưu file
    using (var fileStream = new FileStream(filePath, FileMode.Create))
    {
      await wordFile.CopyToAsync(fileStream);
    }
    //Trả vê đường dẫn relative
    return $"/uploads/forms/{fileName}";
  }

  //Phân tích loại template từ World file
  private async Task<string> AnalyzeFormTemplate(string? wordFilePath)
  {
    if (string.IsNullOrEmpty(wordFilePath))
    {
      return TemplateType.Unknown.ToString();
    }
    try
    {
      var fullPath = Path.Combine(_environment.WebRootPath ?? "", wordFilePath.TrimStart('/'));
      if (!File.Exists(fullPath)) return TemplateType.Simple.ToString();

      using (var document = DocX.Load(fullPath))
      {
        //Kiểm tra có table không
        if (document.Tables.Count > 0)
        {
          var firstTable = document.Tables.First();

          //Có nhiều table phức tạp => Form Assessment
          if (document.Tables.Count > 2)
            return TemplateType.Assessment.ToString();

          // 1 - 2 table đơn giản => Table
          if (firstTable.RowCount > 2 && firstTable.ColumnCount > 2)
            return TemplateType.Table.ToString();
        }

        //Kiểm tra có section headers không
        var text = document.Text.ToUpper();
        if (text.Contains("ASSESSMENT") || text.Contains("COMPETENCY") || text.Contains("SCORE"))
          return TemplateType.Assessment.ToString();

        //Mixed(có cả text và table)
        if (document.Tables.Count > 0 && document.Text.Length > 500)
          return TemplateType.Mixed.ToString();

        //Simple form(chỉ có text fields)
        return TemplateType.Simple.ToString();
      }
    }
    catch (System.Exception ex)
    {
      return TemplateType.Simple.ToString();
    }
  }

  //Gender Layout dựa trên template type
  private LayoutConfig GenerateLayoutConfig(string templateType, List<FormFieldDto> fields)
  {
    var config = new LayoutConfig();

    switch (templateType)
    {
      case "Simple":
        config.RenderType = "vertical";
        config.Columns = 1;

        // Section 1: Number fields
        var simpleNumberFields = fields.Where(f => f.FieldType == "Number").ToList();
        if (simpleNumberFields.Any())
        {
          config.Sections.Add(new FormSection
          {
            Title = "Thông tin số liệu",
            Type = "fields",
            FieldNames = simpleNumberFields.Select(f => f.FieldName).ToList(),
            Props = new Dictionary<string, object> { { "columns", 2 } }
          });
        }

        // Section 2: Formula fields  
        var simpleFormulaFields = fields.Where(f => f.FieldType == "Formula").ToList();
        if (simpleFormulaFields.Any())
        {
          config.Sections.Add(new FormSection
          {
            Title = "Công thức tính",
            Type = "formula",
            FieldNames = simpleFormulaFields.Select(f => f.FieldName).ToList(),
            Props = new Dictionary<string, object>
                    {
                        { "readonly", true },
                        { "columns", 1 }
                    }
          });
        }

        // Section 3: Text fields
        var simpleTextFields = fields.Where(f => f.FieldType == "Text").ToList();
        if (simpleTextFields.Any())
        {
          config.Sections.Add(new FormSection
          {
            Title = "Thông tin văn bản",
            Type = "fields",
            FieldNames = simpleTextFields.Select(f => f.FieldName).ToList()
          });
        }

        // Nếu không có section nào, tạo section mặc định
        if (!config.Sections.Any())
        {
          config.Sections.Add(new FormSection
          {
            Title = "Thông tin form",
            Type = "fields",
            FieldNames = fields.Select(f => f.FieldName).ToList()
          });
        }
        break;

      case "Table":
        config.RenderType = "table";
        config.Columns = 2;

        // Section 1: Thông tin cơ bản
        var tableBasicFields = fields.Where(f => f.FieldType == "Text" || f.FieldType == "Date").ToList();
        if (tableBasicFields.Any())
        {
          config.Sections.Add(new FormSection
          {
            Title = "Thông tin cơ bản",
            Type = "fields",
            FieldNames = tableBasicFields.Select(f => f.FieldName).ToList(),
            Props = new Dictionary<string, object> { { "columns", 2 } }
          });
        }

        // Section 2: Điểm số và đánh giá
        var tableScoreFields = fields.Where(f => f.FieldType == "Number" || f.FieldType == "Formula").ToList();
        if (tableScoreFields.Any())
        {
          config.Sections.Add(new FormSection
          {
            Title = "Điểm số và đánh giá",
            Type = "fields",
            FieldNames = tableScoreFields.Select(f => f.FieldName).ToList(),
            Props = new Dictionary<string, object> { { "columns", 3 } }
          });
        }
        break;

      case "Assessment":
        config.RenderType = "sections";
        config.Columns = 1;

        // Section 1: Text fields
        var assessmentTextFields = fields.Where(f => f.FieldType == "Text").ToList();
        if (assessmentTextFields.Any())
        {
          config.Sections.Add(new FormSection
          {
            Title = "Thông tin văn bản",
            Type = "fields",
            FieldNames = assessmentTextFields.Select(f => f.FieldName).ToList(),
            Props = new Dictionary<string, object> { { "columns", 2 } }
          });
        }

        // Section 2: Number fields
        var assessmentNumberFields = fields.Where(f => f.FieldType == "Number").ToList();
        if (assessmentNumberFields.Any())
        {
          config.Sections.Add(new FormSection
          {
            Title = "Thông tin số liệu",
            Type = "fields",
            FieldNames = assessmentNumberFields.Select(f => f.FieldName).ToList(),
            Props = new Dictionary<string, object> { { "columns", 3 } }
          });
        }

        // Section 3: Boolean fields
        var assessmentBooleanFields = fields.Where(f => f.FieldType == "Boolean").ToList();
        if (assessmentBooleanFields.Any())
        {
          config.Sections.Add(new FormSection
          {
            Title = "Lựa chọn Pass/Fail",
            Type = "boolean-group",
            FieldNames = assessmentBooleanFields.Select(f => f.FieldName).ToList(),
            Props = new Dictionary<string, object> { { "layout", "horizontal" } }
          });
        }

        // Section 4: Checkbox fields
        var assessmentCheckboxFields = fields.Where(f => f.FieldType == "Checkbox").ToList();
        if (assessmentCheckboxFields.Any())
        {
          config.Sections.Add(new FormSection
          {
            Title = "Đánh dấu",
            Type = "checkbox-group",
            FieldNames = assessmentCheckboxFields.Select(f => f.FieldName).ToList(),
            Props = new Dictionary<string, object> { { "layout", "vertical" } }
          });
        }

        // Section 5: Date fields
        var assessmentDateFields = fields.Where(f => f.FieldType == "Date").ToList();
        if (assessmentDateFields.Any())
        {
          config.Sections.Add(new FormSection
          {
            Title = "Thông tin ngày tháng",
            Type = "fields",
            FieldNames = assessmentDateFields.Select(f => f.FieldName).ToList(),
            Props = new Dictionary<string, object> { { "columns", 2 } }
          });
        }
        break;

      case "Mixed":
        config.RenderType = "sections";

        // Group theo field type
        var groupedByType = fields.GroupBy(f => f.FieldType);

        foreach (var group in groupedByType)
        {
          var sectionTitle = group.Key switch
          {
            "Text" => "Thông tin văn bản",
            "Number" => "Thông tin số liệu",
            "Formula" => "Công thức tính",
            "Boolean" => "Lựa chọn (Có/Không)",
            "Date" => "Thông tin ngày tháng",
            "Checkbox" => "Lựa chọn đánh dấu",
            "Dropdown" => "Danh sách lựa chọn",
            _ => "Thông tin khác"
          };

          var sectionType = group.Key switch
          {
            "Formula" => "formula",
            "Boolean" => "boolean-group",
            "Checkbox" => "checkbox-group",
            "Dropdown" => "dropdown-group",
            _ => "fields"
          };

          config.Sections.Add(new FormSection
          {
            Title = sectionTitle,
            Type = sectionType,
            FieldNames = group.Select(f => f.FieldName).ToList(),
            Props = new Dictionary<string, object>
                    {
                        { "columns", group.Key == "Formula" ? 1 : 2 },
                        { "readonly", group.Key == "Formula" }
                    }
          });
        }
        break;

      default:
        config.RenderType = "vertical";
        config.Sections.Add(new FormSection
        {
          Title = "Tất cả fields",
          Type = "fields",
          FieldNames = fields.Select(f => f.FieldName).ToList()
        });
        break;
    }

    return config;
  }


  //method  để lấy thứ tự fields từ Word file
  private async Task<Dictionary<string, int>> GetFieldOrderFromWordFile(string? wordFilePath)
  {
    var orderMap = new Dictionary<string, int>();

    if (string.IsNullOrEmpty(wordFilePath))
      return orderMap;

    try
    {
      var fullPath = Path.Combine(_environment.WebRootPath ?? "", wordFilePath.TrimStart('/'));
      if (!File.Exists(fullPath))
        return orderMap;

      using (var document = DocX.Load(fullPath))
      {
        var documentText = document.Text;
        var placeholderRegex = new System.Text.RegularExpressions.Regex(@"\{([^}]+)\}|\[([^\]]+)\]|\{\{([^}]+)\}\}");
        var matches = placeholderRegex.Matches(documentText);

        var order = 0;
        var seenFields = new HashSet<string>();

        foreach (System.Text.RegularExpressions.Match match in matches)
        {
          var fieldName = match.Groups[1].Value ?? match.Groups[2].Value ?? match.Groups[3].Value;

          if (!string.IsNullOrEmpty(fieldName))
          {
            // Loại bỏ prefix như t_, n_, d_, c_ để lấy tên thật
            var cleanFieldName = fieldName.Trim();
            if (cleanFieldName.Contains('_') && cleanFieldName.Length > 2)
            {
              cleanFieldName = cleanFieldName.Substring(cleanFieldName.IndexOf('_') + 1);
            }

            // Chỉ lưu field đầu tiên nếu có trùng lặp
            if (!seenFields.Contains(cleanFieldName.ToLower()))
            {
              orderMap[cleanFieldName] = order++;
              seenFields.Add(cleanFieldName.ToLower());
            }
          }
        }
      }
    }
    catch (Exception ex)
    {
      Console.WriteLine($"Lỗi khi đọc thứ tự từ Word file: {ex.Message}");
    }

    return orderMap;
  }

  public async Task<HTTPResponseClient<UpdateFormulaResponse>> UpdateFormulaAsync(Guid formId, Guid fieldId, UpdateFormulaRequest request)
  {
    try
    {
      await _unitOfWork.BeginTransaction();

      // Tìm FormField dựa trên formId và fieldId
      var formField = await _context.FormFields
          .Include(ff => ff.Field)
          .Include(ff => ff.Form)
          .FirstOrDefaultAsync(ff => ff.FormId == formId && ff.FieldId == fieldId);

      if (formField == null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<UpdateFormulaResponse>
        {
          StatusCode = 404,
          Message = $"Không tìm thấy field với FormId '{formId}' và FieldId '{fieldId}'",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Kiểm tra field có phải là Formula type không
      if (formField.Field?.Type != "Formula")
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<UpdateFormulaResponse>
        {
          StatusCode = 400,
          Message = $"Field '{formField.Field?.Name}' không phải là Formula field (Type: {formField.Field?.Type})",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Lưu giá trị cũ để trả về
      var oldFormula = formField.Formula ?? "";
      var oldDescription = formField.Field?.Description ?? "";

      // Cập nhật Formula trong FormField
      formField.Formula = request.Formula;

      // Cập nhật Description trong Field nếu có
      if (!string.IsNullOrEmpty(request.Description) && formField.Field != null)
      {
        formField.Field.Description = request.Description;
        _context.Fields.Update(formField.Field);
      }

      // Update FormField
      _context.FormFields.Update(formField);

      // Commit transaction
      await _context.SaveChangesAsync();
      await _unitOfWork.CommitTransaction();

      var response = new UpdateFormulaResponse
      {
        FormId = formId,
        FieldId = fieldId,
        FormFieldId = formField.Id,
        FieldName = formField.Field?.Name ?? "Unknown",
        FieldType = formField.Field?.Type ?? "Unknown",
        Formula = request.Formula,
        OldFormula = oldFormula,
        Description = request.Description ?? formField.Field?.Description,
        OldDescription = oldDescription,
        IsUpdated = true,
        Message = $"Cập nhật formula cho field '{formField.Field?.Name}' thành công",
        UpdatedAt = DateTime.Now
      };

      return new HTTPResponseClient<UpdateFormulaResponse>
      {
        StatusCode = 200,
        Message = "Cập nhật formula thành công",
        Data = response,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      await _unitOfWork.RollBack();
      return new HTTPResponseClient<UpdateFormulaResponse>
      {
        StatusCode = 500,
        Message = $"Lỗi khi cập nhật formula: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }


  public async Task<HTTPResponseClient<DeleteFormResponse>> DeleteFormAsync(Guid formId)
  {
    try
    {
      // Gọi stored procedure
      var formIdParam = new Microsoft.Data.SqlClient.SqlParameter("@FormId", System.Data.SqlDbType.UniqueIdentifier)
      {
        Value = formId
      };

      var result = await _context.Database
          .SqlQueryRaw<DeleteFormStoredProcResult>(
              "EXEC sp_DeleteFormAndRelatedData @FormId",
              formIdParam)
          .ToListAsync();

      var spResult = result.FirstOrDefault();

      if (spResult == null)
      {
        return new HTTPResponseClient<DeleteFormResponse>
        {
          StatusCode = 500,
          Message = "Không nhận được kết quả từ stored procedure",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Kiểm tra trạng thái từ SP
      if (spResult.Status == "Error")
      {
        var httpStatusCode = spResult.ErrorNumber == 404 ? 404 : 500;

        return new HTTPResponseClient<DeleteFormResponse>
        {
          StatusCode = httpStatusCode,
          Message = spResult.Message,
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // **SỬA VẤN ĐỀ XÓA FILE WORD**
      bool wordFileDeleted = false;
      string wordFilePath = null;

      // Lấy WordFilePath từ database TRƯỚC KHI stored procedure xóa
      // Vì stored procedure đã xóa Form record rồi, nên spResult.WordFilePath có thể null
      if (!string.IsNullOrEmpty(spResult.WordFilePath))
      {
        wordFilePath = spResult.WordFilePath;
        var fullPath = Path.Combine(_environment.WebRootPath ?? "", wordFilePath.TrimStart('/'));

        Console.WriteLine($"Attempting to delete file at: {fullPath}");
        Console.WriteLine($"File exists: {File.Exists(fullPath)}");

        if (File.Exists(fullPath))
        {
          wordFileDeleted = await _fileService.DeleteFileAsync(fullPath);
          Console.WriteLine($"File deletion result: {wordFileDeleted}");
        }
        else
        {
          Console.WriteLine($"File not found at path: {fullPath}");
        }
      }
      else
      {
        Console.WriteLine("WordFilePath is null or empty from stored procedure");
      }

      var response = new DeleteFormResponse
      {
        DeletedFormId = formId,
        Status = "Success",
        Message = "Xóa form và tất cả dữ liệu liên quan thành công",
        DeletedAt = spResult.DeletedAt,
        TotalAffectedRecords = spResult.TotalAffectedRecords,
        WordFilePath = wordFilePath,
        WordFileDeleted = wordFileDeleted,
        Details = new DeleteFormDetails
        {
          PDFsDeleted = spResult.PDFsDeleted,
          UserFillFormHistoriesDeleted = spResult.HistoriesDeleted,
          UserFillFormsDeleted = spResult.UserFillFormsDeleted,
          FormFieldsDeleted = spResult.FormFieldsDeleted,
          FieldsDeleted = spResult.FieldsDeleted,
          FormDeleted = true
        }
      };

      return new HTTPResponseClient<DeleteFormResponse>
      {
        StatusCode = 200,
        Message = "Xóa form thành công",
        Data = response,
        DateTime = DateTime.Now
      };
    }
    catch (Microsoft.Data.SqlClient.SqlException sqlEx)
    {
      return new HTTPResponseClient<DeleteFormResponse>
      {
        StatusCode = 500,
        Message = $"Database error: {sqlEx.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      return new HTTPResponseClient<DeleteFormResponse>
      {
        StatusCode = 500,
        Message = $"Lỗi khi xóa form: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }


  public async Task<HTTPResponseClient<UpdateSelectOptionsResponse>> UpdateSelectOptionsAsync(Guid formId, Guid fieldId, UpdateSelectOptionsRequest request)
  {
    try
    {
      await _unitOfWork.BeginTransaction();

      // Tìm FormField dựa trên formId và fieldId
      var formField = await _context.FormFields
          .Include(ff => ff.Field)
          .Include(ff => ff.Form)
          .FirstOrDefaultAsync(ff => ff.FormId == formId && ff.FieldId == fieldId);

      if (formField == null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<UpdateSelectOptionsResponse>
        {
          StatusCode = 404,
          Message = $"Không tìm thấy field với FormId '{formId}' và FieldId '{fieldId}'",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Kiểm tra field có phải là Select type không
      if (formField.Field?.Type != "Select")
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<UpdateSelectOptionsResponse>
        {
          StatusCode = 400,
          Message = $"Field '{formField.Field?.Name}' không phải là Select field (Type: {formField.Field?.Type})",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Lưu options cũ
      var oldFormula = formField.Formula ?? string.Empty;

      // Cập nhật Formula với string từ request
      formField.Formula = request.Options;

      // Update FormField
      _context.FormFields.Update(formField);

      // Commit transaction
      await _context.SaveChangesAsync();
      await _unitOfWork.CommitTransaction();

      var response = new UpdateSelectOptionsResponse
      {
        FormId = formId,
        FieldId = fieldId,
        FormFieldId = formField.Id,
        FieldName = formField.Field?.Name ?? "Unknown",
        FieldType = formField.Field?.Type ?? "Unknown",
        NewOptions = request.Options,
        OldOptions = oldFormula,
        IsUpdated = true,
        Message = $"Cập nhật options cho field '{formField.Field?.Name}' thành công",
        UpdatedAt = DateTime.Now
      };

      return new HTTPResponseClient<UpdateSelectOptionsResponse>
      {
        StatusCode = 200,
        Message = "Cập nhật select options thành công",
        Data = response,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      await _unitOfWork.RollBack();
      return new HTTPResponseClient<UpdateSelectOptionsResponse>
      {
        StatusCode = 500,
        Message = $"Lỗi khi cập nhật select options: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  public async Task<HTTPResponseClient<UpdateBooleanFormulaResponse>> UpdateBooleanFormulaAsync(Guid formId, Guid fieldId, UpdateBooleanFormulaRequest request)
  {
    try
    {
      await _unitOfWork.BeginTransaction();

      // Tìm FormField dựa trên formId và fieldId
      var formField = await _context.FormFields
          .Include(ff => ff.Field)
          .Include(ff => ff.Form)
          .FirstOrDefaultAsync(ff => ff.FormId == formId && ff.FieldId == fieldId);

      if (formField == null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<UpdateBooleanFormulaResponse>
        {
          StatusCode = 404,
          Message = $"Không tìm thấy field với FormId '{formId}' và FieldId '{fieldId}'",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Kiểm tra field có phải là Boolean type không
      if (formField.Field?.Type != "Boolean")
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<UpdateBooleanFormulaResponse>
        {
          StatusCode = 400,
          Message = $"Field '{formField.Field?.Name}' không phải là Boolean field (Type: {formField.Field?.Type})",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Lưu formula cũ
      var oldFormula = formField.Formula ?? string.Empty;

      // Cập nhật Formula với string từ request
      formField.Formula = request.Formula;

      // Update FormField
      _context.FormFields.Update(formField);

      // Commit transaction
      await _context.SaveChangesAsync();
      await _unitOfWork.CommitTransaction();

      var response = new UpdateBooleanFormulaResponse
      {
        FormId = formId,
        FieldId = fieldId,
        FormFieldId = formField.Id,
        FieldName = formField.Field?.Name ?? "Unknown",
        FieldType = formField.Field?.Type ?? "Unknown",
        NewFormula = request.Formula,
        OldFormula = oldFormula,
        IsUpdated = true,
        Message = $"Cập nhật formula cho field '{formField.Field?.Name}' thành công",
        UpdatedAt = DateTime.Now
      };

      return new HTTPResponseClient<UpdateBooleanFormulaResponse>
      {
        StatusCode = 200,
        Message = "Cập nhật Boolean formula thành công",
        Data = response,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      await _unitOfWork.RollBack();
      return new HTTPResponseClient<UpdateBooleanFormulaResponse>
      {
        StatusCode = 500,
        Message = $"Lỗi khi cập nhật Boolean formula: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  public async Task<HTTPResponseClient<UpdateFieldRequiredResponse>> ToggleFieldRequiredAsync(Guid formId, Guid fieldId)
  {
    try
    {
      await _unitOfWork.BeginTransaction();

      // Tìm FormField dựa trên formId và fieldId
      var formField = await _context.FormFields
          .Include(ff => ff.Field)
          .Include(ff => ff.Form)
          .FirstOrDefaultAsync(ff => ff.FormId == formId && ff.FieldId == fieldId);

      if (formField == null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<UpdateFieldRequiredResponse>
        {
          StatusCode = 404,
          Message = $"Không tìm thấy field với FormId '{formId}' và FieldId '{fieldId}'",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      if (formField.Field == null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<UpdateFieldRequiredResponse>
        {
          StatusCode = 404,
          Message = "Không tìm thấy thông tin field",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Lưu giá trị cũ
      var oldIsRequired = formField.Field.IsRequired ?? false;

      // Toggle IsRequired: true -> false, false -> true
      var newIsRequired = !oldIsRequired;
      formField.Field.IsRequired = newIsRequired;

      // Update Field
      _unitOfWork._fieldRepository.Update(formField.Field);

      // Commit transaction
      await _unitOfWork.SaveChangesAsync();
      await _unitOfWork.CommitTransaction();
      var response = new UpdateFieldRequiredResponse
      {
        FormId = formId,
        FieldId = fieldId,
        FormFieldId = formField.Id,
        FieldName = formField.Field.Name ?? "Unknown",
        FieldType = formField.Field.Type ?? "Unknown",
        NewIsRequired = newIsRequired,
        OldIsRequired = oldIsRequired,
        IsUpdated = true,
        Message = $"Toggle IsRequired cho field '{formField.Field.Name}' thành công. Từ {oldIsRequired} thành {newIsRequired}",
        UpdatedAt = DateTime.Now
      };

      return new HTTPResponseClient<UpdateFieldRequiredResponse>
      {
        StatusCode = 200,
        Message = "Toggle IsRequired thành công",
        Data = response,
        DateTime = DateTime.Now
      };
    }
    catch (System.Exception ex)
    {
      await _unitOfWork.RollBack();
      return new HTTPResponseClient<UpdateFieldRequiredResponse>
      {
        StatusCode = 500,
        Message = $"Lỗi khi toggle IsRequired: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  public async Task<HTTPResponseClient<UpdateFieldUpperCaseResponse>> ToggleFieldUpperCaseAsync(Guid formId, Guid fieldId)
  {
    try
    {
      await _unitOfWork.BeginTransaction();

      // Tìm FormField dựa trên formId và fieldId
      var formField = await _context.FormFields
          .Include(ff => ff.Field)
          .Include(ff => ff.Form)
          .FirstOrDefaultAsync(ff => ff.FormId == formId && ff.FieldId == fieldId);

      if (formField == null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<UpdateFieldUpperCaseResponse>
        {
          StatusCode = 404,
          Message = $"Không tìm thấy field với FormId '{formId}' và FieldId '{fieldId}'",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      if (formField.Field == null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<UpdateFieldUpperCaseResponse>
        {
          StatusCode = 404,
          Message = "Không tìm thấy thông tin field",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Kiểm tra field có phải là Text type không
      if (formField.Field.Type != "Text")
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<UpdateFieldUpperCaseResponse>
        {
          StatusCode = 400,
          Message = $"Chỉ có thể toggle IsUpperCase cho field Text. Field '{formField.Field.Name}' có type '{formField.Field.Type}'",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Lưu giá trị cũ
      var oldIsUpperCase = formField.Field.IsUpperCase ?? false;

      // Toggle IsUpperCase: true -> false, false -> true
      var newIsUpperCase = !oldIsUpperCase;
      formField.Field.IsUpperCase = newIsUpperCase;

      // Update Field
      _unitOfWork._fieldRepository.Update(formField.Field);

      // Commit transaction
      await _unitOfWork.SaveChangesAsync();
      await _unitOfWork.CommitTransaction();

      var response = new UpdateFieldUpperCaseResponse
      {
        FormId = formId,
        FieldId = fieldId,
        FormFieldId = formField.Id,
        FieldName = formField.Field.Name ?? "Unknown",
        FieldType = formField.Field.Type ?? "Unknown",
        NewIsUpperCase = newIsUpperCase,
        OldIsUpperCase = oldIsUpperCase,
        IsUpdated = true,
        Message = $"Toggle IsUpperCase cho Text field '{formField.Field.Name}' thành công. Từ {oldIsUpperCase} thành {newIsUpperCase}",
        UpdatedAt = DateTime.Now
      };

      return new HTTPResponseClient<UpdateFieldUpperCaseResponse>
      {
        StatusCode = 200,
        Message = "Toggle IsUpperCase thành công",
        Data = response,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      await _unitOfWork.RollBack();
      return new HTTPResponseClient<UpdateFieldUpperCaseResponse>
      {
        StatusCode = 500,
        Message = $"Lỗi khi toggle IsUpperCase: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }
}