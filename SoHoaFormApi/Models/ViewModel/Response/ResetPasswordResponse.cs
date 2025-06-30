using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class ResetPasswordResponse
    {
        public Guid UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public bool IsReset { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime ResetAt { get; set; }
    }
}