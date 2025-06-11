using Microsoft.EntityFrameworkCore;
using SoHoaFormApi.Models.DbSoHoaForm;
using SoHoaFormApi.Models.ViewModel.Request;
using SoHoaFormApi.Models.ViewModel.Response;

namespace SoHoaFormApi.Infrastructure.Services
{
    public interface IAuthService
    {
        Task<HTTPResponseClient<LoginResponse>> LoginAsync(LoginRequest request);
    }

    public class AuthService : IAuthService
    {
        private readonly SoHoaFormContext _context;
        private readonly JwtAuthService _jwtService;

        public AuthService(SoHoaFormContext context, JwtAuthService jwtService)
        {
            _context = context;
            _jwtService = jwtService;
        }

        public async Task<HTTPResponseClient<LoginResponse>> LoginAsync(LoginRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Role))
                {
                    return new HTTPResponseClient<LoginResponse>
                    {
                        Message = "Role is required",
                        StatusCode = 400,
                        Data = null,
                        DateTime = DateTime.Now,
                    };
                }

                var role = request.Role.ToLower();
                if (role != "admin" && role != "user")
                {
                    return new HTTPResponseClient<LoginResponse>
                    {
                        Message = "Role must be 'admin' or 'user'",
                        StatusCode = 400,
                        Data = null,
                        DateTime = DateTime.Now,
                    };
                }

                // Tìm hoặc tạo user với role tương ứng
                var dbRole = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName.ToLower() == role);
                if (dbRole == null)
                {
                    return new HTTPResponseClient<LoginResponse>
                    {
                        Message = "Invalid role",
                        StatusCode = 400,
                        Data = null,
                        DateTime = DateTime.Now,
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

                var loginResponse = new LoginResponse
                {
                    Token = token,
                    Role = role,
                    UserId = user.Id,
                    Success = true,
                    Message = "Login successful"
                };

                return new HTTPResponseClient<LoginResponse>
                {
                    Message = "Login successful",
                    StatusCode = 200,
                    Data = loginResponse,
                    DateTime = DateTime.Now,
                };
            }
            catch (Exception ex)
            {
                return new HTTPResponseClient<LoginResponse>
                {
                    Message = $"Login failed: {ex.Message}",
                    StatusCode = 500,
                    Data = null,
                    DateTime = DateTime.Now,
                };
            }
        }
    }
}