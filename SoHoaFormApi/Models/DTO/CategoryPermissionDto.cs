using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.DTO
{
    public class CategoryPermissionDto
    {
         public Guid CategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public bool CanAccess { get; set; }
        public string CategoryPath { get; set; } = string.Empty;
        public int Level { get; set; }
    }
}