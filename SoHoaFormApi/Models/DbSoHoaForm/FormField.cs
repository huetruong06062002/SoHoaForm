using System;
using System.Collections.Generic;

namespace SoHoaFormApi.Models.DbSoHoaForm;

public partial class FormField
{
    public Guid Id { get; set; }

    public Guid? FormId { get; set; }

    public Guid? FieldId { get; set; }

    public string? Formula { get; set; }

    public virtual Field? Field { get; set; }

    public virtual Form? Form { get; set; }
}
