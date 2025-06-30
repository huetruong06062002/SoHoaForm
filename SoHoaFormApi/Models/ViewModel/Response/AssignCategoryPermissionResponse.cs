using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class AssignCategoryPermissionResponse
    {
        public Guid RoleCategoryPermissionId { get; set; }
        public Guid RoleId { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public Guid FormCategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public bool CanAccess { get; set; }
        public bool IsAssigned { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime AssignedAt { get; set; }
    }
}