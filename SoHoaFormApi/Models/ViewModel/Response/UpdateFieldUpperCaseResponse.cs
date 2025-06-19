using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class UpdateFieldUpperCaseResponse
    {
        public Guid FormId { get; set; }
        public Guid FieldId { get; set; }
        public Guid FormFieldId { get; set; }
        public string FieldName { get; set; } = string.Empty;
        public string FieldType { get; set; } = string.Empty;
        public bool NewIsUpperCase { get; set; }
        public bool OldIsUpperCase { get; set; }
        public bool IsUpdated { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime UpdatedAt { get; set; }
    }
}