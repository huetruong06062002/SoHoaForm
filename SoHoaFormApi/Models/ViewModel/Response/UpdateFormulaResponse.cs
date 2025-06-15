using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class UpdateFormulaResponse
    {
        public Guid FormId { get; set; }
        public Guid FieldId { get; set; }
        public Guid FormFieldId { get; set; } // Thêm FormFieldId
        public string FieldName { get; set; } = string.Empty;
        public string FieldType { get; set; } = string.Empty;
        public string Formula { get; set; } = string.Empty;
        public string OldFormula { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? OldDescription { get; set; }
        public bool IsUpdated { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime UpdatedAt { get; set; }
    }
}