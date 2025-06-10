using SoHoaFormApi.Models.DbSoHoaForm;

public interface IRoleRepository : IRepository<Role>
{
    // Add custom methods for Role here if needed
}

public class RoleRepository : Repository<Role>, IRoleRepository
{
    public RoleRepository(SoHoaFormContext context) : base(context)
    {
    }
}