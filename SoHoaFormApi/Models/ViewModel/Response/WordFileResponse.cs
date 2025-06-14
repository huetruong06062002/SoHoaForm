using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class WordFileResponse
    {
         public Guid FormId { get; set; }
        public string FormName { get; set; } = string.Empty;
        public string CategoryName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public byte[] FileContent { get; set; } = Array.Empty<byte>();
    }
}