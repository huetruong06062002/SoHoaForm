using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using SoHoaFormApi.Models.DbSoHoaForm;

public interface IFormRepository : IRepository<Form>
{
    Task<Form?> GetFormWithCategoryAsync(Guid formId);
    Task<List<Form>> GetFormsByCategoryAsync(Guid categoryId);

    Task<bool> AnyAsync(Expression<Func<Form, bool>> predicate);
    Task<IEnumerable<Form>> GetFormsByUserIdAsync(Guid userId);
    Task<IEnumerable<Form>> GetFormsByCategoryIdAsync(Guid categoryId);
    Task<Form?> GetFormWithDetailsAsync(Guid formId);
}

public class FormRepository : Repository<Form>, IFormRepository
{
    public FormRepository(SoHoaFormContext context) : base(context)
    {
    }

    public async Task<Form?> GetFormWithCategoryAsync(Guid formId)
    {
        return await _context.Forms
            .Include(f => f.Category)
            .FirstOrDefaultAsync(f => f.Id == formId);
    }

    public async Task<List<Form>> GetFormsByCategoryAsync(Guid categoryId)
    {
        return await _context.Forms
            .Include(f => f.Category)
            .Where(f => f.CategoryId == categoryId)
            .ToListAsync();
    }

      public async Task<bool> AnyAsync(Expression<Func<Form, bool>> predicate)
        {
            return await _context.Forms.AnyAsync(predicate);
        }

        public async Task<IEnumerable<Form>> GetFormsByUserIdAsync(Guid userId)
        {
            return await _context.Forms
                .Include(f => f.User)
                .Include(f => f.Category)
                .Where(f => f.UserId == userId)
                .OrderByDescending(f => f.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<Form>> GetFormsByCategoryIdAsync(Guid categoryId)
        {
            return await _context.Forms
                .Include(f => f.User)
                .Include(f => f.Category)
                .Where(f => f.CategoryId == categoryId)
                .OrderByDescending(f => f.CreatedAt)
                .ToListAsync();
        }

        public async Task<Form?> GetFormWithDetailsAsync(Guid formId)
        {
            return await _context.Forms
                .Include(f => f.User)
                .Include(f => f.Category)
                .Include(f => f.FormFields)
                    .ThenInclude(ff => ff.Field)
                .FirstOrDefaultAsync(f => f.Id == formId);
        }
}