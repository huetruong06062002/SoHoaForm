using System;
using System.Collections.Generic;

namespace SoHoaFormApi.Models.DbSoHoaForm;

public partial class RoleCategoryPermission
{
    public Guid Id { get; set; }

    public Guid? RoleId { get; set; }

    public Guid? FormCategoryId { get; set; }

    public bool? CanAcess { get; set; }

    public virtual FormCategory? FormCategory { get; set; }

    public virtual Role? Role { get; set; }
}
