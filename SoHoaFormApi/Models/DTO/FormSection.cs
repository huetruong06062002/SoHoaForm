using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.DTO
{
    public class FormSection
    {
        public string Title { get; set; } = string.Empty;
        public string Type { get; set; } = "fields";// "fields", "table", "checkbox-group", "assessment-table"

        public List<string> FieldNames { get; set; } = new ();
        public Dictionary<string, object> Props { get; set; } = new();
     }
}