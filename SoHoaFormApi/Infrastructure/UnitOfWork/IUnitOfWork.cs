
using SoHoaFormApi.Models.DbSoHoaForm;

public interface IUnitOfWork : IAsyncDisposable
{
    public IUserRepository _userRepository { get; }
    public IRoleRepository _roleRepository { get; }
    public IFormRepository _formRepository { get; }
    public IFormFieldRepository _formFieldRepository { get; }
    
    public IFieldRepository _fieldRepository { get; }
    public IFormCategoryRepository _formCategoryRepository { get; }

    public IPdfRepository _pdfRepository { get; }

    public IUserFillFormRepository _userFillFormRepository { get; }

    public IUserFillFormHistoryRepository _formFieldValueRepository { get; }

    public Task BeginTransaction();
    public Task CommitTransaction();
    public Task RollBack();


    Task<int> SaveChangesAsync();

    public ValueTask DisposeAsync();
}

public class UnitOfWork : IUnitOfWork
{
    
    public IUserRepository _userRepository { get; }
    public IRoleRepository _roleRepository { get; }
    public IFormRepository _formRepository { get; }
    public IFormFieldRepository _formFieldRepository { get; }
    
    public IFieldRepository _fieldRepository { get; }
    public IFormCategoryRepository _formCategoryRepository { get; }

    public IPdfRepository _pdfRepository { get; }

    public IUserFillFormRepository _userFillFormRepository { get; }

    public IUserFillFormHistoryRepository _formFieldValueRepository { get; }

    private readonly SoHoaFormContext _context;

    public UnitOfWork(SoHoaFormContext context
        , IUserRepository userRepository
        , IRoleRepository roleRepository
        , IFormRepository formRepository
        , IFormFieldRepository formFieldRepository
        , IFieldRepository fieldRepository
        , IFormCategoryRepository formCategoryRepository
        , IPdfRepository pdfRepository
        , IUserFillFormRepository userFillFormRepository
        , IUserFillFormHistoryRepository formFieldValueRepository
    )
    {
        _context = context;
        _userRepository = userRepository;
        _roleRepository = roleRepository;
        _formRepository = formRepository;
        _formFieldRepository = formFieldRepository;
        _fieldRepository = fieldRepository;
        _formCategoryRepository = formCategoryRepository;
        _pdfRepository = pdfRepository;
        _userFillFormRepository = userFillFormRepository;
        _formFieldValueRepository = formFieldValueRepository;
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



