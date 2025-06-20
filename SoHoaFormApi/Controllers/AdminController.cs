using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using SoHoaFormApi.Models.ViewModel.Request;
//using SoHoaFormApi.Models;

namespace SoHoaFormApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _adminService;

        public AdminController(IAdminService adminService)
        {
            _adminService = adminService;
        }
        [HttpGet("")]
        public async Task<IActionResult> TestAdmin()
        {
            return Ok("123");
        }

        [HttpPost("forms")]
        public async Task<ActionResult> CreateForm([FromForm] CreateFormRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _adminService.CreateFormAsync(request, User);

            if (result.StatusCode == 200)
            {
                return Ok(result);
            }

            return StatusCode(result.StatusCode, result);
        }
        [HttpGet("forms/{formId}/fields/")]
        [AllowAnonymous]
        public async Task<IActionResult> GetFormFields(Guid formId)
        {
            var result = await _adminService.GetFormFieldsAsync(formId);

            if (result.StatusCode == 200)
            {
                return Ok(result);
            }

            return StatusCode(result.StatusCode, result);
        }


        [HttpPut("form/{formId}/field/{fieldId}/formula")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateFormula(Guid formId, Guid fieldId, [FromBody] UpdateFormulaRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var result = await _adminService.UpdateFormulaAsync(formId, fieldId, request);

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


        [HttpDelete("forms/{formId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteForm(Guid formId)
        {
            try
            {
                var result = await _adminService.DeleteFormAsync(formId);

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


        [HttpPut("form/{formId}/field/{fieldId}/select-options")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateSelectOptions(Guid formId, Guid fieldId, [FromBody] UpdateSelectOptionsRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var result = await _adminService.UpdateSelectOptionsAsync(formId, fieldId, request);

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


        [HttpPut("form/{formId}/field/{fieldId}/boolean-formula")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateBooleanFormula(Guid formId, Guid fieldId, [FromBody] UpdateBooleanFormulaRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var result = await _adminService.UpdateBooleanFormulaAsync(formId, fieldId, request);

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


        [HttpPut("form/{formId}/field/{fieldId}/toggle-required")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ToggleFieldRequired(Guid formId, Guid fieldId)
        {
            try
            {
                var result = await _adminService.ToggleFieldRequiredAsync(formId, fieldId);

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

        [HttpPut("form/{formId}/field/{fieldId}/toggle-uppercase")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ToggleFieldUpperCase(Guid formId, Guid fieldId)
        {
            try
            {
                var result = await _adminService.ToggleFieldUpperCaseAsync(formId, fieldId);

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