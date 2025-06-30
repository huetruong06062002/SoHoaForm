using Microsoft.EntityFrameworkCore;
using SoHoaFormApi.Models.DbSoHoaForm;

public interface IFormCategoryRepository : IRepository<FormCategory>
{
    public Task<List<FormCategory>> GetAllCategoriesAsync();

    public Task<FormCategory> GetCategorieByNameAsync(string name, Guid ParentCategoryId);

    public Task<FormCategory> GetCategoryWithDetailsAsync(Guid categoryId);

    public Task<FormCategory> GetParentCategoryByIdAsync(Guid categoryId);

    public Task<List<FormCategory>> GetRootCategoryAsync();

    public Task<List<FormCategory>> GetChildCategoriesByParentIdAsync(Guid? parentId);

    public Task<FormCategory> GetCategoryWithRolePermission(Guid categoryId);
}

public class FormCategoryRepository : Repository<FormCategory>, IFormCategoryRepository
{
    public FormCategoryRepository(SoHoaFormContext context) : base(context)
    {
    }

    public async Task<List<FormCategory>> GetAllCategoriesAsync()
    {
        return await _context.FormCategories
                        .Include(c => c.ParentCategory)
                        .Include(c => c.InverseParentCategory)
                        .Include(c => c.Forms)
                        .Include(c => c.RoleCategoryPermissions)
                            .ThenInclude(rcp => rcp.Role)
                        .ToListAsync();
    }

    public async Task<FormCategory> GetCategorieByNameAsync(string name, Guid ParentCategoryId)
    {
        return await _context.FormCategories
                .FirstOrDefaultAsync(c => c.CategoryName.ToLower() == name.ToLower()
                                        && c.ParentCategoryId == ParentCategoryId);
    }

    public async Task<FormCategory> GetCategoryWithDetailsAsync(Guid categoryId)
    {
        return await _context.FormCategories
                        .Include(c => c.ParentCategory)
                        .Include(c => c.InverseParentCategory)
                        .Include(c => c.Forms)
                        .Include(c => c.RoleCategoryPermissions)
                            .ThenInclude(rcp => rcp.Role)
                        .FirstOrDefaultAsync(c => c.Id == categoryId);

    }

  public async Task<FormCategory> GetCategoryWithRolePermission(Guid categoryId)
  {
    return await _context.FormCategories
                    .Include(c => c.InverseParentCategory)
                    .Include(c => c.Forms)
                    .Include(c => c.RoleCategoryPermissions)
                    .FirstOrDefaultAsync(c => c.Id == categoryId);
  }

  public async Task<List<FormCategory>> GetChildCategoriesByParentIdAsync(Guid? parentId)
    {
        return await _context.FormCategories
          .Include(c => c.InverseParentCategory)
          .Include(c => c.Forms)
          .Where(c => c.ParentCategoryId == parentId)
          .ToListAsync();
    }

    public async Task<FormCategory> GetParentCategoryByIdAsync(Guid categoryId)
    {
        return await _context.FormCategories
             .Include(c => c.ParentCategory)
             .FirstOrDefaultAsync(c => c.Id == categoryId);
    }

    public async Task<List<FormCategory>> GetRootCategoryAsync()
    {
        return await _context.FormCategories
               .Include(c => c.InverseParentCategory)
               .Include(c => c.Forms)
               .Where(c => c.ParentCategoryId == null)
               .ToListAsync();
    }
}