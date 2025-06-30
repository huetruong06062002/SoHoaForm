using SoHoaFormApi.Models.DbSoHoaForm;
using SoHoaFormApi.Models.DTO;
using SoHoaFormApi.Models.Helper;
using SoHoaFormApi.Models.ViewModel.Request;
using SoHoaFormApi.Models.ViewModel.Response;

public interface IUserManagementService
{
  Task<HTTPResponseClient<List<UserDto>>> GetAllUsersAsync();
  Task<HTTPResponseClient<UserDto>> GetUserByIdAsync(Guid userId);
  Task<HTTPResponseClient<CreateUserResponse>> CreateUserAsync(CreateUserRequest request);
  Task<HTTPResponseClient<UpdateUserResponse>> UpdateUserAsync(Guid userId, UpdateUserRequest request);
  Task<HTTPResponseClient<DeleteUserResponse>> DeleteUserAsync(Guid userId);
  Task<HTTPResponseClient<AssignRoleResponse>> AssignRoleToUserAsync(Guid userId, Guid roleId);

  Task<HTTPResponseClient<List<UserRoleDto>>> GetUserRolesAsync(Guid userId);

  Task<HTTPResponseClient<object>> GetUsersByRoleAsync(Guid roleId);
  Task<HTTPResponseClient<object>> AddRoleToUserAsync(Guid userId, Guid roleId);
  Task<HTTPResponseClient<object>> RemoveRoleFromUserAsync(Guid userId, Guid roleId);

  Task<HTTPResponseClient<object>> SearchUsersAsync(string searchTerm, int pageNumber = 1, int pageSize = 10);
}

public class UserManagementService : IUserManagementService
{
  private readonly IUnitOfWork _unitOfWork;

  public UserManagementService(IUnitOfWork unitOfWork)
  {
    _unitOfWork = unitOfWork;
  }

