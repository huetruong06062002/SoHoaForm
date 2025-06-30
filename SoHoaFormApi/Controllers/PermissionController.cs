using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using SoHoaFormApi.Models.ViewModel.Request;


namespace SoHoaFormApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PermissionController : ControllerBase
    {
        private readonly IPermissionService _permissionService;

        public PermissionController(IPermissionService permissionService)
        {
            _permissionService = permissionService;
        }
        [HttpGet]
        public async Task<IActionResult> GetAllPermissions()
        {
            try
            {
                var result = await _permissionService.GetAllPermissionsAsync();
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
        [HttpPost]
        public async Task<IActionResult> CreatePermission([FromBody] CreatePermissionRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var result = await _permissionService.CreatePermissionAsync(request);
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
       
        
        [HttpPut("{permissionId}")]
        public async Task<IActionResult> UpdatePermission(Guid permissionId, [FromBody] UpdatePermissionRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var result = await _permissionService.UpdatePermissionAsync(permissionId, request);
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
        
        [HttpDelete("{permissionId}")]
        public async Task<IActionResult> DeletePermission(Guid permissionId)
        {
            try
            {
                var result = await _permissionService.DeletePermissionAsync(permissionId);
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