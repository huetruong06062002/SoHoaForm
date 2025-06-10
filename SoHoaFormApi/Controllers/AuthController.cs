using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
//using SoHoaFormApi.Models;

namespace SoHoaFormApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        public AuthController()
        {
        }

        [HttpGet("")]
        public async Task<ActionResult> TestAuth()
        {
          

            return Ok("123");
        }

    }
}