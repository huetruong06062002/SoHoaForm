using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Request
{
    public class CreateFormRequest
    {
        [Required(ErrorMessage = "Tên form là bắt buộc")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Tên danh mục là bắt buộc")]
        public string CategoryName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Vui lòng chọn file")]
        public IFormFile? WordFile { get; set; } = null!;

    }
}