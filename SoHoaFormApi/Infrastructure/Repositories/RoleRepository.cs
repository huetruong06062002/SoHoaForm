using Microsoft.EntityFrameworkCore;
using SoHoaFormApi.Models.DbSoHoaForm;

public interface IRoleRepository : IRepository<Role>
{
    // Add custom methods for Role here if needed

    public Task<Role> GetRoleByNameAsync(string roleName);
    public Task<List<Role>> GetRolesByUserIdAsync(Guid userId);

    public Task<List<Role>> GetAllRoleWithPermissionAndFormCategory();

    public Task<Role> GetRoleWithPermissionAndFormCategorByIdAsync(Guid roleId);

    public Task<RolePermission> GetRolePermission(Guid roleId, Guid permissionId);
}

public class RoleRepository : Repository<Role>, IRoleRepository
{
    public RoleRepository(SoHoaFormContext context) : base(context)
    {
    }

    public async Task<List<Role>> GetAllRoleWithPermissionAndFormCategory()
    {
        var role = await _context.Roles.Include(r => r.RolePermissions).ThenInclude(rp => rp.Permission).Include(r => r.RoleCategoryPermissions)
        .ThenInclude(rcp => rcp.FormCategory).ToListAsync();

        return role;

    }

    public async Task<Role> GetRoleByNameAsync(string roleName)
    {
        return await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == roleName);
    }

    public async Task<RolePermission> GetRolePermission(Guid roleId, Guid permissionId)
    {
        return await _context.RolePermissions
                    .Include(rp => rp.Role)
                    .Include(rp => rp.Permission)
                    .FirstOrDefaultAsync(rp => rp.RoleId == roleId && rp.PermissionId == permissionId);
    }

    public async Task<List<Role>> GetRolesByUserIdAsync(Guid userId)
    {
        return await _context.Roles
            .Where(r => r.Users.Any(u => u.Id == userId))
            .ToListAsync();
    }

    public async Task<Role> GetRoleWithPermissionAndFormCategorByIdAsync(Guid roleId)
    {
        return await _context.Roles
                        .Include(r => r.RolePermissions)
                            .ThenInclude(rp => rp.Permission)
                        .Include(r => r.RoleCategoryPermissions)
                            .ThenInclude(rcp => rcp.FormCategory)
                        .FirstOrDefaultAsync(r => r.Id == roleId);
    }
}