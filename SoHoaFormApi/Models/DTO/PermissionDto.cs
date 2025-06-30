using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.DTO
{
    public class PermissionDto
    {
        public Guid Id { get; set; }
        public string PermissionName { get; set; } = string.Empty;
        public int RolePermissionsCount { get; set; }
        public List<RoleDto> AssignedRoles { get; set; } = new List<RoleDto>();
    }
}