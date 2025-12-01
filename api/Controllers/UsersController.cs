using CrimsonSports.Api.Data;
using CrimsonSports.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrimsonSports.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UsersController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/users/customers - Get all customers
        [HttpGet("customers")]
        public async Task<IActionResult> GetCustomers()
        {
            var customers = await _context.Customers
                .OrderBy(c => c.LastName)
                .ThenBy(c => c.FirstName)
                .ToListAsync();
            return Ok(customers);
        }

        // GET: api/users/employees - Get all employees
        [HttpGet("employees")]
        public async Task<IActionResult> GetEmployees()
        {
            var employees = await _context.Employees
                .OrderBy(e => e.LastName)
                .ThenBy(e => e.FirstName)
                .ToListAsync();
            return Ok(employees);
        }

        // POST: api/users/customers - Create new customer
        [HttpPost("customers")]
        public async Task<IActionResult> CreateCustomer([FromBody] Customer customer)
        {
            if (string.IsNullOrWhiteSpace(customer.Email))
            {
                return BadRequest("Email is required.");
            }

            // Check if email already exists
            var existing = await _context.Customers
                .FirstOrDefaultAsync(c => c.Email.ToLower() == customer.Email.ToLower());
            
            if (existing != null)
            {
                return BadRequest("Email already registered.");
            }

            customer.RegistrationDate = DateTime.Now;
            _context.Customers.Add(customer);
            await _context.SaveChangesAsync();

            return Ok(customer);
        }

        // POST: api/users/employees - Create new employee
        [HttpPost("employees")]
        public async Task<IActionResult> CreateEmployee([FromBody] Employee employee)
        {
            if (string.IsNullOrWhiteSpace(employee.Email))
            {
                return BadRequest("Email is required.");
            }

            // Check if email already exists
            var existing = await _context.Employees
                .FirstOrDefaultAsync(e => e.Email.ToLower() == employee.Email.ToLower());
            
            if (existing != null)
            {
                return BadRequest("Email already registered.");
            }

            employee.HireDate = DateTime.Now;
            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();

            return Ok(employee);
        }

        // DELETE: api/users/customers/{id} - Delete customer
        [HttpDelete("customers/{id}")]
        public async Task<IActionResult> DeleteCustomer(int id)
        {
            var customer = await _context.Customers.FindAsync(id);
            if (customer == null) return NotFound();

            _context.Customers.Remove(customer);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/users/employees/{id} - Delete employee
        [HttpDelete("employees/{id}")]
        public async Task<IActionResult> DeleteEmployee(int id)
        {
            var employee = await _context.Employees.FindAsync(id);
            if (employee == null) return NotFound();

            _context.Employees.Remove(employee);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // PUT: api/users/customers/{id} - Update customer
        [HttpPut("customers/{id}")]
        public async Task<IActionResult> UpdateCustomer(int id, [FromBody] Customer updated)
        {
            if (string.IsNullOrWhiteSpace(updated.Email))
            {
                return BadRequest("Email is required.");
            }

            var customer = await _context.Customers.FindAsync(id);
            if (customer == null) return NotFound();

            // Check if email is being changed and if new email already exists
            if (customer.Email.ToLower() != updated.Email.ToLower())
            {
                var existing = await _context.Customers
                    .FirstOrDefaultAsync(c => c.Email.ToLower() == updated.Email.ToLower() && c.CustomerID != id);
                if (existing != null)
                {
                    return BadRequest("Email already registered.");
                }
            }

            customer.FirstName = updated.FirstName;
            customer.LastName = updated.LastName;
            customer.Email = updated.Email;
            customer.Password = updated.Password;
            customer.Address = updated.Address;
            customer.City = updated.City;
            customer.State = updated.State;
            customer.Zipcode = updated.Zipcode;
            customer.CustomerPhone = updated.CustomerPhone;

            await _context.SaveChangesAsync();
            return Ok(customer);
        }

        // PUT: api/users/employees/{id} - Update employee
        [HttpPut("employees/{id}")]
        public async Task<IActionResult> UpdateEmployee(int id, [FromBody] Employee updated)
        {
            if (string.IsNullOrWhiteSpace(updated.Email))
            {
                return BadRequest("Email is required.");
            }

            var employee = await _context.Employees.FindAsync(id);
            if (employee == null) return NotFound();

            // Check if email is being changed and if new email already exists
            if (employee.Email.ToLower() != updated.Email.ToLower())
            {
                var existing = await _context.Employees
                    .FirstOrDefaultAsync(e => e.Email.ToLower() == updated.Email.ToLower() && e.EmployeeID != id);
                if (existing != null)
                {
                    return BadRequest("Email already registered.");
                }
            }

            employee.FirstName = updated.FirstName;
            employee.LastName = updated.LastName;
            employee.Email = updated.Email;
            employee.Password = updated.Password;
            employee.EmployeePhone = updated.EmployeePhone;
            employee.Role = updated.Role;

            await _context.SaveChangesAsync();
            return Ok(employee);
        }
    }
}

