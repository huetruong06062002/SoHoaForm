using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SoHoaFormApi.Models.DTO;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class UpdateUserFillFormResponse
    {
         public Guid UserFillFormId { get; set; }
        public Guid FormId { get; set; }
        public string FormName { get; set; } = string.Empty;
        public Guid UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public List<FieldValueDto> NewFieldValues { get; set; } = new List<FieldValueDto>();
        public List<FieldValueDto> OldFieldValues { get; set; } = new List<FieldValueDto>();
        public Guid HistoryId { get; set; }
        public DateTime UpdatedAt { get; set; }
        public bool IsUpdated { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}