using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using SoHoaFormApi.Models.DbSoHoaForm;

public interface IUserFillFormHistoryRepository : IRepository<UserFillFormHistory>
{

    
}

public class UserFillFormHistoryRepository : Repository<UserFillFormHistory>, IUserFillFormHistoryRepository
{
    public UserFillFormHistoryRepository(SoHoaFormContext context) : base(context)
    {
    }

   
}