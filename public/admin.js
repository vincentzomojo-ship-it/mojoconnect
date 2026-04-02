const API = window.location.origin;

let allUsers = [];
let allTransactions = [];
let allTickets = [];

function authHeaders(base = {}){
  return { ...base };
}

function formatMoney(value){
  return (parseFloat(value || 0) || 0).toFixed(2);
}

function toCsv(rows){
  if(!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escaped = rows.map(row =>
    headers.map(h => {
      const val = String(row[h] ?? "").replace(/"/g, '""');
      return `"${val}"`;
    }).join(",")
  );
  return [headers.join(","), ...escaped].join("\n");
}

function downloadCsv(filename, rows){
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function logout(){
  window.location.href = "/admin.html";
}

async function apiFetch(path, options = {}){
  const res = await fetch(API + path, options);
  return res;
}

function setNow(){
  const el = document.getElementById("adminNow");
  if(!el) return;
  el.textContent = `Last updated: ${new Date().toLocaleString()}`;
}

function renderKpis(stats){
  const activeUsers = allUsers.filter(u => u.is_active !== false).length;
  const suspendedUsers = allUsers.length - activeUsers;
  const pendingTickets = allTickets.filter(t => String(t.status || "").toLowerCase() === "pending").length;
  const resolvedTickets = allTickets.length - pendingTickets;

  document.getElementById("totalUsers").innerText = String(stats.totalUsers || 0);
  document.getElementById("activeUsers").innerText = String(activeUsers);
  document.getElementById("suspendedUsers").innerText = String(suspendedUsers);
  document.getElementById("totalTransactions").innerText = String(stats.totalTransactions || 0);
  document.getElementById("totalRevenue").innerText = formatMoney(stats.totalRevenue);
  document.getElementById("totalWalletBalance").innerText = formatMoney(stats.totalWalletBalance);
  document.getElementById("pendingTickets").innerText = String(pendingTickets);
  document.getElementById("resolvedTickets").innerText = String(resolvedTickets);
}

function renderSupportSnapshot(){
  const table = document.getElementById("supportTable");
  if(!table) return;
  table.innerHTML = "";

  const recent = allTickets.slice(0, 8);
  if(!recent.length){
    table.innerHTML = `<tr><td colspan="4" class="empty">No customer service tickets yet.</td></tr>`;
    return;
  }

  recent.forEach(ticket => {
    const status = String(ticket.status || "Pending").toLowerCase();
    const chipClass = status.includes("resolved") ? "completed" : "pending";
    const row = document.createElement("tr");
    const dateText = ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : (ticket.date || "-");
    const userText = ticket.User?.email || ticket.user_email_snapshot || ticket.user || "-";
    const typeText = ticket.issue_type || ticket.type || "General";
    row.innerHTML = `
      <td>${dateText}</td>
      <td>${userText}</td>
      <td>${typeText}</td>
      <td><span class="chip ${chipClass}">${ticket.status || "Pending"}</span></td>
    `;
    table.appendChild(row);
  });
}

function renderUsers(){
  const table = document.getElementById("usersTable");
  if(!table) return;
  table.innerHTML = "";

  const q = (document.getElementById("userSearchInput")?.value || "").trim().toLowerCase();
  const statusFilter = document.getElementById("userStatusFilter")?.value || "all";

  const filtered = allUsers.filter(user => {
    const text = `${user.username || ""} ${user.email || ""}`.toLowerCase();
    const matchesSearch = !q || text.includes(q);
    const isActive = user.is_active !== false;
    const matchesStatus = statusFilter === "all"
      || (statusFilter === "active" && isActive)
      || (statusFilter === "suspended" && !isActive);
    return matchesSearch && matchesStatus;
  });

  if(!filtered.length){
    table.innerHTML = `<tr><td colspan="6" class="empty">No users found for the selected filter.</td></tr>`;
    return;
  }

  filtered.forEach(user => {
    const isActive = user.is_active !== false;
    const chipClass = isActive ? "active" : "suspended";
    const chipLabel = isActive ? "Active" : "Suspended";
    const actionClass = isActive ? "btn-red" : "btn-green";
    const actionLabel = isActive ? "Suspend" : "Reactivate";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${user.id}</td>
      <td>${user.username || "-"}</td>
      <td>${user.email || "-"}</td>
      <td>GH₵ ${formatMoney(user.wallet_balance)}</td>
      <td><span class="chip ${chipClass}">${chipLabel}</span></td>
      <td><button class="${actionClass}" data-user-id="${user.id}" data-active="${isActive}">${actionLabel}</button></td>
    `;
    table.appendChild(row);
  });
}

function renderTransactions(){
  const table = document.getElementById("transactionsTable");
  if(!table) return;
  table.innerHTML = "";

  const q = (document.getElementById("txSearchInput")?.value || "").trim().toLowerCase();
  const statusFilter = document.getElementById("txStatusFilter")?.value || "all";

  const filtered = allTransactions.filter(tx => {
    const text = `${tx.type || ""} ${tx.status || ""} ${tx.User?.email || ""}`.toLowerCase();
    const matchesSearch = !q || text.includes(q);
    const status = String(tx.status || "").toLowerCase();
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if(!filtered.length){
    table.innerHTML = `<tr><td colspan="5" class="empty">No transactions found for the selected filter.</td></tr>`;
    return;
  }

  filtered.slice(0, 300).forEach(tx => {
    const status = String(tx.status || "pending").toLowerCase();
    const chipClass = status.includes("complete") ? "completed" : (status.includes("fail") ? "failed" : "pending");
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${new Date(tx.createdAt).toLocaleString()}</td>
      <td>${tx.User?.email || "-"}</td>
      <td>GH₵ ${formatMoney(tx.amount)}</td>
      <td>${tx.type || "-"}</td>
      <td><span class="chip ${chipClass}">${tx.status || "-"}</span></td>
    `;
    table.appendChild(row);
  });
}

async function loadStats(){
  const res = await apiFetch("/admin/stats", {
    headers: authHeaders()
  });
  return await res.json();
}

async function loadUsers(){
  const res = await apiFetch("/admin/users", {
    headers: authHeaders()
  });
  const data = await res.json();
  allUsers = data.users || [];
}

async function loadTransactions(){
  const res = await apiFetch("/admin/transactions", {
    headers: authHeaders()
  });
  const data = await res.json();
  allTransactions = data.transactions || [];
}

async function loadSupportTickets(){
  const res = await apiFetch("/admin/support-tickets", {
    headers: authHeaders()
  });
  const data = await res.json();
  allTickets = data.tickets || [];
}

async function refreshAll(){
  try{
    const stats = await loadStats();
    await Promise.all([loadUsers(), loadTransactions(), loadSupportTickets()]);
    renderKpis(stats);
    renderSupportSnapshot();
    renderUsers();
    renderTransactions();
    setNow();
  }catch(err){
    if(err.message !== "Unauthorized" && err.message !== "Forbidden"){
      console.log("Admin refresh error", err);
    }
  }
}

async function updateUserStatus(userId, nextActive){
  const res = await apiFetch(`/admin/users/${userId}/status`, {
    method:"PATCH",
    headers: authHeaders({ "Content-Type":"application/json" }),
    body: JSON.stringify({ isActive: nextActive })
  });
  const data = await res.json();
  if(!res.ok){
    throw new Error(data.message || "Failed to update user");
  }
}

document.addEventListener("DOMContentLoaded", ()=>{
  document.getElementById("refreshAdminBtn")?.addEventListener("click", refreshAll);
  document.getElementById("quickRefreshBtn")?.addEventListener("click", refreshAll);

  document.getElementById("logoutBtn")?.addEventListener("click", logout);

  const openSupport = ()=> window.location.href = "/admin-customer-services.html";
  document.getElementById("customerServiceAdminBtn")?.addEventListener("click", openSupport);
  document.getElementById("openSupportQueueBtn")?.addEventListener("click", openSupport);
  document.getElementById("quickOpenSupportBtn")?.addEventListener("click", openSupport);

  document.getElementById("userSearchInput")?.addEventListener("input", renderUsers);
  document.getElementById("userStatusFilter")?.addEventListener("change", renderUsers);
  document.getElementById("txSearchInput")?.addEventListener("input", renderTransactions);
  document.getElementById("txStatusFilter")?.addEventListener("change", renderTransactions);

  document.getElementById("usersTable")?.addEventListener("click", async (e)=>{
    const btn = e.target.closest("button[data-user-id]");
    if(!btn) return;
    const userId = btn.getAttribute("data-user-id");
    const currentActive = btn.getAttribute("data-active") === "true";
    const nextActive = !currentActive;
    const actionText = nextActive ? "reactivate" : "suspend";
    if(!confirm(`Are you sure you want to ${actionText} this user?`)) return;

    try{
      await updateUserStatus(userId, nextActive);
      await refreshAll();
    }catch(err){
      alert(err.message || "Failed to update user status");
    }
  });

  const usersToCsvRows = ()=> allUsers.map(u => ({
    id: u.id,
    username: u.username,
    email: u.email,
    wallet_balance: formatMoney(u.wallet_balance),
    status: (u.is_active !== false) ? "active" : "suspended"
  }));

  const txToCsvRows = ()=> allTransactions.map(tx => ({
    createdAt: new Date(tx.createdAt).toLocaleString(),
    user: tx.User?.email || "",
    amount: formatMoney(tx.amount),
    type: tx.type || "",
    status: tx.status || ""
  }));

  const exportUsers = ()=> downloadCsv("admin-users.csv", usersToCsvRows());
  const exportTx = ()=> downloadCsv("admin-transactions.csv", txToCsvRows());

  document.getElementById("exportUsersBtn")?.addEventListener("click", exportUsers);
  document.getElementById("quickUsersCsvBtn")?.addEventListener("click", exportUsers);
  document.getElementById("exportTransactionsBtn")?.addEventListener("click", exportTx);
  document.getElementById("quickTxCsvBtn")?.addEventListener("click", exportTx);

  refreshAll();
  setInterval(setNow, 1000 * 20);
});
