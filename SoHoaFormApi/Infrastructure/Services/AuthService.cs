using Microsoft.EntityFrameworkCore;
using SoHoaFormApi.Models.DbSoHoaForm;
using SoHoaFormApi.Models.ViewModel.Request;
using SoHoaFormApi.Models.ViewModel.Response;
using SoHoaFormApi.Models.Helper;
using BCrypt.Net;
using SoHoaFormApi.Models.DTO;

namespace SoHoaFormApi.Infrastructure.Services
{
    public interface IAuthService
    {
        Task<HTTPResponseClient<LoginResponse>> LoginAsync(LoginRequest request);
        Task<HTTPResponseClient<ChangePasswordResponse>> ChangePasswordAsync(Guid userId, ChangePasswordRequest request);
        Task<HTTPResponseClient<ResetPasswordResponse>> ResetPasswordAsync(ResetPasswordRequest request);
        Task<HTTPResponseClient<object>> ValidateTokenAsync(string token);
        Task<HTTPResponseClient<LoginResponse>> RefreshTokenAsync(string token);
    }

    public class AuthService : IAuthService
    {
        private readonly SoHoaFormContext _context;
        private readonly JwtAuthService _jwtService;
        private readonly IUnitOfWork _unitOfWork;

        public AuthService(SoHoaFormContext context, JwtAuthService jwtService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _jwtService = jwtService;
            _unitOfWork = unitOfWork;
        }

        public async Task<HTTPResponseClient<LoginResponse>> LoginAsync(LoginRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.UserName) || string.IsNullOrWhiteSpace(request.Password))
                {
                    return new HTTPResponseClient<LoginResponse>
                    {
                        Message = "Tên đăng nhập và mật khẩu là bắt buộc",
                        StatusCode = 400,
                        Data = null,
                        DateTime = DateTime.Now
                    };
                }

                // Tìm user theo username
                var user = await _context.Users
                    .Include(u => u.Role)
                        .ThenInclude(r => r.RolePermissions)
                            .ThenInclude(rp => rp.Permission)
                    .Include(u => u.Role)
                        .ThenInclude(r => r.RoleCategoryPermissions)
                            .ThenInclude(rcp => rcp.FormCategory)
                                .ThenInclude(fc => fc.ParentCategory)
                    .FirstOrDefaultAsync(u => u.UserName == request.UserName);

                if (user == null)
                {
                    return new HTTPResponseClient<LoginResponse>
                    {
                        Message = "Tên đăng nhập hoặc mật khẩu không đúng",
                        StatusCode = 401,
                        Data = null,
                        DateTime = DateTime.Now
                    };
                }

