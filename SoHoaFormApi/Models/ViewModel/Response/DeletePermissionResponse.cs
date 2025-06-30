using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class DeletePermissionResponse
    {
        public Guid DeletedPermissionId { get; set; }
        public string PermissionName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public bool IsDeleted { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime DeletedAt { get; set; }
    }
}