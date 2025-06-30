using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class RemovePermissionResponse
    {
         public Guid RoleId { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public Guid PermissionId { get; set; }
        public string PermissionName { get; set; } = string.Empty;
        public bool IsRemoved { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime RemovedAt { get; set; }
    }
}