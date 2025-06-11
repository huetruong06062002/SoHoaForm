using System;
using System.Collections.Generic;

namespace SoHoaFormApi.Models.DbSoHoaForm;

public partial class Field
{
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    public string? Type { get; set; }

    public string? Description { get; set; }

    public bool? IsRequired { get; set; }

    public bool? IsUpperCase { get; set; }

    public virtual ICollection<FormField> FormFields { get; set; } = new List<FormField>();
}
