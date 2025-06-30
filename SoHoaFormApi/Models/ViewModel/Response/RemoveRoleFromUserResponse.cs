using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;


namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class RemoveRoleFromUserResponse
    {
         public Guid UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public Guid RoleId { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public bool IsRemoved { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime RemovedAt { get; set; }
    }
}