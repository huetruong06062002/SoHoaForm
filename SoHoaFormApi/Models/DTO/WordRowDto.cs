using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.DTO
{
    public class WordRowDto
    {
        public List<WordCellDto> Cells { get; set; } = new List<WordCellDto>();
    }
}