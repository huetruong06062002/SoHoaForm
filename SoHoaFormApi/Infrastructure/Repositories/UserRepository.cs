using Microsoft.EntityFrameworkCore;
using SoHoaFormApi.Models.DbSoHoaForm;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;


public interface IUserRepository : IRepository<User>
{
    Task<User?> GetUserWithRoleAndPermissionsAsync(string userName);
    Task<User?> GetUserWithRoleAndCategoryPermissionsAsync(string userName);
    Task<User?> GetUserWithFullPermissionsAsync(string userName);
    Task<bool> HasPermissionAsync(string userName, string permission);
    Task<bool> HasCategoryAccessAsync(string userName, Guid categoryId);

    // 🆕 CÁC HÀM CHO USER MANAGEMENT
    Task<IEnumerable<User>> GetAllUsersWithRoleAsync();
    Task<User?> GetUserWithRoleAsync(Guid userId);
    Task<User?> GetUserByUserNameAsync(string userName);
    Task<IEnumerable<User>> GetUsersByRoleAsync(Guid roleId);
    Task<bool> IsUserNameExistsAsync(string userName, Guid? excludeUserId = null);
    Task<int> CountUsersByRoleAsync(Guid roleId);
    Task<IEnumerable<object>> GetUsersWithStatisticsAsync();
    Task<bool> HasRelatedDataAsync(Guid userId);
    Task<IEnumerable<User>> SearchUsersAsync(string searchTerm);
    Task<(IEnumerable<User> Users, int TotalCount)> GetUsersWithPaginationAsync(int pageNumber = 1, int pageSize = 10, string? searchTerm = null);
    Task<IEnumerable<User>> GetActiveUsersAsync();
}

public class UserRepository : Repository<User>, IUserRepository
{
    public UserRepository(SoHoaFormContext context) : base(context)
    {
    }

    public async Task<User?> GetUserWithRoleAndPermissionsAsync(string userName)
    {
        return await _context.Users
            .Include(u => u.Role)
                .ThenInclude(r => r.RolePermissions)
                    .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(u => u.UserName == userName);
    }

    public async Task<User?> GetUserWithRoleAndCategoryPermissionsAsync(string userName)
    {
        return await _context.Users
            .Include(u => u.Role)
                .ThenInclude(r => r.RoleCategoryPermissions)
                    .ThenInclude(rcp => rcp.FormCategory)
            .FirstOrDefaultAsync(u => u.UserName == userName);
    }

    public async Task<User?> GetUserWithFullPermissionsAsync(string userName)
    {
        return await _context.Users
            .Include(u => u.Role)
                .ThenInclude(r => r.RolePermissions)
                    .ThenInclude(rp => rp.Permission)
            .Include(u => u.Role)
                .ThenInclude(r => r.RoleCategoryPermissions)
                    .ThenInclude(rcp => rcp.FormCategory)
            .FirstOrDefaultAsync(u => u.UserName == userName);
    }

    public async Task<bool> HasPermissionAsync(string userName, string permission)
    {
        return await _context.Users
            .Where(u => u.UserName == userName)
            .SelectMany(u => u.Role.RolePermissions)
            .AnyAsync(rp => rp.Permission.PermissionName == permission);
    }

    public async Task<bool> HasCategoryAccessAsync(string userName, Guid categoryId)
    {
        return await _context.Users
            .Where(u => u.UserName == userName)
            .SelectMany(u => u.Role.RoleCategoryPermissions)
            .AnyAsync(rcp => rcp.FormCategoryId == categoryId && rcp.CanAcess == true);
    }

    // 🆕 CÁC HÀM MỚI CHO USER MANAGEMENT

    /// <summary>
    /// Lấy tất cả users kèm thông tin role và user roles (quan hệ nhiều-nhiều)
    /// </summary>
    public async Task<IEnumerable<User>> GetAllUsersWithRoleAsync()
    {
        return await _context.Users
    .Include(u => u.Role) // Role chính
    .Include(u => u.UserRoles) // Quan hệ nhiều-nhiều
        .ThenInclude(ur => ur.Role) // Role của từng UserRole
    .OrderBy(u => u.Name)
    .ToListAsync();
    }

    /// <summary>
    /// Lấy user theo ID kèm thông tin role và user roles
    /// </summary>
    public async Task<User?> GetUserWithRoleAsync(Guid userId)
    {
        return await _context.Users
        .Include(u => u.Role) // Role chính
        .Include(u => u.UserRoles) // Quan hệ nhiều-nhiều
            .ThenInclude(ur => ur.Role) // Role của từng UserRole
        .FirstOrDefaultAsync(u => u.Id == userId);
    }

