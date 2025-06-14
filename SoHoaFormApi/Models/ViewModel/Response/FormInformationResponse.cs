using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class FormInformationResponse
    {
         public Guid FormId { get; set; }
        public string FormName { get; set; } = string.Empty;
        public string CategoryName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string Status { get; set; } = string.Empty;
        public string CreatedBy { get; set; } = string.Empty;
    }
}