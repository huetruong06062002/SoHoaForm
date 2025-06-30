using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class UpdatePermissionResponse
    {
        public Guid PermissionId { get; set; }
        public string OldPermissionName { get; set; } = string.Empty;
        public string NewPermissionName { get; set; } = string.Empty;
        public string OldDescription { get; set; } = string.Empty;
        public string NewDescription { get; set; } = string.Empty;
        public bool IsUpdated { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime UpdatedAt { get; set; }
    }
}