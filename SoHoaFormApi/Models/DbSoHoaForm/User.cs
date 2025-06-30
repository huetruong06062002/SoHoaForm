using System;
using System.Collections.Generic;

namespace SoHoaFormApi.Models.DbSoHoaForm;

public partial class User
{
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    public Guid? RoleId { get; set; }

    public string? UserName { get; set; }

    public string? PassWord { get; set; }

    public DateTime? DateCreated { get; set; }

    public virtual ICollection<Form> Forms { get; set; } = new List<Form>();

    public virtual Role? Role { get; set; }

    public virtual ICollection<UserFillForm> UserFillForms { get; set; } = new List<UserFillForm>();

    public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}
