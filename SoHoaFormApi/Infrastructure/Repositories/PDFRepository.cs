using SoHoaFormApi.Models.DbSoHoaForm;

public interface IPdfRepository : IRepository<Pdf>
{
    // Add custom methods for Pdf here if needed
}

public class PdfRepository : Repository<Pdf>, IPdfRepository
{
    public PdfRepository(SoHoaFormContext context) : base(context)
    {
    }
}