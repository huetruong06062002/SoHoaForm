using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.VisualBasic.FileIO;
using SoHoaFormApi.Models.DbSoHoaForm;
using SoHoaFormApi.Models.Helper;
using SoHoaFormApi.Models.ViewModel.Request;
using SoHoaFormApi.Models.ViewModel.Response;
using Xceed.Words.NET;

public interface IAdminService
{
  Task<HTTPResponseClient<CreateFormResponse>> CreateFormAsync(CreateFormRequest request, ClaimsPrincipal user);
  Task<HTTPResponseClient<List<dynamic>>> GetFormFieldsAsync(Guid formId);

}

public class AdminService : IAdminService
{
  private readonly IUnitOfWork _unitOfWork;
  private readonly IWebHostEnvironment _environment;
  private readonly SoHoaFormContext _context;

  public AdminService(IUnitOfWork unitOfWork, IWebHostEnvironment environment, SoHoaFormContext context)
  {
    _unitOfWork = unitOfWork;
    _environment = environment;
    _context = context;
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
  private async Task<int> ProcessWordFileAndCreateFields(IFormFile wordFile, Guid formId)
  {

    try
    {
      var fieldsCreated = 0;
      var tempFilePath = Path.GetTempFileName();

      // Lưu file tạm để đọc
      using (var stream = new FileStream(tempFilePath, FileMode.Create))
      {
        await wordFile.CopyToAsync(stream);
      }

      // Đọc file Word bằng DocX
      using (var document = DocX.Load(tempFilePath))
      {
        // Tìm các placeholder hoặc form fields trong Word
        var fieldPatterns = ExtractFieldsFromDocument(document);

        foreach (var pattern in fieldPatterns)
        {
          // Tìm hoặc tạo Field
          var existingField = await _unitOfWork._fieldRepository
              .SingleOrDefaultAsync(f => f.Name.ToLower() == pattern.Name.ToLower());

          Field field;
          if (existingField == null)
          {
            field = new Field
            {
              Id = Guid.NewGuid(),
              Name = pattern.Name,
              Type = pattern.Type,
              Description = pattern.Description,
              IsRequired = pattern.IsRequired,
              IsUpperCase = pattern.IsUpperCase
            };
            await _unitOfWork._fieldRepository.AddAsync(field);
          }
          else
          {
            field = existingField;
          }

          // Tạo FormField
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
      //Đọc tất cả text trong document
      var documentText = document.Text;

      //Tìm các placeholder pattern như {TenField}, [TenField], {{TenField}}
      var placeholderRegex = new System.Text.RegularExpressions.Regex(@"\{([^}]+)\}|\[([^\]]+)\]|\{\{([^}]+)\}\}");
      var matches = placeholderRegex.Matches(documentText);

      foreach (System.Text.RegularExpressions.Match match in matches)
      {
        var fieldName = match.Groups[1].Value ?? match.Groups[2].Value ?? match.Groups[3].Value;

        if (!string.IsNullOrEmpty(fieldName))
        {
          // Phân tích tên field để xác định type
          var fieldType = DetermineFieldType(fieldName);

          patterns.Add(new FieldPattern
          {
            Name = fieldName.Trim(),
            Type = fieldType,
            Description = $"Trường {fieldName} từ file Word",
            IsRequired = fieldName.Contains("*") || fieldName.ToLower().Contains("required"),
            IsUpperCase = fieldName.Contains("UPPER") || fieldName.ToLower().Contains("upper"),
            Formula = match.Value // Lưu nguyên pattern gốc
          });
        }

        //Loại bỏ trùng lặp
        patterns = patterns.GroupBy(p => p.Name).Select(g => g.First()).ToList();
      }
    }
    catch (System.Exception ex)
    {

      throw;
    }
    return patterns;
  }

  //Xác định type của field dựa trên tên
  private string DetermineFieldType(string fieldName)
  {
    var name = fieldName.ToLower();

    if (name.Contains("date") || name.Contains("ngay")) return "Date";
    if (name.Contains("email")) return "Email";
    if (name.Contains("phone") || name.Contains("sdt")) return "Phone";
    if (name.Contains("number") || name.Contains("so")) return "Number";
    if (name.Contains("checkbox") || name.Contains("check")) return "Checkbox";
    if (name.Contains("select") || name.Contains("dropdown")) return "Select";
    if (name.Contains("textarea") || name.Contains("note")) return "Textarea";


    return "Text"; //Mặc định là Text nếu không xác định được type
  }

  public async Task<HTTPResponseClient<List<dynamic>>> GetFormFieldsAsync(Guid formId)
  {
    try
    {
      // Sử dụng Include để lấy thông tin Field cùng với FormField
      var formFields = await _context.FormFields
          .Where(ff => ff.FormId == formId)
          .Include(ff => ff.Field)
          .ToListAsync();

      if (!formFields.Any())
      {
        return new HTTPResponseClient<List<dynamic>>
        {
          Message = "Không tìm thấy fields cho form này",
          StatusCode = 404,
          Data = new List<dynamic>(),
          DateTime = DateTime.Now
        };
      }

      // Group by FieldId để tránh trùng lặp nếu có
      var groupedFields = formFields
          .GroupBy(ff => ff.FieldId)
          .Select(group => group.First()) // Lấy FormField đầu tiên trong mỗi group
          .Select(ff => new
          {
            FormFieldId = ff.Id,
            FieldId = ff.FieldId,
            FieldName = (ff.Field?.Name ?? "Unknown").Contains('_')
            ? (ff.Field.Name.Substring(ff.Field.Name.IndexOf('_') + 1))
            : (ff.Field?.Name ?? "Unknown"),
            FieldType = ff.Field?.Type ?? "Text",
            FieldDescription = ff.Field?.Description ?? "",
            IsRequired = ff.Field?.IsRequired ?? false,
            IsUpperCase = ff.Field?.IsUpperCase ?? false,
            Formula = ff.Formula ?? "",
            FormId = ff.FormId
          })
          .OrderBy(f => f.FieldName)
          .ToList();

      return new HTTPResponseClient<List<dynamic>>
      {
        Message = $"Lấy danh sách {groupedFields.Count} form fields thành công",
        StatusCode = 200,
        Data = groupedFields.Cast<dynamic>().ToList(),
        DateTime = DateTime.Now
      };
    }
    catch (System.Exception ex)
    {
      return new HTTPResponseClient<List<dynamic>>
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


}