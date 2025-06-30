using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Request
{
    public class AssignPermissionRequest
    {
        [Required(ErrorMessage = "PermissionId là bắt buộc")]
        public Guid PermissionId { get; set; }
    }
}