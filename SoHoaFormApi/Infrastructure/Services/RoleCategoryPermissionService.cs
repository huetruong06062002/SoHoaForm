using SoHoaFormApi.Models.DbSoHoaForm;
using SoHoaFormApi.Models.DTO;
using SoHoaFormApi.Models.Helper;
using SoHoaFormApi.Models.ViewModel.Request;
using SoHoaFormApi.Models.ViewModel.Response;


namespace SoHoaFormApi.Infrastructure.Services
{
  public interface IRoleCategoryPermissionService
  {
    Task<HTTPResponseClient<List<RoleCategoryPermissionDto>>> GetAllRoleCategoryPermissionsAsync();
    Task<HTTPResponseClient<List<RoleCategoryPermissionDto>>> GetRoleCategoryPermissionsByRoleAsync(Guid roleId);
    Task<HTTPResponseClient<List<RoleCategoryPermissionDto>>> GetRoleCategoryPermissionsByCategoryAsync(Guid categoryId);
    Task<HTTPResponseClient<RoleCategoryPermissionDto>> GetRoleCategoryPermissionAsync(Guid roleId, Guid categoryId);
    Task<HTTPResponseClient<AssignCategoryPermissionResponse>> AssignCategoryPermissionToRoleAsync(AssignCategoryPermissionRequest request);
    Task<HTTPResponseClient<UpdateCategoryPermissionResponse>> UpdateCategoryPermissionAsync(Guid roleCategoryPermissionId, UpdateCategoryPermissionRequest request);
    Task<HTTPResponseClient<RemoveCategoryPermissionResponse>> RemoveCategoryPermissionFromRoleAsync(Guid roleId, Guid categoryId);
    Task<HTTPResponseClient<List<RoleCategoryPermissionDto>>> GetUserCategoryPermissionsAsync(Guid userId);
  }

  public class RoleCategoryPermissionService : IRoleCategoryPermissionService
  {
    private readonly IUnitOfWork _unitOfWork;

    public RoleCategoryPermissionService(IUnitOfWork unitOfWork)
    {
      _unitOfWork = unitOfWork;
    }

    public async Task<HTTPResponseClient<List<RoleCategoryPermissionDto>>> GetAllRoleCategoryPermissionsAsync()
    {
      try
      {
        var roleCategoryPermissions = await _unitOfWork._roleCategoryPermissionRepository.GetAllWithRelatedDataAsync();

        var dtos = roleCategoryPermissions.Select(rcp => new RoleCategoryPermissionDto
        {
          Id = rcp.Id,
          RoleId = rcp.RoleId ?? Guid.Empty,
          RoleName = rcp.Role?.RoleName ?? "",
          FormCategoryId = rcp.FormCategoryId ?? Guid.Empty,
          CategoryName = rcp.FormCategory?.CategoryName ?? "",
          ParentCategoryId = rcp.FormCategory?.ParentCategoryId ?? Guid.Empty,
          ParentCategoryName = rcp.FormCategory?.ParentCategory?.CategoryName,
          CanAccess = rcp.CanAcess ?? false,
          CategoryLevel = HelperClass.GetCategoryLevel(rcp.FormCategory)
        }).ToList();

        return new HTTPResponseClient<List<RoleCategoryPermissionDto>>
        {
          StatusCode = 200,
          Message = "Lấy danh sách role category permissions thành công",
          Data = dtos,
          DateTime = DateTime.Now
        };
      }
      catch (Exception ex)
      {
        return new HTTPResponseClient<List<RoleCategoryPermissionDto>>
        {
          StatusCode = 500,
          Message = $"Lỗi khi lấy danh sách role category permissions: {ex.Message}",
          Data = null,
          DateTime = DateTime.Now
        };
      }
    }

    public async Task<HTTPResponseClient<List<RoleCategoryPermissionDto>>> GetRoleCategoryPermissionsByRoleAsync(Guid roleId)
    {
      try
      {
        var roleCategoryPermissions = await _unitOfWork._roleCategoryPermissionRepository.GetByRoleIdAsync(roleId);

        var dtos = roleCategoryPermissions.Select(rcp => new RoleCategoryPermissionDto
        {
          Id = rcp.Id,
          RoleId = rcp.RoleId ?? Guid.Empty,
          RoleName = rcp.Role?.RoleName ?? "",
          FormCategoryId = rcp.FormCategoryId ?? Guid.Empty,
          CategoryName = rcp.FormCategory?.CategoryName ?? "",
          ParentCategoryId = rcp.FormCategory?.ParentCategoryId ?? Guid.Empty,
          ParentCategoryName = rcp.FormCategory?.ParentCategory?.CategoryName,
          CanAccess = rcp.CanAcess ?? false,
          CategoryLevel = HelperClass.GetCategoryLevel(rcp.FormCategory)
        }).ToList();

        return new HTTPResponseClient<List<RoleCategoryPermissionDto>>
        {
          StatusCode = 200,
          Message = $"Lấy danh sách category permissions của role thành công ({dtos.Count} items)",
          Data = dtos,
          DateTime = DateTime.Now
        };
      }
      catch (Exception ex)
      {
        return new HTTPResponseClient<List<RoleCategoryPermissionDto>>
        {
          StatusCode = 500,
          Message = $"Lỗi khi lấy category permissions của role: {ex.Message}",
          Data = null,
          DateTime = DateTime.Now
        };
      }
    }

