using SoHoaFormApi.Models.DbSoHoaForm;

public interface IUserFillFormHistoryRepository : IRepository<UserFillFormHistory>
{
    // Add custom methods for UserFillFormHistory here if needed
}

public class UserFillFormHistoryRepository : Repository<UserFillFormHistory>, IUserFillFormHistoryRepository
{
    public UserFillFormHistoryRepository(SoHoaFormContext context) : base(context)
    {
    }
}