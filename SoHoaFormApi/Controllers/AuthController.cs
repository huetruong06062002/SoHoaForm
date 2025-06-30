using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SoHoaFormApi.Infrastructure.Services;
using SoHoaFormApi.Models.ViewModel.Request;
using SoHoaFormApi.Models.ViewModel.Response;
using System.Security.Claims;

namespace SoHoaFormApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        /// <summary>
        /// Đăng nhập bằng username và password
        /// </summary>
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var result = await _authService.LoginAsync(request);
                return StatusCode(result.StatusCode, result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new HTTPResponseClient<object>
                {
                    StatusCode = 500,
                    Message = $"Internal server error: {ex.Message}",
                    Data = null,
                    DateTime = DateTime.Now
                });
            }
        }

        /// <summary>
        /// Đổi mật khẩu
        /// </summary>
        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                // Lấy UserId từ token
                var userIdClaim = User.FindFirst("UserId");
                if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                {
                    return BadRequest(new HTTPResponseClient<object>
                    {
                        StatusCode = 400,
                        Message = "Không thể xác định UserId",
                        Data = null,
                        DateTime = DateTime.Now
                    });
                }

                var result = await _authService.ChangePasswordAsync(userId, request);
                return StatusCode(result.StatusCode, result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new HTTPResponseClient<object>
                {
                    StatusCode = 500,
                    Message = $"Internal server error: {ex.Message}",
                    Data = null,
                    DateTime = DateTime.Now
                });
            }
        }

        /// <summary>
        /// Reset mật khẩu (chỉ Admin)
        /// </summary>
        [HttpPost("reset-password")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var result = await _authService.ResetPasswordAsync(request);
                return StatusCode(result.StatusCode, result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new HTTPResponseClient<object>
                {
                    StatusCode = 500,
                    Message = $"Internal server error: {ex.Message}",
                    Data = null,
                    DateTime = DateTime.Now
                });
            }
        }

        /// <summary>
        /// Validate token
        /// </summary>
        [HttpPost("validate-token")]
        public async Task<IActionResult> ValidateToken([FromBody] ValidateTokenRequest request)
        {
            try
            {
                var result = await _authService.ValidateTokenAsync(request.Token);
                return StatusCode(result.StatusCode, result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new HTTPResponseClient<object>
                {
                    StatusCode = 500,
                    Message = $"Internal server error: {ex.Message}",
                    Data = null,
                    DateTime = DateTime.Now
                });
            }
        }

        /// <summary>
        /// Refresh token
        /// </summary>
        [HttpPost("refresh-token")]
        public async Task<IActionResult> RefreshToken([FromBody] ValidateTokenRequest request)
        {
            try
            {
                var result = await _authService.RefreshTokenAsync(request.Token);
                return StatusCode(result.StatusCode, result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new HTTPResponseClient<object>
                {
                    StatusCode = 500,
                    Message = $"Internal server error: {ex.Message}",
                    Data = null,
                    DateTime = DateTime.Now
                });
            }
        }

        /// <summary>
        /// Lấy thông tin user hiện tại
        /// </summary>
        [HttpGet("profile")]
        [Authorize]
        public async Task<IActionResult> GetProfile()
        {
            try
            {
                var userIdClaim = User.FindFirst("UserId");
                var userNameClaim = User.FindFirst("UserName");
                var roleClaim = User.FindFirst(ClaimTypes.Role);

                if (userIdClaim == null || userNameClaim == null)
                {
                    return BadRequest(new HTTPResponseClient<object>
                    {
                        StatusCode = 400,
                        Message = "Không thể xác định thông tin user",
                        Data = null,
                        DateTime = DateTime.Now
                    });
                }

                var profile = new
                {
                    UserId = userIdClaim.Value,
                    UserName = userNameClaim.Value,
                    Role = roleClaim?.Value ?? "",
                    Claims = User.Claims.Select(c => new { c.Type, c.Value }).ToList()
                };

                return Ok(new HTTPResponseClient<object>
                {
                    StatusCode = 200,
                    Message = "Lấy thông tin profile thành công",
                    Data = profile,
                    DateTime = DateTime.Now
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new HTTPResponseClient<object>
                {
                    StatusCode = 500,
                    Message = $"Internal server error: {ex.Message}",
                    Data = null,
                    DateTime = DateTime.Now
                });
            }
        }
    }

}