using CrimsonSports.Api.Data;
using CrimsonSports.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrimsonSports.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TransactionsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TransactionsController(AppDbContext context)
        {
            _context = context;
        }

        public class CartItemDto
        {
            public int ProductID { get; set; }
            public int Quantity { get; set; }
        }

        public class CreateTransactionRequest
        {
            public int CustomerID { get; set; }
            public int EmployeeID { get; set; } // for simplicity, pick 1 or from login
            public string PaymentMethod { get; set; } = "Credit";
            public List<CartItemDto> Items { get; set; } = new();
        }

        [HttpPost]
        public async Task<IActionResult> CreateTransaction([FromBody] CreateTransactionRequest request)
        {
            if (request.Items == null || request.Items.Count == 0)
            {
                return BadRequest("Cart is empty.");
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            var newTrans = new CustomerPurchaseTransaction
            {
                CustomerID = request.CustomerID,
                EmployeeID = request.EmployeeID,
                TransactionDate = DateTime.Now,
                PaymentMethod = request.PaymentMethod,
                Status = "Completed"
            };

            _context.CustomerPurchaseTransactions.Add(newTrans);
            await _context.SaveChangesAsync();

            decimal total = 0m;

            foreach (var item in request.Items)
            {
                var product = await _context.Products.FirstOrDefaultAsync(p => p.ProductID == item.ProductID);
                if (product == null) continue;

                if (product.StockQuantity < item.Quantity)
                {
                    await transaction.RollbackAsync();
                    return BadRequest($"Not enough stock for {product.ProductName}.");
                }

                var detail = new TransactionDetail
                {
                    TransactionID = newTrans.TransactionID,
                    ProductID = product.ProductID,
                    Quantity = item.Quantity,
                    UnitPrice = product.Price,
                    Subtotal = product.Price * item.Quantity
                };

                _context.TransactionDetails.Add(detail);

                product.StockQuantity -= item.Quantity;
                total += detail.Subtotal;
            }

            newTrans.TotalAmount = total;
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { newTrans.TransactionID, newTrans.TotalAmount });
        }
    }
}
