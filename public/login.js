// public/login.js
const API = (window.location.protocol === "http:" || window.location.protocol === "https:")
  ? window.location.origin
  : "http://localhost:5050";

async function readJsonSafe(res){
  try{
    return await res.json();
  }catch{
    return {};
  }
}

document.addEventListener("DOMContentLoaded", () => {

  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const showRegisterLink = document.getElementById("showRegisterLink");
  const showLoginLink = document.getElementById("showLoginLink");

  // SWITCH FORMS (LOGIN PAGE)
  showRegisterLink?.addEventListener("click", () => {
    if (loginForm) loginForm.style.display = "none";
    if (registerForm) registerForm.style.display = "block";
  });

  showLoginLink?.addEventListener("click", () => {
    if (registerForm) registerForm.style.display = "none";
    if (loginForm) loginForm.style.display = "block";
  });

  // LOGIN
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      try {
        const res = await fetch(API + "/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: document.getElementById("email").value,
            password: document.getElementById("password").value
          })
        });

        const data = await readJsonSafe(res);

        if (res.ok && data.token) {
          localStorage.setItem("token", data.token);
          window.location.href = "/dashboard.html";
        } else {
          document.getElementById("errorMsg").innerText =
            data.message || "Login failed";
        }

      } catch (err) {
        console.log(err);
        document.getElementById("errorMsg").innerText = "Server error";
      }
    });
  }

  // REGISTER
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      try {
        const regName = document.getElementById("regName").value.trim();
        const regEmail = document.getElementById("regEmail").value.trim();
        const regPassword = document.getElementById("regPassword").value;

        const res = await fetch(API + "/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // Keep both formats for backend compatibility.
            regName,
            regEmail,
            regPassword,
            username: regName,
            email: regEmail,
            password: regPassword
          })
        });

        const data = await readJsonSafe(res);

        document.getElementById("registerMsg").innerText =
          data.message || "Registered";

        if (res.ok && data.success) {
          // On login.html: switch back to login form.
          // On register.html: redirect to login page.
          if (loginForm) {
            registerForm.style.display = "none";
            loginForm.style.display = "block";
            const emailInput = document.getElementById("email");
            const passwordInput = document.getElementById("password");
            if (emailInput) emailInput.value = regEmail;
            if (passwordInput) passwordInput.value = "";
          } else {
            window.location.href = "/login.html";
          }
        }

      } catch (err) {
        console.log(err);
        document.getElementById("registerMsg").innerText = "Server error";
      }
    });
  }

});
