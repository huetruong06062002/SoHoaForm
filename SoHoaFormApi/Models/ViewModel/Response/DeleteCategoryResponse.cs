using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class DeleteCategoryResponse
    {
        public Guid DeletedCategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public int RolePermissionsDeleted { get; set; }
        public bool IsDeleted { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime DeletedAt { get; set; }
    }
}