using Microsoft.EntityFrameworkCore;
using SoHoaFormApi.Models.DbSoHoaForm;
using SoHoaFormApi.Models.DTO;
using SoHoaFormApi.Models.ViewModel.Response;

public interface IUserService
{
  Task<HTTPResponseClient<List<FormCategoryResponse>>> GetAllFormsCategoryAsync();
  Task<HTTPResponseClient<FormInformationResponse>> GetFormInformationAsync(Guid formId);
  Task<HTTPResponseClient<FormsByCategoryResponse>> GetAllFormsOrderByCategoryAsync();
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

}