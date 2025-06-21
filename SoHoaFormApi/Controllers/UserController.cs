using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SoHoaFormApi.Infrastructure.Services;
using SoHoaFormApi.Models.DbSoHoaForm;
using SoHoaFormApi.Models.DTO;
using SoHoaFormApi.Models.ViewModel.Request;
using SoHoaFormApi.Models.ViewModel.Response;
//using SoHoaFormApi.Models;

namespace SoHoaFormApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;

        private readonly IAdminService _adminService;
        private readonly SoHoaFormContext _context;
        private readonly IWebHostEnvironment _environment;
        private readonly IWordReaderService _wordReaderService;

        public UserController(
            IUserService userService
            , SoHoaFormContext context
            , IWebHostEnvironment environment
            , IWordReaderService wordReaderService
            , IAdminService adminService
        )
        {
            _userService = userService;
            _context = context;
            _environment = environment;
            _wordReaderService = wordReaderService;
            _adminService = adminService;
        }

        [HttpGet("")]
        public async Task<ActionResult> TestUser()
        {


            return Ok("123");
        }
        [HttpGet("GetAllFormWithCategory")]
        public async Task<ActionResult> GetAllFormsCategory()
        {
            var response = await _userService.GetAllFormsCategoryAsync();
            if (response.StatusCode != 200)
            {
                return StatusCode(response.StatusCode, response);
            }
            return Ok(response);
        }

        [HttpGet("form/{formId}/content")]
        public async Task<IActionResult> GetFormWithContent(Guid formId)
        {
            try
            {
                var form = await _context.Forms.FirstOrDefaultAsync(f => f.Id == formId);
                if (form == null)
                {
                    return NotFound("Form not found");
                }

                // Đọc nội dung từ Word file
                var wordContent = await _wordReaderService.ReadWordContentAsync(form.WordFilePath);

                // Lấy fields từ database
                var fields = await _adminService.GetFormFieldsAsync(formId);

                var response = new FormWithContentResponse
                {
                    FormId = formId,
                    FormName = form.Name,
                    WordContent = wordContent,
                    Fields = fields.Data.Fields
                };

                return Ok(new HTTPResponseClient<FormWithContentResponse>
                {
                    StatusCode = 200,
                    Message = "Form content retrieved successfully",
                    DateTime = DateTime.Now,
                    Data = response

                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new HTTPResponseClient<object>
                {
                    StatusCode = 500,
                    Message = ex.Message,
                    DateTime = DateTime.Now,
                    Data = null
                });
            }
        }


        [HttpGet("form/{formId}/word-file")]
        public async Task<IActionResult> GetFormWordFile(Guid formId)
        {
            try
            {
                var form = await _context.Forms.FirstOrDefaultAsync(f => f.Id == formId);
                if (form == null)
                {
                    return NotFound("Form not found");
                }

                if (string.IsNullOrEmpty(form.WordFilePath))
                {
                    return NotFound("Word file not found for this form");
                }

                // Tạo full path
                var fullPath = Path.Combine(_environment.WebRootPath ?? "", form.WordFilePath.TrimStart('/'));

                if (!System.IO.File.Exists(fullPath))
                {
                    return NotFound("Word file does not exist");
                }

                // Đọc file và trả về
                var fileBytes = await System.IO.File.ReadAllBytesAsync(fullPath);
                var fileName = Path.GetFileName(form.WordFilePath);

                return File(fileBytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", fileName);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error retrieving Word file: {ex.Message}");
            }
        }

        [HttpGet("form/{formId}/info")]
        public async Task<IActionResult> GetFormInfo(Guid formId)
        {
            try
            {
                var form = await _context.Forms
                    .Include(f => f.Category)
                    .FirstOrDefaultAsync(f => f.Id == formId);

                if (form == null)
                {
                    return NotFound("Form not found");
                }

                // Lấy fields để biết cần điền gì
                var fields = await _adminService.GetFormFieldsAsync(formId);

                var response = new FormInfoResponse
                {
                    FormId = formId,
                    FormName = form.Name,
                    CategoryName = form.Category?.CategoryName,
                    WordFileUrl = $"/api/user/form/{formId}/word-file", // URL để download file
                    HasWordFile = !string.IsNullOrEmpty(form.WordFilePath),
                    Fields = fields.Data?.Fields ?? new List<FormFieldDto>(),
                    CreatedAt = form?.CreatedAt
                };

                return Ok(new HTTPResponseClient<FormInfoResponse>
                {
                    StatusCode = 200,
                    Message = "Form info retrieved successfully",
                    Data = response,
                    DateTime = DateTime.Now
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        [HttpGet("form/{formId}/information")]
        public async Task<IActionResult> GetFormInformation(Guid formId)
        {
            try
            {
                var result = await _userService.GetFormInformationAsync(formId);

                if (result.Data == null)
                {
                    if (result.StatusCode == 404)
                    {
                        return NotFound(result);
                    }
                    return BadRequest(result);
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new HTTPResponseClient<object>
                {
                    Data = null,
                    Message = $"Internal server error: {ex.Message}",
                    StatusCode = 500,
                    DateTime = DateTime.Now
                });
            }
        }

        [HttpGet("forms/order-by-category")]
        public async Task<IActionResult> GetAllFormsOrderByCategory()
        {
            try
            {
                var result = await _userService.GetAllFormsOrderByCategoryAsync();

                if (result.Data == null)
                {
                    return StatusCode(result.StatusCode, result);
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new HTTPResponseClient<object>
                {
                    Message = $"Internal server error: {ex.Message}",
                    StatusCode = 500,
                    DateTime = DateTime.Now
                });
            }
        }


        [HttpGet("fill-form/{formId}")]
        [Authorize]
        public async Task<IActionResult> GetUserFillForm(Guid formId)
        {
            try
            {
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

                var userFillForm = await _context.UserFillForms
                    .Include(uff => uff.Form)
                    .Include(uff => uff.User)
                    .FirstOrDefaultAsync(uff => uff.FormId == formId && uff.UserId == userId);

                if (userFillForm == null)
                {
                    return NotFound(new HTTPResponseClient<object>
                    {
                        StatusCode = 404,
                        Message = "Không tìm thấy dữ liệu đã lưu",
                        Data = null,
                        DateTime = DateTime.Now
                    });
                }

                // Parse JSON field values về List<FieldValueDto>
                List<FieldValueDto>? fieldValues = null;
                if (!string.IsNullOrEmpty(userFillForm.JsonFieldValue))
                {
                    try
                    {
                        fieldValues = System.Text.Json.JsonSerializer.Deserialize<List<FieldValueDto>>(
                            userFillForm.JsonFieldValue,
                            new JsonSerializerOptions
                            {
                                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                            });
                    }
                    catch
                    {
                        fieldValues = new List<FieldValueDto>();
                    }
                }

                var response = new
                {
                    UserFillFormId = userFillForm.Id,
                    FormId = userFillForm.FormId,
                    FormName = userFillForm.Form?.Name,
                    UserId = userFillForm.UserId,
                    UserName = userFillForm.User?.Name,
                    Status = userFillForm.Status,
                    FieldValues = fieldValues ?? new List<FieldValueDto>(),
                    LastUpdated = userFillForm.DateTime
                };

                return Ok(new HTTPResponseClient<object>
                {
                    StatusCode = 200,
                    Message = "Lấy dữ liệu thành công",
                    Data = response,
                    DateTime = DateTime.Now
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new HTTPResponseClient<object>
                {
                    StatusCode = 500,
                    Message = $"Lỗi khi lấy dữ liệu: {ex.Message}",
                    Data = null,
                    DateTime = DateTime.Now
                });
            }
        }

        [HttpPost("fill-form/save")]
        [Authorize] // Yêu cầu đăng nhập
        public async Task<IActionResult> SaveUserFillForm([FromBody] SaveUserFillFormRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                // Lấy UserId từ token nếu không được truyền
                if (request.UserId == Guid.Empty)
                {
                    var userIdClaim = User.FindFirst("UserId");
                    if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var tokenUserId))
                    {
                        request.UserId = tokenUserId;
                    }
                    else
                    {
                        return BadRequest(new HTTPResponseClient<object>
                        {
                            StatusCode = 400,
                            Message = "Không thể xác định UserId",
                            Data = null,
                            DateTime = DateTime.Now
                        });
                    }
                }

                var result = await _userService.SaveUserFillFormAsync(request);

                if (result.StatusCode != 200)
                {
                    return StatusCode(result.StatusCode, result);
                }

                return Ok(result);
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


        [HttpGet("fill-form/latest/{formId}")]
        public async Task<IActionResult> GetLatestFieldValuesByFormId(Guid formId)
        {
            try
            {
                var result = await _userService.GetLatestFieldValuesByFormIdAsync(formId);

                if (result.StatusCode != 200)
                {
                    return StatusCode(result.StatusCode, result);
                }

                return Ok(result);
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

        [HttpGet("user-fill-forms/form/{formId}/ids")]
        public async Task<IActionResult> GetUserFillFormIdsByFormId(Guid formId)
        {
            try
            {
                var result = await _userService.GetUserFillFormIdsByFormIdAsync(formId);

                if (result.StatusCode != 200)
                {
                    return StatusCode(result.StatusCode, result);
                }

                return Ok(result);
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

        [HttpGet("user-fill-form/{userFillFormId}/json-field-value")]
        public async Task<IActionResult> GetJsonFieldValueByUserFillFormId(Guid userFillFormId)
        {
            try
            {
                var result = await _userService.GetJsonFieldValueByUserFillFormIdAsync(userFillFormId);

                if (result.StatusCode != 200)
                {
                    return StatusCode(result.StatusCode, result);
                }

                return Ok(result);
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

        [HttpPut("user-fill-form/{userFillFormId}/update-field-values")]
        [Authorize]
        public async Task<IActionResult> UpdateUserFillFormFieldValues(Guid userFillFormId, [FromBody] UpdateUserFillFormRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                // Lấy UserId từ token để verify ownership
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

                var result = await _userService.UpdateUserFillFormFieldValuesAsync(userFillFormId, userId, request);

                if (result.StatusCode != 200)
                {
                    return StatusCode(result.StatusCode, result);
                }

                return Ok(result);
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

        [HttpGet("user-fill-form/{userFillFormId}/raw-json")]
        public async Task<IActionResult> GetRawJsonFieldValue(Guid userFillFormId)
        {
            try
            {
                var result = await _userService.GetRawJsonFieldValueAsync(userFillFormId);

                if (result.StatusCode != 200)
                {
                    return StatusCode(result.StatusCode, result);
                }

                return Ok(result);
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

        // ...existing code...
        [HttpPut("fill-form/{userFillFormId}/complete")]
        [Authorize]
        public async Task<IActionResult> CompleteUserFillForm(Guid userFillFormId)
        {
            try
            {
                // Lấy UserId từ token để verify ownership
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

                var result = await _userService.CompleteUserFillFormAsync(userFillFormId, userId);

                if (result.StatusCode != 200)
                {
                    return StatusCode(result.StatusCode, result);
                }

                return Ok(result);
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