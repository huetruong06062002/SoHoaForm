using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SoHoaFormApi.Infrastructure.Services;
using SoHoaFormApi.Models.DbSoHoaForm;
using SoHoaFormApi.Models.DTO;
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
    }
}