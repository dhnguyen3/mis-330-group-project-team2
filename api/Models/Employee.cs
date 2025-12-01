namespace CrimsonSports.Api.Models
{
    public class Employee
    {
        public int EmployeeID { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? EmployeePhone { get; set; }
        public string? Role { get; set; }
        public DateTime HireDate { get; set; }

        public ICollection<CustomerPurchaseTransaction>? Transactions { get; set; }
    }
}

