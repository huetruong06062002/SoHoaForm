using SoHoaFormApi.Models.DbSoHoaForm;

public interface ISubmissionRepository : IRepository<Submission>
{
    // Add custom methods for Submission here if needed
}

public class SubmissionRepository : Repository<Submission>, ISubmissionRepository
{
    public SubmissionRepository(SoHoaFormContext context) : base(context)
    {
    }
}