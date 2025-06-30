using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Request
{
    public class AssignRoleRequest
    {
        [Required(ErrorMessage = "RoleId là bắt buộc")]
        public Guid RoleId { get; set; }
    }
}