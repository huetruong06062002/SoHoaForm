using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using SoHoaFormApi.Models.DTO;

namespace SoHoaFormApi.Models.ViewModel.Request
{
    public class SaveUserFillFormRequest
    {
        [Required(ErrorMessage = "FormId là bắt buộc")]
        public Guid FormId { get; set; }

        public Guid UserId { get; set; } // Không required, sẽ lấy từ token

        public string? Name { get; set; } = string.Empty; // Tên cho UserFillForm (có thể rỗng)

        [Required(ErrorMessage = "Dữ liệu fields là bắt buộc")]
        public List<FieldValueDto> FieldValues { get; set; } = new List<FieldValueDto>();

        public string Status { get; set; } = "Draft"; // Draft, Completed, Submitted
    }
}