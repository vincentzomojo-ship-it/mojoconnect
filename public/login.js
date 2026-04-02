// public/login.js
const API = (window.location.protocol === "http:" || window.location.protocol === "https:")
  ? window.location.origin
  : "http://localhost:5050";

function removeBlackBackground(imgEl, threshold = 38, feather = 42){
  if(!imgEl || imgEl.dataset.bgCutoutDone === "1") return;
  const src = imgEl.getAttribute("src");
  if(!src) return;

  const source = new Image();
  source.crossOrigin = "anonymous";
  source.onload = () => {
    try{
      const canvas = document.createElement("canvas");
      canvas.width = source.naturalWidth || source.width;
      canvas.height = source.naturalHeight || source.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(source, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for(let i = 0; i < data.length; i += 4){
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const max = Math.max(r, g, b);

        if(max <= threshold){
          data[i + 3] = 0;
          continue;
        }

        if(max < threshold + feather){
          const ratio = (max - threshold) / feather;
          data[i + 3] = Math.round(data[i + 3] * ratio);
        }
      }

      ctx.putImageData(imageData, 0, 0);
      imgEl.src = canvas.toDataURL("image/png");
      imgEl.dataset.bgCutoutDone = "1";
    }catch(err){
      console.warn("Logo cutout failed:", err);
    }
  };
  source.src = src;
}

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
  const loginPasswordInput = document.getElementById("password");
  const registerPasswordInput = document.getElementById("regPassword");
  const showLoginPassword = document.getElementById("showLoginPassword");
  const showRegisterPassword = document.getElementById("showRegisterPassword");
  const brandLogo = document.querySelector(".brand-logo");
  const resendWrap = document.getElementById("resendWrap");
  const resendTokenBtn = document.getElementById("resendTokenBtn");
  const registerMsgEl = document.getElementById("registerMsg");

  let lastRegisteredEmail = "";

  removeBlackBackground(brandLogo);

  showLoginPassword?.addEventListener("change", () => {
    if (loginPasswordInput) {
      loginPasswordInput.type = showLoginPassword.checked ? "text" : "password";
    }
  });

  showRegisterPassword?.addEventListener("change", () => {
    if (registerPasswordInput) {
      registerPasswordInput.type = showRegisterPassword.checked ? "text" : "password";
    }
  });

  // SWITCH FORMS (LOGIN PAGE)
  showRegisterLink?.addEventListener("click", () => {
    if (loginForm) loginForm.style.display = "none";
    if (registerForm) registerForm.style.display = "block";
    if (resendWrap) resendWrap.style.display = "none";
  });

  showLoginLink?.addEventListener("click", () => {
    if (registerForm) registerForm.style.display = "none";
    if (loginForm) loginForm.style.display = "block";
    if (resendWrap) resendWrap.style.display = "none";
  });

  // LOGIN
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      try {
        const email = document.getElementById("email").value.trim().toLowerCase();
        const res = await fetch(API + "/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password: document.getElementById("password").value
          })
        });

        const data = await readJsonSafe(res);

        if (res.ok && data.token) {
          localStorage.setItem("token", data.token);
          window.location.href = "/dashboard.html";
        } else {
          if (data?.requiresEmailVerification) {
            document.getElementById("errorMsg").innerText =
              "Email not verified. Check your inbox, then login again.";
            return;
          }
          document.getElementById("errorMsg").innerText = data.message || "Login failed";
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
        const regEmail = document.getElementById("regEmail").value.trim().toLowerCase();
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

        registerMsgEl.innerText = data.message || "Registered";

        if (data?.verificationUrl) {
          registerMsgEl.innerText += ` Verify now: ${data.verificationUrl}`;
        }
        lastRegisteredEmail = regEmail;
        if (resendWrap) resendWrap.style.display = "block";

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
        registerMsgEl.innerText = "Server error";
        if (resendWrap) resendWrap.style.display = "none";
      }
    });
  }

  resendTokenBtn?.addEventListener("click", async () => {
    const email = (lastRegisteredEmail || document.getElementById("regEmail")?.value || "").trim().toLowerCase();
    if (!email) {
      registerMsgEl.innerText = "Enter your email first.";
      return;
    }

    registerMsgEl.innerText = "Sending new token...";
    try {
      const res = await fetch(API + "/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await readJsonSafe(res);
      if (!res.ok) {
        registerMsgEl.innerText = data.message || "Failed to resend token.";
        return;
      }
      registerMsgEl.innerText = data.message || "Token resent successfully.";
      if (data?.verificationUrl) {
        registerMsgEl.innerText += ` Verify now: ${data.verificationUrl}`;
      }
    } catch (err) {
      console.log(err);
      registerMsgEl.innerText = "Server error while resending token.";
    }
  });

});
