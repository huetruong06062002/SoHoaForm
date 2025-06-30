using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class UpdateRoleResponse
    {
        public Guid RoleId { get; set; }
        public string OldRoleName { get; set; } = string.Empty;
        public string NewRoleName { get; set; } = string.Empty;
        public bool IsUpdated { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime UpdatedAt { get; set; }
    }
}