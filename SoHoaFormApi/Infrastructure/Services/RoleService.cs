using SoHoaFormApi.Models.DbSoHoaForm;
using SoHoaFormApi.Models.DTO;
using SoHoaFormApi.Models.ViewModel.Request;
using SoHoaFormApi.Models.ViewModel.Response;

public interface IRoleService
{
  Task<HTTPResponseClient<List<RoleDto>>> GetAllRolesAsync();
  Task<HTTPResponseClient<RoleDto>> GetRoleByIdAsync(Guid roleId);
  Task<HTTPResponseClient<CreateRoleResponse>> CreateRoleAsync(CreateRoleRequest request);
  Task<HTTPResponseClient<UpdateRoleResponse>> UpdateRoleAsync(Guid roleId, UpdateRoleRequest request);
  Task<HTTPResponseClient<DeleteRoleResponse>> DeleteRoleAsync(Guid roleId);
  Task<HTTPResponseClient<List<RolePermissionDto>>> GetRolePermissionsAsync(Guid roleId);
  Task<HTTPResponseClient<AssignPermissionResponse>> AssignPermissionToRoleAsync(Guid roleId, AssignPermissionRequest request);
  Task<HTTPResponseClient<RemovePermissionResponse>> RemovePermissionFromRoleAsync(Guid roleId, Guid permissionId);
}

public class RoleService : IRoleService
{

  private readonly IUnitOfWork _unitOfWork;
  private readonly SoHoaFormContext _context;

  public RoleService(IUnitOfWork unitOfWork, SoHoaFormContext context)
  {
    _unitOfWork = unitOfWork;
    _context = context;
  }

