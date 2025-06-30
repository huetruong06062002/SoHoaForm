using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using SoHoaFormApi.Models.ViewModel.Request;
//using SoHoaFormApi.Models;

namespace SoHoaFormApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FormCategoryController : ControllerBase
    {
        private readonly IFormCategoryService _formCategoryService;

        public FormCategoryController(IFormCategoryService formCategoryService)
        {
            _formCategoryService = formCategoryService;
        }


        /// <summary>
        ///  Lấy tất cả categories
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllCategories()
        {
            try
            {
                var result = await _formCategoryService.GetAllCategoriesAsync();
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
        /// Tạo category mới
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var result = await _formCategoryService.CreateCategoryAsync(request);
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
        /// PUT /api/formcategory/{id} - Cập nhật category
        /// </summary>
        [HttpPut("{categoryId}")]
        public async Task<IActionResult> UpdateCategory(Guid categoryId, [FromBody] UpdateCategoryRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var result = await _formCategoryService.UpdateCategoryAsync(categoryId, request);
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
        /// DELETE /api/formcategory/{id} - Xóa category
        /// </summary>
        [HttpDelete("{categoryId}")]
        public async Task<IActionResult> DeleteCategory(Guid categoryId)
        {
            try
            {
                var result = await _formCategoryService.DeleteCategoryAsync(categoryId);
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
        /// GET /api/formcategory/tree - Lấy cây phân cấp
        /// </summary>
        [HttpGet("tree")]
        public async Task<IActionResult> GetCategoryTree()
        {
            try
            {
                var result = await _formCategoryService.GetCategoryTreeAsync();
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
        /// GET /api/formcategory/root - Lấy root categories
        /// </summary>
        [HttpGet("root")]
        public async Task<IActionResult> GetRootCategories()
        {
            try
            {
                var result = await _formCategoryService.GetRootCategoriesAsync();
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
        /// GET /api/formcategory/{id} - Lấy category theo ID
        /// </summary>
        [HttpGet("{categoryId}")]
        public async Task<IActionResult> GetCategoryById(Guid categoryId)
        {
            try
            {
                var result = await _formCategoryService.GetCategoryByIdAsync(categoryId);
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
        /// GET /api/formcategory/{id}/children - Lấy categories con
        /// </summary>
        [HttpGet("{parentId}/children")]
        public async Task<IActionResult> GetChildCategories(Guid parentId)
        {
            try
            {
                var result = await _formCategoryService.GetChildCategoriesAsync(parentId);
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