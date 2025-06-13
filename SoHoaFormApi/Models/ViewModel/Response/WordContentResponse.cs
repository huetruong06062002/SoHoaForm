using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SoHoaFormApi.Models.DTO;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class WordContentResponse
    {
        public List<WordTableDto> Tables { get; set; } = new List<WordTableDto>();
        public List<WordParagraphDto> Paragraphs { get; set; } = new List<WordParagraphDto>();
        public List<string> Headers { get; set; } = new List<string>();
    }
}