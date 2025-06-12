using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SoHoaFormApi.Models.DTO;

namespace SoHoaFormApi.Models.Config
{
    public class LayoutConfig
    {
        public string RenderType { get; set; } = "vertical";//"vertical", "table, "sections
        public int Columns { get; set; } = 1;
        public List<FormSection> Sections { get; set; } = new();
    }
}