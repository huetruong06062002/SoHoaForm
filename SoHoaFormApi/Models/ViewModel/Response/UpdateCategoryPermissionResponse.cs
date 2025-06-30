using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class UpdateCategoryPermissionResponse
    {
        public Guid RoleCategoryPermissionId { get; set; }
        public Guid RoleId { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public Guid FormCategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public bool OldCanAccess { get; set; }
        public bool NewCanAccess { get; set; }
        public bool IsUpdated { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime UpdatedAt { get; set; }
    }
}