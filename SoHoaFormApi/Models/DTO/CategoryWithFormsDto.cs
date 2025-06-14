using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.DTO
{
    public class CategoryWithFormsDto
    {
        public Guid? CategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public List<FormSummaryDto> Forms { get; set; } = new List<FormSummaryDto>();
        public int FormCount { get; set; }
    }
}