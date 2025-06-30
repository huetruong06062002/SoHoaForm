using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SoHoaFormApi.Models.DTO;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class LoginResponse
    {
        public string Token { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public Guid UserId { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public List<string> Permissions { get; set; } = new List<string>();
        public List<CategoryPermissionDto> CategoryPermissions { get; set; } = new List<CategoryPermissionDto>();
        public DateTime LoginTime { get; set; }
        public DateTime ExpiresAt { get; set; }
    }
}