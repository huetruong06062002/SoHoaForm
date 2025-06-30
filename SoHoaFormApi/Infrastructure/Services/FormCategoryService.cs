using Microsoft.EntityFrameworkCore;
using SoHoaFormApi.Models.DbSoHoaForm;
using SoHoaFormApi.Models.DTO;
using SoHoaFormApi.Models.Helper;
using SoHoaFormApi.Models.ViewModel.Request;
using SoHoaFormApi.Models.ViewModel.Response;

public interface IFormCategoryService
{
  Task<HTTPResponseClient<List<FormCategoryDto>>> GetAllCategoriesAsync();
  Task<HTTPResponseClient<List<FormCategoryTreeDto>>> GetCategoryTreeAsync();
  Task<HTTPResponseClient<FormCategoryDto>> GetCategoryByIdAsync(Guid categoryId);
  Task<HTTPResponseClient<CreateCategoryResponse>> CreateCategoryAsync(CreateCategoryRequest request);
  Task<HTTPResponseClient<UpdateCategoryResponse>> UpdateCategoryAsync(Guid categoryId, UpdateCategoryRequest request);
  Task<HTTPResponseClient<DeleteCategoryResponse>> DeleteCategoryAsync(Guid categoryId);
  Task<HTTPResponseClient<List<FormCategoryDto>>> GetChildCategoriesAsync(Guid parentId);
  Task<HTTPResponseClient<List<FormCategoryDto>>> GetRootCategoriesAsync();
}

public class FormCategoryService : IFormCategoryService
{
  private readonly IUnitOfWork _unitOfWork;
  private readonly SoHoaFormContext _context;

  public FormCategoryService(IUnitOfWork unitOfWork, SoHoaFormContext context)
  {
    _unitOfWork = unitOfWork;
    _context = context;
  }

