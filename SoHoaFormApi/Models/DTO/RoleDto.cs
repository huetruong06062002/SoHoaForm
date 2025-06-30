using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.DTO
{
    public class RoleDto
    {
        public Guid Id { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public int PermissionCount { get; set; }
        public int CategoryPermissionCount { get; set; }
        public List<PermissionDto> Permissions { get; set; } = new List<PermissionDto>();
        public List<RoleCategoryPermissionDto> CategoryPermissions { get; set; } = new List<RoleCategoryPermissionDto>();
    }
}