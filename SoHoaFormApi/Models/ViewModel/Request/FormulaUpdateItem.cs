using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Request
{
    public class FormulaUpdateItem
    {
        [Required]
        public string FieldName { get; set; } = string.Empty;

        [Required]
        public string Formula { get; set; } = string.Empty;

        public string? Description { get; set; }
    }
}