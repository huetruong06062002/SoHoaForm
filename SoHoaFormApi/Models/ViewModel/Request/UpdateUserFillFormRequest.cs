using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using SoHoaFormApi.Models.DTO;

namespace SoHoaFormApi.Models.ViewModel.Request
{
    public class UpdateUserFillFormRequest
    {
        [Required(ErrorMessage = "Dữ liệu fields là bắt buộc")]
        public List<FieldValueDto> FieldValues { get; set; } = new List<FieldValueDto>();
    }
}