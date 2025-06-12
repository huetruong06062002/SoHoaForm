using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SoHoaFormApi.Models.Config;
using SoHoaFormApi.Models.DTO;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class FormPreviewResponse
    {
         public Guid FormId { get; set; }
        public string FormName { get; set; } = string.Empty;
        public string TemplateType { get; set; } = string.Empty;
        public List<FormFieldDto> Fields { get; set; } = new();
        public LayoutConfig LayoutConfig { get; set; } = new();
    }
}