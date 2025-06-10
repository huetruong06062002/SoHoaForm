
using SoHoaFormApi.Models.DbSoHoaForm;

public interface IUnitOfWork : IAsyncDisposable
{
    public Task BeginTransaction();
    public Task CommitTransaction();
    public Task RollBack();


    Task<int> SaveChangesAsync();

    public ValueTask DisposeAsync();
}

public class UnitOfWork : IUnitOfWork
{
    

    private readonly SoHoaFormContext _context;

    public UnitOfWork(SoHoaFormContext context)
    {
        _context = context;

    }

    public async Task BeginTransaction()
    {
        await _context.Database.BeginTransactionAsync();
    }
    public async Task CommitTransaction()
    {
        await _context.Database.CommitTransactionAsync();
    }
    public async Task RollBack()
    {
        await _context.Database.RollbackTransactionAsync();
    }
    public Task<int> SaveChangesAsync()
    {
        return _context.SaveChangesAsync();
    }
    public async ValueTask DisposeAsync()
    {
        await _context.DisposeAsync();
    }
}



