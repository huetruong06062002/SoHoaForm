using SoHoaFormApi.Models.DbSoHoaForm;

public interface IFormFieldRepository : IRepository<FormField>
{
    // Add custom methods for FormField here if needed
}

public class FormFieldRepository : Repository<FormField>, IFormFieldRepository
{
    public FormFieldRepository(SoHoaFormContext context) : base(context)
    {
    }
}