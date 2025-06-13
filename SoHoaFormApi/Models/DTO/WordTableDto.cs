using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.DTO
{
    public class WordTableDto
    {
        public List<WordRowDto> Rows { get; set; } = new List<WordRowDto>();
    }
}