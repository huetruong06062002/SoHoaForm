using System;
using System.Collections.Generic;

namespace SoHoaFormApi.Models.DbSoHoaForm;

public partial class FormCategory
{
    public Guid Id { get; set; }

    public string CategoryName { get; set; } = null!;

    public virtual ICollection<Form> Forms { get; set; } = new List<Form>();
}
