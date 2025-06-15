using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.DTO
{
    public class DeleteFormStoredProcResult
    {
        public Guid DeletedFormId { get; set; }
        public string Status { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public DateTime DeletedAt { get; set; }
        public int PDFsDeleted { get; set; }
        public int HistoriesDeleted { get; set; }
        public int UserFillFormsDeleted { get; set; }
        public int FormFieldsDeleted { get; set; }
        public int FieldsDeleted { get; set; } // THÊM FIELD MỚI
        public int TotalAffectedRecords { get; set; }
        public string? WordFilePath { get; set; }

        // For error cases
        public int? ErrorNumber { get; set; }
        public int? ErrorSeverity { get; set; }
        public int? ErrorState { get; set; }
    }
}