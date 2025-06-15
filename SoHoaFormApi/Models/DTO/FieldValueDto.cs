using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.DTO
{
    public class FieldValueDto
    {
         public string FieldName { get; set; } = string.Empty;
        public string FieldType { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public object Value { get; set; } = new object();
    }
}