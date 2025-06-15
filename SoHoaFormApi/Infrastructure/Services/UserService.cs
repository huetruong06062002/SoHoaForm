using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SoHoaFormApi.Models.DbSoHoaForm;
using SoHoaFormApi.Models.DTO;
using SoHoaFormApi.Models.ViewModel.Request;
using SoHoaFormApi.Models.ViewModel.Response;

public interface IUserService
{
  Task<HTTPResponseClient<List<FormCategoryResponse>>> GetAllFormsCategoryAsync();
  Task<HTTPResponseClient<FormInformationResponse>> GetFormInformationAsync(Guid formId);
  Task<HTTPResponseClient<FormsByCategoryResponse>> GetAllFormsOrderByCategoryAsync();

  Task<HTTPResponseClient<SaveUserFillFormResponse>> SaveUserFillFormAsync(SaveUserFillFormRequest request);
  Task<HTTPResponseClient<object>> GetLatestFieldValuesByFormIdAsync(Guid formId);
}

public class UserService : IUserService
{
  private readonly IUnitOfWork _unitOfWork;
  private readonly IWebHostEnvironment _environment;
  private readonly SoHoaFormContext _context;
  public UserService(IUnitOfWork unitOfWork, IWebHostEnvironment environment, SoHoaFormContext context)
  {
    _unitOfWork = unitOfWork;
    _environment = environment;
    _context = context;
  }
  public async Task<HTTPResponseClient<List<FormCategoryResponse>>> GetAllFormsCategoryAsync()
  {
    var response = new HTTPResponseClient<List<FormCategoryResponse>>
    {
      Message = "",
      StatusCode = 0,
      Data = null,
      DateTime = DateTime.Now
    };

    try
    {
      // Sử dụng Include để lấy forms cùng với category thông tin
      var forms = await _context.Forms
          .Where(f => f.Status == "Active")
           .AsNoTracking()
          .Include(f => f.Category)
          .ToListAsync();

      if (forms == null || !forms.Any())
      {
        response.Message = "Không tìm thấy dữ liệu.";
        response.StatusCode = 404;
        return response;
      }

      var formCategoryResponses = forms.Select(form => new FormCategoryResponse
      {
        FormId = form.Id,
        FormName = form.Name,
        CategoryName = form.Category.CategoryName ?? "Không có danh mục",
        DateCreated = form?.CreatedAt
      }).ToList();

      response.Data = formCategoryResponses;
      response.StatusCode = 200;
      response.Message = "Lấy danh sách form categories thành công";
    }
    catch (Exception ex)
    {
      response.Message = $"Lỗi khi lấy dữ liệu: {ex.Message}";
      response.StatusCode = 500;
      return response;
    }

    return response;
  }

