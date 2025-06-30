using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using SoHoaFormApi.Models.DbSoHoaForm;

public interface IUserFillFormRepository : IRepository<UserFillForm>
{
   Task<bool> AnyAsync(Expression<Func<UserFillForm, bool>> predicate);
    Task<IEnumerable<UserFillForm>> GetUserFillFormsByUserIdAsync(Guid userId);
    Task<IEnumerable<UserFillForm>> GetUserFillFormsByFormIdAsync(Guid formId);
    Task<UserFillForm?> GetUserFillFormWithDetailsAsync(Guid userFillFormId);
}

public class UserFillFormRepository : Repository<UserFillForm>, IUserFillFormRepository
{
    public UserFillFormRepository(SoHoaFormContext context) : base(context)
    {
    }

     public async Task<bool> AnyAsync(Expression<Func<UserFillForm, bool>> predicate)
    {
        return await _context.UserFillForms.AnyAsync(predicate);
    }

    public async Task<IEnumerable<UserFillForm>> GetUserFillFormsByUserIdAsync(Guid userId)
    {
        return await _context.UserFillForms
            .Include(uff => uff.User)
            .Include(uff => uff.Form)
                .ThenInclude(f => f.Category)
            .Where(uff => uff.UserId == userId)
            .OrderByDescending(uff => uff.DateTime)
            .ToListAsync();
    }

    public async Task<IEnumerable<UserFillForm>> GetUserFillFormsByFormIdAsync(Guid formId)
    {
        return await _context.UserFillForms
            .Include(uff => uff.User)
            .Include(uff => uff.Form)
            .Where(uff => uff.FormId == formId)
            .OrderByDescending(uff => uff.DateTime)
            .ToListAsync();
    }

    public async Task<UserFillForm?> GetUserFillFormWithDetailsAsync(Guid userFillFormId)
    {
        return await _context.UserFillForms
            .Include(uff => uff.User)
            .Include(uff => uff.Form)
                .ThenInclude(f => f.Category)
            .Include(uff => uff.Form)
                .ThenInclude(f => f.FormFields)
                    .ThenInclude(ff => ff.Field)
            .FirstOrDefaultAsync(uff => uff.Id == userFillFormId);
    }
}