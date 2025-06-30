using SoHoaFormApi.Models.DbSoHoaForm;
using SoHoaFormApi.Models.DTO;
using SoHoaFormApi.Models.ViewModel.Request;
using SoHoaFormApi.Models.ViewModel.Response;

public interface IPermissionService
{
  Task<HTTPResponseClient<List<PermissionDto>>> GetAllPermissionsAsync();
  Task<HTTPResponseClient<PermissionDto>> GetPermissionByIdAsync(Guid permissionId);
  Task<HTTPResponseClient<CreatePermissionResponse>> CreatePermissionAsync(CreatePermissionRequest request);
  Task<HTTPResponseClient<UpdatePermissionResponse>> UpdatePermissionAsync(Guid permissionId, UpdatePermissionRequest request);
  Task<HTTPResponseClient<DeletePermissionResponse>> DeletePermissionAsync(Guid permissionId);
}

public class PermissionService : IPermissionService
{

  private readonly IUnitOfWork _unitOfWork;
  private readonly SoHoaFormContext _context;

  public PermissionService(IUnitOfWork unitOfWork, SoHoaFormContext context)
  {
    _unitOfWork = unitOfWork;
    _context = context;
  }

  public async Task<HTTPResponseClient<CreatePermissionResponse>> CreatePermissionAsync(CreatePermissionRequest request)
  {
    try
    {
      await _unitOfWork.BeginTransaction();

      //Kiểm tra permission name đã tồn tại chưa
      var existingPermission = await _unitOfWork._permissionsRepository.GetPermissionByName(request.PermissionName);

      if (existingPermission != null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<CreatePermissionResponse>
        {
          StatusCode = 400,
          Message = "Tên permission đã tồn tại",
          Data = null,
          DateTime = DateTime.Now
        };
      }
      var newPermission = new Permission
      {
        Id = Guid.NewGuid(),
        PermissionName = request.PermissionName,
      };

      await _unitOfWork._permissionsRepository.AddAsync(newPermission);
      await _unitOfWork.SaveChangesAsync();
      await _unitOfWork.CommitTransaction();

      var response = new CreatePermissionResponse
      {
        PermissionId = newPermission.Id,
        PermissionName = newPermission.PermissionName ?? "",
        CreatedAt = DateTime.Now
      };

      return new HTTPResponseClient<CreatePermissionResponse>
      {
        StatusCode = 200,
        Message = "Tạo permission thành công",
        Data = response,
        DateTime = DateTime.Now
      };
    }
    catch (System.Exception ex)
    {
      await _unitOfWork.RollBack();
      return new HTTPResponseClient<CreatePermissionResponse>
      {
        StatusCode = 500,
        Message = $"Lỗi khi tạo permission: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  public async Task<HTTPResponseClient<DeletePermissionResponse>> DeletePermissionAsync(Guid permissionId)
  {

    try
    {
      await _unitOfWork.BeginTransaction();
      var permission = await _unitOfWork._permissionsRepository.GetPermissionById(permissionId);
      if (permission == null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<DeletePermissionResponse>
        {
          StatusCode = 404,
          Message = "Không tìm thấy permission",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      //Kiểm tra permission có đang đc sử dụng không
      if (permission.RolePermissions?.Any() == true)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<DeletePermissionResponse>
        {
          StatusCode = 400,
          Message = $@"Không thể xóa permission '{permission.PermissionName}' vì đang có  {permission.RolePermissions.Count} role đang được sử dụng",
          Data = null,
          DateTime = DateTime.Now
        };
      }
      // Xóa permission
      await _unitOfWork._permissionsRepository.DeleteAsync(permission.Id);
      await _unitOfWork.SaveChangesAsync();
      await _unitOfWork.CommitTransaction();

      var response = new DeletePermissionResponse
      {
        DeletedPermissionId = permissionId,
        PermissionName = permission.PermissionName ?? "",
        IsDeleted = true,
        Message = $"Xóa permission '{permission.PermissionName}' thành công",
        DeletedAt = DateTime.Now
      };

      return new HTTPResponseClient<DeletePermissionResponse>
      {
        StatusCode = 200,
        Message = "Xóa permission thành công",
        Data = response,
        DateTime = DateTime.Now
      };
    }
    catch (System.Exception ex)
    {
      await _unitOfWork.RollBack();
      return new HTTPResponseClient<DeletePermissionResponse>
      {
        StatusCode = 500,
        Message = $"Lỗi khi xóa permission: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  public async Task<HTTPResponseClient<List<PermissionDto>>> GetAllPermissionsAsync()
  {
    try
    {
      var permissions = await _unitOfWork._permissionsRepository.GetAllPermissionWithRole();
      var permissionDtos = permissions.Select(permission => new PermissionDto
      {
        Id = permission.Id,
        PermissionName = permission.PermissionName ?? "",
        RolePermissionsCount = permission.RolePermissions?.Count ?? 0,
        AssignedRoles = permission.RolePermissions?.Select(rp => new RoleDto
        {
          Id = rp.Role?.Id ?? Guid.Empty,
          RoleName = rp.Role?.RoleName ?? ""
        }).ToList() ?? new List<RoleDto>()
      }).ToList();

      return new HTTPResponseClient<List<PermissionDto>>
      {
        StatusCode = 200,
        Message = "Lấy danh sách permissions thành công",
        Data = permissionDtos,
        DateTime = DateTime.Now
      };
    }
    catch (System.Exception ex)
    {
      return new HTTPResponseClient<List<PermissionDto>>
      {
        StatusCode = 500,
        Message = $"Lỗi khi lấy danh sách permissions: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  public async Task<HTTPResponseClient<PermissionDto>> GetPermissionByIdAsync(Guid permissionId)
  {
    try
    {


      var permission = await _unitOfWork._permissionsRepository.GetPermissionById(permissionId);
      if (permission == null)
      {
        return new HTTPResponseClient<PermissionDto>
        {
          StatusCode = 400,
          Message = "Không tìm thấy permission",
          Data = null,
          DateTime = DateTime.Now
        };
      }
      var permissionDto = new PermissionDto
      {
        Id = permission.Id,
        PermissionName = permission.PermissionName ?? "",
        RolePermissionsCount = permission.RolePermissions?.Count ?? 0,
        AssignedRoles = permission.RolePermissions?.Select(rp => new RoleDto
        {
          Id = rp.Role?.Id ?? Guid.Empty,
          RoleName = rp.Role?.RoleName ?? ""
        }).ToList() ?? new List<RoleDto>()
      };
      return new HTTPResponseClient<PermissionDto>
      {
        StatusCode = 200,
        Message = "Lấy thông tin permission thành công",
        Data = permissionDto,
        DateTime = DateTime.Now
      };
    }
    catch (System.Exception ex)
    {
      return new HTTPResponseClient<PermissionDto>
      {
        StatusCode = 500,
        Message = $"Lỗi khi lấy thông tin permission: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  public async Task<HTTPResponseClient<UpdatePermissionResponse>> UpdatePermissionAsync(Guid permissionId, UpdatePermissionRequest request)
  {
    try
    {
      await _unitOfWork.BeginTransaction();

      var permission = await _unitOfWork._permissionsRepository.GetByIdAsync(permissionId);
      if (permission == null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<UpdatePermissionResponse>
        {
          StatusCode = 404,
          Message = "Không tìm thấy permission",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Kiểm tra tên mới có trùng với permission khác không
      var existingPermission = await _unitOfWork._permissionsRepository.GetPermissionByName(request.PermissionName);

      if (existingPermission != null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<UpdatePermissionResponse>
        {
          StatusCode = 400,
          Message = "Tên permission đã tồn tại",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      var oldPermissionName = permission.PermissionName;

      permission.PermissionName = request.PermissionName;

      _unitOfWork._permissionsRepository.Update(permission);
      await _unitOfWork.SaveChangesAsync();
      await _unitOfWork.CommitTransaction();

      var response = new UpdatePermissionResponse
      {
        PermissionId = permissionId,
        OldPermissionName = oldPermissionName ?? "",
        NewPermissionName = permission.PermissionName ?? "",
        IsUpdated = true,
        Message = $"Cập nhật permission từ '{oldPermissionName}' thành '{permission.PermissionName}' thành công",
        UpdatedAt = DateTime.Now
      };

      return new HTTPResponseClient<UpdatePermissionResponse>
      {
        StatusCode = 200,
        Message = "Cập nhật permission thành công",
        Data = response,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      await _unitOfWork.RollBack();
      return new HTTPResponseClient<UpdatePermissionResponse>
      {
        StatusCode = 500,
        Message = $"Lỗi khi cập nhật permission: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }
}