const API = "http://localhost:3000";

async function loadTransactions() {

  const token = localStorage.getItem("token");

  const res = await fetch(API + "/user/transactions", {
    headers: {
      Authorization: "Bearer " + token
    }
  });

  const data = await res.json();

  const tbody = document.querySelector("#txTable tbody");

  data.forEach(tx => {

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${new Date(tx.createdAt).toLocaleString()}</td>
      <td class="${tx.type}">${tx.type}</td>
      <td>${tx.amount}</td>
      <td>${tx.status}</td>
      <td>${tx.description}</td>
      <td>${tx.reference}</td>
    `;

    tbody.appendChild(row);

  });

}

loadTransactions();