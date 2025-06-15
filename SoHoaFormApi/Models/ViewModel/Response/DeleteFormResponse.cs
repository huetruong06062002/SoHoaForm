using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class DeleteFormResponse
    {
        public Guid DeletedFormId { get; set; }
        public string Status { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public DateTime DeletedAt { get; set; }
        public int TotalAffectedRecords { get; set; }
        public string? WordFilePath { get; set; }
        public bool WordFileDeleted { get; set; }
        public DeleteFormDetails Details { get; set; } = new DeleteFormDetails();
    }
}