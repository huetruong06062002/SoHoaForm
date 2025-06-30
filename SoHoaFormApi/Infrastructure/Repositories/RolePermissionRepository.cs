using SoHoaFormApi.Models.DbSoHoaForm;

public interface IRolePermissionsRepository : IRepository<RolePermission>
{
    // Add custom methods for RolePermissions here if needed
}

public class RolePermissionsRepository : Repository<RolePermission>, IRolePermissionsRepository
{
    public RolePermissionsRepository(SoHoaFormContext context) : base(context)
    {
    }
}