    /// <summary>
    /// Lấy user theo username kèm thông tin role
    /// </summary>
    public async Task<User?> GetUserByUserNameAsync(string userName)
    {
        return await _context.Users
         .Include(u => u.Role) // Role chính
         .Include(u => u.UserRoles) // Quan hệ nhiều-nhiều
             .ThenInclude(ur => ur.Role) // Role của từng UserRole
         .FirstOrDefaultAsync(u => u.UserName == userName);
    }

    /// <summary>
    /// Lấy danh sách users theo roleId
    /// </summary>
    public async Task<IEnumerable<User>> GetUsersByRoleAsync(Guid roleId)
    {
        return await _context.Users
            .Include(u => u.Role)
            .Where(u => u.RoleId == roleId)
            .OrderBy(u => u.Name)
            .ToListAsync();
    }

    /// <summary>
    /// Kiểm tra username đã tồn tại chưa (có thể exclude một user cụ thể)
    /// </summary>
    public async Task<bool> IsUserNameExistsAsync(string userName, Guid? excludeUserId = null)
    {
        var query = _context.Users.Where(u => u.UserName == userName);

        if (excludeUserId.HasValue)
        {
            query = query.Where(u => u.Id != excludeUserId.Value);
        }

        return await query.AnyAsync();
    }

    /// <summary>
    /// Đếm số lượng users theo role
    /// </summary>
    public async Task<int> CountUsersByRoleAsync(Guid roleId)
    {
        return await _context.Users
            .CountAsync(u => u.RoleId == roleId);
    }

    /// <summary>
    /// Lấy users kèm thống kê forms và user fill forms
    /// </summary>
    public async Task<IEnumerable<object>> GetUsersWithStatisticsAsync()
    {
        return await _context.Users
            .Include(u => u.Role)
            .Select(u => new
            {
                u.Id,
                u.Name,
                u.UserName,
                RoleName = u.Role != null ? u.Role.RoleName : "",
                FormsCount = u.Forms.Count(),
                UserFillFormsCount = u.UserFillForms.Count()
            })
            .ToListAsync();
    }

    /// <summary>
    /// Kiểm tra user có dữ liệu liên quan không (forms, user fill forms)
    /// </summary>
    public async Task<bool> HasRelatedDataAsync(Guid userId)
    {
        var hasForms = await _context.Forms.AnyAsync(f => f.UserId == userId);
        var hasUserFillForms = await _context.UserFillForms.AnyAsync(uff => uff.UserId == userId);

        return hasForms || hasUserFillForms;
    }

    /// <summary>
    /// Tìm kiếm users theo tên hoặc username
    /// </summary>
    public async Task<IEnumerable<User>> SearchUsersAsync(string searchTerm)
    {
        if (string.IsNullOrWhiteSpace(searchTerm))
        {
            return await GetAllUsersWithRoleAsync();
        }

        var lowerSearchTerm = searchTerm.ToLower();

        return await _context.Users
            .Include(u => u.Role)
            .Where(u => u.Name.ToLower().Contains(lowerSearchTerm) ||
                       (u.UserName != null && u.UserName.ToLower().Contains(lowerSearchTerm)))
            .OrderBy(u => u.Name)
            .ToListAsync();
    }

    /// <summary>
    /// Lấy users với phân trang kèm user roles
    /// </summary>
    public async Task<(IEnumerable<User> Users, int TotalCount)> GetUsersWithPaginationAsync(
        int pageNumber = 1,
        int pageSize = 10,
        string? searchTerm = null)
    {
        var query = _context.Users
       .Include(u => u.Role) // Role chính
       .Include(u => u.UserRoles) // Quan hệ nhiều-nhiều
           .ThenInclude(ur => ur.Role) // Role của từng UserRole
       .AsQueryable();

        // Áp dụng tìm kiếm nếu có
        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var lowerSearchTerm = searchTerm.ToLower();
            query = query.Where(u => u.Name.ToLower().Contains(lowerSearchTerm) ||
                                   (u.UserName != null && u.UserName.ToLower().Contains(lowerSearchTerm)));
        }

        var totalCount = await query.CountAsync();

        var users = await query
            .OrderBy(u => u.Name)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (users, totalCount);
    }

    /// <summary>
    /// Lấy users active (có thể thêm field IsActive vào User entity sau này)
    /// </summary>
    public async Task<IEnumerable<User>> GetActiveUsersAsync()
    {
        return await _context.Users
            .Include(u => u.Role)
            .Where(u => u.Role != null) // Users có role là active
            .OrderBy(u => u.Name)
            .ToListAsync();
    }
}
