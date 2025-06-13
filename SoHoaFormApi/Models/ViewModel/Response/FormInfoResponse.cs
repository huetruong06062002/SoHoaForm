using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SoHoaFormApi.Models.DTO;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class FormInfoResponse
    {
        public Guid FormId { get; set; }
        public string FormName { get; set; } = string.Empty;
        public string? CategoryName { get; set; }
        public string WordFileUrl { get; set; } = string.Empty;
        public bool HasWordFile { get; set; }
        public List<FormFieldDto> Fields { get; set; } = new();
        public DateTime? CreatedAt { get; set; }
    }
}