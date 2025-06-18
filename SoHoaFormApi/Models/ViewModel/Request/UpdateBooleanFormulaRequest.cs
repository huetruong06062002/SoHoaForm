using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Request
{
    public class UpdateBooleanFormulaRequest
    {
        [Required(ErrorMessage = "Formula là bắt buộc")]
        public string Formula { get; set; } = string.Empty;
    }
}