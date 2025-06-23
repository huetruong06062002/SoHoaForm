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

  Task<HTTPResponseClient<object>> GetUserFillFormIdsByFormIdAsync(Guid formId);

  Task<HTTPResponseClient<object>> GetJsonFieldValueByUserFillFormIdAsync(Guid userFillFormId);
  Task<HTTPResponseClient<string>> GetRawJsonFieldValueAsync(Guid userFillFormId);

  Task<HTTPResponseClient<CompleteUserFillFormResponse>> CompleteUserFillFormAsync(Guid userFillFormId, Guid userId);

  Task<HTTPResponseClient<UpdateUserFillFormResponse>> UpdateUserFillFormFieldValuesAsync(Guid userFillFormId, Guid userId, UpdateUserFillFormRequest request);
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

      // **KIỂM TRA TRẠNG THÁI COMPLETE - NGĂN KHÔNG CHO EDIT**
      var existingUserFillForm = await _context.UserFillForms
          .FirstOrDefaultAsync(uff => uff.FormId == request.FormId && uff.UserId == request.UserId);

      if (existingUserFillForm != null && existingUserFillForm.Status?.ToLower() == "complete")
      {
        return new HTTPResponseClient<SaveUserFillFormResponse>
        {
          StatusCode = 400,
          Message = "Form đã được hoàn thành và không thể chỉnh sửa. Sử dụng API Complete để hoàn thành form.",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // **NGĂN KHÔNG CHO SET STATUS = COMPLETE TRỰC TIẾP**
      if (request.Status?.ToLower() == "complete")
      {
        return new HTTPResponseClient<SaveUserFillFormResponse>
        {
          StatusCode = 400,
          Message = "Không thể set status thành 'Complete' trực tiếp. Vui lòng sử dụng API Complete riêng biệt.",
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

      // **LUÔN TẠO RECORD MỚI** - bỏ tên nếu không có field Name trong DB
      var userFillForm = new UserFillForm
      {
        Id = Guid.NewGuid(),
        FormId = request.FormId,
        UserId = request.UserId,
        // Name = submissionName, // BỎ DÒNG NÀY nếu không có field Name
        JsonFieldValue = jsonFieldValue,
        Status = request.Status,
        DateTime = DateTime.Now
      };

      _context.UserFillForms.Add(userFillForm);

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
          userFillFormHistory.DateFill = DateTime.Now; // SỬA: DateFill thay vì DateFinish
          userFillFormHistory.DateFinish = null; // Không có DateFinish nếu không phải Completed hay Submitted
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
        Name = request.Name ?? $"Submission_{DateTime.Now:yyyyMMdd_HHmmss}", // Chỉ dùng trong response
        Status = userFillForm.Status ?? "",
        FieldValues = request.FieldValues,
        SavedAt = userFillForm.DateTime ?? DateTime.Now,
        HistoryId = userFillFormHistory.Id,
        Message = "Tạo submission mới thành công",
        IsNewRecord = true
      };

      return new HTTPResponseClient<SaveUserFillFormResponse>
      {
        StatusCode = 200,
        Message = "Lưu dữ liệu thành công",
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
  public async Task<HTTPResponseClient<object>> GetUserFillFormIdsByFormIdAsync(Guid formId)
  {
    try
    {
      // Kiểm tra form có tồn tại không
      var form = await _context.Forms.FirstOrDefaultAsync(f => f.Id == formId);
      if (form == null)
      {
        return new HTTPResponseClient<object>
        {
          StatusCode = 404,
          Message = "Không tìm thấy form",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Lấy tất cả UserFillFormId theo FormId
      var userFillFormIds = await _context.UserFillForms
          .Where(uff => uff.FormId == formId)
          .Include(uff => uff.UserFillFormHistories)
          .Select(uff => new
          {
            UserFillFormId = uff.Id,
            UserId = uff.UserId,
            Status = uff.Status,
            CreatedAt = uff.DateTime,
            DateFinish = uff.UserFillFormHistories
                .Where(ufh => ufh.Status.ToLower() == "complete")
                .Select(ufh => ufh.DateFinish)
                .FirstOrDefault(),
          })
          .OrderByDescending(uff => uff.CreatedAt)
          .ToListAsync();

      if (!userFillFormIds.Any())
      {
        return new HTTPResponseClient<object>
        {
          StatusCode = 404,
          Message = "Không tìm thấy UserFillForm nào cho form này",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      var response = new
      {
        FormId = formId,
        FormName = form.Name,
        TotalRecords = userFillFormIds.Count,
        DateFinish = userFillFormIds.Select(uff => uff.DateFinish).FirstOrDefault(),
        UserFillFormIds = userFillFormIds
      };

      return new HTTPResponseClient<object>
      {
        StatusCode = 200,
        Message = $"Tìm thấy {userFillFormIds.Count} UserFillForm cho form này",
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

  public async Task<HTTPResponseClient<object>> GetJsonFieldValueByUserFillFormIdAsync(Guid userFillFormId)
  {
    try
    {
      // Lấy UserFillForm theo ID
      var userFillForm = await _context.UserFillForms
          .Include(uff => uff.Form)
          .Include(uff => uff.User)
          .FirstOrDefaultAsync(uff => uff.Id == userFillFormId);

      if (userFillForm == null)
      {
        return new HTTPResponseClient<object>
        {
          StatusCode = 404,
          Message = "Không tìm thấy UserFillForm với ID này",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Parse JSON field values
      List<FieldValueDto>? fieldValues = null;
      string rawJsonValue = userFillForm.JsonFieldValue ?? "";

      if (!string.IsNullOrEmpty(rawJsonValue))
      {
        try
        {
          fieldValues = System.Text.Json.JsonSerializer.Deserialize<List<FieldValueDto>>(
              rawJsonValue,
              new JsonSerializerOptions
              {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
              });
        }
        catch (JsonException ex)
        {
          return new HTTPResponseClient<object>
          {
            StatusCode = 400,
            Message = $"Lỗi khi parse JSON: {ex.Message}",
            Data = new
            {
              UserFillFormId = userFillFormId,
              RawJsonValue = rawJsonValue,
              Error = ex.Message
            },
            DateTime = DateTime.Now
          };
        }
      }

      var response = new
      {
        UserFillFormId = userFillForm.Id,
        FormId = userFillForm.FormId,
        FormName = userFillForm.Form?.Name,
        UserId = userFillForm.UserId,
        UserName = userFillForm.User?.Name,
        Status = userFillForm.Status,
        CreatedAt = userFillForm.DateTime,
        RawJsonFieldValue = rawJsonValue, // JSON string gốc
        ParsedFieldValues = fieldValues ?? new List<FieldValueDto>(), // JSON đã parse
        FieldCount = fieldValues?.Count ?? 0
      };

      return new HTTPResponseClient<object>
      {
        StatusCode = 200,
        Message = "Lấy json_field_value thành công",
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

  public async Task<HTTPResponseClient<string>> GetRawJsonFieldValueAsync(Guid userFillFormId)
  {
    try
    {
      var jsonFieldValue = await _context.UserFillForms
          .Where(uff => uff.Id == userFillFormId)
          .Select(uff => uff.JsonFieldValue)
          .FirstOrDefaultAsync();

      if (jsonFieldValue == null)
      {
        return new HTTPResponseClient<string>
        {
          StatusCode = 404,
          Message = "Không tìm thấy UserFillForm hoặc không có dữ liệu JSON",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      return new HTTPResponseClient<string>
      {
        StatusCode = 200,
        Message = "Lấy raw JSON thành công",
        Data = jsonFieldValue,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      return new HTTPResponseClient<string>
      {
        StatusCode = 500,
        Message = $"Lỗi khi lấy dữ liệu: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }


  public async Task<HTTPResponseClient<CompleteUserFillFormResponse>> CompleteUserFillFormAsync(Guid userFillFormId, Guid userId)
  {
    try
    {
      // Tìm UserFillForm và verify ownership
      var userFillForm = await _context.UserFillForms
          .Include(uff => uff.Form)
          .Include(uff => uff.User)
          .FirstOrDefaultAsync(uff => uff.Id == userFillFormId && uff.UserId == userId);

      if (userFillForm == null)
      {
        return new HTTPResponseClient<CompleteUserFillFormResponse>
        {
          StatusCode = 404,
          Message = "Không tìm thấy UserFillForm hoặc bạn không có quyền truy cập",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Kiểm tra trạng thái hiện tại
      var currentStatus = userFillForm.Status ?? "Draft";
      if (currentStatus.ToLower() == "complete")
      {
        return new HTTPResponseClient<CompleteUserFillFormResponse>
        {
          StatusCode = 400,
          Message = "Form đã được hoàn thành trước đó",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Update UserFillForm status
      var oldStatus = userFillForm.Status ?? "Draft";
      userFillForm.Status = "Complete";

      _unitOfWork._userFillFormRepository.Update(userFillForm);

      // Tạo UserFillFormHistory mới cho việc Complete
      var completionHistory = new UserFillFormHistory
      {
        Id = Guid.NewGuid(),
        UserFillFormId = userFillFormId,
        DateWrite = DateTime.Now,
        DateFill = DateTime.Now,
        DateFinish = DateTime.Now, // Set DateFinish khi Complete
        Status = "Complete"
      };

      await _unitOfWork._userFillFormHistoryRepository.AddAsync(completionHistory);

      // Lưu changes
      await _unitOfWork.SaveChangesAsync();

      var response = new CompleteUserFillFormResponse
      {
        UserFillFormId = userFillFormId,
        FormId = userFillForm.FormId ?? Guid.Empty,
        FormName = userFillForm.Form?.Name ?? "Unknown",
        UserId = userId,
        UserName = userFillForm.User?.Name ?? "Unknown",
        OldStatus = oldStatus,
        NewStatus = "Complete",
        HistoryId = completionHistory.Id,
        CompletedAt = DateTime.Now,
        IsCompleted = true,
        Message = $"Form '{userFillForm.Form?.Name}' đã được hoàn thành thành công. Bạn không thể chỉnh sửa form này nữa."
      };

      return new HTTPResponseClient<CompleteUserFillFormResponse>
      {
        StatusCode = 200,
        Message = "Hoàn thành form thành công",
        Data = response,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      return new HTTPResponseClient<CompleteUserFillFormResponse>
      {
        StatusCode = 500,
        Message = $"Lỗi khi hoàn thành form: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  public async Task<HTTPResponseClient<UpdateUserFillFormResponse>> UpdateUserFillFormFieldValuesAsync(Guid userFillFormId, Guid userId, UpdateUserFillFormRequest request)
  {
    try
    {
      // Tìm UserFillForm và verify ownership
      var userFillForm = await _context.UserFillForms
          .Include(uff => uff.Form)
          .Include(uff => uff.User)
          .FirstOrDefaultAsync(uff => uff.Id == userFillFormId);

      if (userFillForm == null)
      {
        return new HTTPResponseClient<UpdateUserFillFormResponse>
        {
          StatusCode = 404,
          Message = "Không tìm thấy UserFillForm hoặc bạn không có quyền truy cập",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // **KIỂM TRA TRẠNG THÁI COMPLETE - NGĂN KHÔNG CHO EDIT**
      if (userFillForm.Status?.ToLower() == "complete")
      {
        return new HTTPResponseClient<UpdateUserFillFormResponse>
        {
          StatusCode = 400,
          Message = "Form đã được hoàn thành và không thể chỉnh sửa",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Lưu giá trị cũ để trả về
      List<FieldValueDto> oldFieldValues = new List<FieldValueDto>();
      if (!string.IsNullOrEmpty(userFillForm.JsonFieldValue))
      {
        try
        {
          oldFieldValues = System.Text.Json.JsonSerializer.Deserialize<List<FieldValueDto>>(
              userFillForm.JsonFieldValue,
              new JsonSerializerOptions
              {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
              }) ?? new List<FieldValueDto>();
        }
        catch
        {
          oldFieldValues = new List<FieldValueDto>();
        }
      }

      // Chuyển đổi FieldValues mới thành JSON
      var newJsonFieldValue = System.Text.Json.JsonSerializer.Serialize(request.FieldValues, new JsonSerializerOptions
      {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
      });

      // Cập nhật UserFillForm
      userFillForm.JsonFieldValue = newJsonFieldValue;
      userFillForm.DateTime = DateTime.Now; // Cập nhật thời gian sửa đổi

      _context.UserFillForms.Update(userFillForm);

      // Tạo UserFillFormHistory cho việc update
      var updateHistory = new UserFillFormHistory
      {
        Id = Guid.NewGuid(),
        UserFillFormId = userFillFormId,
        DateWrite = DateTime.Now,
        DateFill = DateTime.Now,
        Status = userFillForm.Status ?? "Draft"
      };

      _context.UserFillFormHistories.Add(updateHistory);

      // Lưu changes
      await _context.SaveChangesAsync();

      var response = new UpdateUserFillFormResponse
      {
        UserFillFormId = userFillFormId,
        FormId = userFillForm.FormId ?? Guid.Empty,
        FormName = userFillForm.Form?.Name ?? "Unknown",
        UserId = userId,
        UserName = userFillForm.User?.Name ?? "Unknown",
        Status = userFillForm.Status ?? "Draft",
        NewFieldValues = request.FieldValues,
        OldFieldValues = oldFieldValues,
        HistoryId = updateHistory.Id,
        UpdatedAt = DateTime.Now,
        IsUpdated = true,
        Message = $"Cập nhật field values cho form '{userFillForm.Form?.Name}' thành công"
      };

      return new HTTPResponseClient<UpdateUserFillFormResponse>
      {
        StatusCode = 200,
        Message = "Cập nhật field values thành công",
        Data = response,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      return new HTTPResponseClient<UpdateUserFillFormResponse>
      {
        StatusCode = 500,
        Message = $"Lỗi khi cập nhật field values: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }
}