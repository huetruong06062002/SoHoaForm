using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SoHoaFormApi.Models.ViewModel.Response;

namespace SoHoaFormApi.Models.DTO
{
    public class FormWithContentResponse
    {
        public Guid FormId { get; set; }
        public string FormName { get; set; }
        public WordContentResponse WordContent { get; set; }
        public List<FormFieldDto> Fields { get; set; }
    }
}