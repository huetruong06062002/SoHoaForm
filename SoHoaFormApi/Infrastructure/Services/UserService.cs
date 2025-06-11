using Microsoft.EntityFrameworkCore;
using SoHoaFormApi.Models.DbSoHoaForm;
using SoHoaFormApi.Models.ViewModel.Response;

public interface IUserService
{
  Task<HTTPResponseClient<List<FormCategoryResponse>>> GetAllFormsCategoryAsync();
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
}