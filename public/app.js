const API = window.location.origin;

async function readJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

// ============================
// GLOBAL TOKEN
// ============================

const token = localStorage.getItem("token");

// ============================
// REGISTER
// ============================

const registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const res = await fetch(API + "/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Send both formats so it works with either auth controller.
        regName: username,
        regEmail: email,
        regPassword: password,
        username,
        email,
        password
      })
    });

    const data = await readJsonSafe(res);

    if (res.ok) {
      alert("Registered successfully!");
      window.location.href = "/login.html";
    } else {
      alert(data.message || "Registration failed");
    }
  });
}

// ============================
// LOGIN
// ============================

const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const res = await fetch(API + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: document.getElementById("email").value,
        password: document.getElementById("password").value
      })
    });

    const data = await readJsonSafe(res);

    if (data.token) {
      localStorage.setItem("token", data.token);
      window.location.href = "/dashboard.html";
    } else {
      alert(data.message || "Login failed");
    }
  });
}

// ============================
// DASHBOARD AUTH CHECK
// ============================

const dashboardWelcome = document.getElementById("welcome");

if (dashboardWelcome) {

  if (!token) {
    window.location.href = "/login.html";
  } else {

    fetch(API + "/user/profile", {
      headers: { Authorization: "Bearer " + token }
    })
    .then(res => res.json())
    .then(data => {

      if (data.username) {
        dashboardWelcome.innerText = "Welcome " + data.username;
        document.getElementById("email").innerText =
          "Email: " + data.email;

        loadWallet();
        loadTransactions();

      } else {
        localStorage.removeItem("token");
        window.location.href = "/login.html";
      }
    })
    .catch(() => {
      localStorage.removeItem("token");
      window.location.href = "/login.html";
    });
  }
}

// ============================
// LOAD WALLET
// ============================

async function loadWallet() {

  const res = await fetch(API + "/user/wallet", {
    headers: { Authorization: "Bearer " + token }
  });

  const data = await res.json();

  if (data.balance !== undefined) {
    document.getElementById("balance").innerText = data.balance;
  }
}

// ============================
// LOAD TRANSACTIONS
// ============================

async function loadTransactions() {

  const res = await fetch(API + "/user/transactions", {
    headers: { Authorization: "Bearer " + token }
  });

  const data = await res.json();

  const list = document.getElementById("transactions");

  if (!list) return;

  list.innerHTML = "";

  const transactions = data.transactions || [];

  transactions.forEach(tx => {
    const li = document.createElement("li");
    li.innerText = `${tx.type.toUpperCase()} - ₦${tx.amount} - ${tx.description}`;
    list.appendChild(li);
  });
}

// ============================
// FUND WALLET
// ============================

const fundBtn = document.getElementById("fundBtn");

if (fundBtn) {

  fundBtn.addEventListener("click", async () => {

    const amount = parseFloat(document.getElementById("fundAmount").value);

    if (!amount || amount <= 0) {
      alert("Enter valid amount");
      return;
    }

    await fetch(API + "/user/wallet/credit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({ amount })
    });

    loadWallet();
    loadTransactions();
  });
}

// ============================
// BUY AIRTIME
// ============================

const buyBtn = document.getElementById("buyBtn");

if (buyBtn) {

  buyBtn.addEventListener("click", async () => {

    const phone = document.getElementById("phone").value;
    const amount = parseFloat(document.getElementById("airtimeAmount").value);

    if (!phone || !amount || amount <= 0) {
      alert("Enter valid phone and amount");
      return;
    }

    await fetch(API + "/user/purchase", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({ phone, amount })
    });

    loadWallet();
    loadTransactions();
  });
}

// ============================
// LOGOUT
// ============================

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {

    localStorage.clear();
    window.location.href = "/login.html";
  });
}

// Auto load if dashboard exists
if (document.getElementById("balance")) {
  loadWallet();
  loadTransactions();
}
