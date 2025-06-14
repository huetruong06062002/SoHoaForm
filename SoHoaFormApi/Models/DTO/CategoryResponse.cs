using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.DTO
{
    public class CategoryResponse
    {
        public List<CategoryWithFormsDto> Categories { get; set; } = new List<CategoryWithFormsDto>();
        public int TotalCategories { get; set; }
        public int TotalForms { get; set; }
    }
}