  public async Task<HTTPResponseClient<CreateCategoryResponse>> CreateCategoryAsync(CreateCategoryRequest request)
  {
    try
    {
      await _unitOfWork.BeginTransaction();

      // Kiểm tra tên category đã tồn tại chưa (trong cùng parent)
      var existingCategory = await _unitOfWork._formCategoryRepository
          .GetCategorieByNameAsync(request.CategoryName, request.ParentCategoryId ?? Guid.Empty);

      if (existingCategory != null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<CreateCategoryResponse>
        {
          StatusCode = 400,
          Message = "Tên category đã tồn tại trong cùng cấp cha",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Kiểm tra parent category tồn tại (nếu có)
      FormCategory? parentCategory = null;
      if (request.ParentCategoryId.HasValue)
      {
        parentCategory = await _unitOfWork._formCategoryRepository
            .GetByIdAsync(request.ParentCategoryId.Value);
        if (parentCategory == null)
        {
          await _unitOfWork.RollBack();
          return new HTTPResponseClient<CreateCategoryResponse>
          {
            StatusCode = 404,
            Message = "Không tìm thấy parent category",
            Data = null,
            DateTime = DateTime.Now
          };
        }

        // Kiểm tra độ sâu tối đa (ví dụ: 5 cấp)
        var level = HelperClass.GetCategoryLevel(parentCategory) + 1;
        if (level > 5)
        {
          await _unitOfWork.RollBack();
          return new HTTPResponseClient<CreateCategoryResponse>
          {
            StatusCode = 400,
            Message = "Đã đạt độ sâu tối đa của cây phân cấp (5 cấp)",
            Data = null,
            DateTime = DateTime.Now
          };
        }
      }

      var newCategory = new FormCategory
      {
        Id = Guid.NewGuid(),
        CategoryName = request.CategoryName,
        ParentCategoryId = request.ParentCategoryId
      };

      await _unitOfWork._formCategoryRepository.AddAsync(newCategory);
      await _unitOfWork.SaveChangesAsync();
      await _unitOfWork.CommitTransaction();

      var response = new CreateCategoryResponse
      {
        CategoryId = newCategory.Id,
        CategoryName = newCategory.CategoryName,
        ParentCategoryId = newCategory.ParentCategoryId,
        ParentCategoryName = parentCategory?.CategoryName,
        Level = parentCategory != null ? HelperClass.GetCategoryLevel(parentCategory) + 1 : 0,
        IsCreated = true,
        Message = $"Tạo category '{newCategory.CategoryName}' thành công",
        CreatedAt = DateTime.Now
      };

      return new HTTPResponseClient<CreateCategoryResponse>
      {
        StatusCode = 200,
        Message = "Tạo category thành công",
        Data = response,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      await _unitOfWork.RollBack();
      return new HTTPResponseClient<CreateCategoryResponse>
      {
        StatusCode = 500,
        Message = $"Lỗi khi tạo category: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  public async Task<HTTPResponseClient<DeleteCategoryResponse>> DeleteCategoryAsync(Guid categoryId)
  {
    try
    {
      await _unitOfWork.BeginTransaction();

      var category = await _unitOfWork._formCategoryRepository
          .GetCategoryWithRolePermission(categoryId);

      if (category == null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<DeleteCategoryResponse>
        {
          StatusCode = 404,
          Message = "Không tìm thấy category",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Kiểm tra có children categories không
      if (category.InverseParentCategory.Any())
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<DeleteCategoryResponse>
        {
          StatusCode = 400,
          Message = $"Không thể xóa category '{category.CategoryName}' vì có {category.InverseParentCategory.Count} category con",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Kiểm tra có forms không
      if (category.Forms.Any())
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<DeleteCategoryResponse>
        {
          StatusCode = 400,
          Message = $"Không thể xóa category '{category.CategoryName}' vì có {category.Forms.Count} form đang sử dụng",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Xóa role category permissions liên quan
      if (category.RoleCategoryPermissions.Any())
      {
        _context.RoleCategoryPermissions.RemoveRange(category.RoleCategoryPermissions);
      }

      // Xóa category
      await _unitOfWork._formCategoryRepository.DeleteAsync(category.Id);
      await _unitOfWork.SaveChangesAsync();
      await _unitOfWork.CommitTransaction();

      var response = new DeleteCategoryResponse
      {
        DeletedCategoryId = categoryId,
        CategoryName = category.CategoryName,
        RolePermissionsDeleted = category.RoleCategoryPermissions.Count,
        IsDeleted = true,
        Message = $"Xóa category '{category.CategoryName}' thành công",
        DeletedAt = DateTime.Now
      };

      return new HTTPResponseClient<DeleteCategoryResponse>
      {
        StatusCode = 200,
        Message = "Xóa category thành công",
        Data = response,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      await _unitOfWork.RollBack();
      return new HTTPResponseClient<DeleteCategoryResponse>
      {
        StatusCode = 500,
        Message = $"Lỗi khi xóa category: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  public async Task<HTTPResponseClient<List<FormCategoryDto>>> GetAllCategoriesAsync()
  {
    try
    {
      var categories = await _unitOfWork._formCategoryRepository.GetAllCategoriesAsync();

      // Tạo dictionary để lookup nhanh
      var categoryDict = categories.ToDictionary(c => c.Id, c => c);

      // Hàm đệ quy để build children
      List<FormCategoryDto> BuildChildren(Guid parentId)
      {
        return categories
            .Where(c => c.ParentCategoryId == parentId)
            .Select(child => new FormCategoryDto
            {
              Id = child.Id,
              CategoryName = child.CategoryName,
              ParentCategoryId = child.ParentCategoryId,
              ParentCategoryName = child.ParentCategory?.CategoryName,
              ChildrenCount = child.InverseParentCategory.Count,
              FormsCount = child.Forms.Count,
              RolePermissionsCount = child.RoleCategoryPermissions.Count,
              Level = HelperClass.GetCategoryLevel(child),
              Path = HelperClass.GetCategoryPath(child),
              HasChildren = child.InverseParentCategory.Any(),
              IsRoot = false,
              Children = BuildChildren(child.Id) // Đệ quy build children
            })
            .ToList();
      }

      // Chỉ lấy root categories (ParentCategoryId == null)
      var rootCategories = categories
          .Where(c => c.ParentCategoryId == null)
          .Select(category => new FormCategoryDto
          {
            Id = category.Id,
            CategoryName = category.CategoryName,
            ParentCategoryId = null,
            ParentCategoryName = null,
            ChildrenCount = category.InverseParentCategory.Count,
            FormsCount = category.Forms.Count,
            RolePermissionsCount = category.RoleCategoryPermissions.Count,
            Level = 0,
            Path = category.CategoryName,
            HasChildren = category.InverseParentCategory.Any(),
            IsRoot = true,
            Children = BuildChildren(category.Id) // Build tất cả children recursively
          })
          .ToList();

      return new HTTPResponseClient<List<FormCategoryDto>>
      {
        StatusCode = 200,
        Message = "Lấy danh sách categories thành công",
        Data = rootCategories,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      return new HTTPResponseClient<List<FormCategoryDto>>
      {
        StatusCode = 500,
        Message = $"Lỗi khi lấy danh sách categories: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  public async Task<HTTPResponseClient<FormCategoryDto>> GetCategoryByIdAsync(Guid categoryId)
  {
     try
            {
                var category = await _unitOfWork._formCategoryRepository
                    .GetCategoryWithDetailsAsync(categoryId);

                if (category == null)
                {
                    return new HTTPResponseClient<FormCategoryDto>
                    {
                        StatusCode = 404,
                        Message = "Không tìm thấy category",
                        Data = null,
                        DateTime = DateTime.Now
                    };
                }

                var categoryDto = new FormCategoryDto
                {
                    Id = category.Id,
                    CategoryName = category.CategoryName,
                    ParentCategoryId = category.ParentCategoryId,
                    ParentCategoryName = category.ParentCategory?.CategoryName,
                    ChildrenCount = category.InverseParentCategory.Count,
                    FormsCount = category.Forms.Count,
                    RolePermissionsCount = category.RoleCategoryPermissions.Count,
                    Level = HelperClass.GetCategoryLevel(category),
                    Path = HelperClass.GetCategoryPath(category),
                    HasChildren = category.InverseParentCategory.Any(),
                    IsRoot = category.ParentCategoryId == null,
                    Children = category.InverseParentCategory.Select(child => new FormCategoryDto
                    {
                        Id = child.Id,
                        CategoryName = child.CategoryName,
                        ParentCategoryId = child.ParentCategoryId,
                        ChildrenCount = child.InverseParentCategory.Count,
                        FormsCount = child.Forms.Count
                    }).ToList()
                };

                return new HTTPResponseClient<FormCategoryDto>
                {
                    StatusCode = 200,
                    Message = "Lấy thông tin category thành công",
                    Data = categoryDto,
                    DateTime = DateTime.Now
                };
            }
            catch (Exception ex)
            {
                return new HTTPResponseClient<FormCategoryDto>
                {
                    StatusCode = 500,
                    Message = $"Lỗi khi lấy thông tin category: {ex.Message}",
                    Data = null,
                    DateTime = DateTime.Now
                };
            }
  }

  public async Task<HTTPResponseClient<List<FormCategoryTreeDto>>> GetCategoryTreeAsync()
  {
    try
    {
      var categories = await _unitOfWork._formCategoryRepository.GetAllCategoriesAsync();

      // Lấy root categories (không có parent)
      var rootCategories = categories.Where(c => c.ParentCategoryId == null).ToList();

      var treeNodes = rootCategories.Select(category => HelperClass.BuildCategoryTree(category, categories)).ToList();

      return new HTTPResponseClient<List<FormCategoryTreeDto>>
      {
        StatusCode = 200,
        Message = "Lấy cây phân cấp categories thành công",
        Data = treeNodes,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      return new HTTPResponseClient<List<FormCategoryTreeDto>>
      {
        StatusCode = 500,
        Message = $"Lỗi khi lấy cây phân cấp categories: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  public async Task<HTTPResponseClient<List<FormCategoryDto>>> GetChildCategoriesAsync(Guid parentId)
  {
    try
    {
      var children = await _unitOfWork._formCategoryRepository.GetChildCategoriesByParentIdAsync(parentId);

      var childrenDtos = children.Select(child => new FormCategoryDto
      {
        Id = child.Id,
        CategoryName = child.CategoryName,
        ParentCategoryId = child.ParentCategoryId,
        ChildrenCount = child.InverseParentCategory.Count,
        FormsCount = child.Forms.Count,
        HasChildren = child.InverseParentCategory.Any(),
        IsRoot = false
      }).ToList();

      return new HTTPResponseClient<List<FormCategoryDto>>
      {
        StatusCode = 200,
        Message = $"Lấy danh sách category con thành công ({children.Count} items)",
        Data = childrenDtos,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      return new HTTPResponseClient<List<FormCategoryDto>>
      {
        StatusCode = 500,
        Message = $"Lỗi khi lấy danh sách category con: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  public async Task<HTTPResponseClient<List<FormCategoryDto>>> GetRootCategoriesAsync()
  {
    try
    {
      var rootCategories = await _unitOfWork._formCategoryRepository.GetRootCategoryAsync();

      var rootDtos = rootCategories.Select(root => new FormCategoryDto
      {
        Id = root.Id,
        CategoryName = root.CategoryName,
        ParentCategoryId = null,
        ChildrenCount = root.InverseParentCategory.Count,
        FormsCount = root.Forms.Count,
        HasChildren = root.InverseParentCategory.Any(),
        IsRoot = true,
        Level = 0
      }).ToList();

      return new HTTPResponseClient<List<FormCategoryDto>>
      {
        StatusCode = 200,
        Message = $"Lấy danh sách root categories thành công ({rootCategories.Count} items)",
        Data = rootDtos,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      return new HTTPResponseClient<List<FormCategoryDto>>
      {
        StatusCode = 500,
        Message = $"Lỗi khi lấy danh sách root categories: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  public async Task<HTTPResponseClient<UpdateCategoryResponse>> UpdateCategoryAsync(Guid categoryId, UpdateCategoryRequest request)
  {
    try
    {
      await _unitOfWork.BeginTransaction();

      var category = await _context.FormCategories
          .Include(c => c.ParentCategory)
          .Include(c => c.InverseParentCategory)
          .FirstOrDefaultAsync(c => c.Id == categoryId);

      if (category == null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<UpdateCategoryResponse>
        {
          StatusCode = 404,
          Message = "Không tìm thấy category",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Kiểm tra tên mới có trùng với category khác không (trong cùng parent)
      var existingCategory = await _unitOfWork._formCategoryRepository
          .GetCategorieByNameAsync(request.CategoryName, request.ParentCategoryId ?? Guid.Empty);

      if (existingCategory != null && existingCategory.Id != categoryId)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<UpdateCategoryResponse>
        {
          StatusCode = 400,
          Message = "Tên category đã tồn tại trong cùng cấp cha",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Kiểm tra parent category mới (nếu có)
      FormCategory? newParentCategory = null;
      if (request.ParentCategoryId.HasValue)
      {
        // Không thể set parent là chính nó hoặc con của nó
        if (request.ParentCategoryId.Value == categoryId)
        {
          await _unitOfWork.RollBack();
          return new HTTPResponseClient<UpdateCategoryResponse>
          {
            StatusCode = 400,
            Message = "Không thể set parent category là chính nó",
            Data = null,
            DateTime = DateTime.Now
          };
        }

        // Kiểm tra có phải là con của category hiện tại không
        var isDescendant = await IsDescendantOf(request.ParentCategoryId.Value, categoryId);
        if (isDescendant)
        {
          await _unitOfWork.RollBack();
          return new HTTPResponseClient<UpdateCategoryResponse>
          {
            StatusCode = 400,
            Message = "Không thể set parent category là con của category hiện tại",
            Data = null,
            DateTime = DateTime.Now
          };
        }

        newParentCategory = await _unitOfWork._formCategoryRepository
            .GetByIdAsync(request.ParentCategoryId.Value);

        if (newParentCategory == null)
        {
          await _unitOfWork.RollBack();
          return new HTTPResponseClient<UpdateCategoryResponse>
          {
            StatusCode = 404,
            Message = "Không tìm thấy parent category mới",
            Data = null,
            DateTime = DateTime.Now
          };
        }
      }

      var oldCategoryName = category.CategoryName;
      var oldParentId = category.ParentCategoryId;

      category.CategoryName = request.CategoryName;
      category.ParentCategoryId = request.ParentCategoryId;

      _unitOfWork._formCategoryRepository.Update(category);
      await _unitOfWork.SaveChangesAsync();
      await _unitOfWork.CommitTransaction();

      var response = new UpdateCategoryResponse
      {
        CategoryId = categoryId,
        OldCategoryName = oldCategoryName,
        NewCategoryName = category.CategoryName,
        OldParentCategoryId = oldParentId,
        NewParentCategoryId = category.ParentCategoryId,
        NewParentCategoryName = newParentCategory?.CategoryName,
        IsUpdated = true,
        Message = $"Cập nhật category từ '{oldCategoryName}' thành '{category.CategoryName}' thành công",
        UpdatedAt = DateTime.Now
      };

      return new HTTPResponseClient<UpdateCategoryResponse>
      {
        StatusCode = 200,
        Message = "Cập nhật category thành công",
        Data = response,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      await _unitOfWork.RollBack();
      return new HTTPResponseClient<UpdateCategoryResponse>
      {
        StatusCode = 500,
        Message = $"Lỗi khi cập nhật category: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }
  private async Task<bool> IsDescendantOf(Guid potentialAncestorId, Guid categoryId)
  {
    var category = await _unitOfWork._formCategoryRepository.GetParentCategoryByIdAsync(categoryId);

    while (category?.ParentCategory != null)
    {
      if (category.ParentCategory.Id == categoryId)
        return true;
      category = category.ParentCategory;
    }

    return false;
  }
}