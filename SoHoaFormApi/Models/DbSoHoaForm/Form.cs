using System;
using System.Collections.Generic;

namespace SoHoaFormApi.Models.DbSoHoaForm;

public partial class Form
{
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    public string? Category { get; set; }

    public Guid CreatedBy { get; set; }

    public string? WordFilePath { get; set; }

    public string Status { get; set; } = null!;

    public virtual User CreatedByNavigation { get; set; } = null!;

    public virtual ICollection<FormField> FormFields { get; set; } = new List<FormField>();

    public virtual ICollection<Submission> Submissions { get; set; } = new List<Submission>();
}
