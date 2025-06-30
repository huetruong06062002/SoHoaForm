using System;
using System.Collections.Generic;

namespace SoHoaFormApi.Models.DbSoHoaForm;

public partial class UserRole
{
    public Guid Id { get; set; }

    public Guid? RoleId { get; set; }

    public Guid? UserId { get; set; }

    public DateTime? DateCreated { get; set; }

    public virtual Role? Role { get; set; }

    public virtual User? User { get; set; }
}