    public async Task<HTTPResponseClient<List<RoleCategoryPermissionDto>>> GetRoleCategoryPermissionsByCategoryAsync(Guid categoryId)
    {
      try
      {
        var roleCategoryPermissions = await _unitOfWork._roleCategoryPermissionRepository.GetByCategoryIdAsync(categoryId);

        var dtos = roleCategoryPermissions.Select(rcp => new RoleCategoryPermissionDto
        {
          Id = rcp.Id,
          RoleId = rcp.RoleId ?? Guid.Empty,
          RoleName = rcp.Role?.RoleName ?? "",
          FormCategoryId = rcp.FormCategoryId ?? Guid.Empty,
          CategoryName = rcp.FormCategory?.CategoryName ?? "",
          ParentCategoryId = rcp.FormCategory?.ParentCategoryId ?? Guid.Empty,
          ParentCategoryName = rcp.FormCategory?.ParentCategory?.CategoryName,
          CanAccess = rcp.CanAcess ?? false,
          CategoryLevel = HelperClass.GetCategoryLevel(rcp.FormCategory)
        }).ToList();

        return new HTTPResponseClient<List<RoleCategoryPermissionDto>>
        {
          StatusCode = 200,
          Message = $"Lấy danh sách role permissions của category thành công ({dtos.Count} items)",
          Data = dtos,
          DateTime = DateTime.Now
        };
      }
      catch (Exception ex)
      {
        return new HTTPResponseClient<List<RoleCategoryPermissionDto>>
        {
          StatusCode = 500,
          Message = $"Lỗi khi lấy role permissions của category: {ex.Message}",
          Data = null,
          DateTime = DateTime.Now
        };
      }
    }

    public async Task<HTTPResponseClient<RoleCategoryPermissionDto>> GetRoleCategoryPermissionAsync(Guid roleId, Guid categoryId)
    {
      try
      {
        var roleCategoryPermission = await _unitOfWork._roleCategoryPermissionRepository.GetByRoleAndCategoryAsync(roleId, categoryId);

        if (roleCategoryPermission == null)
        {
          return new HTTPResponseClient<RoleCategoryPermissionDto>
          {
            StatusCode = 404,
            Message = "Không tìm thấy role category permission",
            Data = null,
            DateTime = DateTime.Now
          };
        }

        var dto = new RoleCategoryPermissionDto
        {
          Id = roleCategoryPermission.Id,
          RoleId = roleCategoryPermission.RoleId ?? Guid.Empty,
          RoleName = roleCategoryPermission.Role?.RoleName ?? "",
          FormCategoryId = roleCategoryPermission.FormCategoryId ?? Guid.Empty,
          CategoryName = roleCategoryPermission.FormCategory?.CategoryName ?? "",
          ParentCategoryId = roleCategoryPermission.FormCategory?.ParentCategoryId ?? Guid.Empty,
          ParentCategoryName = roleCategoryPermission.FormCategory?.ParentCategory?.CategoryName,
          CanAccess = roleCategoryPermission.CanAcess ?? false,
          CategoryLevel = HelperClass.GetCategoryLevel(roleCategoryPermission.FormCategory)
        };

        return new HTTPResponseClient<RoleCategoryPermissionDto>
        {
          StatusCode = 200,
          Message = "Lấy thông tin role category permission thành công",
          Data = dto,
          DateTime = DateTime.Now
        };
      }
      catch (Exception ex)
      {
        return new HTTPResponseClient<RoleCategoryPermissionDto>
        {
          StatusCode = 500,
          Message = $"Lỗi khi lấy thông tin role category permission: {ex.Message}",
          Data = null,
          DateTime = DateTime.Now
        };
      }
    }

