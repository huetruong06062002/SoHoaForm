﻿using System;
using System.Collections.Generic;

namespace SoHoaFormApi.Models.DbSoHoaForm;

public partial class RolePermission
{
    public Guid Id { get; set; }

    public Guid? RoleId { get; set; }

    public Guid? PermissionId { get; set; }

    public virtual Permission? Permission { get; set; }

    public virtual Role? Role { get; set; }
}
