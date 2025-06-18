using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Request
{
    public class UpdateSelectOptionsRequest
    {
        [Required(ErrorMessage = "Options là bắt buộc")]
        public string Options { get; set; } = string.Empty;
    }
}