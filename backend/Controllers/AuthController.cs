using CrimsonSports.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrimsonSports.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AuthController(AppDbContext context)
        {
            _context = context;
        }

        public class LoginRequest
        {
            public string Email { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
            public string UserType { get; set; } = "Customer"; // "Customer" or "Employee"
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (request.UserType == "Employee")
            {
                var emp = await _context.Employees
                    .FirstOrDefaultAsync(e => e.Email == request.Email && e.Password == request.Password);

                if (emp == null) return Unauthorized();

                return Ok(new
                {
                    userType = "Employee",
                    id = emp.EmployeeID,
                    name = $"{emp.FirstName} {emp.LastName}",
                    role = emp.Role
                });
            }
            else
            {
                var cust = await _context.Customers
                    .FirstOrDefaultAsync(c => c.Email == request.Email && c.Password == request.Password);

                if (cust == null) return Unauthorized();

                return Ok(new
                {
                    userType = "Customer",
                    id = cust.CustomerID,
                    name = $"{cust.FirstName} {cust.LastName}"
                });
            }
        }
    }
}
