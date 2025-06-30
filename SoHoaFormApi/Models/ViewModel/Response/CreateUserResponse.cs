using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class CreateUserResponse
    {
        public Guid UserId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public Guid? RoleId { get; set; }
        public string? RoleName { get; set; } = string.Empty;
        public bool IsCreated { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime? CreatedAt { get; set; }

         public bool HasRole { get; set; }
    }
}