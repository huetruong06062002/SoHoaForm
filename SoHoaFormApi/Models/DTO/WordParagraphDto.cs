using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.DTO
{
    public class WordParagraphDto
    {
        public string Text { get; set; }
        public bool IsField { get; set; }
        public string FieldName { get; set; }
    }
}