    public async Task<HTTPResponseClient<AssignCategoryPermissionResponse>> AssignCategoryPermissionToRoleAsync(AssignCategoryPermissionRequest request)
    {
      try
      {
        await _unitOfWork.BeginTransaction();

        // Kiểm tra role tồn tại
        var role = await _unitOfWork._roleRepository.GetByIdAsync(request.RoleId);
        if (role == null)
        {
          await _unitOfWork.RollBack();
          return new HTTPResponseClient<AssignCategoryPermissionResponse>
          {
            StatusCode = 404,
            Message = "Không tìm thấy role",
            Data = null,
            DateTime = DateTime.Now
          };
        }

        // Kiểm tra category tồn tại
        var category = await _unitOfWork._formCategoryRepository.GetByIdAsync(request.FormCategoryId);
        if (category == null)
        {
          await _unitOfWork.RollBack();
          return new HTTPResponseClient<AssignCategoryPermissionResponse>
          {
            StatusCode = 404,
            Message = "Không tìm thấy form category",
            Data = null,
            DateTime = DateTime.Now
          };
        }

        // Kiểm tra đã assign chưa
        var existingPermission = await _unitOfWork._roleCategoryPermissionRepository.ExistsAsync(request.RoleId, request.FormCategoryId);
        if (existingPermission)
        {
          await _unitOfWork.RollBack();
          return new HTTPResponseClient<AssignCategoryPermissionResponse>
          {
            StatusCode = 400,
            Message = $"Role '{role.RoleName}' đã có permission cho category '{category.CategoryName}'",
            Data = null,
            DateTime = DateTime.Now
          };
        }

        // Tạo RoleCategoryPermission mới
        var roleCategoryPermission = new RoleCategoryPermission
        {
          Id = Guid.NewGuid(),
          RoleId = request.RoleId,
          FormCategoryId = request.FormCategoryId,
          CanAcess = request.CanAccess
        };

        await _unitOfWork._roleCategoryPermissionRepository.AddAsync(roleCategoryPermission);
        await _unitOfWork.SaveChangesAsync();
        await _unitOfWork.CommitTransaction();

        var response = new AssignCategoryPermissionResponse
        {
          RoleCategoryPermissionId = roleCategoryPermission.Id,
          RoleId = request.RoleId,
          RoleName = role.RoleName,
          FormCategoryId = request.FormCategoryId,
          CategoryName = category.CategoryName,
          CanAccess = request.CanAccess,
          IsAssigned = true,
          Message = $"Assign category permission '{category.CategoryName}' cho role '{role.RoleName}' thành công",
          AssignedAt = DateTime.Now
        };

        return new HTTPResponseClient<AssignCategoryPermissionResponse>
        {
          StatusCode = 200,
          Message = "Assign category permission cho role thành công",
          Data = response,
          DateTime = DateTime.Now
        };
      }
      catch (Exception ex)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<AssignCategoryPermissionResponse>
        {
          StatusCode = 500,
          Message = $"Lỗi khi assign category permission cho role: {ex.Message}",
          Data = null,
          DateTime = DateTime.Now
        };
      }
    }

