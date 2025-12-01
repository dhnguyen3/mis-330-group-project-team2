namespace CrimsonSports.Api.Models
{
    public class TransactionDetail
    {
        public int TransactionDetailID { get; set; }
        public int TransactionID { get; set; }
        public int ProductID { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal Subtotal { get; set; }  // mapped to stored column

        public CustomerPurchaseTransaction? Transaction { get; set; }
        public Product? Product { get; set; }
    }
}

