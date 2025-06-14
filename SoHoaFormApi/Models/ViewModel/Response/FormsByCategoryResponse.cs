using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SoHoaFormApi.Models.DTO;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class FormsByCategoryResponse
    {
            public List<CategoryWithFormsDto> Categories { get; set; } = new List<CategoryWithFormsDto>();
        public int TotalCategories { get; set; }
        public int TotalForms { get; set; }
    }
}