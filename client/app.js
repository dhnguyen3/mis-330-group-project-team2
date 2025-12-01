const API_BASE_URL = "http://localhost:5001/api"; // adjust port

let currentUser = null; // { userType, id, name, role? }
let cart = [];

// UI references
const loginSection = document.getElementById("login-section");
const shopSection = document.getElementById("shop-section");
const adminSection = document.getElementById("admin-section");
const userInfoSpan = document.getElementById("user-info");

document.getElementById("nav-login").addEventListener("click", () => {
    showSection("login");
});
document.getElementById("nav-shop").addEventListener("click", () => {
    showSection("shop");
});
document.getElementById("nav-admin").addEventListener("click", () => {
    showSection("admin");
});

// Login helper function - automatically detects user type
async function performLogin(email, password) {
    const msg = document.getElementById("login-message");
    msg.textContent = "";

    if (!email || !password) {
        msg.textContent = "Please enter both email and password.";
        return;
    }

    try {
        const resp = await fetch(`${API_BASE_URL}/Auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        if (!resp.ok) {
            let errorText = "";
            let errorMessage = "";
            let debugInfo = null;
            try {
                const contentType = resp.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const errorJson = await resp.json();
                    // Handle ASP.NET Core ProblemDetails format
                    if (errorJson.message) {
                        errorMessage = errorJson.message;
                        debugInfo = errorJson.debug; // Get debug info if available
                    } else if (errorJson.title) {
                        errorMessage = errorJson.title;
                    } else if (typeof errorJson === "string") {
                        errorMessage = errorJson;
                    }
                    errorText = JSON.stringify(errorJson);
                } else {
                    errorText = await resp.text();
                    errorMessage = errorText;
                }
            } catch (e) {
                errorText = `Error parsing response: ${e.message}`;
                errorMessage = errorText;
            }
            
            if (resp.status === 401) {
                // Show user-friendly message with debug info if available
                let userMessage = "";
                if (debugInfo) {
                    // We have debug info - show more specific message
                    if (debugInfo.emailFound) {
                        userMessage = `Invalid password. Password length mismatch: DB has ${debugInfo.dbPasswordLength} chars, you entered ${debugInfo.requestPasswordLength} chars. Please check your password.`;
                    } else {
                        userMessage = "No account found with this email address. Please register or check your email.";
                    }
                } else if (errorMessage.toLowerCase().includes("password")) {
                    userMessage = "Invalid password. Please check your password and try again.";
                } else if (errorMessage.toLowerCase().includes("email") || errorMessage.toLowerCase().includes("account") || errorMessage.toLowerCase().includes("unauthorized")) {
                    if (debugInfo && debugInfo.totalEmployeesInDb !== undefined) {
                        userMessage = `No account found. Database has ${debugInfo.totalEmployeesInDb} employees and ${debugInfo.totalCustomersInDb} customers. Searched for: ${debugInfo.searchedEmail}`;
                        if (debugInfo.sampleEmployeeEmails && debugInfo.sampleEmployeeEmails.length > 0) {
                            console.log("Sample employee emails in DB:", debugInfo.sampleEmployeeEmails);
                        }
                        if (debugInfo.sampleCustomerEmails && debugInfo.sampleCustomerEmails.length > 0) {
                            console.log("Sample customer emails in DB:", debugInfo.sampleCustomerEmails);
                        }
                    } else {
                        userMessage = "No account found with this email address. Please register or check your email.";
                    }
                } else {
                    userMessage = "Invalid email or password. Please check your credentials and try again.";
                }
                msg.textContent = userMessage;
                msg.style.color = "red";
                console.error("Login failed (401):", errorText);
                if (debugInfo) {
                    console.error("Debug info:", debugInfo);
                }
            } else {
                msg.textContent = `Login failed (${resp.status}): ${errorMessage || "Unknown error"}`;
                msg.style.color = "red";
                console.error("Login error:", resp.status, errorText);
            }
            return;
        }

        const data = await resp.json();
        currentUser = data;
        userInfoSpan.textContent = `${data.userType}: ${data.name}`;
        msg.textContent = "Login successful!";
        
        // Automatically route based on user type
        if (data.userType === "Employee") {
            showSection("admin");
        } else {
            showSection("shop");
        }
    } catch (err) {
        console.error(err);
        msg.textContent = `Error logging in: ${err.message}`;
    }
}

// Regular login button
document.getElementById("login-btn").addEventListener("click", async () => {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    await performLogin(email, password);
});

// Quick login buttons
// Note: Update these credentials to match your database
document.getElementById("quick-login-customer1").addEventListener("click", async () => {
    document.getElementById("login-email").value = "emily.adams@example.com";
    document.getElementById("login-password").value = "EmilyPass9";
    await performLogin("emily.adams@example.com", "EmilyPass9");
});

document.getElementById("quick-login-customer2").addEventListener("click", async () => {
    document.getElementById("login-email").value = "john.bryant@example.com";
    document.getElementById("login-password").value = "JBama2025!";
    await performLogin("john.bryant@example.com", "JBama2025!");
});

document.getElementById("quick-login-manager").addEventListener("click", async () => {
    document.getElementById("login-email").value = "sarah.johnson@crimsonsports.com";
    document.getElementById("login-password").value = "Sar@h2024";
    await performLogin("sarah.johnson@crimsonsports.com", "Sar@h2024");
});

document.getElementById("quick-login-cashier").addEventListener("click", async () => {
    document.getElementById("login-email").value = "james.brown@crimsonsports.com";
    document.getElementById("login-password").value = "JBr0wn!";
    await performLogin("james.brown@crimsonsports.com", "JBr0wn!");
});

// Load products with enhanced search, filtering, and sorting
async function loadProducts(searchTerm = "", category = "", sort = "name") {
    const container = document.getElementById("products-container");
    container.innerHTML = "Loading...";

    let url = `${API_BASE_URL}/Products?sort=${sort}`;
    if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
    }
    if (category) {
        url += `&category=${encodeURIComponent(category)}`;
    }

    try {
        const resp = await fetch(url);
        const products = await resp.json();

        container.innerHTML = "";
        products.forEach(p => {
            const div = document.createElement("div");
            div.className = "product-card";
            div.innerHTML = `
                <h3>${p.productName}</h3>
                <p>Category: ${p.category || "N/A"}</p>
                <p>Price: $${p.price.toFixed(2)}</p>
                <p>In Stock: ${p.stockQuantity}</p>
                <button data-id="${p.productID}">Add to Cart</button>
            `;
            const btn = div.querySelector("button");
            btn.addEventListener("click", () => addToCart(p));
            container.appendChild(div);
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = "Failed to load products.";
    }
}

// Load categories for filter dropdown
async function loadCategories() {
    try {
        const resp = await fetch(`${API_BASE_URL}/Products`);
        const products = await resp.json();
        const categories = [...new Set(products.map(p => p.category).filter(c => c))];
        const select = document.getElementById("category-filter");
        // Clear existing options except "All Categories"
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }
        categories.forEach(cat => {
            const option = document.createElement("option");
            option.value = cat;
            option.textContent = cat;
            select.appendChild(option);
        });
    } catch (err) {
        console.error(err);
    }
}

// Registration
document.getElementById("show-register").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("login-tab").classList.add("hidden");
    document.getElementById("register-tab").classList.remove("hidden");
});

document.getElementById("show-login").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("register-tab").classList.add("hidden");
    document.getElementById("login-tab").classList.remove("hidden");
});

document.getElementById("register-btn").addEventListener("click", async () => {
    const msg = document.getElementById("register-message");
    msg.textContent = "";

    const customer = {
        firstName: document.getElementById("reg-firstName").value,
        lastName: document.getElementById("reg-lastName").value,
        email: document.getElementById("reg-email").value,
        password: document.getElementById("reg-password").value,
        customerPhone: document.getElementById("reg-phone").value || null,
        address: document.getElementById("reg-address").value || null,
        city: document.getElementById("reg-city").value || null,
        state: document.getElementById("reg-state").value || null,
        zipcode: document.getElementById("reg-zipcode").value || null
    };

    try {
        const resp = await fetch(`${API_BASE_URL}/Auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(customer)
        });

        if (!resp.ok) {
            const text = await resp.text();
            msg.textContent = `Registration failed: ${text}`;
            return;
        }

        const data = await resp.json();
        msg.textContent = "Registration successful! Please login.";
        setTimeout(() => {
            document.getElementById("register-tab").classList.add("hidden");
            document.getElementById("login-tab").classList.remove("hidden");
        }, 2000);
    } catch (err) {
        console.error(err);
        msg.textContent = "Error during registration.";
    }
});

