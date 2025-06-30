using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SoHoaFormApi.Infrastructure.Services;
using SoHoaFormApi.Models.ViewModel.Request;
using SoHoaFormApi.Models.ViewModel.Response;

namespace SoHoaFormApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "admin")]
    public class RoleCategoryPermissionController : ControllerBase
    {
        private readonly IRoleCategoryPermissionService _roleCategoryPermissionService;

        public RoleCategoryPermissionController(IRoleCategoryPermissionService roleCategoryPermissionService)
        {
            _roleCategoryPermissionService = roleCategoryPermissionService;
        }

        /// <summary>
        /// GET /api/rolecategorypermission - Lấy tất cả
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllRoleCategoryPermissions()
        {
            try
            {
                var result = await _roleCategoryPermissionService.GetAllRoleCategoryPermissionsAsync();
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
        /// GET /api/rolecategorypermission/role/{roleId} - Theo role
        /// </summary>
        [HttpGet("role/{roleId}")]
        public async Task<IActionResult> GetRoleCategoryPermissionsByRole(Guid roleId)
        {
            try
            {
                var result = await _roleCategoryPermissionService.GetRoleCategoryPermissionsByRoleAsync(roleId);
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
        /// GET /api/rolecategorypermission/category/{categoryId} - Theo category
        /// </summary>
        [HttpGet("category/{categoryId}")]
        public async Task<IActionResult> GetRoleCategoryPermissionsByCategory(Guid categoryId)
        {
            try
            {
                var result = await _roleCategoryPermissionService.GetRoleCategoryPermissionsByCategoryAsync(categoryId);
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
        /// GET /api/rolecategorypermission/user/{userId} - Theo user
        /// </summary>
        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetUserCategoryPermissions(Guid userId)
        {
            try
            {
                var result = await _roleCategoryPermissionService.GetUserCategoryPermissionsAsync(userId);
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
        /// POST /api/rolecategorypermission - Assign permission
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> AssignCategoryPermission([FromBody] AssignCategoryPermissionRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var result = await _roleCategoryPermissionService.AssignCategoryPermissionToRoleAsync(request);
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
        /// PUT /api/rolecategorypermission/{id} - Cập nhật permission
        /// </summary>
        [HttpPut("{roleCategoryPermissionId}")]
        public async Task<IActionResult> UpdateCategoryPermission(Guid roleCategoryPermissionId, [FromBody] UpdateCategoryPermissionRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var result = await _roleCategoryPermissionService.UpdateCategoryPermissionAsync(roleCategoryPermissionId, request);
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
        /// DELETE /api/rolecategorypermission/role/{roleId}/category/{categoryId} - Xóa permission
        /// </summary>
        [HttpDelete("role/{roleId}/category/{categoryId}")]
        public async Task<IActionResult> RemoveCategoryPermission(Guid roleId, Guid categoryId)
        {
            try
            {
                var result = await _roleCategoryPermissionService.RemoveCategoryPermissionFromRoleAsync(roleId, categoryId);
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