using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.Helper
{
    public class FieldPattern
    {
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public bool IsRequired { get; set; } = false;
        public bool IsUpperCase { get; set; } = false;

        public string Formula { get; set; } = string.Empty;

        public int Order { get; set; } = 0;//Thứ tự field
    }
}