  public async Task<HTTPResponseClient<FormInformationResponse>> GetFormInformationAsync(Guid formId)
  {
    try
    {
      var form = await _context.Forms
          .Include(f => f.Category)
          .Include(f => f.User)
          .FirstOrDefaultAsync(f => f.Id == formId);

      if (form == null)
      {
        return new HTTPResponseClient<FormInformationResponse>
        {
          Message = "Form not found",
          StatusCode = 404,
          Data = null,
          DateTime = DateTime.Now
        };
      }

      var formInformation = new FormInformationResponse
      {
        FormId = form.Id,
        FormName = form.Name,
        CategoryName = form.Category?.CategoryName ?? "Unknown",
        CreatedAt = form.CreatedAt ?? DateTime.Now,
        Status = form.Status,
        CreatedBy = form.User?.Name ?? "Unknown"
      };

      return new HTTPResponseClient<FormInformationResponse>
      {
        StatusCode = 200,
        Message = "Lấy thông tin form thành công",
        Data = formInformation,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      return new HTTPResponseClient<FormInformationResponse>
      {
        StatusCode = 200,
        Message = $"Lấy thông tin form thành công: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  public async Task<HTTPResponseClient<FormsByCategoryResponse>> GetAllFormsOrderByCategoryAsync()
  {
    try
    {
      var formsWithCategories = await _context.Forms
          .Include(f => f.Category)
          .Include(f => f.User)
          .OrderBy(f => f.Category.CategoryName)
          .ThenBy(f => f.Name)
          .ToListAsync();

      // Group forms by category
      var categoriesWithForms = formsWithCategories
          .GroupBy(f => new { f.CategoryId, CategoryName = f.Category?.CategoryName ?? "Uncategorized" })
          .Select(group => new CategoryWithFormsDto
          {
            CategoryId = group.Key.CategoryId,
            CategoryName = group.Key.CategoryName,
            FormCount = group.Count(),
            Forms = group.Select(f => new FormSummaryDto
            {
              FormId = f.Id,
              FormName = f.Name,
              CategoryName = f.Category?.CategoryName ?? "Uncategorized",
              Status = f.Status,
              CreatedAt = f.CreatedAt ?? DateTime.Now,
              CreatedBy = f.User?.Name ?? "Unknown",
              HasWordFile = !string.IsNullOrEmpty(f.WordFilePath)
            }).ToList()
          })
          .OrderBy(c => c.CategoryName)
          .ToList();

      var response = new FormsByCategoryResponse
      {
        Categories = categoriesWithForms,
        TotalCategories = categoriesWithForms.Count,
        TotalForms = formsWithCategories.Count
      };

      return new HTTPResponseClient<FormsByCategoryResponse>
      {
        Message = "Forms grouped by category retrieved successfully",
        Data = response,
        StatusCode = 200,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      return new HTTPResponseClient<FormsByCategoryResponse>
      {
        Message = $"Error retrieving forms by category: {ex.Message}",
        StatusCode = 500,
        DateTime = DateTime.Now
      };
    }
  }

  public async Task<HTTPResponseClient<SaveUserFillFormResponse>> SaveUserFillFormAsync(SaveUserFillFormRequest request)
  {
    try
    {
      // Kiểm tra form có tồn tại không
      var form = await _context.Forms.FirstOrDefaultAsync(f => f.Id == request.FormId);
      if (form == null)
      {
        return new HTTPResponseClient<SaveUserFillFormResponse>
        {
          StatusCode = 404,
          Message = "Không tìm thấy form",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Kiểm tra user có tồn tại không
      var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId);
      if (user == null)
      {
        return new HTTPResponseClient<SaveUserFillFormResponse>
        {
          StatusCode = 404,
          Message = "Không tìm thấy user",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Chuyển đổi FieldValues thành JSON
      var jsonFieldValue = System.Text.Json.JsonSerializer.Serialize(request.FieldValues, new JsonSerializerOptions
      {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
      });

      // Kiểm tra xem user đã có UserFillForm cho form này chưa
      var existingUserFillForm = await _context.UserFillForms
          .FirstOrDefaultAsync(uff => uff.FormId == request.FormId && uff.UserId == request.UserId);

      UserFillForm userFillForm;
      bool isNewRecord = false;

      if (existingUserFillForm == null)
      {
        // Tạo mới UserFillForm
        userFillForm = new UserFillForm
        {
          Id = Guid.NewGuid(),
          FormId = request.FormId,
          UserId = request.UserId,
          JsonFieldValue = jsonFieldValue,
          Status = request.Status,
          DateTime = DateTime.Now
        };

        _context.UserFillForms.Add(userFillForm);
        isNewRecord = true;
      }
      else
      {
        // Cập nhật UserFillForm hiện có
        existingUserFillForm.JsonFieldValue = jsonFieldValue;
        existingUserFillForm.Status = request.Status;
        existingUserFillForm.DateTime = DateTime.Now;

        _context.UserFillForms.Update(existingUserFillForm);
        userFillForm = existingUserFillForm;
      }

      // Tạo UserFillFormHistory
      var userFillFormHistory = new UserFillFormHistory
      {
        Id = Guid.NewGuid(),
        UserFillFormId = userFillForm.Id,
        DateWrite = DateTime.Now,
        Status = request.Status
      };

      // Set DateFill và DateFinish dựa trên Status
      switch (request.Status.ToLower())
      {
        case "draft":
          userFillFormHistory.DateFill = DateTime.Now;
          break;
        case "completed":
          userFillFormHistory.DateFill = DateTime.Now;
          userFillFormHistory.DateFinish = DateTime.Now;
          break;
        case "submitted":
          userFillFormHistory.DateFill = DateTime.Now;
          userFillFormHistory.DateFinish = DateTime.Now;
          break;
        default:
          userFillFormHistory.DateFinish = DateTime.Now;
          break;
      }

      _context.UserFillFormHistories.Add(userFillFormHistory);

      // Lưu thay đổi
      await _context.SaveChangesAsync();

      var response = new SaveUserFillFormResponse
      {
        UserFillFormId = userFillForm.Id,
        FormId = request.FormId,
        UserId = request.UserId,
        Status = userFillForm.Status ?? "",
        FieldValues = request.FieldValues, // Trả về array như đã gửi lên
        SavedAt = userFillForm.DateTime ?? DateTime.Now,
        HistoryId = userFillFormHistory.Id,
        Message = isNewRecord ? "Tạo mới và lưu dữ liệu thành công" : "Cập nhật dữ liệu thành công",
        IsNewRecord = isNewRecord
      };

      return new HTTPResponseClient<SaveUserFillFormResponse>
      {
        StatusCode = 200,
        Message = response.Message,
        Data = response,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      return new HTTPResponseClient<SaveUserFillFormResponse>
      {
        StatusCode = 500,
        Message = $"Lỗi khi lưu dữ liệu: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  // ...existing code...
  public async Task<HTTPResponseClient<object>> GetLatestFieldValuesByFormIdAsync(Guid formId)
  {
    try
    {
      // Lấy UserFillForm mới nhất theo FormId (sắp xếp theo DateTime desc)
      var latestUserFillForm = await _context.UserFillForms
          .Where(uff => uff.FormId == formId)
          .OrderByDescending(uff => uff.DateTime)
          .FirstOrDefaultAsync();

      if (latestUserFillForm == null)
      {
        return new HTTPResponseClient<object>
        {
          StatusCode = 404,
          Message = "Không tìm thấy dữ liệu cho form này",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Parse JSON field values về List<FieldValueDto>
      List<FieldValueDto>? fieldValues = null;
      if (!string.IsNullOrEmpty(latestUserFillForm.JsonFieldValue))
      {
        try
        {
          fieldValues = System.Text.Json.JsonSerializer.Deserialize<List<FieldValueDto>>(
              latestUserFillForm.JsonFieldValue,
              new JsonSerializerOptions
              {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
              });
        }
        catch (Exception ex)
        {
          return new HTTPResponseClient<object>
          {
            StatusCode = 500,
            Message = $"Lỗi khi parse JSON: {ex.Message}",
            Data = null,
            DateTime = DateTime.Now
          };
        }
      }

      var response = new
      {
        UserFillFormId = latestUserFillForm.Id,
        FormId = latestUserFillForm.FormId,
        UserId = latestUserFillForm.UserId,
        Status = latestUserFillForm.Status,
        FieldValues = fieldValues ?? new List<FieldValueDto>(),
        LastUpdated = latestUserFillForm.DateTime
      };

      return new HTTPResponseClient<object>
      {
        StatusCode = 200,
        Message = "Lấy dữ liệu mới nhất thành công",
        Data = response,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      return new HTTPResponseClient<object>
      {
        StatusCode = 500,
        Message = $"Lỗi khi lấy dữ liệu: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }
  // ...existing code...

}