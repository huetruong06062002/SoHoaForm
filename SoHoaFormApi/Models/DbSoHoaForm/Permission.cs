using System;
using System.Collections.Generic;

namespace SoHoaFormApi.Models.DbSoHoaForm;

public partial class Permission
{
    public Guid Id { get; set; }

    public string? PermissionName { get; set; }

    public virtual ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}
