using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SoHoaFormApi.Models.DbSoHoaForm;
//using SoHoaFormApi.Models;

namespace SoHoaFormApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly SoHoaFormContext _context;
        private readonly IWebHostEnvironment _environment;

        public UserController(
            IUserService userService
            , SoHoaFormContext context
            , IWebHostEnvironment environment
        )
        {
            _userService = userService;
            _context = context;
            _environment = environment;
        }

        [HttpGet("")]
        public async Task<ActionResult> TestUser()
        {


            return Ok("123");
        }
        [HttpGet("GetAllFormWithCategory")]
        public async Task<ActionResult> GetAllFormsCategory()
        {
            var response = await _userService.GetAllFormsCategoryAsync();
            if (response.StatusCode != 200)
            {
                return StatusCode(response.StatusCode, response);
            }
            return Ok(response);
        }
    }
}