// Enhanced search with sorting and category filtering
document.getElementById("search-btn").addEventListener("click", () => {
    const term = document.getElementById("search-box").value;
    const category = document.getElementById("category-filter").value;
    const sort = document.getElementById("sort-options").value;
    loadProducts(term, category, sort);
});

// Cart functions
function addToCart(product) {
    const existing = cart.find(c => c.productID === product.productID);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            productID: product.productID,
            name: product.productName,
            price: product.price,
            quantity: 1
        });
    }
    renderCart();
}

function renderCart() {
    const container = document.getElementById("cart-container");
    container.innerHTML = "";
    let total = 0;

    cart.forEach(item => {
        const lineTotal = item.price * item.quantity;
        total += lineTotal;

        const div = document.createElement("div");
        div.className = "cart-item";
        div.innerHTML = `
            ${item.name} (x${item.quantity}) - $${lineTotal.toFixed(2)}
            <button data-id="${item.productID}" class="inc">+</button>
            <button data-id="${item.productID}" class="dec">-</button>
        `;
        container.appendChild(div);
    });

    const totalDiv = document.createElement("div");
    totalDiv.textContent = `Total: $${total.toFixed(2)}`;
    container.appendChild(totalDiv);

    container.querySelectorAll(".inc").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id);
            const item = cart.find(c => c.productID === id);
            if (item) {
                item.quantity++;
                renderCart();
            }
        });
    });

    container.querySelectorAll(".dec").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id);
            const index = cart.findIndex(c => c.productID === id);
            if (index >= 0) {
                cart[index].quantity--;
                if (cart[index].quantity <= 0) {
                    cart.splice(index, 1);
                }
                renderCart();
            }
        });
    });
}

