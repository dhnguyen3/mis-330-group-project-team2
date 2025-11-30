const API_BASE_URL = "https://localhost:5001/api"; // adjust port

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

// Login
document.getElementById("login-btn").addEventListener("click", async () => {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    const userType = document.getElementById("login-userType").value;
    const msg = document.getElementById("login-message");

    msg.textContent = "";

    try {
        const resp = await fetch(`${API_BASE_URL}/Auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, userType })
        });

        if (!resp.ok) {
            msg.textContent = "Invalid credentials.";
            return;
        }

        const data = await resp.json();
        currentUser = data;
        userInfoSpan.textContent = `${data.userType}: ${data.name}`;
        msg.textContent = "Login successful!";
        showSection("shop");
    } catch (err) {
        console.error(err);
        msg.textContent = "Error logging in.";
    }
});

// Load products
async function loadProducts(searchTerm = "") {
    const container = document.getElementById("products-container");
    container.innerHTML = "Loading...";

    let url = `${API_BASE_URL}/Products`;
    if (searchTerm) {
        url += `?search=${encodeURIComponent(searchTerm)}`;
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

document.getElementById("search-btn").addEventListener("click", () => {
    const term = document.getElementById("search-box").value;
    loadProducts(term);
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
document.getElementById("checkout-btn").addEventListener("click", async () => {
    const msg = document.getElementById("checkout-message");
    msg.textContent = "";

    if (!currentUser || currentUser.userType !== "Customer") {
        msg.textContent = "Please log in as a customer first.";
        return;
    }

    if (cart.length === 0) {
        msg.textContent = "Cart is empty.";
        return;
    }

    const items = cart.map(c => ({
        productID: c.productID,
        quantity: c.quantity
    }));

    // For demo, use EmployeeID = 1
    const body = {
        customerID: currentUser.id,
        employeeID: 1,
        paymentMethod: "Credit",
        items
    };

    try {
        const resp = await fetch(`${API_BASE_URL}/Transactions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!resp.ok) {
            const text = await resp.text();
            msg.textContent = `Checkout failed: ${text}`;
            return;
        }

        const data = await resp.json();
        msg.textContent = `Order placed! Transaction ID: ${data.transactionID}, Total: $${data.totalAmount.toFixed(2)}`;
        cart = [];
        renderCart();
        loadProducts(); // refresh inventory
    } catch (err) {
        console.error(err);
        msg.textContent = "Error during checkout.";
    }
});

// Admin inventory view
document.getElementById("reload-products-btn").addEventListener("click", loadAdminProducts);

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
            `;
            container.appendChild(div);
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = "Failed to load inventory.";
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
            loadAdminProducts();
        }
    }
}

// Initial load
loadProducts();
showSection("shop");
