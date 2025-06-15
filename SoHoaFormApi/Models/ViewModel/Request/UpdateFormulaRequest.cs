using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Request
{
    public class UpdateFormulaRequest
    {
        [Required(ErrorMessage = "Formula là bắt buộc")]
        public string Formula { get; set; } = string.Empty;

        public string? Description { get; set; }
    }
}