using SoHoaFormApi.Models.DbSoHoaForm;

public interface IFormCategoryRepository : IRepository<FormCategory>
{
    // Add custom methods for FormCategory here if needed
}

public class FormCategoryRepository : Repository<FormCategory>, IFormCategoryRepository
{
    public FormCategoryRepository(SoHoaFormContext context) : base(context)
    {
    }
}