// Checkout
const checkoutBtn = document.getElementById("checkout-btn");
if (checkoutBtn) {
    checkoutBtn.addEventListener("click", async () => {
        const msg = document.getElementById("checkout-message");
        msg.textContent = "";
        msg.style.color = "";

        if (!currentUser || currentUser.userType !== "Customer") {
            msg.textContent = "Please log in as a customer first.";
            msg.style.color = "red";
            return;
        }

        if (cart.length === 0) {
            msg.textContent = "Cart is empty.";
            msg.style.color = "red";
            return;
        }

        const items = cart.map(c => ({
            productID: c.productID,
            quantity: c.quantity
        }));

        // Use the logged-in employee ID if available, otherwise default to 1
        const employeeID = currentUser.userType === "Employee" ? currentUser.id : 1;

        const body = {
            CustomerID: currentUser.id,
            EmployeeID: employeeID,
            PaymentMethod: "Credit",
            Items: items
        };

        try {
            checkoutBtn.disabled = true;
            checkoutBtn.textContent = "Processing...";

            const resp = await fetch(`${API_BASE_URL}/Transactions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (!resp.ok) {
                let errorText = "";
                try {
                    // Read as text first, then try to parse as JSON
                    const errorTextRaw = await resp.text();
                    try {
                        const errorJson = JSON.parse(errorTextRaw);
                        errorText = errorJson.message || errorJson.title || errorTextRaw;
                    } catch {
                        errorText = errorTextRaw || `HTTP ${resp.status} ${resp.statusText}`;
                    }
                } catch {
                    errorText = `HTTP ${resp.status} ${resp.statusText}`;
                }
                msg.textContent = `Checkout failed: ${errorText}`;
                msg.style.color = "red";
                console.error("Checkout error:", resp.status, errorText);
                return;
            }

            const data = await resp.json();
            msg.textContent = `Order placed! Transaction ID: ${data.transactionID}, Total: $${data.totalAmount.toFixed(2)}`;
            msg.style.color = "green";
            cart = [];
            renderCart();
            loadProducts(); // refresh inventory
        } catch (err) {
            console.error("Checkout exception:", err);
            msg.textContent = `Error during checkout: ${err.message}`;
            msg.style.color = "red";
        } finally {
            checkoutBtn.disabled = false;
            checkoutBtn.textContent = "Checkout";
        }
    });
} else {
    console.error("Checkout button not found!");
}

// ========== MANAGEMENT FUNCTIONS (For Managers/Employees) ==========

// Tab switching for management dashboard
document.getElementById("nav-products-mgmt").addEventListener("click", () => {
    switchMgmtTab("products");
    loadAdminProducts();
});

document.getElementById("nav-inventory-mgmt").addEventListener("click", () => {
    switchMgmtTab("inventory");
    loadInventory();
});

document.getElementById("nav-transactions-mgmt").addEventListener("click", () => {
    switchMgmtTab("transactions");
    loadTransactions();
});

document.getElementById("nav-users-mgmt").addEventListener("click", () => {
    switchMgmtTab("users");
    switchUserTypeTab("customers");
    loadCustomers();
});

function switchMgmtTab(tab) {
    document.querySelectorAll(".mgmt-tab").forEach(t => t.classList.add("hidden"));
    document.querySelectorAll(".mgmt-tab-btn").forEach(b => b.classList.remove("active"));
    
    if (tab === "products") {
        document.getElementById("products-mgmt-tab").classList.remove("hidden");
        document.getElementById("nav-products-mgmt").classList.add("active");
    } else if (tab === "inventory") {
        document.getElementById("inventory-mgmt-tab").classList.remove("hidden");
        document.getElementById("nav-inventory-mgmt").classList.add("active");
    } else if (tab === "transactions") {
        document.getElementById("transactions-mgmt-tab").classList.remove("hidden");
        document.getElementById("nav-transactions-mgmt").classList.add("active");
    } else if (tab === "users") {
        document.getElementById("users-mgmt-tab").classList.remove("hidden");
        document.getElementById("nav-users-mgmt").classList.add("active");
    }
}

function switchUserTypeTab(type) {
    document.querySelectorAll(".user-type-tab").forEach(t => t.classList.add("hidden"));
    document.querySelectorAll("#users-mgmt-tab .mgmt-tab-btn").forEach(b => b.classList.remove("active"));
    
    if (type === "customers") {
        document.getElementById("customers-mgmt").classList.remove("hidden");
        document.getElementById("nav-customers-tab").classList.add("active");
    } else if (type === "employees") {
        document.getElementById("employees-mgmt").classList.remove("hidden");
        document.getElementById("nav-employees-tab").classList.add("active");
    }
}

// Product Management (CRUD)
async function loadAdminProducts() {
    const container = document.getElementById("admin-products-container");
    container.innerHTML = "Loading...";

    try {
        const resp = await fetch(`${API_BASE_URL}/Products`);
        const products = await resp.json();
        container.innerHTML = "";

        products.forEach(p => {
            const div = document.createElement("div");
            div.className = "product-card";
            div.innerHTML = `
                <h3>${p.productName}</h3>
                <p>Category: ${p.category || "N/A"}</p>
                <p>Price: $${p.price.toFixed(2)}</p>
                <p>Stock: ${p.stockQuantity}</p>
                <p>Supplier: ${p.supplier || "N/A"}</p>
                <button class="edit-product-btn" data-id="${p.productID}">Edit</button>
                <button class="delete-product-btn" data-id="${p.productID}">Delete</button>
            `;
            const editBtn = div.querySelector(".edit-product-btn");
            const deleteBtn = div.querySelector(".delete-product-btn");
            editBtn.addEventListener("click", () => editProduct(p));
            deleteBtn.addEventListener("click", () => deleteProduct(p.productID));
            container.appendChild(div);
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = "Failed to load products.";
    }
}

document.getElementById("add-product-btn").addEventListener("click", () => {
    document.getElementById("modal-title").textContent = "Add New Product";
    document.getElementById("product-form").reset();
    document.getElementById("product-id").value = "";
    document.getElementById("product-modal").classList.remove("hidden");
});

document.getElementById("cancel-product-btn").addEventListener("click", () => {
    document.getElementById("product-modal").classList.add("hidden");
});

document.querySelector(".close-modal").addEventListener("click", () => {
    document.getElementById("product-modal").classList.add("hidden");
});

document.getElementById("product-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const productId = document.getElementById("product-id").value;
    const product = {
        productName: document.getElementById("product-name").value,
        category: document.getElementById("product-category").value,
        description: document.getElementById("product-description").value,
        price: parseFloat(document.getElementById("product-price").value),
        stockQuantity: parseInt(document.getElementById("product-stock").value),
        supplier: document.getElementById("product-supplier").value
    };

    try {
        let resp;
        if (productId) {
            // Update existing product
            resp = await fetch(`${API_BASE_URL}/Products/${productId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(product)
            });
        } else {
            // Create new product
            resp = await fetch(`${API_BASE_URL}/Products`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(product)
            });
        }

        if (!resp.ok) {
            alert("Failed to save product.");
            return;
        }

        document.getElementById("product-modal").classList.add("hidden");
        loadAdminProducts();
    } catch (err) {
        console.error(err);
        alert("Error saving product.");
    }
});

