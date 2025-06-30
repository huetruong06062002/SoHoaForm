using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.DTO
{
    public class FormCategoryTreeDto
    {
        public Guid Id { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public Guid? ParentCategoryId { get; set; }
        public int Level { get; set; }
        public int FormsCount { get; set; }
        public bool HasChildren { get; set; }
        public List<FormCategoryTreeDto> Children { get; set; } = new List<FormCategoryTreeDto>();
    }
}