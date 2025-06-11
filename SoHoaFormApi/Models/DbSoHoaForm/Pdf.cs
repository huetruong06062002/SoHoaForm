using System;
using System.Collections.Generic;

namespace SoHoaFormApi.Models.DbSoHoaForm;

public partial class Pdf
{
    public Guid Id { get; set; }

    public Guid? UserFillFormId { get; set; }

    public string? PdfPath { get; set; }

    public virtual UserFillForm? UserFillForm { get; set; }
}
