using System;
using System.Collections.Generic;

namespace SoHoaFormApi.Models.DbSoHoaForm;

public partial class Submission
{
    public Guid Id { get; set; }

    public Guid FormId { get; set; }

    public Guid UserId { get; set; }

    public DateTime SubmissionDate { get; set; }

    public virtual Form Form { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
