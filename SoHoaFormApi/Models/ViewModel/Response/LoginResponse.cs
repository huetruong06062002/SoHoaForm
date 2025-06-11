using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.ViewModel.Response
{
    public class LoginResponse
    {
        public string Token { get; set; } = string.Empty;

        public string Role { get; set; } = string.Empty;

        public Guid UserId { get; set; }
         public string Message { get; set; } = string.Empty;
        public bool Success { get; set; } = false;
    }
}