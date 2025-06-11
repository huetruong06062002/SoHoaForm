using Microsoft.EntityFrameworkCore;
using SoHoaFormApi.Models.DbSoHoaForm;
using SoHoaFormApi.Models.ViewModel.Request;
using SoHoaFormApi.Models.ViewModel.Response;

namespace SoHoaFormApi.Infrastructure.Services
{
    public class AuthService
    {
        private readonly SoHoaFormContext _context;
        private readonly JwtAuthService _jwtService;

        public AuthService(SoHoaFormContext context, JwtAuthService jwtService)
        {
            _context = context;
            _jwtService = jwtService;
        }

        public async Task<LoginResponse> LoginAsync(LoginRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Role))
                {
                    return new LoginResponse
                    {
                        Success = false,
                        Message = "Role is required"
                    };
                }

                var role = request.Role.ToLower();
                if (role != "admin" && role != "user")
                {
                    return new LoginResponse
                    {
                        Success = false,
                        Message = "Role must be 'admin' or 'user'"
                    };
                }

                // Tìm hoặc tạo user với role tương ứng
                var dbRole = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName.ToLower() == role);
                if (dbRole == null)
                {
                    return new LoginResponse
                    {
                        Success = false,
                        Message = "Invalid role"
                    };
                }

                var user = await _context.Users.FirstOrDefaultAsync(u => u.RoleId == dbRole.Id);
                if (user == null)
                {
                    // Tạo user mới nếu chưa có
                    user = new User
                    {
                        Id = Guid.NewGuid(),
                        Name = role == "admin" ? "Admin" : "User",
                        RoleId = dbRole.Id
                    };
                    _context.Users.Add(user);
                    await _context.SaveChangesAsync();
                }

                var token = _jwtService.GenerateToken(user);

                return new LoginResponse
                {
                    Token = token,
                    Role = role,
                    UserId = user.Id,
                    Success = true,
                    Message = "Login successful"
                };
            }
            catch (Exception ex)
            {
                return new LoginResponse
                {
                    Success = false,
                    Message = $"Login failed: {ex.Message}"
                };
            }
        }
    }
}