using SoHoaFormApi.Models.DbSoHoaForm;

public interface IUserFillFormRepository : IRepository<UserFillForm>
{
    // Add custom methods for UserFillForm here if needed
}

public class UserFillFormRepository : Repository<UserFillForm>, IUserFillFormRepository
{
    public UserFillFormRepository(SoHoaFormContext context) : base(context)
    {
    }
}