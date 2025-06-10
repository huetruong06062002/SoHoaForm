using SoHoaFormApi.Models.DbSoHoaForm;

public interface IFormRepository : IRepository<Form>
{
    // Add custom methods for Form here if needed
}

public class FormRepository : Repository<Form>, IFormRepository
{
    public FormRepository(SoHoaFormContext context) : base(context)
    {
    }
}