    public async Task<HTTPResponseClient<UpdateCategoryPermissionResponse>> UpdateCategoryPermissionAsync(Guid roleCategoryPermissionId, UpdateCategoryPermissionRequest request)
    {
      try
      {
        await _unitOfWork.BeginTransaction();

        var roleCategoryPermission = await _unitOfWork._roleCategoryPermissionRepository.GetByIdWithRelatedDataAsync(roleCategoryPermissionId);

        if (roleCategoryPermission == null)
        {
          await _unitOfWork.RollBack();
          return new HTTPResponseClient<UpdateCategoryPermissionResponse>
          {
            StatusCode = 404,
            Message = "Không tìm thấy role category permission",
            Data = null,
            DateTime = DateTime.Now
          };
        }

        var oldCanAccess = roleCategoryPermission.CanAcess ?? false;
        roleCategoryPermission.CanAcess = request.CanAccess;

        _unitOfWork._roleCategoryPermissionRepository.Update(roleCategoryPermission);
        await _unitOfWork.SaveChangesAsync();
        await _unitOfWork.CommitTransaction();

        var response = new UpdateCategoryPermissionResponse
        {
          RoleCategoryPermissionId = roleCategoryPermissionId,
          RoleId = roleCategoryPermission.RoleId ?? Guid.Empty,
          RoleName = roleCategoryPermission.Role?.RoleName ?? "",
          FormCategoryId = roleCategoryPermission.FormCategoryId ?? Guid.Empty,
          CategoryName = roleCategoryPermission.FormCategory?.CategoryName ?? "",
          OldCanAccess = oldCanAccess,
          NewCanAccess = request.CanAccess,
          IsUpdated = true,
          Message = $"Cập nhật category permission từ '{oldCanAccess}' thành '{request.CanAccess}' thành công",
          UpdatedAt = DateTime.Now
        };

        return new HTTPResponseClient<UpdateCategoryPermissionResponse>
        {
          StatusCode = 200,
          Message = "Cập nhật category permission thành công",
          Data = response,
          DateTime = DateTime.Now
        };
      }
      catch (Exception ex)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<UpdateCategoryPermissionResponse>
        {
          StatusCode = 500,
          Message = $"Lỗi khi cập nhật category permission: {ex.Message}",
          Data = null,
          DateTime = DateTime.Now
        };
      }
    }

    public async Task<HTTPResponseClient<RemoveCategoryPermissionResponse>> RemoveCategoryPermissionFromRoleAsync(Guid roleId, Guid categoryId)
    {
      try
      {
        await _unitOfWork.BeginTransaction();

        var roleCategoryPermission = await _unitOfWork._roleCategoryPermissionRepository.GetByRoleAndCategoryAsync(roleId, categoryId);

        if (roleCategoryPermission == null)
        {
          await _unitOfWork.RollBack();
          return new HTTPResponseClient<RemoveCategoryPermissionResponse>
          {
            StatusCode = 404,
            Message = "Không tìm thấy role category permission để xóa",
            Data = null,
            DateTime = DateTime.Now
          };
        }

        _unitOfWork._roleCategoryPermissionRepository.DeleteAsync(roleCategoryPermission.Id);
        await _unitOfWork.SaveChangesAsync();
        await _unitOfWork.CommitTransaction();

        var response = new RemoveCategoryPermissionResponse
        {
          RoleId = roleId,
          RoleName = roleCategoryPermission.Role?.RoleName ?? "",
          FormCategoryId = categoryId,
          CategoryName = roleCategoryPermission.FormCategory?.CategoryName ?? "",
          IsRemoved = true,
          Message = $"Xóa category permission '{roleCategoryPermission.FormCategory?.CategoryName}' khỏi role '{roleCategoryPermission.Role?.RoleName}' thành công",
          RemovedAt = DateTime.Now
        };

        return new HTTPResponseClient<RemoveCategoryPermissionResponse>
        {
          StatusCode = 200,
          Message = "Xóa category permission khỏi role thành công",
          Data = response,
          DateTime = DateTime.Now
        };
      }
      catch (Exception ex)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<RemoveCategoryPermissionResponse>
        {
          StatusCode = 500,
          Message = $"Lỗi khi xóa category permission khỏi role: {ex.Message}",
          Data = null,
          DateTime = DateTime.Now
        };
      }
    }

    public async Task<HTTPResponseClient<List<RoleCategoryPermissionDto>>> GetUserCategoryPermissionsAsync(Guid userId)
    {
      try
      {
        var categoryPermissions = await _unitOfWork._roleCategoryPermissionRepository.GetUserCategoryPermissionsAsync(userId);

        if (!categoryPermissions.Any())
        {
          return new HTTPResponseClient<List<RoleCategoryPermissionDto>>
          {
            StatusCode = 404,
            Message = "Không tìm thấy user hoặc user không có category permissions",
            Data = new List<RoleCategoryPermissionDto>(),
            DateTime = DateTime.Now
          };
        }

        var dtos = categoryPermissions.Select(rcp => new RoleCategoryPermissionDto
        {
          Id = rcp.Id,
          RoleId = rcp.RoleId ?? Guid.Empty,
          RoleName = rcp.Role?.RoleName ?? "",
          FormCategoryId = rcp.FormCategoryId ?? Guid.Empty,
          CategoryName = rcp.FormCategory?.CategoryName ?? "",
          ParentCategoryId = rcp.FormCategory?.ParentCategoryId ?? Guid.Empty,
          ParentCategoryName = rcp.FormCategory?.ParentCategory?.CategoryName,
          CanAccess = rcp.CanAcess ?? false,
          CategoryLevel = rcp.FormCategory != null ? HelperClass.GetCategoryLevel(rcp.FormCategory) : 0
        }).ToList();

        return new HTTPResponseClient<List<RoleCategoryPermissionDto>>
        {
          StatusCode = 200,
          Message = $"Lấy danh sách category permissions của user thành công ({dtos.Count} items)",
          Data = dtos,
          DateTime = DateTime.Now
        };
      }
      catch (Exception ex)
      {
        return new HTTPResponseClient<List<RoleCategoryPermissionDto>>
        {
          StatusCode = 500,
          Message = $"Lỗi khi lấy category permissions của user: {ex.Message}",
          Data = null,
          DateTime = DateTime.Now
        };
      }
    }
  }
}