  public async Task<HTTPResponseClient<List<UserDto>>> GetAllUsersAsync()
  {
    try
    {
      var users = await _unitOfWork._userRepository.GetAllUsersWithRoleAsync();

      var userDtos = users.Select(user => HelperClass.MapToUserDto(user)).ToList();

      return new HTTPResponseClient<List<UserDto>>
      {
        StatusCode = 200,
        Message = "Lấy danh sách users thành công",
        Data = userDtos,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      return new HTTPResponseClient<List<UserDto>>
      {
        StatusCode = 500,
        Message = $"Lỗi khi lấy danh sách users: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
    ;
  }

  public async Task<HTTPResponseClient<UserDto>> GetUserByIdAsync(Guid userId)
  {
    try
    {
      var user = await _unitOfWork._userRepository.GetUserWithRoleAsync(userId);

      if (user == null)
      {
        return new HTTPResponseClient<UserDto>
        {
          StatusCode = 404,
          Message = "Không tìm thấy user",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      var userDto = HelperClass.MapToUserDto(user);

      return new HTTPResponseClient<UserDto>
      {
        StatusCode = 200,
        Message = "Lấy thông tin user thành công",
        Data = userDto,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      return new HTTPResponseClient<UserDto>
      {
        StatusCode = 500,
        Message = $"Lỗi khi lấy thông tin user: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }


  public async Task<HTTPResponseClient<CreateUserResponse>> CreateUserAsync(CreateUserRequest request)
  {
     try
    {
        await _unitOfWork.BeginTransaction();

        // Kiểm tra username đã tồn tại chưa
        var isUserNameExists = await _unitOfWork._userRepository.IsUserNameExistsAsync(request.UserName);
        if (isUserNameExists)
        {
            await _unitOfWork.RollBack();
            return new HTTPResponseClient<CreateUserResponse>
            {
                StatusCode = 400,
                Message = "Tên đăng nhập đã tồn tại",
                Data = null,
                DateTime = DateTime.Now
            };
        }

        //Chỉ kiểm tra role nếu RoleId được cung cấp
        Role? role = null;
        if (request.RoleId.HasValue && request.RoleId.Value != Guid.Empty)
        {
            role = await _unitOfWork._roleRepository.GetByIdAsync(request.RoleId.Value);
            if (role == null)
            {
                await _unitOfWork.RollBack();
                return new HTTPResponseClient<CreateUserResponse>
                {
                    StatusCode = 404,
                    Message = "Không tìm thấy role",
                    Data = null,
                    DateTime = DateTime.Now
                };
            }
        }

        // Hash password
        var hashedPassword = BCrypt.Net.BCrypt.HashPassword(request.Password);

        // ✅ THAY ĐỔI: Tạo user với RoleId có thể null
        var newUser = new User
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            UserName = request.UserName,
            PassWord = hashedPassword,
            RoleId = request.RoleId, // Có thể null
            DateCreated = DateTime.Now,
        };

        await _unitOfWork._userRepository.AddAsync(newUser);
        await _unitOfWork.SaveChangesAsync();
        await _unitOfWork.CommitTransaction();

        // ✅ THAY ĐỔI: Response với thông tin role có thể null
        var response = new CreateUserResponse
        {
            UserId = newUser.Id,
            Name = newUser.Name,
            UserName = newUser.UserName ?? "",
            RoleId = request.RoleId,
            RoleName = role?.RoleName,
            HasRole = role != null,
            IsCreated = true,
            Message = role != null 
                ? $"Tạo user '{newUser.Name}' với role '{role.RoleName}' thành công"
                : $"Tạo user '{newUser.Name}' (chưa gán role) thành công",
            CreatedAt = newUser.DateCreated
        };

        return new HTTPResponseClient<CreateUserResponse>
        {
            StatusCode = 200,
            Message = "Tạo user thành công",
            Data = response,
            DateTime = DateTime.Now
        };
    }
    catch (Exception ex)
    {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<CreateUserResponse>
        {
            StatusCode = 500,
            Message = $"Lỗi khi tạo user: {ex.Message}",
            Data = null,
            DateTime = DateTime.Now
        };
    }
  }

  public async Task<HTTPResponseClient<UpdateUserResponse>> UpdateUserAsync(Guid userId, UpdateUserRequest request)
  {
    try
    {
      await _unitOfWork.BeginTransaction();

      var user = await _unitOfWork._userRepository.GetUserWithRoleAsync(userId);
      if (user == null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<UpdateUserResponse>
        {
          StatusCode = 404,
          Message = "Không tìm thấy user",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Kiểm tra username mới có trùng với user khác không
      var existingUser = await _unitOfWork._userRepository.GetUserByUserNameAsync(request.UserName);
      if (existingUser != null && existingUser.Id != userId)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<UpdateUserResponse>
        {
          StatusCode = 400,
          Message = "Tên đăng nhập đã tồn tại",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Kiểm tra role có tồn tại không
      var newRole = await _unitOfWork._roleRepository.GetByIdAsync(request.RoleId);
      if (newRole == null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<UpdateUserResponse>
        {
          StatusCode = 404,
          Message = "Không tìm thấy role",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Lưu thông tin cũ
      var oldName = user.Name;
      var oldUserName = user.UserName ?? "";
      var oldRoleId = user.RoleId ?? Guid.Empty;
      var oldRoleName = user.Role?.RoleName ?? "";

      // Cập nhật thông tin
      user.Name = request.Name;
      user.UserName = request.UserName;
      user.RoleId = request.RoleId;

      bool isPasswordChanged = false;
      if (!string.IsNullOrEmpty(request.Password))
      {
        user.PassWord = BCrypt.Net.BCrypt.HashPassword(request.Password);
        isPasswordChanged = true;
      }

      _unitOfWork._userRepository.Update(user);
      await _unitOfWork.SaveChangesAsync();
      await _unitOfWork.CommitTransaction();

      var response = new UpdateUserResponse
      {
        UserId = userId,
        OldName = oldName,
        NewName = user.Name,
        OldUserName = oldUserName,
        NewUserName = user.UserName ?? "",
        OldRoleId = oldRoleId,
        NewRoleId = request.RoleId,
        OldRoleName = oldRoleName,
        NewRoleName = newRole.RoleName,
        IsPasswordChanged = isPasswordChanged,
        IsUpdated = true,
        Message = $"Cập nhật user '{user.Name}' thành công",
        UpdatedAt = DateTime.Now
      };

      return new HTTPResponseClient<UpdateUserResponse>
      {
        StatusCode = 200,
        Message = "Cập nhật user thành công",
        Data = response,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      await _unitOfWork.RollBack();
      return new HTTPResponseClient<UpdateUserResponse>
      {
        StatusCode = 500,
        Message = $"Lỗi khi cập nhật user: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  public async Task<HTTPResponseClient<DeleteUserResponse>> DeleteUserAsync(Guid userId)
  {
    try
    {
      await _unitOfWork.BeginTransaction();

      var user = await _unitOfWork._userRepository.GetUserWithRoleAsync(userId);
      if (user == null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<DeleteUserResponse>
        {
          StatusCode = 404,
          Message = "Không tìm thấy user",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Kiểm tra user có đang có forms hay user fill forms không
      var hasForms = await _unitOfWork._formRepository.AnyAsync(f => f.UserId == userId);
      var hasUserFillForms = await _unitOfWork._userFillFormRepository.AnyAsync(uff => uff.UserId == userId);

      if (hasForms || hasUserFillForms)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<DeleteUserResponse>
        {
          StatusCode = 400,
          Message = "Không thể xóa user vì đang có dữ liệu liên quan (forms hoặc user fill forms)",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      await _unitOfWork._userRepository.DeleteAsync(userId);
      await _unitOfWork.SaveChangesAsync();
      await _unitOfWork.CommitTransaction();

      var response = new DeleteUserResponse
      {
        DeletedUserId = userId,
        UserName = user.UserName ?? "",
        Name = user.Name,
        RoleName = user.Role?.RoleName ?? "",
        IsDeleted = true,
        Message = $"Xóa user '{user.Name}' thành công",
        DeletedAt = DateTime.Now
      };

      return new HTTPResponseClient<DeleteUserResponse>
      {
        StatusCode = 200,
        Message = "Xóa user thành công",
        Data = response,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      await _unitOfWork.RollBack();
      return new HTTPResponseClient<DeleteUserResponse>
      {
        StatusCode = 500,
        Message = $"Lỗi khi xóa user: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  public async Task<HTTPResponseClient<AssignRoleResponse>> AssignRoleToUserAsync(Guid userId, Guid roleId)
  {
    try
    {
      await _unitOfWork.BeginTransaction();

      var user = await _unitOfWork._userRepository.GetUserWithRoleAsync(userId);
      if (user == null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<AssignRoleResponse>
        {
          StatusCode = 404,
          Message = "Không tìm thấy user",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      var newRole = await _unitOfWork._roleRepository.GetByIdAsync(roleId);
      if (newRole == null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<AssignRoleResponse>
        {
          StatusCode = 404,
          Message = "Không tìm thấy role",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      var oldRoleId = user.RoleId ?? Guid.Empty;
      var oldRoleName = user.Role?.RoleName ?? "";

      user.RoleId = roleId;
      _unitOfWork._userRepository.Update(user);
      await _unitOfWork.SaveChangesAsync();
      await _unitOfWork.CommitTransaction();

      var response = new AssignRoleResponse
      {
        UserId = userId,
        UserName = user.UserName ?? "",
        OldRoleId = oldRoleId,
        NewRoleId = roleId,
        OldRoleName = oldRoleName,
        NewRoleName = newRole.RoleName,
        IsAssigned = true,
        Message = $"Assign role '{newRole.RoleName}' cho user '{user.Name}' thành công",
        AssignedAt = DateTime.Now
      };

      return new HTTPResponseClient<AssignRoleResponse>
      {
        StatusCode = 200,
        Message = "Assign role cho user thành công",
        Data = response,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      await _unitOfWork.RollBack();
      return new HTTPResponseClient<AssignRoleResponse>
      {
        StatusCode = 500,
        Message = $"Lỗi khi assign role cho user: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  public async Task<HTTPResponseClient<object>> SearchUsersAsync(string searchTerm, int pageNumber = 1, int pageSize = 10)
  {
    try
    {
      var (users, totalCount) = await _unitOfWork._userRepository.GetUsersWithPaginationAsync(pageNumber, pageSize, searchTerm);

      var userDtos = users.Select(user => HelperClass.MapToUserDto(user)).ToList();

      var response = new
      {
        Users = userDtos,
        TotalCount = totalCount,
        PageNumber = pageNumber,
        PageSize = pageSize,
        TotalPages = (int)Math.Ceiling((double)totalCount / pageSize)
      };

      return new HTTPResponseClient<object>
      {
        StatusCode = 200,
        Message = "Tìm kiếm users thành công",
        Data = response,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      return new HTTPResponseClient<object>
      {
        StatusCode = 500,
        Message = $"Lỗi khi tìm kiếm users: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
    ;
  }

  public async Task<HTTPResponseClient<List<UserRoleDto>>> GetUserRolesAsync(Guid userId)
  {
    try
    {
      // Kiểm tra user có tồn tại không
      var user = await _unitOfWork._userRepository.GetByIdAsync(userId);
      if (user == null)
      {
        return new HTTPResponseClient<List<UserRoleDto>>
        {
          StatusCode = 404,
          Message = "Không tìm thấy user",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Lấy tất cả roles của user
      var userRoles = await _unitOfWork._userRoleRepository.GetUserRolesByUserIdAsync(userId);

      var userRoleDtos = userRoles.Select(ur => new UserRoleDto
      {
        RoleId = ur.RoleId ?? Guid.Empty,
        RoleName = ur.Role?.RoleName ?? "",
        AssignedAt = ur.DateCreated
      }).ToList();

      return new HTTPResponseClient<List<UserRoleDto>>
      {
        StatusCode = 200,
        Message = $"Lấy danh sách roles của user '{user.Name}' thành công ({userRoleDtos.Count} roles)",
        Data = userRoleDtos,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      return new HTTPResponseClient<List<UserRoleDto>>
      {
        StatusCode = 500,
        Message = $"Lỗi khi lấy danh sách roles của user: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  public async Task<HTTPResponseClient<object>> AddRoleToUserAsync(Guid userId, Guid roleId)
  {
    try
    {
      await _unitOfWork.BeginTransaction();

      // Kiểm tra user có tồn tại không
      var user = await _unitOfWork._userRepository.GetByIdAsync(userId);
      if (user == null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<object>
        {
          StatusCode = 404,
          Message = "Không tìm thấy user",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Kiểm tra role có tồn tại không
      var role = await _unitOfWork._roleRepository.GetByIdAsync(roleId);
      if (role == null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<object>
        {
          StatusCode = 404,
          Message = "Không tìm thấy role",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Kiểm tra đã có user-role này chưa
      var existingUserRole = await _unitOfWork._userRoleRepository.ExistsAsync(userId, roleId);
      if (existingUserRole)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<object>
        {
          StatusCode = 400,
          Message = $"User '{user.Name}' đã có role '{role.RoleName}'",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Tạo UserRole mới
      var newUserRole = new UserRole
      {
        Id = Guid.NewGuid(),
        UserId = userId,
        RoleId = roleId,
        DateCreated = DateTime.Now
      };

      await _unitOfWork._userRoleRepository.AddAsync(newUserRole);
      await _unitOfWork.SaveChangesAsync();
      await _unitOfWork.CommitTransaction();

      var response = new AddRoleToUserResponse
      {
        UserId = userId,
        UserName = user.UserName ?? "",
        Name = user.Name,
        RoleId = roleId,
        RoleName = role.RoleName,
        IsAdded = true,
        Message = $"Thêm role '{role.RoleName}' cho user '{user.Name}' thành công",
        AddedAt = DateTime.Now
      };

      return new HTTPResponseClient<object>
      {
        StatusCode = 200,
        Message = "Thêm role cho user thành công",
        Data = response,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      await _unitOfWork.RollBack();
      return new HTTPResponseClient<object>
      {
        StatusCode = 500,
        Message = $"Lỗi khi thêm role cho user: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }

  public async Task<HTTPResponseClient<object>> RemoveRoleFromUserAsync(Guid userId, Guid roleId)
  {
    try
    {
      await _unitOfWork.BeginTransaction();

      // Kiểm tra user có tồn tại không
      var user = await _unitOfWork._userRepository.GetByIdAsync(userId);
      if (user == null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<object>
        {
          StatusCode = 404,
          Message = "Không tìm thấy user",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Kiểm tra role có tồn tại không
      var role = await _unitOfWork._roleRepository.GetByIdAsync(roleId);
      if (role == null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<object>
        {
          StatusCode = 404,
          Message = "Không tìm thấy role",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Tìm UserRole để xóa
      var userRole = await _unitOfWork._userRoleRepository.GetUserRoleAsync(userId, roleId);
      if (userRole == null)
      {
        await _unitOfWork.RollBack();
        return new HTTPResponseClient<object>
        {
          StatusCode = 404,
          Message = $"User '{user.Name}' không có role '{role.RoleName}' để xóa",
          Data = null,
          DateTime = DateTime.Now
        };
      }

      // Kiểm tra không cho xóa role chính (nếu có logic này)
      if (user.RoleId == roleId)
      {
        // Đếm số roles còn lại
        var totalRoles = await _unitOfWork._userRoleRepository.CountRolesByUserAsync(userId);
        if (totalRoles <= 1)
        {
          await _unitOfWork.RollBack();
          return new HTTPResponseClient<object>
          {
            StatusCode = 400,
            Message = "Không thể xóa role chính duy nhất của user. Hãy assign role khác trước khi xóa.",
            Data = null,
            DateTime = DateTime.Now
          };
        }
      }

      // Xóa UserRole
      await _unitOfWork._userRoleRepository.DeleteAsync(userRole.Id);
      await _unitOfWork.SaveChangesAsync();
      await _unitOfWork.CommitTransaction();

      var response = new RemoveRoleFromUserResponse
      {
        UserId = userId,
        UserName = user.UserName ?? "",
        Name = user.Name,
        RoleId = roleId,
        RoleName = role.RoleName,
        IsRemoved = true,
        Message = $"Xóa role '{role.RoleName}' khỏi user '{user.Name}' thành công",
        RemovedAt = DateTime.Now
      };

      return new HTTPResponseClient<object>
      {
        StatusCode = 200,
        Message = "Xóa role khỏi user thành công",
        Data = response,
        DateTime = DateTime.Now
      };
    }
    catch (Exception ex)
    {
      await _unitOfWork.RollBack();
      return new HTTPResponseClient<object>
      {
        StatusCode = 500,
        Message = $"Lỗi khi xóa role khỏi user: {ex.Message}",
        Data = null,
        DateTime = DateTime.Now
      };
    }
  }


  public async Task<HTTPResponseClient<object>> GetUsersByRoleAsync(Guid roleId)
{
    try
    {
        // Kiểm tra role có tồn tại không
        var role = await _unitOfWork._roleRepository.GetByIdAsync(roleId);
        if (role == null)
        {
            return new HTTPResponseClient<object>
            {
                StatusCode = 404,
                Message = "Không tìm thấy role",
                Data = null,
                DateTime = DateTime.Now
            };
        }

        // Lấy tất cả users có role này
        var userRoles = await _unitOfWork._userRoleRepository.GetUserRolesByRoleIdAsync(roleId);

        // Map sang DTO
        var usersByRole = userRoles.Select(ur => new
        {
            UserId = ur.UserId,
            UserName = ur.User?.UserName ?? "",
            Name = ur.User?.Name ?? "",
            PrimaryRoleId = ur.User?.RoleId,
            PrimaryRoleName = ur.User?.Role?.RoleName ?? "",
            AssignedAt = ur.DateCreated,
            CreatedAt = ur.User?.DateCreated
        }).ToList();

        var response = new
        {
            Role = new
            {
                Id = role.Id,
                Name = role.RoleName,
                CreatedAt = role.DateCreated
            },
            Users = usersByRole,
            TotalUsers = usersByRole.Count,
            Summary = $"Có {usersByRole.Count} users với role '{role.RoleName}'"
        };

        return new HTTPResponseClient<object>
        {
            StatusCode = 200,
            Message = $"Lấy danh sách users với role '{role.RoleName}' thành công",
            Data = response,
            DateTime = DateTime.Now
        };
    }
    catch (Exception ex)
    {
        return new HTTPResponseClient<object>
        {
            StatusCode = 500,
            Message = $"Lỗi khi lấy danh sách users theo role: {ex.Message}",
            Data = null,
            DateTime = DateTime.Now
        };
    }
}
  

}