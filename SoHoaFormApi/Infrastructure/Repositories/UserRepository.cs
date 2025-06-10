using SoHoaFormApi.Models.DbSoHoaForm;

public interface IUserRepository : IRepository<User>
{
    // Add custom methods for User here if needed
}

public class UserRepository : Repository<User>, IUserRepository
{
    public UserRepository(SoHoaFormContext context) : base(context)
    {
    }
}