using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Request
{
    public class UpdateCategoryRequest
    {
        [Required(ErrorMessage = "Tên category là bắt buộc")]
        [StringLength(100, ErrorMessage = "Tên category không được vượt quá 100 ký tự")]
        public string CategoryName { get; set; } = string.Empty;

        public Guid? ParentCategoryId { get; set; }
    }
}