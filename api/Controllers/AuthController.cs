using CrimsonSports.Api.Data;
using CrimsonSports.Api.Models;
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
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest("Email and password are required.");
            }

            try
            {
                // Trim whitespace from email (but not password - passwords are case and space sensitive)
                var email = request.Email.Trim();
                var password = request.Password; // Don't trim password - it's case and space sensitive

                // First check if it's an Employee (check employee table first since manager/cashier are employees)
                // Load all employees and filter in memory to avoid SQL translation issues
                var allEmployees = await _context.Employees.ToListAsync();
                
                // Debug: Get all employee emails for comparison
                var employeeEmails = allEmployees.Where(e => e.Email != null).Select(e => new { 
                    Original = e.Email, 
                    Trimmed = e.Email.Trim(), 
                    Lower = e.Email.Trim().ToLower() 
                }).ToList();
                
                // Try to find employee with case-insensitive email match
                var emp = allEmployees.FirstOrDefault(e => 
                    e.Email != null && 
                    string.Equals(e.Email.Trim(), email, StringComparison.OrdinalIgnoreCase));

                if (emp != null)
                {
                    // Check password (exact match, case-sensitive)
                    // Don't trim password - passwords should match exactly as stored
                    var dbPassword = emp.Password ?? "";
                    if (dbPassword == password)
                    {
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
                        // Email found but password doesn't match - return detailed error for debugging
                        return new JsonResult(new { 
                            message = "Invalid password for this email.",
                            debug = new { 
                                emailFound = true,
                                userType = "Employee",
                                employeeId = emp.EmployeeID,
                                employeeEmail = emp.Email,
                                employeeRole = emp.Role,
                                dbPasswordLength = dbPassword.Length,
                                requestPasswordLength = password.Length,
                                passwordsMatch = dbPassword == password
                            }
                        })
                        {
                            StatusCode = 401
                        };
                    }
                }

                // If not an Employee, check if it's a Customer
                var allCustomers = await _context.Customers.ToListAsync();
                var customerEmails = allCustomers.Where(c => c.Email != null).Select(c => c.Email.Trim()).ToList();
                var cust = allCustomers.FirstOrDefault(c => 
                    c.Email != null && 
                    string.Equals(c.Email.Trim(), email, StringComparison.OrdinalIgnoreCase));

                if (cust != null)
                {
                    // Check password (exact match, case-sensitive)
                    // Don't trim password - passwords should match exactly as stored
                    var dbPassword = cust.Password ?? "";
                    if (dbPassword == password)
                    {
                        return Ok(new
                        {
                            userType = "Customer",
                            id = cust.CustomerID,
                            name = $"{cust.FirstName} {cust.LastName}"
                        });
                    }
                    else
                    {
                        // Email found but password doesn't match
                        return new JsonResult(new { 
                            message = "Invalid password for this email.",
                            debug = new { 
                                emailFound = true,
                                userType = "Customer",
                                dbPasswordLength = dbPassword.Length,
                                requestPasswordLength = password.Length
                            }
                        })
                        {
                            StatusCode = 401
                        };
                    }
                }

                // If neither found, return Unauthorized with debug info
                var totalEmployees = allEmployees.Count;
                var totalCustomers = allCustomers.Count;
                var allEmployeeEmails = allEmployees.Where(e => e.Email != null).Select(e => e.Email.Trim()).ToList();
                var allCustomerEmails = allCustomers.Where(c => c.Email != null).Select(c => c.Email.Trim()).ToList();
                
                return new JsonResult(new { 
                    message = "No account found with this email address.",
                    debug = new {
                        searchedEmail = email,
                        totalEmployeesInDb = totalEmployees,
                        totalCustomersInDb = totalCustomers,
                        allEmployeeEmails = allEmployeeEmails,
                        allCustomerEmails = allCustomerEmails,
                        employeeEmailMatch = allEmployeeEmails.Any(e => string.Equals(e, email, StringComparison.OrdinalIgnoreCase)),
                        customerEmailMatch = allCustomerEmails.Any(c => string.Equals(c, email, StringComparison.OrdinalIgnoreCase))
                    }
                })
                {
                    StatusCode = 401
                };
            }
            catch (Exception ex)
            {
                // Log the error for debugging
                return StatusCode(500, new { message = $"Database error: {ex.Message}", stackTrace = ex.StackTrace });
            }
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] Customer customer)
        {
            // Check if email already exists
            var existingCustomer = await _context.Customers
                .FirstOrDefaultAsync(c => c.Email == customer.Email);
            
            if (existingCustomer != null)
            {
                return BadRequest("Email already registered.");
            }

            customer.RegistrationDate = DateTime.Now;
            _context.Customers.Add(customer);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                userType = "Customer",
                id = customer.CustomerID,
                name = $"{customer.FirstName} {customer.LastName}",
                message = "Registration successful!"
            });
        }

        // Helper endpoint to list available users (for debugging - remove in production)
        [HttpGet("users")]
        public async Task<IActionResult> GetUsers()
        {
            var customers = await _context.Customers
                .Select(c => new { c.CustomerID, c.Email, c.FirstName, c.LastName, PasswordLength = c.Password != null ? c.Password.Length : 0 })
                .ToListAsync();
            
            var employees = await _context.Employees
                .Select(e => new { e.EmployeeID, e.Email, e.FirstName, e.LastName, e.Role, PasswordLength = e.Password != null ? e.Password.Length : 0 })
                .ToListAsync();

            return Ok(new
            {
                customers,
                employees,
                totalCustomers = customers.Count,
                totalEmployees = employees.Count
            });
        }

        // Test endpoint to check a specific email (for debugging)
        [HttpGet("test-email")]
        public async Task<IActionResult> TestEmail([FromQuery] string email)
        {
            if (string.IsNullOrWhiteSpace(email))
            {
                return BadRequest("Email parameter is required.");
            }

            var emailTrimmed = email.Trim();
            var emailLower = emailTrimmed.ToLower();
            
            // Load all employees and customers to test database connection
            var allEmployees = await _context.Employees.ToListAsync();
            var allCustomers = await _context.Customers.ToListAsync();
            
            var emp = allEmployees.FirstOrDefault(e => 
                e.Email != null && 
                string.Equals(e.Email.Trim(), emailTrimmed, StringComparison.OrdinalIgnoreCase));
            
            var cust = allCustomers.FirstOrDefault(c => 
                c.Email != null && 
                string.Equals(c.Email.Trim(), emailTrimmed, StringComparison.OrdinalIgnoreCase));

            return Ok(new
            {
                searchedEmail = email,
                emailTrimmed = emailTrimmed,
                emailLower = emailLower,
                totalEmployees = allEmployees.Count,
                totalCustomers = allCustomers.Count,
                foundAsEmployee = emp != null,
                foundAsCustomer = cust != null,
                employee = emp != null ? new { 
                    emp.EmployeeID, 
                    emp.Email, 
                    emp.FirstName, 
                    emp.LastName, 
                    emp.Role,
                    PasswordLength = emp.Password?.Length ?? 0,
                    PasswordFirstChar = emp.Password != null && emp.Password.Length > 0 ? emp.Password[0].ToString() : "empty"
                } : null,
                customer = cust != null ? new { 
                    cust.CustomerID, 
                    cust.Email, 
                    cust.FirstName, 
                    cust.LastName, 
                    PasswordLength = cust.Password?.Length ?? 0 
                } : null,
                allEmployeeEmails = allEmployees.Where(e => e.Email != null).Select(e => e.Email).ToList(),
                allCustomerEmails = allCustomers.Where(c => c.Email != null).Select(c => c.Email).ToList()
            });
        }
    }
}

