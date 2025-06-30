using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class UpdateCategoryResponse
    {
        public Guid CategoryId { get; set; }
        public string OldCategoryName { get; set; } = string.Empty;
        public string NewCategoryName { get; set; } = string.Empty;
        public Guid? OldParentCategoryId { get; set; }
        public Guid? NewParentCategoryId { get; set; }
        public string? NewParentCategoryName { get; set; }
        public bool IsUpdated { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime UpdatedAt { get; set; } 
    }
}