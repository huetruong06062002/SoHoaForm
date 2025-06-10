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
    public class UserController : ControllerBase
    {
        public UserController()
        {
        }

        [HttpGet("")]
        public async Task<ActionResult> TestUser()
        {
          

            return Ok("123");
        }
    }
}