using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.DTO
{
    public class FormCategoryDto
    {
        public Guid Id { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public Guid? ParentCategoryId { get; set; }
        public string? ParentCategoryName { get; set; }
        public int ChildrenCount { get; set; }
        public int FormsCount { get; set; }
        public int RolePermissionsCount { get; set; }
        public int Level { get; set; }
        public string Path { get; set; } = string.Empty;
        public bool HasChildren { get; set; }
        public bool IsRoot { get; set; }
        public List<FormCategoryDto> Children { get; set; } = new List<FormCategoryDto>();
    }
}