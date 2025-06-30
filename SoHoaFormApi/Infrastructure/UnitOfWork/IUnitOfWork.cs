
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

    public IUserFillFormHistoryRepository _userFillFormHistoryRepository { get; }

    public IPermissionsRepository _permissionsRepository { get; set; }
    public IRoleCategoryPermissionRepository _roleCategoryPermissionRepository { get; set; }
    public IRolePermissionsRepository _rolePermissionRepository { get; set; }

    public IUserRoleRepository _userRoleRepository { get; set; }

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

    public IUserFillFormHistoryRepository _userFillFormHistoryRepository { get; }

    public IPermissionsRepository _permissionsRepository { get; set; }
    public IRoleCategoryPermissionRepository _roleCategoryPermissionRepository { get; set; }
    public IRolePermissionsRepository _rolePermissionRepository { get; set; }

    public IUserRoleRepository _userRoleRepository {get; set;}
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
        , IUserFillFormHistoryRepository userFillFormHistoryRepository
        , IPermissionsRepository permissionsRepository
        , IRoleCategoryPermissionRepository roleCategoryPermissionRepository
        , IRolePermissionsRepository rolePermissionRepository
        , IUserRoleRepository userRoleRepository
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
        _userFillFormHistoryRepository = userFillFormHistoryRepository;
        _permissionsRepository = permissionsRepository;
        _roleCategoryPermissionRepository = roleCategoryPermissionRepository;
        _rolePermissionRepository = rolePermissionRepository;
        _userRoleRepository = userRoleRepository;
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



