using System;
using System.Collections.Generic;

namespace SoHoaFormApi.Models.DbSoHoaForm;

public partial class Role
{
    public Guid Id { get; set; }

    public string RoleName { get; set; } = null!;

    public Guid? UserId { get; set; }

    public DateTime? DateCreated { get; set; }

    public virtual ICollection<RoleCategoryPermission> RoleCategoryPermissions { get; set; } = new List<RoleCategoryPermission>();

    public virtual ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();

    public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();

    public virtual ICollection<User> Users { get; set; } = new List<User>();
}
