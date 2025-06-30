using System;
using System.Collections.Generic;

namespace SoHoaFormApi.Models.DbSoHoaForm;

public partial class FormCategory
{
    public Guid Id { get; set; }

    public string CategoryName { get; set; } = null!;

    public Guid? ParentCategoryId { get; set; }

    public virtual ICollection<Form> Forms { get; set; } = new List<Form>();

    public virtual ICollection<FormCategory> InverseParentCategory { get; set; } = new List<FormCategory>();

    public virtual FormCategory? ParentCategory { get; set; }

    public virtual ICollection<RoleCategoryPermission> RoleCategoryPermissions { get; set; } = new List<RoleCategoryPermission>();
}
