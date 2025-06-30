using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.DTO
{
    public class RolePermissionDto
    {
        public Guid Id { get; set; }
        public Guid RoleId { get; set; }

        public string RoleName { get; set; } = string.Empty;
        public Guid PermissionId { get; set; }
        public string PermissionName { get; set; } = string.Empty;
        public Guid FormCategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public Guid? ParentCategoryId { get; set; }
        public string? ParentCategoryName { get; set; }
        public bool CanAccess { get; set; }
        public string CategoryPath { get; set; } = string.Empty;
        public int CategoryLevel { get; set; }
    }
}