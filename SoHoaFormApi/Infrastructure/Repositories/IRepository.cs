using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using SoHoaFormApi.Models.DbSoHoaForm;


public interface IRepository<T> where T : class
{
    Task<IEnumerable<T>> GetAllAsync();
    Task<T?> GetByIdAsync(Guid id);
    Task AddAsync(T entity);
    void Update(T entity);
    Task DeleteAsync(Guid id);
    Task<T?> SingleOrDefaultAsync(Expression<Func<T, bool>> predicate);
    Task<IEnumerable<T>> WhereAsync(Expression<Func<T, bool>> predicate);
}

public class Repository<T> : IRepository<T> where T : class
{
    protected readonly SoHoaFormContext _context;
    public readonly DbSet<T> _dbSet;

    public Repository(SoHoaFormContext context)
    {
        _context = context;
        _dbSet = _context.Set<T>();
    }


    public async Task<IEnumerable<T>> GetAllAsync(){
        return  _dbSet.AsNoTracking();
    }


    public async Task<T?> GetByIdAsync(Guid id)
        => await _dbSet.FindAsync(id);

    public async Task AddAsync(T entity)
    {
        await _dbSet.AddAsync(entity);
    }

    public void Update(T entity)
    {
        _dbSet.Update(entity);
    }

    public async Task DeleteAsync(Guid id)
    {
        var entity = await _dbSet.FindAsync(id);
        if (entity is not null)
        {
            _dbSet.Remove(entity);
        }
    }

    public async Task<T?> SingleOrDefaultAsync(Expression<Func<T, bool>> predicate)  => await _dbSet.AsNoTracking().SingleOrDefaultAsync(predicate);


    public async Task<IEnumerable<T>> WhereAsync(Expression<Func<T, bool>> predicate)  => await _dbSet.AsNoTracking().Where(predicate).ToListAsync();

}
