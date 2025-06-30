using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class DeleteRoleResponse
    {
       public Guid DeletedRoleId { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public int PermissionsDeleted { get; set; }
        public int CategoryPermissionsDeleted { get; set; }
        public bool IsDeleted { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime DeletedAt { get; set; } 
    }
}