                // Kiểm tra mật khẩu
                if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PassWord))
                {
                    return new HTTPResponseClient<LoginResponse>
                    {
                        Message = "Tên đăng nhập hoặc mật khẩu không đúng",
                        StatusCode = 401,
                        Data = null,
                        DateTime = DateTime.Now
                    };
                }

                // Tạo token
                var token = _jwtService.GenerateToken(user);
                var expiresAt = DateTime.UtcNow.AddHours(24);

                // Lấy permissions của user
                var permissions = user.Role?.RolePermissions?
                    .Where(rp => rp.Permission != null)
                    .Select(rp => rp.Permission!.PermissionName!)
                    .ToList() ?? new List<string>();

                // Lấy category permissions của user
                var categoryPermissions = user.Role?.RoleCategoryPermissions?
                    .Where(rcp => rcp.CanAcess == true && rcp.FormCategory != null)
                    .Select(rcp => new CategoryPermissionDto
                    {
                        CategoryId = rcp.FormCategory!.Id,
                        CategoryName = rcp.FormCategory.CategoryName,
                        CanAccess = rcp.CanAcess ?? false,
                        CategoryPath = HelperClass.GetCategoryPath(rcp.FormCategory),
                        Level = HelperClass.GetCategoryLevel(rcp.FormCategory)
                    })
                    .ToList() ?? new List<CategoryPermissionDto>();

                var loginResponse = new LoginResponse
                {
                    Token = token,
                    UserName = user.UserName ?? "",
                    Name = user.Name ?? "",
                    UserId = user.Id,
                    RoleName = user.Role?.RoleName ?? "",
                    Permissions = permissions,
                    CategoryPermissions = categoryPermissions,
                    LoginTime = DateTime.Now,
                    ExpiresAt = expiresAt
                };

                return new HTTPResponseClient<LoginResponse>
                {
                    StatusCode = 200,
                    Message = $"Đăng nhập thành công! Chào mừng {user.Name}",
                    Data = loginResponse,
                    DateTime = DateTime.Now
                };
            }
            catch (Exception ex)
            {
                return new HTTPResponseClient<LoginResponse>
                {
                    StatusCode = 500,
                    Message = $"Lỗi hệ thống: {ex.Message}",
                    Data = null,
                    DateTime = DateTime.Now
                };
            }
        }

        public async Task<HTTPResponseClient<ChangePasswordResponse>> ChangePasswordAsync(Guid userId, ChangePasswordRequest request)
        {
            try
            {
                await _unitOfWork.BeginTransaction();

                var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
                if (user == null)
                {
                    await _unitOfWork.RollBack();
                    return new HTTPResponseClient<ChangePasswordResponse>
                    {
                        StatusCode = 404,
                        Message = "Không tìm thấy người dùng",
                        Data = null,
                        DateTime = DateTime.Now
                    };
                }

                // Kiểm tra mật khẩu cũ
                if (!BCrypt.Net.BCrypt.Verify(request.OldPassword, user.PassWord))
                {
                    await _unitOfWork.RollBack();
                    return new HTTPResponseClient<ChangePasswordResponse>
                    {
                        StatusCode = 400,
                        Message = "Mật khẩu cũ không đúng",
                        Data = null,
                        DateTime = DateTime.Now
                    };
                }

                // Kiểm tra mật khẩu mới không được giống mật khẩu cũ
                if (BCrypt.Net.BCrypt.Verify(request.NewPassword, user.PassWord))
                {
                    await _unitOfWork.RollBack();
                    return new HTTPResponseClient<ChangePasswordResponse>
                    {
                        StatusCode = 400,
                        Message = "Mật khẩu mới phải khác mật khẩu cũ",
                        Data = null,
                        DateTime = DateTime.Now
                    };
                }

                // Hash mật khẩu mới
                var hashedNewPassword = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
                user.PassWord = hashedNewPassword;

                _unitOfWork._userRepository.Update(user);
                await _unitOfWork.SaveChangesAsync();
                await _unitOfWork.CommitTransaction();

                var response = new ChangePasswordResponse
                {
                    UserId = userId,
                    UserName = user.UserName ?? "",
                    IsChanged = true,
                    Message = "Đổi mật khẩu thành công",
                    ChangedAt = DateTime.Now
                };

                return new HTTPResponseClient<ChangePasswordResponse>
                {
                    StatusCode = 200,
                    Message = "Đổi mật khẩu thành công",
                    Data = response,
                    DateTime = DateTime.Now
                };
            }
            catch (Exception ex)
            {
                await _unitOfWork.RollBack();
                return new HTTPResponseClient<ChangePasswordResponse>
                {
                    StatusCode = 500,
                    Message = $"Lỗi khi đổi mật khẩu: {ex.Message}",
                    Data = null,
                    DateTime = DateTime.Now
                };
            }
        }

        public async Task<HTTPResponseClient<ResetPasswordResponse>> ResetPasswordAsync(ResetPasswordRequest request)
        {
            try
            {
                await _unitOfWork.BeginTransaction();

                var user = await _context.Users.FirstOrDefaultAsync(u => u.UserName == request.UserName);
                if (user == null)
                {
                    await _unitOfWork.RollBack();
                    return new HTTPResponseClient<ResetPasswordResponse>
                    {
                        StatusCode = 404,
                        Message = "Không tìm thấy người dùng",
                        Data = null,
                        DateTime = DateTime.Now
                    };
                }

                // Hash mật khẩu mới
                var hashedNewPassword = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
                user.PassWord = hashedNewPassword;

                _unitOfWork._userRepository.Update(user);
                await _unitOfWork.SaveChangesAsync();
                await _unitOfWork.CommitTransaction();

                var response = new ResetPasswordResponse
                {
                    UserId = user.Id,
                    UserName = user.UserName ?? "",
                    IsReset = true,
                    Message = "Reset mật khẩu thành công",
                    ResetAt = DateTime.Now
                };

                return new HTTPResponseClient<ResetPasswordResponse>
                {
                    StatusCode = 200,
                    Message = "Reset mật khẩu thành công",
                    Data = response,
                    DateTime = DateTime.Now
                };
            }
            catch (Exception ex)
            {
                await _unitOfWork.RollBack();
                return new HTTPResponseClient<ResetPasswordResponse>
                {
                    StatusCode = 500,
                    Message = $"Lỗi khi reset mật khẩu: {ex.Message}",
                    Data = null,
                    DateTime = DateTime.Now
                };
            }
        }

        public async Task<HTTPResponseClient<object>> ValidateTokenAsync(string token)
        {
            try
            {
                if (string.IsNullOrEmpty(token))
                {
                    return new HTTPResponseClient<object>
                    {
                        StatusCode = 400,
                        Message = "Token không được để trống",
                        Data = null,
                        DateTime = DateTime.Now
                    };
                }

                var userName = _jwtService.DecodePayloadToken(token);
                if (string.IsNullOrEmpty(userName))
                {
                    return new HTTPResponseClient<object>
                    {
                        StatusCode = 401,
                        Message = "Token không hợp lệ",
                        Data = null,
                        DateTime = DateTime.Now
                    };
                }

                var user = await _context.Users
                    .Include(u => u.Role)
                    .FirstOrDefaultAsync(u => u.UserName == userName);

                if (user == null)
                {
                    return new HTTPResponseClient<object>
                    {
                        StatusCode = 401,
                        Message = "User không tồn tại",
                        Data = null,
                        DateTime = DateTime.Now
                    };
                }

                return new HTTPResponseClient<object>
                {
                    StatusCode = 200,
                    Message = "Token hợp lệ",
                    Data = new { userId = user.Id, userName = user.UserName, role = user.Role?.RoleName },
                    DateTime = DateTime.Now
                };
            }
            catch (Exception ex)
            {
                return new HTTPResponseClient<object>
                {
                    StatusCode = 401,
                    Message = $"Token không hợp lệ: {ex.Message}",
                    Data = null,
                    DateTime = DateTime.Now
                };
            }
        }

        public async Task<HTTPResponseClient<LoginResponse>> RefreshTokenAsync(string token)
        {
            try
            {
                var userName = _jwtService.DecodePayloadToken(token);
                if (string.IsNullOrEmpty(userName))
                {
                    return new HTTPResponseClient<LoginResponse>
                    {
                        StatusCode = 401,
                        Message = "Token không hợp lệ",
                        Data = null,
                        DateTime = DateTime.Now
                    };
                }

                var user = await _context.Users
                    .Include(u => u.Role)
                        .ThenInclude(r => r.RolePermissions)
                            .ThenInclude(rp => rp.Permission)
                    .Include(u => u.Role)
                        .ThenInclude(r => r.RoleCategoryPermissions)
                            .ThenInclude(rcp => rcp.FormCategory)
                    .FirstOrDefaultAsync(u => u.UserName == userName);

                if (user == null)
                {
                    return new HTTPResponseClient<LoginResponse>
                    {
                        StatusCode = 401,
                        Message = "User không tồn tại",
                        Data = null,
                        DateTime = DateTime.Now
                    };
                }

                var newToken = _jwtService.GenerateToken(user);
                var expiresAt = DateTime.UtcNow.AddHours(24);

                var permissions = user.Role?.RolePermissions?
                    .Where(rp => rp.Permission != null)
                    .Select(rp => rp.Permission!.PermissionName!)
                    .ToList() ?? new List<string>();

                var categoryPermissions = user.Role?.RoleCategoryPermissions?
                    .Where(rcp => rcp.CanAcess == true && rcp.FormCategory != null)
                    .Select(rcp => new CategoryPermissionDto
                    {
                        CategoryId = rcp.FormCategory!.Id,
                        CategoryName = rcp.FormCategory.CategoryName,
                        CanAccess = rcp.CanAcess ?? false,
                        CategoryPath = HelperClass.GetCategoryPath(rcp.FormCategory),
                        Level = HelperClass.GetCategoryLevel(rcp.FormCategory)
                    })
                    .ToList() ?? new List<CategoryPermissionDto>();

                var refreshResponse = new LoginResponse
                {
                    Token = newToken,
                    UserName = user.UserName ?? "",
                    Name = user.Name ?? "",
                    UserId = user.Id,
                    RoleName = user.Role?.RoleName ?? "",
                    Permissions = permissions,
                    CategoryPermissions = categoryPermissions,
                    LoginTime = DateTime.Now,
                    ExpiresAt = expiresAt
                };

                return new HTTPResponseClient<LoginResponse>
                {
                    StatusCode = 200,
                    Message = "Refresh token thành công",
                    Data = refreshResponse,
                    DateTime = DateTime.Now
                };
            }
            catch (Exception ex)
            {
                return new HTTPResponseClient<LoginResponse>
                {
                    StatusCode = 500,
                    Message = $"Lỗi khi refresh token: {ex.Message}",
                    Data = null,
                    DateTime = DateTime.Now
                };
            }
        }
    }
}