using System;
using System.Collections.Generic;

namespace SoHoaFormApi.Models.DbSoHoaForm;

public partial class UserFillForm
{
    public Guid Id { get; set; }

    public Guid? FormId { get; set; }

    public Guid? UserId { get; set; }

    public string? JsonFieldValue { get; set; }

    public string? Status { get; set; }

    public DateTime? DateTime { get; set; }

    public virtual Form? Form { get; set; }

    public virtual ICollection<Pdf> Pdfs { get; set; } = new List<Pdf>();

    public virtual User? User { get; set; }

    public virtual ICollection<UserFillFormHistory> UserFillFormHistories { get; set; } = new List<UserFillFormHistory>();
}
