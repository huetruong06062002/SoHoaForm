using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.DTO
{
    public class UserDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;

        // Role chính
        public Guid? RoleId { get; set; }
        public string RoleName { get; set; } = string.Empty;

        // ✅ THÊM: Danh sách tất cả roles (quan hệ nhiều-nhiều)
        public List<UserRoleDto> UserRoles { get; set; } = new List<UserRoleDto>();

        public DateTime? CreatedAt { get; set; }

        // Thống kê thêm
        public int TotalRoles { get; set; }
        public string AllRoleNames { get; set; } = string.Empty; // "admin, manager, user"
    }
}