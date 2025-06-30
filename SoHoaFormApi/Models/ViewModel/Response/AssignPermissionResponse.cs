using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class AssignPermissionResponse
    {
          public Guid RolePermissionId { get; set; }
        public Guid RoleId { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public Guid PermissionId { get; set; }
        public string PermissionName { get; set; } = string.Empty;
        public bool IsAssigned { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime AssignedAt { get; set; }
    }
}