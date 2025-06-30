using Microsoft.EntityFrameworkCore;
using SoHoaFormApi.Models.DbSoHoaForm;

public interface IPermissionsRepository : IRepository<Permission>
{
    public Task<Permission> GetPermissionByName(string name);

    public Task<List<Permission>> GetAllPermissionWithRole();

    public Task<Permission> GetPermissionById(Guid permissionId);
}

public class PermissionsRepository : Repository<Permission>, IPermissionsRepository
{
    public PermissionsRepository(SoHoaFormContext context) : base(context)
    {
    }

    public async Task<List<Permission>> GetAllPermissionWithRole()
    {
        return await _context.Permissions
                      .Include(p => p.RolePermissions)
                          .ThenInclude(rp => rp.Role)
                      .ToListAsync();

    }

  public async Task<Permission> GetPermissionById(Guid permissionId)
  {
    return await _context.Permissions
                    .Include(p => p.RolePermissions)
                        .ThenInclude(rp => rp.Role)
                    .FirstOrDefaultAsync(p => p.Id == permissionId);
  }

  public async Task<Permission> GetPermissionByName(string name)
    {
        return await _context.Permissions.FirstOrDefaultAsync(p => p.PermissionName.ToLower() == name.ToLower());
    }
}