  public async Task<HTTPResponseClient<AssignPermissionResponse>> AssignPermissionToRoleAsync(Guid roleId, AssignPermissionRequest request)
  {
    try
    {
      await _unitOfWork.BeginTransaction();

      // Kiểm tra role tồn tại
      var role = await _unitOfWork._roleRepository.GetByIdAsync(roleId);
      if (role == null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<AssignPermissionResponse>
        {
          StatusCode = 404,
          Message = "Không tìm thấy role",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Kiểm tra permission tồn tại
      var permission = await _unitOfWork._permissionsRepository.GetByIdAsync(request.PermissionId);
      if (permission == null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<AssignPermissionResponse>
        {
          StatusCode = 404,
          Message = "Không tìm thấy permission",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Tạo RolePermission mới
      var rolePermission = new RolePermission
      {
        Id = Guid.NewGuid(),
        RoleId = roleId,
        PermissionId = request.PermissionId
      };

      await _unitOfWork._rolePermissionRepository.AddAsync(rolePermission);
      await _unitOfWork.SaveChangesAsync();
      await _unitOfWork.CommitTransaction();

      var response = new AssignPermissionResponse
      {
        RolePermissionId = rolePermission.Id,
        RoleId = roleId,
        RoleName = role.RoleName,
        PermissionId = request.PermissionId,
        PermissionName = permission.PermissionName ?? "",
        IsAssigned = true,
        Message = $"Assign permission '{permission.PermissionName}' cho role '{role.RoleName}' thành công",
        AssignedAt = DateTime.Now
      };

      return new HTTPResponseClient<AssignPermissionResponse>
      {
        StatusCode = 200,
        Message = "Assign permission cho role thành công",
        Data = response,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      await _unitOfWork.RollBack();
      return new HTTPResponseClient<AssignPermissionResponse>
      {
        StatusCode = 500,
        Message = $"Lỗi khi assign permission cho role: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  public async Task<HTTPResponseClient<CreateRoleResponse>> CreateRoleAsync(CreateRoleRequest request)
  {
    try
    {
      await _unitOfWork.BeginTransaction();
      //Kiểm tra role năm đã tồn tại chưa
      var existingRole = await _unitOfWork._roleRepository.GetRoleByNameAsync(request.RoleName);
      if (existingRole != null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<CreateRoleResponse>
        {
          StatusCode = 400,
          Message = "Tên role đã tồn tại",
          Data = null,
          DateTime = DateTime.Now,
        };
      }

      var newRole = new Role
      {
        Id = Guid.NewGuid(),
        RoleName = request.RoleName,
      };

      await _unitOfWork._roleRepository.AddAsync(newRole);
      await _unitOfWork.SaveChangesAsync();
      await _unitOfWork.CommitTransaction();

      var response = new CreateRoleResponse
      {
        RoleId = newRole.Id,
        RoleName = newRole.RoleName,
        IsCreated = true,
        CreatedAt = DateTime.Now,
      };

      return new HTTPResponseClient<CreateRoleResponse>
      {
        StatusCode = 200,
        Message = $"Tạo role {newRole.RoleName} thành công",
        Data = response,
        DateTime = DateTime.Now
      };

    }
    catch (System.Exception ex)
    {
      await _unitOfWork.RollBack();
      return new HTTPResponseClient<CreateRoleResponse>
      {
        StatusCode = 500,
        Message = $"Lỗi khi tạo role: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  public async Task<HTTPResponseClient<DeleteRoleResponse>> DeleteRoleAsync(Guid roleId)
  {
    try
    {
      await _unitOfWork.BeginTransaction();

      var role = await _unitOfWork._roleRepository.GetRoleWithPermissionAndFormCategorByIdAsync(roleId);

      if (role == null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<DeleteRoleResponse>
        {
          StatusCode = 404,
          Message = "Không tìm thấy role",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Kiểm tra role có đang được sử dụng không
      if (role.Users.Any())
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<DeleteRoleResponse>
        {
          StatusCode = 400,
          Message = $"Không thể xóa role '{role.RoleName}' vì đang có {role.Users.Count} user sử dụng",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Xóa các permissions và category permissions liên quan
      if (role.RolePermissions.Any())
      {
        _context.RolePermissions.RemoveRange(role.RolePermissions);
      }

      if (role.RoleCategoryPermissions.Any())
      {
        _context.RoleCategoryPermissions.RemoveRange(role.RoleCategoryPermissions);
      }

      // Xóa role
      await _unitOfWork._roleRepository.DeleteAsync(role.Id);
      await _unitOfWork.SaveChangesAsync();
      await _unitOfWork.CommitTransaction();

      var response = new DeleteRoleResponse
      {
        DeletedRoleId = roleId,
        RoleName = role.RoleName,
        PermissionsDeleted = role.RolePermissions.Count,
        CategoryPermissionsDeleted = role.RoleCategoryPermissions.Count,
        IsDeleted = true,
        Message = $"Xóa role '{role.RoleName}' thành công",
        DeletedAt = DateTime.Now
      };

      return new HTTPResponseClient<DeleteRoleResponse>
      {
        StatusCode = 200,
        Message = "Xóa role thành công",
        Data = response,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      await _unitOfWork.RollBack();
      return new HTTPResponseClient<DeleteRoleResponse>
      {
        StatusCode = 500,
        Message = $"Lỗi khi xóa role: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  public async Task<HTTPResponseClient<List<RoleDto>>> GetAllRolesAsync()
  {
    try
    {
      var roles = await _unitOfWork._roleRepository.GetAllRoleWithPermissionAndFormCategory();
      var roleDtos = roles.Select(role => new RoleDto
      {
        Id = role.Id,
        RoleName = role.RoleName,
        PermissionCount = role.RolePermissions.Count,
        CategoryPermissionCount = role.RoleCategoryPermissions.Count,
        Permissions = role.RolePermissions.Select(rp => new PermissionDto
        {
          Id = rp.Permission?.Id ?? Guid.Empty,
          PermissionName = rp.Permission?.PermissionName ?? ""
        }).ToList()
      }).ToList();
      return new HTTPResponseClient<List<RoleDto>>
      {
        StatusCode = 200,
        Message = "Lấy danh sách roles thành công",
        Data = roleDtos,
        DateTime = DateTime.Now
      };
    }
    catch (System.Exception ex)
    {
      return new HTTPResponseClient<List<RoleDto>>
      {
        StatusCode = 500,
        Message = $"Lỗi khi lấy danh sách roles: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  public async Task<HTTPResponseClient<RoleDto>> GetRoleByIdAsync(Guid roleId)
  {
    try
    {
      Role role = await _unitOfWork._roleRepository.GetRoleWithPermissionAndFormCategorByIdAsync(roleId);
      if (role == null)
      {
        return new HTTPResponseClient<RoleDto>
        {
          StatusCode = 404,
          Message = "Không tìm thấy role",
          Data = null,
          DateTime = DateTime.Now
        };
      }
      var roleDto = new RoleDto
      {
        Id = role.Id,
        RoleName = role.RoleName,
        PermissionCount = role.RolePermissions.Count,
        CategoryPermissionCount = role.RoleCategoryPermissions.Count,
        Permissions = role.RolePermissions.Select(rp => new PermissionDto
        {
          Id = rp.Permission?.Id ?? Guid.Empty,
          PermissionName = rp.Permission?.PermissionName ?? ""
        }).ToList(),
        CategoryPermissions = role.RoleCategoryPermissions.Select(rcp => new RoleCategoryPermissionDto
        {
          Id = rcp.Id,
          FormCategoryId = rcp.FormCategoryId ?? Guid.Empty,
          CategoryName = rcp.FormCategory?.CategoryName ?? "",
          CanAccess = rcp.CanAcess ?? false
        }).ToList()
      };
      return new HTTPResponseClient<RoleDto>
      {
        StatusCode = 200,
        Message = "Lấy thông tin role thành công",
        Data = roleDto,
        DateTime = DateTime.Now
      };
    }
    catch (System.Exception ex)
    {
      return new HTTPResponseClient<RoleDto>
      {
        StatusCode = 500,
        Message = $"Lỗi khi lấy thông tin role: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  public async Task<HTTPResponseClient<List<RolePermissionDto>>> GetRolePermissionsAsync(Guid roleId)
  {
    try
    {
      var role = await _unitOfWork._roleRepository.GetRoleWithPermissionAndFormCategorByIdAsync(roleId);
      if (role == null)
      {
        return new HTTPResponseClient<List<RolePermissionDto>>
        {
          StatusCode = 404,
          Message = "Không tìm thấy role",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      var rolePermissions = role.RolePermissions.Select(rp => new RolePermissionDto
      {
        Id = rp.Id,
        RoleId = rp.RoleId ?? Guid.Empty,
        PermissionId = rp.PermissionId ?? Guid.Empty,
        PermissionName = rp.Permission?.PermissionName ?? ""
      }).ToList();

      return new HTTPResponseClient<List<RolePermissionDto>>
      {
        StatusCode = 200,
        Message = $"Lấy danh sách permissions của role '{role.RoleName}' thành công",
        Data = rolePermissions,
        DateTime = DateTime.Now
      };
    }
    catch (System.Exception ex)
    {
      return new HTTPResponseClient<List<RolePermissionDto>>
      {
        StatusCode = 500,
        Message = $"Lỗi khi lấy danh sách quyền của role: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  public async Task<HTTPResponseClient<RemovePermissionResponse>> RemovePermissionFromRoleAsync(Guid roleId, Guid permissionId)
  {
    try
    {
      await _unitOfWork.BeginTransaction();

      var rolePermission = await _unitOfWork._roleRepository.GetRolePermission(roleId, permissionId);

      if (rolePermission == null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<RemovePermissionResponse>
        {
          StatusCode = 404,
          Message = "Không tìm thấy role permission để xóa",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      _unitOfWork._rolePermissionRepository.DeleteAsync(rolePermission.Id);
      await _unitOfWork.SaveChangesAsync();
      await _unitOfWork.CommitTransaction();

      var response = new RemovePermissionResponse
      {
        RoleId = roleId,
        RoleName = rolePermission.Role?.RoleName ?? "",
        PermissionId = permissionId,
        PermissionName = rolePermission.Permission?.PermissionName ?? "",
        IsRemoved = true,
        Message = $"Xóa permission '{rolePermission.Permission?.PermissionName}' khỏi role '{rolePermission.Role?.RoleName}' thành công",
        RemovedAt = DateTime.Now
      };

      return new HTTPResponseClient<RemovePermissionResponse>
      {
        StatusCode = 200,
        Message = "Xóa permission khỏi role thành công",
        Data = response,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      await _unitOfWork.RollBack();
      return new HTTPResponseClient<RemovePermissionResponse>
      {
        StatusCode = 500,
        Message = $"Lỗi khi xóa permission khỏi role: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  public async Task<HTTPResponseClient<UpdateRoleResponse>> UpdateRoleAsync(Guid roleId, UpdateRoleRequest request)
  {
    try
    {
      await _unitOfWork.BeginTransaction();

      var role = await _unitOfWork._roleRepository.GetByIdAsync(roleId);
      if (role == null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<UpdateRoleResponse>
        {
          StatusCode = 404,
          Message = "Không tìm thấy role",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Kiểm tra tên mới có trùng với role khác không
      var existingRole = await _unitOfWork._roleRepository.GetRoleByNameAsync(request.RoleName);
      if (existingRole != null && existingRole.Id != roleId)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<UpdateRoleResponse>
        {
          StatusCode = 400,
          Message = "Tên role đã tồn tại",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      var oldRoleName = role.RoleName;
      role.RoleName = request.RoleName;

      _unitOfWork._roleRepository.Update(role);
      await _unitOfWork.SaveChangesAsync();
      await _unitOfWork.CommitTransaction();

      var response = new UpdateRoleResponse
      {
        RoleId = roleId,
        OldRoleName = oldRoleName,
        NewRoleName = role.RoleName,
        IsUpdated = true,
        Message = $"Cập nhật role từ '{oldRoleName}' thành '{role.RoleName}' thành công",
        UpdatedAt = DateTime.Now
      };

      return new HTTPResponseClient<UpdateRoleResponse>
      {
        StatusCode = 200,
        Message = "Cập nhật role thành công",
        Data = response,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      await _unitOfWork.RollBack();
      return new HTTPResponseClient<UpdateRoleResponse>
      {
        StatusCode = 500,
        Message = $"Lỗi khi cập nhật role: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }
}