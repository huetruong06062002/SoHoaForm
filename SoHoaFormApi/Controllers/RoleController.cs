using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using SoHoaFormApi.Infrastructure.Services;
using SoHoaFormApi.Models.ViewModel.Request;
using SoHoaFormApi.Models.ViewModel.Response;

namespace SoHoaFormApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "admin")]
    public class RoleController : ControllerBase
    {
        private readonly ILogger<RoleController> _logger;
        private readonly IRoleService _roleService;

        public RoleController(ILogger<RoleController> logger, IRoleService roleService)
        {
            _logger = logger;
            _roleService = roleService;
        }

        /// <summary>
        /// Lấy tất cả roles
        /// </summary>
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAllRoles()
        {
            try
            {
                var result = await _roleService.GetAllRolesAsync();
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
        ///  Lấy role theo ID
        /// </summary>
        [HttpGet("{roleId}")]
        public async Task<IActionResult> GetRoleById(Guid roleId)
        {
            try
            {
                var result = await _roleService.GetRoleByIdAsync(roleId);
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
        /// Tạo role mới
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateRole([FromBody] CreateRoleRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var result = await _roleService.CreateRoleAsync(request);
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
        ///  Cập nhật role
        /// </summary>
        [HttpPut("{roleId}")]
        public async Task<IActionResult> UpdateRole(Guid roleId, [FromBody] UpdateRoleRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var result = await _roleService.UpdateRoleAsync(roleId, request);
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
        /// Xóa role
        /// </summary>
        [HttpDelete("{roleId}")]
        public async Task<IActionResult> DeleteRole(Guid roleId)
        {
            try
            {
                var result = await _roleService.DeleteRoleAsync(roleId);
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
        /// Lấy permissions của role
        /// </summary>
        [HttpGet("{roleId}/permissions")]
        public async Task<IActionResult> GetRolePermissions(Guid roleId)
        {
            try
            {
                var result = await _roleService.GetRolePermissionsAsync(roleId);
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
        /// Assign permission cho role
        /// </summary>
        [HttpPost("{roleId}/permissions")]
        public async Task<IActionResult> AssignPermissionToRole(Guid roleId, [FromBody] AssignPermissionRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var result = await _roleService.AssignPermissionToRoleAsync(roleId, request);
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
        /// Xóa permission khỏi role
        /// </summary>
        [HttpDelete("{roleId}/permissions/{permissionId}")]
        public async Task<IActionResult> RemovePermissionFromRole(Guid roleId, Guid permissionId)
        {
            try
            {
                var result = await _roleService.RemovePermissionFromRoleAsync(roleId, permissionId);
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