using CrimsonSports.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CrimsonSports.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Customer> Customers { get; set; }
        public DbSet<Employee> Employees { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<CustomerPurchaseTransaction> CustomerPurchaseTransactions { get; set; }
        public DbSet<TransactionDetail> TransactionDetails { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Map to existing table names/keys
            modelBuilder.Entity<Customer>().ToTable("customer").HasKey(c => c.CustomerID);
            modelBuilder.Entity<Employee>().ToTable("employee").HasKey(e => e.EmployeeID);
            modelBuilder.Entity<Product>().ToTable("product").HasKey(p => p.ProductID);
            modelBuilder.Entity<CustomerPurchaseTransaction>()
                .ToTable("customerPurchaseTransaction")
                .HasKey(t => t.TransactionID);
            modelBuilder.Entity<TransactionDetail>()
                .ToTable("transactionDetails")
                .HasKey(td => td.TransactionDetailID);

            base.OnModelCreating(modelBuilder);
        }
    }
}
