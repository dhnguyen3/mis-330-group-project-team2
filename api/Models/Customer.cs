namespace CrimsonSports.Api.Models
{
    public class Customer
    {
        public int CustomerID { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Zipcode { get; set; }
        public string? CustomerPhone { get; set; }
        public DateTime RegistrationDate { get; set; }

        public ICollection<CustomerPurchaseTransaction>? Transactions { get; set; }
    }
}

