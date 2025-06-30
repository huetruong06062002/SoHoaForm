using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class DeleteUserResponse
    {
        public Guid DeletedUserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string RoleName { get; set; } = string.Empty;
        public bool IsDeleted { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime DeletedAt { get; set; }
    }
}