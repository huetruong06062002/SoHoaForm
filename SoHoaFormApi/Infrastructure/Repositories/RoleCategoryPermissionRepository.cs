using Microsoft.EntityFrameworkCore;
using SoHoaFormApi.Models.DbSoHoaForm;

public interface IRoleCategoryPermissionRepository : IRepository<RoleCategoryPermission>
{
    Task<List<RoleCategoryPermission>> GetAllWithRelatedDataAsync();
    Task<List<RoleCategoryPermission>> GetByRoleIdAsync(Guid roleId);
    Task<List<RoleCategoryPermission>> GetByCategoryIdAsync(Guid categoryId);
    Task<RoleCategoryPermission?> GetByRoleAndCategoryAsync(Guid roleId, Guid categoryId);
    Task<RoleCategoryPermission?> GetByIdWithRelatedDataAsync(Guid id);
    Task<bool> ExistsAsync(Guid roleId, Guid categoryId);
    Task<List<RoleCategoryPermission>> GetUserCategoryPermissionsAsync(Guid userId);
}

public class RoleCategoryPermissionRepository : Repository<RoleCategoryPermission>, IRoleCategoryPermissionRepository
{
    public RoleCategoryPermissionRepository(SoHoaFormContext context) : base(context)
    {
    }

    public async Task<List<RoleCategoryPermission>> GetAllWithRelatedDataAsync()
    {
        return await _context.RoleCategoryPermissions
            .Include(rcp => rcp.Role)
            .Include(rcp => rcp.FormCategory)
                .ThenInclude(fc => fc.ParentCategory)
            .ToListAsync();
    }

    public async Task<List<RoleCategoryPermission>> GetByRoleIdAsync(Guid roleId)
    {
        return await _context.RoleCategoryPermissions
            .Include(rcp => rcp.Role)
            .Include(rcp => rcp.FormCategory)
                .ThenInclude(fc => fc.ParentCategory)
            .Where(rcp => rcp.RoleId == roleId)
            .ToListAsync();
    }

    public async Task<List<RoleCategoryPermission>> GetByCategoryIdAsync(Guid categoryId)
    {
        return await _context.RoleCategoryPermissions
            .Include(rcp => rcp.Role)
            .Include(rcp => rcp.FormCategory)
                .ThenInclude(fc => fc.ParentCategory)
            .Where(rcp => rcp.FormCategoryId == categoryId)
            .ToListAsync();
    }

    public async Task<RoleCategoryPermission?> GetByRoleAndCategoryAsync(Guid roleId, Guid categoryId)
    {
        return await _context.RoleCategoryPermissions
            .Include(rcp => rcp.Role)
            .Include(rcp => rcp.FormCategory)
                .ThenInclude(fc => fc.ParentCategory)
            .FirstOrDefaultAsync(rcp => rcp.RoleId == roleId && rcp.FormCategoryId == categoryId);
    }

    public async Task<RoleCategoryPermission?> GetByIdWithRelatedDataAsync(Guid id)
    {
        return await _context.RoleCategoryPermissions
            .Include(rcp => rcp.Role)
            .Include(rcp => rcp.FormCategory)
            .FirstOrDefaultAsync(rcp => rcp.Id == id);
    }

    public async Task<bool> ExistsAsync(Guid roleId, Guid categoryId)
    {
        return await _context.RoleCategoryPermissions
            .AnyAsync(rcp => rcp.RoleId == roleId && rcp.FormCategoryId == categoryId);
    }

    public async Task<List<RoleCategoryPermission>> GetUserCategoryPermissionsAsync(Guid userId)
    {
        var user = await _context.Users
            .Include(u => u.Role)
                .ThenInclude(r => r.RoleCategoryPermissions)
                    .ThenInclude(rcp => rcp.FormCategory)
                        .ThenInclude(fc => fc.ParentCategory)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user?.Role?.RoleCategoryPermissions == null)
            return new List<RoleCategoryPermission>();

        return user.Role.RoleCategoryPermissions
            .Where(rcp => rcp.CanAcess == true)
            .ToList();
    }

}