function editProduct(product) {
    document.getElementById("modal-title").textContent = "Edit Product";
    document.getElementById("product-id").value = product.productID;
    document.getElementById("product-name").value = product.productName;
    document.getElementById("product-category").value = product.category || "";
    document.getElementById("product-description").value = product.description || "";
    document.getElementById("product-price").value = product.price;
    document.getElementById("product-stock").value = product.stockQuantity;
    document.getElementById("product-supplier").value = product.supplier || "";
    document.getElementById("product-modal").classList.remove("hidden");
}

async function deleteProduct(productId) {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
        const resp = await fetch(`${API_BASE_URL}/Products/${productId}`, {
            method: "DELETE"
        });

        if (!resp.ok) {
            alert("Failed to delete product.");
            return;
        }

        loadAdminProducts();
    } catch (err) {
        console.error(err);
        alert("Error deleting product.");
    }
}

// Inventory Management
document.getElementById("reload-inventory-btn").addEventListener("click", loadInventory);
document.getElementById("view-low-stock-btn").addEventListener("click", loadLowStock);

async function loadInventory() {
    const container = document.getElementById("inventory-container");
    container.innerHTML = "Loading...";

    try {
        const resp = await fetch(`${API_BASE_URL}/Inventory`);
        const products = await resp.json();
        container.innerHTML = "";

        products.forEach(p => {
            const div = document.createElement("div");
            div.className = "product-card";
            div.innerHTML = `
                <h3>${p.productName}</h3>
                <p>Category: ${p.category || "N/A"}</p>
                <p>Current Stock: <strong>${p.stockQuantity}</strong></p>
                <label>Update Stock: 
                    <input type="number" id="stock-${p.productID}" value="${p.stockQuantity}" min="0">
                </label>
                <button class="update-stock-btn" data-id="${p.productID}">Update Stock</button>
            `;
            const updateBtn = div.querySelector(".update-stock-btn");
            updateBtn.addEventListener("click", () => updateStock(p.productID));
            container.appendChild(div);
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = "Failed to load inventory.";
    }
}

async function loadLowStock() {
    const container = document.getElementById("inventory-container");
    container.innerHTML = "Loading...";

    try {
        const resp = await fetch(`${API_BASE_URL}/Inventory/low-stock?threshold=10`);
        const products = await resp.json();
        container.innerHTML = `<h4>Low Stock Items (≤10 units)</h4>`;

        products.forEach(p => {
            const div = document.createElement("div");
            div.className = "product-card";
            div.style.borderColor = p.stockQuantity <= 5 ? "red" : "orange";
            div.innerHTML = `
                <h3>${p.productName}</h3>
                <p>Category: ${p.category || "N/A"}</p>
                <p style="color: ${p.stockQuantity <= 5 ? 'red' : 'orange'}">
                    <strong>Low Stock: ${p.stockQuantity} units</strong>
                </p>
                <label>Update Stock: 
                    <input type="number" id="stock-${p.productID}" value="${p.stockQuantity}" min="0">
                </label>
                <button class="update-stock-btn" data-id="${p.productID}">Update Stock</button>
            `;
            const updateBtn = div.querySelector(".update-stock-btn");
            updateBtn.addEventListener("click", () => updateStock(p.productID));
            container.appendChild(div);
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = "Failed to load low stock items.";
    }
}

async function updateStock(productId) {
    const quantity = parseInt(document.getElementById(`stock-${productId}`).value);
    
    try {
        const resp = await fetch(`${API_BASE_URL}/Inventory/${productId}/stock`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(quantity)
        });

        if (!resp.ok) {
            alert("Failed to update stock.");
            return;
        }

        loadInventory();
    } catch (err) {
        console.error(err);
        alert("Error updating stock.");
    }
}

// Transaction Management
document.getElementById("reload-transactions-btn").addEventListener("click", loadTransactions);

async function loadTransactions() {
    const container = document.getElementById("transactions-container");
    container.innerHTML = "Loading...";

    try {
        const resp = await fetch(`${API_BASE_URL}/Transactions`);
        const transactions = await resp.json();
        container.innerHTML = "";

        if (transactions.length === 0) {
            container.innerHTML = "<p>No transactions found.</p>";
            return;
        }

        transactions.forEach(t => {
            const div = document.createElement("div");
            div.className = "transaction-card";
            const status = t.status || "Pending";
            const isPending = status === "Pending";
            
            // Style pending orders differently
            div.style.border = isPending ? "2px solid #ffc107" : "1px solid #ddd";
            div.style.padding = "1rem";
            div.style.marginBottom = "1rem";
            div.style.backgroundColor = isPending ? "#fff9e6" : "white";
            div.style.borderRadius = "4px";
            
            const itemsList = t.transactionDetails?.map(td => 
                `${td.product?.productName || 'N/A'} (x${td.quantity}) - $${td.subtotal.toFixed(2)}`
            ).join("<br>") || "No items";

            // Status badge color (handle both old and new status values)
            let statusColor = "#6c757d"; // default gray
            if (status === "Pending") statusColor = "#ffc107"; // yellow
            else if (status === "Confirm" || status === "Confirmed") statusColor = "#17a2b8"; // blue
            else if (status === "Process" || status === "Processing") statusColor = "#007bff"; // blue
            else if (status === "Shipped") statusColor = "#28a745"; // green
            else if (status === "Done" || status === "Completed") statusColor = "#28a745"; // green
            else if (status === "Cancel" || status === "Cancelled") statusColor = "#dc3545"; // red

            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                    <h3 style="margin: 0;">Transaction #${t.transactionID}</h3>
                    <span style="background-color: ${statusColor}; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.875rem; font-weight: bold;">
                        ${status}
                    </span>
                </div>
                <p><strong>Date:</strong> ${new Date(t.transactionDate).toLocaleString()}</p>
                <p><strong>Customer:</strong> ${t.customer?.firstName || 'N/A'} ${t.customer?.lastName || ''}</p>
                <p><strong>Employee:</strong> ${t.employee?.firstName || 'N/A'} ${t.employee?.lastName || ''}</p>
                <p><strong>Payment Method:</strong> ${t.paymentMethod || 'N/A'}</p>
                <p><strong>Items:</strong><br>${itemsList}</p>
                <p><strong>Total Amount:</strong> $${(t.totalAmount || 0).toFixed(2)}</p>
                <div style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    ${isPending ? `<button class="confirm-order-btn" data-id="${t.transactionID}" style="background-color: #28a745; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">Confirm Order</button>` : ''}
                    <label style="display: flex; align-items: center; gap: 0.5rem;">
                        <strong>Change Status:</strong>
                        <select class="status-select" data-id="${t.transactionID}" style="padding: 0.5rem; border-radius: 4px; border: 1px solid #ddd;">
                            <option value="Pending" ${status === "Pending" ? "selected" : ""}>Pending</option>
                            <option value="Confirm" ${status === "Confirm" || status === "Confirmed" ? "selected" : ""}>Confirmed</option>
                            <option value="Process" ${status === "Process" || status === "Processing" ? "selected" : ""}>Processing</option>
                            <option value="Shipped" ${status === "Shipped" ? "selected" : ""}>Shipped</option>
                            <option value="Done" ${status === "Done" || status === "Completed" ? "selected" : ""}>Completed</option>
                            <option value="Cancel" ${status === "Cancel" || status === "Cancelled" ? "selected" : ""}>Cancelled</option>
                        </select>
                    </label>
                </div>
            `;
            
            // Add event listeners
            const confirmBtn = div.querySelector(".confirm-order-btn");
            if (confirmBtn) {
                confirmBtn.addEventListener("click", () => confirmOrder(t.transactionID));
            }
            
            const statusSelect = div.querySelector(".status-select");
            statusSelect.addEventListener("change", (e) => {
                updateTransactionStatus(t.transactionID, e.target.value);
            });
            
            container.appendChild(div);
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = "Failed to load transactions.";
    }
}

async function confirmOrder(transactionId) {
    if (!confirm("Are you sure you want to confirm this order?")) return;
    
    try {
        const resp = await fetch(`${API_BASE_URL}/Transactions/${transactionId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "Confirm" })
        });

        if (!resp.ok) {
            let errorText = "";
            try {
                // Read as text first, then try to parse as JSON
                const errorTextRaw = await resp.text();
                try {
                    const errorJson = JSON.parse(errorTextRaw);
                    errorText = errorJson.message || errorJson.error || errorTextRaw;
                } catch {
                    errorText = errorTextRaw || `HTTP ${resp.status} ${resp.statusText}`;
                }
            } catch {
                errorText = `HTTP ${resp.status} ${resp.statusText}`;
            }
            alert(`Failed to confirm order: ${errorText}`);
            console.error("Confirm order error:", resp.status, errorText);
            return;
        }

        loadTransactions(); // Reload to show updated status
    } catch (err) {
        console.error("Confirm order exception:", err);
        alert(`Error confirming order: ${err.message}`);
    }
}

async function updateTransactionStatus(transactionId, newStatus) {
    try {
        const resp = await fetch(`${API_BASE_URL}/Transactions/${transactionId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus })
        });

        if (!resp.ok) {
            let errorText = "";
            try {
                // Read as text first, then try to parse as JSON
                const errorTextRaw = await resp.text();
                try {
                    const errorJson = JSON.parse(errorTextRaw);
                    errorText = errorJson.message || errorJson.error || errorTextRaw;
                } catch {
                    errorText = errorTextRaw || `HTTP ${resp.status} ${resp.statusText}`;
                }
            } catch {
                errorText = `HTTP ${resp.status} ${resp.statusText}`;
            }
            alert(`Failed to update status: ${errorText}`);
            console.error("Update status error:", resp.status, errorText);
            // Reload to reset the dropdown
            loadTransactions();
            return;
        }

        loadTransactions(); // Reload to show updated status
    } catch (err) {
        console.error("Update status exception:", err);
        alert(`Error updating status: ${err.message}`);
        // Reload to reset the dropdown
        loadTransactions();
    }
}

// ========== USER MANAGEMENT FUNCTIONS ==========

// User type tab switching
document.getElementById("nav-customers-tab").addEventListener("click", () => {
    switchUserTypeTab("customers");
    loadCustomers();
});

document.getElementById("nav-employees-tab").addEventListener("click", () => {
    switchUserTypeTab("employees");
    loadEmployees();
});

// Load Customers
document.getElementById("reload-customers-btn").addEventListener("click", loadCustomers);
document.getElementById("add-customer-btn").addEventListener("click", () => {
    openUserModal("customer");
});

async function loadCustomers() {
    const container = document.getElementById("customers-container");
    container.innerHTML = "Loading...";

    try {
        const resp = await fetch(`${API_BASE_URL}/Users/customers`);
        
        if (!resp.ok) {
            if (resp.status === 404) {
                container.innerHTML = "<p style='color: red;'>Users endpoint not found. Please restart the API server.</p>";
            } else {
                container.innerHTML = `<p style='color: red;'>Failed to load customers: ${resp.status} ${resp.statusText}</p>`;
            }
            return;
        }
        
        const customers = await resp.json();
        container.innerHTML = "";

        if (customers.length === 0) {
            container.innerHTML = "<p>No customers found.</p>";
            return;
        }

        customers.forEach(c => {
            const div = document.createElement("div");
            div.className = "product-card";
            div.innerHTML = `
                <h3>${c.firstName} ${c.lastName}</h3>
                <p><strong>Email:</strong> ${c.email}</p>
                <p><strong>Phone:</strong> ${c.customerPhone || "N/A"}</p>
                <p><strong>Address:</strong> ${c.address || "N/A"}, ${c.city || ""} ${c.state || ""} ${c.zipcode || ""}</p>
                <p><strong>Registered:</strong> ${new Date(c.registrationDate).toLocaleDateString()}</p>
                <button class="edit-user-btn" data-type="customer" data-id="${c.customerID}">Edit</button>
                <button class="delete-user-btn" data-type="customer" data-id="${c.customerID}">Delete</button>
            `;
            const editBtn = div.querySelector(".edit-user-btn");
            const deleteBtn = div.querySelector(".delete-user-btn");
            editBtn.addEventListener("click", () => editUser("customer", c));
            deleteBtn.addEventListener("click", () => deleteUser("customer", c.customerID));
            container.appendChild(div);
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = `<p style='color: red;'>Error loading customers: ${err.message}</p>`;
    }
}

// Load Employees
document.getElementById("reload-employees-btn").addEventListener("click", loadEmployees);
document.getElementById("add-employee-btn").addEventListener("click", () => {
    openUserModal("employee");
});

async function loadEmployees() {
    const container = document.getElementById("employees-container");
    container.innerHTML = "Loading...";

    try {
        const resp = await fetch(`${API_BASE_URL}/Users/employees`);
        
        if (!resp.ok) {
            if (resp.status === 404) {
                container.innerHTML = "<p style='color: red;'>Users endpoint not found. Please restart the API server.</p>";
            } else {
                container.innerHTML = `<p style='color: red;'>Failed to load employees: ${resp.status} ${resp.statusText}</p>`;
            }
            return;
        }
        
        const employees = await resp.json();
        container.innerHTML = "";

        if (employees.length === 0) {
            container.innerHTML = "<p>No employees found.</p>";
            return;
        }

        employees.forEach(e => {
            const div = document.createElement("div");
            div.className = "product-card";
            div.innerHTML = `
                <h3>${e.firstName} ${e.lastName}</h3>
                <p><strong>Email:</strong> ${e.email}</p>
                <p><strong>Role:</strong> ${e.role || "N/A"}</p>
                <p><strong>Phone:</strong> ${e.employeePhone || "N/A"}</p>
                <p><strong>Hired:</strong> ${new Date(e.hireDate).toLocaleDateString()}</p>
                <button class="edit-user-btn" data-type="employee" data-id="${e.employeeID}">Edit</button>
                <button class="delete-user-btn" data-type="employee" data-id="${e.employeeID}">Delete</button>
            `;
            const editBtn = div.querySelector(".edit-user-btn");
            const deleteBtn = div.querySelector(".delete-user-btn");
            editBtn.addEventListener("click", () => editUser("employee", e));
            deleteBtn.addEventListener("click", () => deleteUser("employee", e.employeeID));
            container.appendChild(div);
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = `<p style='color: red;'>Error loading employees: ${err.message}</p>`;
    }
}

// User Modal Functions
function openUserModal(userType, user = null) {
    document.getElementById("user-modal-title").textContent = user ? `Edit ${userType === "customer" ? "Customer" : "Employee"}` : `Add New ${userType === "customer" ? "Customer" : "Employee"}`;
    document.getElementById("user-form").reset();
    document.getElementById("user-id").value = user ? (userType === "customer" ? user.customerID : user.employeeID) : "";
    document.getElementById("user-type").value = userType;
    
    if (userType === "customer") {
        document.getElementById("customer-fields").classList.remove("hidden");
        document.getElementById("employee-fields").classList.add("hidden");
        if (user) {
            document.getElementById("user-firstName").value = user.firstName || "";
            document.getElementById("user-lastName").value = user.lastName || "";
            document.getElementById("user-email").value = user.email || "";
            document.getElementById("user-password").value = user.password || "";
            document.getElementById("user-phone").value = user.customerPhone || "";
            document.getElementById("user-address").value = user.address || "";
            document.getElementById("user-city").value = user.city || "";
            document.getElementById("user-state").value = user.state || "";
            document.getElementById("user-zipcode").value = user.zipcode || "";
        }
    } else {
        document.getElementById("customer-fields").classList.add("hidden");
        document.getElementById("employee-fields").classList.remove("hidden");
        if (user) {
            document.getElementById("user-firstName").value = user.firstName || "";
            document.getElementById("user-lastName").value = user.lastName || "";
            document.getElementById("user-email").value = user.email || "";
            document.getElementById("user-password").value = user.password || "";
            document.getElementById("user-phone").value = user.employeePhone || "";
            document.getElementById("user-role").value = user.role || "Employee";
        }
    }
    
    document.getElementById("user-modal").classList.remove("hidden");
}

function editUser(userType, user) {
    openUserModal(userType, user);
}

document.getElementById("cancel-user-btn").addEventListener("click", () => {
    document.getElementById("user-modal").classList.add("hidden");
});

document.querySelector(".close-user-modal").addEventListener("click", () => {
    document.getElementById("user-modal").classList.add("hidden");
});

document.getElementById("user-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const userType = document.getElementById("user-type").value;
    const userId = document.getElementById("user-id").value;
    
    if (userType === "customer") {
        const customer = {
            firstName: document.getElementById("user-firstName").value,
            lastName: document.getElementById("user-lastName").value,
            email: document.getElementById("user-email").value,
            password: document.getElementById("user-password").value,
            customerPhone: document.getElementById("user-phone").value || null,
            address: document.getElementById("user-address").value || null,
            city: document.getElementById("user-city").value || null,
            state: document.getElementById("user-state").value || null,
            zipcode: document.getElementById("user-zipcode").value || null
        };
        
        try {
            let resp;
            if (userId) {
                resp = await fetch(`${API_BASE_URL}/Users/customers/${userId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(customer)
                });
            } else {
                resp = await fetch(`${API_BASE_URL}/Users/customers`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(customer)
                });
            }
            
            if (!resp.ok) {
                const errorText = await resp.text();
                alert(`Failed to save customer: ${errorText}`);
                return;
            }
            
            document.getElementById("user-modal").classList.add("hidden");
            loadCustomers();
        } catch (err) {
            console.error(err);
            alert("Error saving customer.");
        }
    } else {
        const employee = {
            firstName: document.getElementById("user-firstName").value,
            lastName: document.getElementById("user-lastName").value,
            email: document.getElementById("user-email").value,
            password: document.getElementById("user-password").value,
            employeePhone: document.getElementById("user-phone").value || null,
            role: document.getElementById("user-role").value || "Employee"
        };
        
        try {
            let resp;
            if (userId) {
                resp = await fetch(`${API_BASE_URL}/Users/employees/${userId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(employee)
                });
            } else {
                resp = await fetch(`${API_BASE_URL}/Users/employees`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(employee)
                });
            }
            
            if (!resp.ok) {
                const errorText = await resp.text();
                alert(`Failed to save employee: ${errorText}`);
                return;
            }
            
            document.getElementById("user-modal").classList.add("hidden");
            loadEmployees();
        } catch (err) {
            console.error(err);
            alert("Error saving employee.");
        }
    }
});

async function deleteUser(userType, userId) {
    if (!confirm(`Are you sure you want to delete this ${userType}?`)) return;
    
    try {
        const resp = await fetch(`${API_BASE_URL}/Users/${userType}s/${userId}`, {
            method: "DELETE"
        });
        
        if (!resp.ok) {
            alert("Failed to delete user.");
            return;
        }
        
        if (userType === "customer") {
            loadCustomers();
        } else {
            loadEmployees();
        }
    } catch (err) {
        console.error(err);
        alert("Error deleting user.");
    }
}

function showSection(section) {
    loginSection.classList.add("hidden");
    shopSection.classList.add("hidden");
    adminSection.classList.add("hidden");

    if (section === "login") loginSection.classList.remove("hidden");
    if (section === "shop") shopSection.classList.remove("hidden");
    if (section === "admin") {
        if (!currentUser || currentUser.userType !== "Employee") {
            alert("Employees only. Log in as Employee.");
            loginSection.classList.remove("hidden");
        } else {
            adminSection.classList.remove("hidden");
            // Hide Users tab if not a manager
            const usersTabBtn = document.getElementById("nav-users-mgmt");
            if (usersTabBtn) {
                if (currentUser.role === "Manager") {
                    usersTabBtn.style.display = "inline-block";
                } else {
                    usersTabBtn.style.display = "none";
                }
            }
            switchMgmtTab("products");
            loadAdminProducts();
        }
    }
}

// Initial load
loadProducts();
loadCategories();
showSection("shop");
