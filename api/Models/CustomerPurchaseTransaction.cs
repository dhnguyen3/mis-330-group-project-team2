namespace CrimsonSports.Api.Models
{
    public class CustomerPurchaseTransaction
    {
        public int TransactionID { get; set; }
        public int CustomerID { get; set; }
        public int EmployeeID { get; set; }
        public DateTime TransactionDate { get; set; }
        public string? PaymentMethod { get; set; }
        public decimal? TotalAmount { get; set; }
        public string Status { get; set; } = "Pending";

        public Customer? Customer { get; set; }
        public Employee? Employee { get; set; }
        public ICollection<TransactionDetail>? TransactionDetails { get; set; }
    }
}

