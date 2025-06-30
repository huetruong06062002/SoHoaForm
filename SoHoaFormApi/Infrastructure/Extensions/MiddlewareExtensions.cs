using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SoHoaFormApi.MiddleWare;

namespace SoHoaFormApi.Infrastructure.Extensions
{
    public static class MiddlewareExtensions
    {
         /// <summary>
        /// Sử dụng Data Seeding Middleware
        /// </summary>
        public static IApplicationBuilder UseDataSeeding(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<DataSeedingMiddleware>();
        }
    }
}