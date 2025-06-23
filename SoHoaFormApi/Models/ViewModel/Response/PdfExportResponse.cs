using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class PdfExportResponse
    {
         public Guid FormId { get; set; }
        public string FormName { get; set; } = string.Empty;
        public string CategoryName { get; set; } = string.Empty;
        public byte[] PdfContent { get; set; } = Array.Empty<byte>();
        public string PdfPath { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string ContentType { get; set; } = "application/pdf";
        public long FileSize { get; set; }
        public int FieldCount { get; set; }
        public DateTime GeneratedAt { get; set; }
    }
}