
using Microsoft.EntityFrameworkCore;
using SoHoaFormApi.Models.DbSoHoaForm;

public interface IUserRoleRepository : IRepository<UserRole>
{
    Task<IEnumerable<UserRole>> GetUserRolesByUserIdAsync(Guid userId);
    Task<UserRole?> GetUserRoleAsync(Guid userId, Guid roleId);
    Task<bool> ExistsAsync(Guid userId, Guid roleId);
    Task<int> CountRolesByUserAsync(Guid userId);
    Task<int> CountUsersByRoleAsync(Guid roleId);

    Task<IEnumerable<UserRole>> GetUserRolesByRoleIdAsync(Guid roleId);
}

public class UserRoleRepository : Repository<UserRole>, IUserRoleRepository
{
    public UserRoleRepository(SoHoaFormContext context) : base(context)
    {
    }

    public async Task<IEnumerable<UserRole>> GetUserRolesByUserIdAsync(Guid userId)
    {
        return await _context.UserRoles
            .Include(ur => ur.Role)
            .Include(ur => ur.User)
            .Where(ur => ur.UserId == userId)
            .OrderBy(ur => ur.Role!.RoleName)
            .ToListAsync();
    }

    public async Task<UserRole?> GetUserRoleAsync(Guid userId, Guid roleId)
    {
        return await _context.UserRoles
            .Include(ur => ur.Role)
            .Include(ur => ur.User)
            .FirstOrDefaultAsync(ur => ur.UserId == userId && ur.RoleId == roleId);
    }

    public async Task<bool> ExistsAsync(Guid userId, Guid roleId)
    {
        return await _context.UserRoles
            .AnyAsync(ur => ur.UserId == userId && ur.RoleId == roleId);
    }

    public async Task<int> CountRolesByUserAsync(Guid userId)
    {
        return await _context.UserRoles
            .CountAsync(ur => ur.UserId == userId);
    }

    public async Task<int> CountUsersByRoleAsync(Guid roleId)
    {
        return await _context.UserRoles
            .CountAsync(ur => ur.RoleId == roleId);
    }
    public async Task<IEnumerable<UserRole>> GetUserRolesByRoleIdAsync(Guid roleId)
{
    return await _context.UserRoles
        .Include(ur => ur.User)
            .ThenInclude(u => u.Role) // Role chính của user
        .Include(ur => ur.Role)
        .Where(ur => ur.RoleId == roleId)
        .OrderBy(ur => ur.User!.Name)
        .ToListAsync();
}
}