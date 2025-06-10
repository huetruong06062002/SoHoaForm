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
    public class AdminController : ControllerBase
    {
        public AdminController()
        {
        }

        [HttpGet("")]
        public async Task<IActionResult> TestAdmin()
        {
            return Ok("123");
        }

    }
}