// using Microsoft.AspNetCore.Authorization;
// using Microsoft.AspNetCore.Mvc;
// using SoHoaFormApi.Infrastructure.Authorization;
// using SoHoaFormApi.Infrastructure.Services;
// using SoHoaFormApi.Models.ViewModel.Request;

// namespace SoHoaFormApi.Controllers
// {
//     [Route("api/[controller]")]
//     [ApiController]
//     [Authorize] // Yêu cầu đăng nhập
//     public class FormController : ControllerBase
//     {
//         private readonly IFormService _formService;

//         public FormController(IFormService formService)
//         {
//             _formService = formService;
//         }

//         /// <summary>
//         /// Lấy tất cả forms - Cần quyền VIEW_FORM
//         /// </summary>
//         [HttpGet]
//         [RequirePermission("VIEW_FORM")]
//         public async Task<IActionResult> GetAllForms()
//         {
//             var result = await _formService.GetAllFormsAsync();
//             return StatusCode(result.StatusCode, result);
//         }

//         /// <summary>
//         /// Lấy forms theo category - Cần quyền VIEW_FORM và access category
//         /// </summary>
//         [HttpGet("category/{categoryId}")]
//         [RequirePermissionAndCategory("VIEW_FORM", "categoryId")]
//         public async Task<IActionResult> GetFormsByCategory(Guid categoryId)
//         {
//             var result = await _formService.GetFormsByCategoryAsync(categoryId);
//             return StatusCode(result.StatusCode, result);
//         }

//         /// <summary>
//         /// Tạo form mới - Cần quyền CREATE_FORM và access category
//         /// </summary>
//         [HttpPost]
//         [RequirePermission("CREATE_FORM")]
//         public async Task<IActionResult> CreateForm([FromBody] CreateFormRequest request)
//         {
//             // Kiểm tra category access riêng trong method
//             if (!await HasCategoryAccess(request.CategoryId))
//             {
//                 return Forbid("Bạn không có quyền tạo form trong category này");
//             }

//             var result = await _formService.CreateFormAsync(request);
//             return StatusCode(result.StatusCode, result);
//         }

//         /// <summary>
//         /// Cập nhật form - Cần quyền EDIT_FORM
//         /// </summary>
//         [HttpPut("{formId}")]
//         [RequirePermission("EDIT_FORM")]
//         public async Task<IActionResult> UpdateForm(Guid formId, [FromBody] UpdateFormRequest request)
//         {
//             var result = await _formService.UpdateFormAsync(formId, request);
//             return StatusCode(result.StatusCode, result);
//         }

//         /// <summary>
//         /// Xóa form - Cần quyền DELETE_FORM
//         /// </summary>
//         [HttpDelete("{formId}")]
//         [RequirePermission("DELETE_FORM")]
//         public async Task<IActionResult> DeleteForm(Guid formId)
//         {
//             var result = await _formService.DeleteFormAsync(formId);
//             return StatusCode(result.StatusCode, result);
//         }

//         /// <summary>
//         /// Export PDF - Cần quyền EXPORT_PDF
//         /// </summary>
//         [HttpPost("{formId}/export-pdf")]
//         [RequirePermission("EXPORT_PDF")]
//         public async Task<IActionResult> ExportToPdf(Guid formId)
//         {
//             var result = await _formService.ExportToPdfAsync(formId);
//             return StatusCode(result.StatusCode, result);
//         }

//         // Helper method để check category access
//         private async Task<bool> HasCategoryAccess(Guid categoryId)
//         {
//             var userNameClaim = User.FindFirst("UserName");
//             if (userNameClaim == null) return false;

//             var unitOfWork = HttpContext.RequestServices.GetRequiredService<IUnitOfWork>();
//             var userRepo = unitOfWork._userRepository;
            
//             return await userRepo.HasCategoryAccessAsync(userNameClaim.Value, categoryId);
//         }
//     }
// }