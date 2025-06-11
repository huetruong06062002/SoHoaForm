using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class FormCategoryResponse
    {   
        public Guid FormId { get; set; }
        public string FormName { get; set; }
        public string CategoryName { get; set; }

        public DateTime? DateCreated { get; set; }
    }
}