using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Request
{
    public class CreateRoleResponse
    {
        public Guid RoleId { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public bool IsCreated { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}