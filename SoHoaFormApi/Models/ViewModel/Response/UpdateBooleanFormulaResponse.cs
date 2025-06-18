using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class UpdateBooleanFormulaResponse
    {
        public Guid FormId { get; set; }
        public Guid FieldId { get; set; }
        public Guid FormFieldId { get; set; }
        public string FieldName { get; set; } = string.Empty;
        public string FieldType { get; set; } = string.Empty;
        public string NewFormula { get; set; } = string.Empty;
        public string OldFormula { get; set; } = string.Empty;
        public bool IsUpdated { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime UpdatedAt { get; set; }
    }
}