using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class AssignRoleResponse
    {
        public Guid UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public Guid OldRoleId { get; set; }
        public Guid NewRoleId { get; set; }
        public string OldRoleName { get; set; } = string.Empty;
        public string NewRoleName { get; set; } = string.Empty;
        public bool IsAssigned { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime AssignedAt { get; set; }
    }
}