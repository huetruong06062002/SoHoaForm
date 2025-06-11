using System;
using System.Collections.Generic;

namespace SoHoaFormApi.Models.DbSoHoaForm;

public partial class UserFillFormHistory
{
    public Guid Id { get; set; }

    public Guid? UserFillFormId { get; set; }

    public DateTime? DateFill { get; set; }

    public DateTime? DateWrite { get; set; }

    public DateTime? DateFinish { get; set; }

    public string? Status { get; set; }

    public virtual UserFillForm? UserFillForm { get; set; }
}
