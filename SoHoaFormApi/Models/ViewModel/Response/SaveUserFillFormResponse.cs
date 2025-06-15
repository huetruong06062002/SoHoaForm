using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SoHoaFormApi.Models.DTO;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class SaveUserFillFormResponse
    {
        public Guid UserFillFormId { get; set; }
        public Guid FormId { get; set; }
        public Guid UserId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public List<FieldValueDto> FieldValues { get; set; } = new List<FieldValueDto>();
        public DateTime SavedAt { get; set; }
        public Guid HistoryId { get; set; }
        public string Message { get; set; } = string.Empty;
        public bool IsNewRecord { get; set; }
    }
}