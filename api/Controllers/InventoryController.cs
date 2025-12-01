using CrimsonSports.Api.Data;
using CrimsonSports.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrimsonSports.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InventoryController : ControllerBase
    {
        private readonly AppDbContext _context;

        public InventoryController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/inventory - Get all products with inventory details
        [HttpGet]
        public async Task<IActionResult> GetInventory()
        {
            var products = await _context.Products
                .OrderBy(p => p.ProductName)
                .ToListAsync();
            return Ok(products);
        }

        // GET: api/inventory/low-stock - Get products with low stock
        [HttpGet("low-stock")]
        public async Task<IActionResult> GetLowStock([FromQuery] int threshold = 10)
        {
            var products = await _context.Products
                .Where(p => p.StockQuantity <= threshold)
                .OrderBy(p => p.StockQuantity)
                .ToListAsync();
            return Ok(products);
        }

        // PUT: api/inventory/{id}/stock - Update stock quantity
        [HttpPut("{id}/stock")]
        public async Task<IActionResult> UpdateStock(int id, [FromBody] int quantity)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null) return NotFound();

            product.StockQuantity = quantity;
            product.LastUpdated = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(product);
        }
    }
}

