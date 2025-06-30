using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SoHoaFormApi.Infrastructure.Services;
using SoHoaFormApi.Models.ViewModel.Request;
using SoHoaFormApi.Models.ViewModel.Response;
using System;
using System.Threading.Tasks;

namespace SoHoaFormApi.Controllers
{
  [Route("api/[controller]")]
  [ApiController]
  [Authorize(Roles = "admin")]
  public class UserManagementController : ControllerBase
  {
    private readonly IUserManagementService _userManagementService;

    public UserManagementController(IUserManagementService userManagementService)
    {
      _userManagementService = userManagementService;
    }

    /// <summary>
    /// Lấy tất cả users
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAllUsers()
    {
      try
      {
        var result = await _userManagementService.GetAllUsersAsync();
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
    /// Lấy user theo ID
    /// </summary>
    [HttpGet("{userId}")]
    public async Task<IActionResult> GetUserById(Guid userId)
    {
      try
      {
        var result = await _userManagementService.GetUserByIdAsync(userId);
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
    /// Tạo user mới (RoleId optional - nếu không điền thì tạo user không gán role)
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
      try
      {
        if (!ModelState.IsValid)
        {
          return BadRequest(ModelState);
        }

        var result = await _userManagementService.CreateUserAsync(request);
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
    /// Cập nhật user
    /// </summary>
    [HttpPut("{userId}")]
    public async Task<IActionResult> UpdateUser(Guid userId, [FromBody] UpdateUserRequest request)
    {
      try
      {
        if (!ModelState.IsValid)
        {
          return BadRequest(ModelState);
        }

        var result = await _userManagementService.UpdateUserAsync(userId, request);
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
    /// Xóa user
    /// </summary>
    [HttpDelete("{userId}")]
    public async Task<IActionResult> DeleteUser(Guid userId)
    {
      try
      {
        var result = await _userManagementService.DeleteUserAsync(userId);
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
    /// Assign role cho user
    /// </summary>
    [HttpPost("{userId}/assign-role")]
    public async Task<IActionResult> AssignRole(Guid userId, [FromBody] AssignRoleRequest request)
    {
      try
      {
        if (!ModelState.IsValid)
        {
          return BadRequest(ModelState);
        }

        var result = await _userManagementService.AssignRoleToUserAsync(userId, request.RoleId);
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
    /// Thêm role cho user (quan hệ nhiều-nhiều)
    /// </summary>
    [HttpPost("{userId}/roles/{roleId}")]
    public async Task<IActionResult> AddRoleToUser(Guid userId, Guid roleId)
    {
      try
      {
        var result = await _userManagementService.AddRoleToUserAsync(userId, roleId);
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
    /// Xóa role khỏi user (quan hệ nhiều-nhiều)
    /// </summary>
    [HttpDelete("{userId}/roles/{roleId}")]
    public async Task<IActionResult> RemoveRoleFromUser(Guid userId, Guid roleId)
    {
      try
      {
        var result = await _userManagementService.RemoveRoleFromUserAsync(userId, roleId);
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
    /// Lấy tất cả roles của user
    /// </summary>
    [HttpGet("{userId}/roles")]
    public async Task<IActionResult> GetUserRoles(Guid userId)
    {
      try
      {
        var result = await _userManagementService.GetUserRolesAsync(userId);
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
    /// Tìm kiếm users với phân trang
    /// </summary>
    [HttpGet("search")]
    public async Task<IActionResult> SearchUsers(
        [FromQuery] string? searchTerm = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
      try
      {
        var result = await _userManagementService.SearchUsersAsync(searchTerm ?? "", pageNumber, pageSize);
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
    /// Lấy users theo role
    /// </summary>
    [HttpGet("by-role/{roleId}")]
    public async Task<IActionResult> GetUsersByRole(Guid roleId)
    {
      try
      {
        var result = await _userManagementService.GetUsersByRoleAsync(roleId);
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

  }
}