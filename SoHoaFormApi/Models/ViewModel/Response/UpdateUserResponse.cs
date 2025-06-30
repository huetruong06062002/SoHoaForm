using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class UpdateUserResponse
    {
        public Guid UserId { get; set; }
        public string OldName { get; set; } = string.Empty;
        public string NewName { get; set; } = string.Empty;
        public string OldUserName { get; set; } = string.Empty;
        public string NewUserName { get; set; } = string.Empty;
        public Guid OldRoleId { get; set; }
        public Guid NewRoleId { get; set; }
        public string OldRoleName { get; set; } = string.Empty;
        public string NewRoleName { get; set; } = string.Empty;
        public bool IsPasswordChanged { get; set; }
        public bool IsUpdated { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime UpdatedAt { get; set; }
    }
}