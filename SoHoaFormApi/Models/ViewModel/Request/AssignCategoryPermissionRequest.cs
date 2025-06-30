using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Request
{
    public class AssignCategoryPermissionRequest
    {
        [Required(ErrorMessage = "RoleId là bắt buộc")]
        public Guid RoleId { get; set; }

        [Required(ErrorMessage = "FormCategoryId là bắt buộc")]
        public Guid FormCategoryId { get; set; }

        public bool CanAccess { get; set; } = true;
    }
}