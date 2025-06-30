using System;
using System.Collections.Generic;

namespace SoHoaFormApi.Models.DbSoHoaForm;

public partial class Form
{
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    public Guid? CategoryId { get; set; }

    public Guid? UserId { get; set; }

    public string? WordFilePath { get; set; }

    public string? Status { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? TimeExpired { get; set; }

    public virtual FormCategory? Category { get; set; }

    public virtual ICollection<FormField> FormFields { get; set; } = new List<FormField>();

    public virtual User? User { get; set; }

    public virtual ICollection<UserFillForm> UserFillForms { get; set; } = new List<UserFillForm>();
}
