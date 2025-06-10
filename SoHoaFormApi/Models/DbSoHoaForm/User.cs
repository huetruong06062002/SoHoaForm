using System;
using System.Collections.Generic;

namespace SoHoaFormApi.Models.DbSoHoaForm;

public partial class User
{
    public Guid Id { get; set; }

    public string? Name { get; set; }

    public Guid RoleId { get; set; }

    public virtual ICollection<Form> Forms { get; set; } = new List<Form>();

    public virtual Role Role { get; set; } = null!;

    public virtual ICollection<Submission> Submissions { get; set; } = new List<Submission>();
}
