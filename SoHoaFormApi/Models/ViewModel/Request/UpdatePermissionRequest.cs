using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Request
{
    public class UpdatePermissionRequest
    {
        [Required(ErrorMessage = "Tên permission là bắt buộc")]
        [StringLength(100, ErrorMessage = "Tên permission không được vượt quá 100 ký tự")]
        public string PermissionName { get; set; } = string.Empty;

        [StringLength(500, ErrorMessage = "Mô tả không được vượt quá 500 ký tự")]
        public string Description { get; set; } = string.Empty;
    }
}