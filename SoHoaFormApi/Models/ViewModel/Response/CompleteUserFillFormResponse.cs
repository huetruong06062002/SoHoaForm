using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class CompleteUserFillFormResponse
    {
        public Guid UserFillFormId { get; set; }
        public Guid FormId { get; set; }
        public string FormName { get; set; } = string.Empty;
        public Guid UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string OldStatus { get; set; } = string.Empty;
        public string NewStatus { get; set; } = "Complete";
        public Guid HistoryId { get; set; }
        public DateTime CompletedAt { get; set; }
        public bool IsCompleted { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}