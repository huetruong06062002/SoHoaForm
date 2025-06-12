using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.DTO
{
    public class FormFieldDto
    {
        public Guid FormFieldId { get; set; }
        public Guid? FieldId { get; set; }
        public string FieldName { get; set; } = string.Empty;
        public string FieldType { get; set; } = string.Empty;
        public string FieldDescription { get; set; } = string.Empty;
        public bool IsRequired { get; set; }
        public bool IsUpperCase { get; set; }
        public string Formula { get; set; } = string.Empty;
        public Guid? FormId { get; set; }
    }
}