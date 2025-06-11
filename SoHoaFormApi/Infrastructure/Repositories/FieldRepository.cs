using SoHoaFormApi.Models.DbSoHoaForm;

public interface IFieldRepository : IRepository<Field>
{
    // Add custom methods for Field here if needed
}

public class FieldRepository : Repository<Field>, IFieldRepository
{
    public FieldRepository(SoHoaFormContext context) : base(context)
    {
    }
}