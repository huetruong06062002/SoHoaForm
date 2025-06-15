using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class DeleteFormDetails
    {
       public int PDFsDeleted { get; set; }
        public int UserFillFormHistoriesDeleted { get; set; }
        public int UserFillFormsDeleted { get; set; }
        public int FormFieldsDeleted { get; set; }
        public int FieldsDeleted { get; set; } // THÊM FIELD MỚI
        public bool FormDeleted { get; set; }
    }
}