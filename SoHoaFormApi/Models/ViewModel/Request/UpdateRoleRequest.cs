using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Request
{
    public class UpdateRoleRequest
    {
        [Required(ErrorMessage = "Tên role là bắt buộc")]
        [StringLength(100, ErrorMessage = "Tên role không được vượt quá 100 ký tự")]
        public string RoleName { get; set; } = string.Empty;
    }
}