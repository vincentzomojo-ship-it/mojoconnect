const API = window.location.origin; // Keep your original API logic  
const token = localStorage.getItem("token");  

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

document.addEventListener("DOMContentLoaded", ()=>{  
  removeBlackBackground(document.querySelector(".sidebar-logo img"));

  async function apiFetch(path, options = {}){
    const res = await fetch(API + path, options);
    if(res.status === 401){
      localStorage.removeItem("token");
      showToast("Session expired. Please login again.", "error");
      setTimeout(()=>{ window.location.href = "/login.html"; }, 900);
      throw new Error("Unauthorized");
    }
    return res;
  }

  function createIdempotencyKey(action){
    const rand = Math.random().toString(36).slice(2, 10);
    return `${action}-${Date.now()}-${rand}`;
  }

  // ONLY run API calls if token exists  
  if(token){  
    loadBalance();  
    loadTransactions(true);  
  }  

  let txOffset = 0;  
  const txLimit = 20;  
  let allTransactions = [];  
  let purchaseTransactions = [];
  let transferOffset = 0;
  const transferLimit = 10;
  let allTransfers = [];

  const settingsBtn = document.getElementById("settingsBtn");
  const dashboardBtn = document.getElementById("dashboardBtn");
  const customerServiceBtn = document.getElementById("customerServiceBtn");
  const sidebarPurchasedHistoryBtn = document.getElementById("sidebarPurchasedHistoryBtn");
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const sidebar = document.querySelector(".sidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const mbDashboard = document.getElementById("mbDashboard");
  const mbBundles = document.getElementById("mbBundles");
  const mbWallet = document.getElementById("mbWallet");
  const mbHistory = document.getElementById("mbHistory");
  const mbSettings = document.getElementById("mbSettings");
  const mobileNavButtons = [mbDashboard, mbBundles, mbWallet, mbHistory, mbSettings].filter(Boolean);
  const bundlesPickerModal = document.getElementById("bundlesPickerModal");
  const closeBundlesPickerBtn = document.getElementById("closeBundlesPickerBtn");
  const walletBtn = document.getElementById("walletBtn");
  const walletBalanceCard = document.getElementById("walletBalanceCard");
  const addFundsCard = document.getElementById("addFundsCard");
  const totalOrdersValue = document.getElementById("totalOrdersValue");
  const totalSpentValue = document.getElementById("totalSpentValue");
  const spentTrendCanvas = document.getElementById("spentTrendCanvas");

  const dashboardPage = document.getElementById("dashboardPage");
  const settingsPage = document.getElementById("settingsPage");
  const customerServicePage = document.getElementById("customerServicePage");
  const welcomeTitle = document.getElementById("welcomeTitle");

  function setMobileNavActive(key){
    const keyToEl = {
      dashboard: mbDashboard,
      bundles: mbBundles,
      wallet: mbWallet,
      history: mbHistory,
      settings: mbSettings,
      support: mbSettings
    };
    mobileNavButtons.forEach(btn => btn.classList.remove("active"));
    keyToEl[key]?.classList.add("active");
  }

  function isMobileView(){
    return window.matchMedia("(max-width: 768px)").matches;
  }

  function closeMobileSidebar(){
    sidebar?.classList.remove("open");
    sidebarOverlay?.classList.remove("show");
  }

  function openMobileSidebar(){
    sidebar?.classList.add("open");
    sidebarOverlay?.classList.add("show");
  }

  function openBundlesPicker(){
    if(!bundlesPickerModal){
      document.getElementById("mtnBtn")?.click();
      return;
    }
    bundlesPickerModal.style.display = "flex";
    setMobileNavActive("bundles");
  }

  function closeBundlesPicker(){
    if(!bundlesPickerModal) return;
    bundlesPickerModal.style.display = "none";
  }

  mobileMenuBtn?.addEventListener("click", ()=>{
    if(!isMobileView()) return;
    if(sidebar?.classList.contains("open")) closeMobileSidebar();
    else openMobileSidebar();
  });

  sidebarOverlay?.addEventListener("click", closeMobileSidebar);

  sidebar?.querySelectorAll("li").forEach((item)=>{
    item.addEventListener("click", ()=>{
      if(isMobileView()) closeMobileSidebar();
      const idToKey = {
        dashboardBtn: "dashboard",
        mtnBtn: "bundles",
        airtelBtn: "bundles",
        telecelBtn: "bundles",
        walletBtn: "wallet",
        sidebarPurchasedHistoryBtn: "history",
        customerServiceBtn: "support",
        settingsBtn: "settings"
      };
      const key = idToKey[item.id];
      if(key) setMobileNavActive(key);
    });
  });

  window.addEventListener("resize", ()=>{
    if(!isMobileView()) closeMobileSidebar();
  });

  mbDashboard?.addEventListener("click", ()=> dashboardBtn?.click());
  mbBundles?.addEventListener("click", ()=> openBundlesPicker());
  mbWallet?.addEventListener("click", ()=> walletBtn?.click());
  mbHistory?.addEventListener("click", ()=> sidebarPurchasedHistoryBtn?.click());
  mbSettings?.addEventListener("click", ()=> settingsBtn?.click());

  closeBundlesPickerBtn?.addEventListener("click", closeBundlesPicker);
  bundlesPickerModal?.addEventListener("click", (e)=>{
    if(e.target === bundlesPickerModal) closeBundlesPicker();
  });
  bundlesPickerModal?.querySelectorAll(".bundle-choice-btn").forEach((btn)=>{
    btn.addEventListener("click", ()=>{
      const network = btn.dataset.network;
      closeBundlesPicker();
      if(network === "mtn") document.getElementById("mtnBtn")?.click();
      if(network === "airtel") document.getElementById("airtelBtn")?.click();
      if(network === "telecel") document.getElementById("telecelBtn")?.click();
      setMobileNavActive("bundles");
    });
  });

  if(settingsBtn && dashboardPage && settingsPage){
    settingsBtn.onclick = () => {
      dashboardPage.style.display = "none";
      settingsPage.style.display = "block";
      if(customerServicePage) customerServicePage.style.display = "none";
      if(walletBalanceCard) walletBalanceCard.style.display = "none";
      if(addFundsCard) addFundsCard.style.display = "none";
      openSettingsPanel("profileSection");
      setMobileNavActive("settings");
    };
  }

  if(dashboardBtn && dashboardPage && settingsPage){
    dashboardBtn.onclick = () => {
      settingsPage.style.display = "none";
      dashboardPage.style.display = "block";
      if(customerServicePage) customerServicePage.style.display = "none";
      if(walletBalanceCard) walletBalanceCard.style.display = "none";
      if(addFundsCard) addFundsCard.style.display = "none";
      setMobileNavActive("dashboard");
    };
  }

  customerServiceBtn?.addEventListener("click", ()=>{
    if(dashboardPage && settingsPage && customerServicePage){
      dashboardPage.style.display = "none";
      settingsPage.style.display = "none";
      customerServicePage.style.display = "block";
      if(walletBalanceCard) walletBalanceCard.style.display = "none";
      if(addFundsCard) addFundsCard.style.display = "none";
      setMobileNavActive("support");
    }
  });

  walletBtn?.addEventListener("click", ()=>{
    if(dashboardPage) dashboardPage.style.display = "block";
    if(settingsPage) settingsPage.style.display = "none";
    if(customerServicePage) customerServicePage.style.display = "none";
    if(walletBalanceCard){
      if(token) loadBalance();
      walletBalanceCard.style.display = "block";
      walletBalanceCard.scrollIntoView({ behavior:"smooth", block:"center" });
    }
    if(addFundsCard) addFundsCard.style.display = "block";
    setMobileNavActive("wallet");
  });

  const settingsTabs = document.querySelectorAll(".settings-tab");
  const settingsPanels = document.querySelectorAll(".settings-panel");

  const settingsAvatarPreview = document.getElementById("settingsAvatarPreview");
  const settingsAvatarUrl = document.getElementById("settingsAvatarUrl");
  const settingsAvatarUpload = document.getElementById("settingsAvatarUpload");
  const settingsPreviewName = document.getElementById("settingsPreviewName");
  const settingsPreviewEmail = document.getElementById("settingsPreviewEmail");
  const settingsThemeChip = document.getElementById("settingsThemeChip");

  const settingsUsername = document.getElementById("settingsUsername");
  const settingsEmail = document.getElementById("settingsEmail");
  const settingsCurrentPassword = document.getElementById("settingsCurrentPassword");
  const settingsNewPassword = document.getElementById("settingsNewPassword");
  const settingsConfirmPassword = document.getElementById("settingsConfirmPassword");
  const settingsTwoFactor = document.getElementById("settingsTwoFactor");
  const settingsNotificationsToggle = document.getElementById("settingsNotificationsToggle");
  const settingsBundleAlerts = document.getElementById("settingsBundleAlerts");
  const settingsEmailAlerts = document.getElementById("settingsEmailAlerts");
  const settingsSmsToggle = document.getElementById("settingsSmsToggle");
  const settingsDarkModeToggle = document.getElementById("settingsDarkModeToggle");
  const settingsAccentColor = document.getElementById("settingsAccentColor");
  const settingsLanguage = document.getElementById("settingsLanguage");
  const settingsRegion = document.getElementById("settingsRegion");
  const settingsPreferredPayment = document.getElementById("settingsPreferredPayment");
  const settingsAutoTopUp = document.getElementById("settingsAutoTopUp");
  const settingsProfileVisibility = document.getElementById("settingsProfileVisibility");
  const settingsAnalytics = document.getElementById("settingsAnalytics");
  const settingsDefaultTxType = document.getElementById("settingsDefaultTxType");
  const settingsDefaultView = document.getElementById("settingsDefaultView");

  const linkPaymentBtn = document.getElementById("linkPaymentBtn");
  const unlinkPaymentBtn = document.getElementById("unlinkPaymentBtn");
  const reportBugBtn = document.getElementById("reportBugBtn");
  const faqLink = document.getElementById("faqLink");
  const settingsTxSummary = document.getElementById("settingsTxSummary");
  const complaintIssueType = document.getElementById("complaintIssueType");
  const complaintMessage = document.getElementById("complaintMessage");
  const submitComplaintBtn = document.getElementById("submitComplaintBtn");

  const settingsSaveBtn = document.getElementById("settingsSaveBtn");
  const settingsResetBtn = document.getElementById("settingsResetBtn");
  const settingsLogoutBtn = document.getElementById("settingsLogoutBtn");
  const clearDataBtn = document.getElementById("clearDataBtn");
  const deleteAccountBtn = document.getElementById("deleteAccountBtn");
  const clearDataModal = document.getElementById("clearDataModal");
  const deleteAccountModal = document.getElementById("deleteAccountModal");
  const confirmClearDataBtn = document.getElementById("confirmClearDataBtn");
  const confirmDeleteAccountBtn = document.getElementById("confirmDeleteAccountBtn");
  const toastRoot = document.getElementById("toastRoot");
  const avatarImg = document.getElementById("avatarImg");
  const notifyBtn = document.getElementById("notifyBtn");
  const notifyBadge = document.getElementById("notifyBadge");
  const notifyPanel = document.getElementById("notifyPanel");
  const notifyList = document.getElementById("notifyList");
  const clearNotificationsBtn = document.getElementById("clearNotificationsBtn");

  const SETTINGS_KEY = "dashboardSettings";
  const DASHBOARD_NOTIFICATIONS_KEY = "dashboardNotifications";
  const defaultSettings = {
    username: "",
    email: "",
    avatar: "images/default-avatar.png",
    twoFactor: false,
    notifications: true,
    bundleAlerts: true,
    emailAlerts: false,
    smsAlerts: false,
    darkMode: false,
    accentColor: "#f6b700",
    language: "English",
    region: "Ghana",
    preferredPayment: "Wallet",
    autoTopUp: false,
    profileVisibility: "Private",
    analytics: false,
    defaultTxType: "All",
    defaultView: "Overview",
    paymentLinked: true
  };
  let notifications = [];

  function getStoredNotifications(){
    try{
      const items = JSON.parse(localStorage.getItem(DASHBOARD_NOTIFICATIONS_KEY) || "[]");
      return Array.isArray(items) ? items : [];
    }catch{
      return [];
    }
  }

  function saveNotifications(){
    localStorage.setItem(DASHBOARD_NOTIFICATIONS_KEY, JSON.stringify(notifications.slice(0, 100)));
  }

  function shouldPushNotification(){
    if(settingsNotificationsToggle) return !!settingsNotificationsToggle.checked;
    const saved = getStoredSettings();
    return !!saved.notifications;
  }

  function updateNotificationBadge(){
    if(!notifyBadge) return;
    const unreadCount = notifications.filter(n => !n.read).length;
    if(unreadCount <= 0){
      notifyBadge.style.display = "none";
      notifyBadge.textContent = "0";
      return;
    }
    notifyBadge.style.display = "flex";
    notifyBadge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
  }

  function renderNotifications(){
    if(!notifyList) return;
    if(!notifications.length){
      notifyList.innerHTML = `<div class="notify-empty">No notifications yet.</div>`;
      updateNotificationBadge();
      return;
    }

    notifyList.innerHTML = notifications.map(item => `
      <div class="notify-item">
        <div class="notify-item-title">${item.title || "Update"}</div>
        <div class="notify-item-text">${item.message || ""}</div>
        <div class="notify-item-time">${item.time || ""}</div>
      </div>
    `).join("");
    updateNotificationBadge();
  }

  function markAllNotificationsRead(){
    notifications = notifications.map(item => ({ ...item, read: true }));
    saveNotifications();
    renderNotifications();
  }

  function pushNotification(title, message){
    if(!shouldPushNotification()) return;
    notifications.unshift({
      id: Date.now() + Math.floor(Math.random() * 1000),
      title,
      message,
      time: new Date().toLocaleString(),
      read: false
    });
    notifications = notifications.slice(0, 100);
    saveNotifications();
    renderNotifications();
  }

  function openSettingsPanel(targetId){
    settingsTabs.forEach(tab => tab.classList.toggle("active", tab.dataset.target === targetId));
    settingsPanels.forEach(panel => panel.classList.toggle("active", panel.id === targetId));
    applyAccent(settingsAccentColor?.value || defaultSettings.accentColor);
  }

  settingsTabs.forEach(tab => {
    tab.addEventListener("click", ()=>{
      openSettingsPanel(tab.dataset.target);
    });
  });

  function updateProfilePreview(){
    if(settingsPreviewName) settingsPreviewName.textContent = settingsUsername?.value?.trim() || "Mojo User";
    if(settingsPreviewEmail) settingsPreviewEmail.textContent = settingsEmail?.value?.trim() || "user@example.com";
  }

  function updateThemeChip(isDark){
    if(settingsThemeChip) settingsThemeChip.textContent = isDark ? "Dark Mode" : "Light Mode";
  }

  function applyTheme(isDark){
    document.body.classList.toggle("dark-theme", !!isDark);
    updateThemeChip(!!isDark);
  }

  function applyAccent(color){
    const accent = color || "#f6b700";
    document.querySelectorAll(".settings-tab.active").forEach(el => el.style.background = accent);
    document.querySelectorAll("#transfersBtn, #sendMoneyBtn, #airtimeBtn, #payBillsBtn").forEach(el => {
      el.style.background = accent;
    });
    const focusTargets = document.querySelectorAll("input:focus, select:focus");
    focusTargets.forEach(el => el.style.borderColor = accent);
    const welcome = document.querySelector(".welcome");
    if(welcome) welcome.style.background = `linear-gradient(135deg, ${accent}, #d99a00)`;
  }

  function getStoredSettings(){
    try{
      const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      return { ...defaultSettings, ...parsed };
    }catch(err){
      return { ...defaultSettings };
    }
  }

  function collectSettings(){
    return {
      username: settingsUsername?.value?.trim() || "",
      email: settingsEmail?.value?.trim() || "",
      avatar: settingsAvatarPreview?.src || defaultSettings.avatar,
      twoFactor: !!settingsTwoFactor?.checked,
      notifications: !!settingsNotificationsToggle?.checked,
      bundleAlerts: !!settingsBundleAlerts?.checked,
      emailAlerts: !!settingsEmailAlerts?.checked,
      smsAlerts: !!settingsSmsToggle?.checked,
      darkMode: !!settingsDarkModeToggle?.checked,
      accentColor: settingsAccentColor?.value || defaultSettings.accentColor,
      language: settingsLanguage?.value || defaultSettings.language,
      region: settingsRegion?.value || defaultSettings.region,
      preferredPayment: settingsPreferredPayment?.value || defaultSettings.preferredPayment,
      autoTopUp: !!settingsAutoTopUp?.checked,
      profileVisibility: settingsProfileVisibility?.value || defaultSettings.profileVisibility,
      analytics: !!settingsAnalytics?.checked,
      defaultTxType: settingsDefaultTxType?.value || defaultSettings.defaultTxType,
      defaultView: settingsDefaultView?.value || defaultSettings.defaultView,
      paymentLinked: (linkPaymentBtn?.dataset.linked || "true") === "true"
    };
  }

  function populateSettings(settings){
    if(settingsUsername) settingsUsername.value = settings.username || "";
    if(settingsEmail) settingsEmail.value = settings.email || "";
    if(settingsAvatarPreview) settingsAvatarPreview.src = settings.avatar || defaultSettings.avatar;
    if(settingsAvatarUrl) settingsAvatarUrl.value = settings.avatar || "";
    if(settingsCurrentPassword) settingsCurrentPassword.value = "";
    if(settingsNewPassword) settingsNewPassword.value = "";
    if(settingsConfirmPassword) settingsConfirmPassword.value = "";
    if(settingsTwoFactor) settingsTwoFactor.checked = !!settings.twoFactor;
    if(settingsNotificationsToggle) settingsNotificationsToggle.checked = !!settings.notifications;
    if(settingsBundleAlerts) settingsBundleAlerts.checked = !!settings.bundleAlerts;
    if(settingsEmailAlerts) settingsEmailAlerts.checked = !!settings.emailAlerts;
    if(settingsSmsToggle) settingsSmsToggle.checked = !!settings.smsAlerts;
    if(settingsDarkModeToggle) settingsDarkModeToggle.checked = !!settings.darkMode;
    if(settingsAccentColor) settingsAccentColor.value = settings.accentColor || defaultSettings.accentColor;
    if(settingsLanguage) settingsLanguage.value = settings.language || defaultSettings.language;
    if(settingsRegion) settingsRegion.value = settings.region || defaultSettings.region;
    if(settingsPreferredPayment) settingsPreferredPayment.value = settings.preferredPayment || defaultSettings.preferredPayment;
    if(settingsAutoTopUp) settingsAutoTopUp.checked = !!settings.autoTopUp;
    if(settingsProfileVisibility) settingsProfileVisibility.value = settings.profileVisibility || defaultSettings.profileVisibility;
    if(settingsAnalytics) settingsAnalytics.checked = !!settings.analytics;
    if(settingsDefaultTxType) settingsDefaultTxType.value = settings.defaultTxType || defaultSettings.defaultTxType;
    if(settingsDefaultView) settingsDefaultView.value = settings.defaultView || defaultSettings.defaultView;
    if(linkPaymentBtn){
      linkPaymentBtn.dataset.linked = settings.paymentLinked ? "true" : "false";
      linkPaymentBtn.textContent = settings.paymentLinked ? "Method Linked" : "Link Method";
    }
    if(unlinkPaymentBtn){
      unlinkPaymentBtn.disabled = !settings.paymentLinked;
      unlinkPaymentBtn.style.opacity = settings.paymentLinked ? "1" : "0.5";
    }
    if(avatarImg) avatarImg.src = settings.avatar || defaultSettings.avatar;
    localStorage.setItem("avatar", settings.avatar || defaultSettings.avatar);
    updateProfilePreview();
    applyTheme(!!settings.darkMode);
    applyAccent(settings.accentColor);
  }

  function saveSettings(silent = false, validatePassword = false){
    const password = settingsNewPassword?.value || "";
    const confirm = settingsConfirmPassword?.value || "";
    if(validatePassword && (password || confirm)){
      if(password.length < 6){
        showToast("Security: New password must be at least 6 characters.", "error");
        return;
      }
      if(password !== confirm){
        showToast("Security: Password confirmation does not match.", "error");
        return;
      }
    }
    const settings = collectSettings();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    localStorage.setItem("userEmail", settings.email || "");
    applyTheme(settings.darkMode);
    applyAccent(settings.accentColor);
    updateProfilePreview();
    if(!silent) showToast("Settings: Changes saved successfully.", "success");
  }

  function isPurchaseTransaction(tx){
    const type = String(tx?.type || "").toLowerCase();
    return type.includes("bundle") || type.includes("airtime");
  }

  function isTransferTransactionType(type){
    const t = String(type || "").toLowerCase();
    return t === "send money" || t === "pay bills";
  }

  function updateSettingsTxSummary(){
    if(!settingsTxSummary) return;
    const rows = document.querySelectorAll("#purchaseHistoryTable tbody tr");
    if(!rows.length){
      settingsTxSummary.innerHTML = "<li>No transactions yet.</li>";
      return;
    }
    const items = [];
    for(let i=0; i<Math.min(rows.length, 3); i++){
      const cells = rows[i].querySelectorAll("td");
      if(cells.length >= 3){
        items.push(`<li>${cells[1].textContent} - ${cells[2].textContent}</li>`);
      }
    }
    settingsTxSummary.innerHTML = items.join("");
  }

  function updateTotalOrders(){
    if(totalOrdersValue){
      totalOrdersValue.innerText = String(purchaseTransactions.length || 0);
    }
  }

  function incrementTotalOrders(count = 1){
    if(!totalOrdersValue) return;
    const current = parseInt(totalOrdersValue.innerText || "0", 10) || 0;
    totalOrdersValue.innerText = String(current + count);
  }

  function updateTotalSpent(){
    if(!totalSpentValue) return;
    const spent = (purchaseTransactions || []).reduce((sum, tx)=>{
      const status = String(tx?.status || "").toLowerCase();
      const amount = parseFloat(tx?.amount || 0) || 0;
      const isFailed = status.includes("fail") || status.includes("cancel");
      return !isFailed ? sum + amount : sum;
    }, 0);
    totalSpentValue.innerText = spent.toFixed(2);
    renderSpentTrendChart();
  }

  function incrementTotalSpent(amount){
    if(!totalSpentValue) return;
    const current = parseFloat(totalSpentValue.innerText || "0") || 0;
    totalSpentValue.innerText = (current + (parseFloat(amount) || 0)).toFixed(2);
    renderSpentTrendChart();
  }

  function getSpentTrendValues(limit = 8){
    return (purchaseTransactions || [])
      .filter(tx => {
        const status = String(tx?.status || "").toLowerCase();
        return !(status.includes("fail") || status.includes("cancel"));
      })
      .slice(-limit)
      .map(tx => parseFloat(tx?.amount || 0) || 0);
  }

  function renderSpentTrendChart(){
    if(!spentTrendCanvas) return;

    const cssWidth = 118;
    const cssHeight = 46;
    const dpr = window.devicePixelRatio || 1;
    spentTrendCanvas.width = Math.round(cssWidth * dpr);
    spentTrendCanvas.height = Math.round(cssHeight * dpr);
    const ctx = spentTrendCanvas.getContext("2d");
    if(!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const values = getSpentTrendValues(8);
    if(values.length < 2){
      ctx.strokeStyle = "rgba(182,124,0,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(4, cssHeight - 8);
      ctx.lineTo(cssWidth - 4, cssHeight - 8);
      ctx.stroke();
      return;
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, 1);
    const xStep = (cssWidth - 8) / (values.length - 1);

    const points = values.map((v, i) => {
      const x = 4 + i * xStep;
      const y = 4 + (cssHeight - 12) * (1 - (v - min) / range);
      return { x, y };
    });

    const areaGradient = ctx.createLinearGradient(0, 0, 0, cssHeight);
    areaGradient.addColorStop(0, "rgba(246,183,0,0.30)");
    areaGradient.addColorStop(1, "rgba(246,183,0,0)");

    ctx.beginPath();
    ctx.moveTo(points[0].x, cssHeight - 2);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, cssHeight - 2);
    ctx.closePath();
    ctx.fillStyle = areaGradient;
    ctx.fill();

    ctx.beginPath();
    points.forEach((p, idx) => {
      if(idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = "#b67c00";
    ctx.lineWidth = 2.3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    const last = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 2.8, 0, Math.PI * 2);
    ctx.fillStyle = "#b67c00";
    ctx.fill();
  }

  function appendPurchasedHistoryRow(type, amount, status, description){
    const tbody = document.querySelector("#purchaseHistoryTable tbody");
    if(!tbody) return;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${new Date().toLocaleString()}</td>
      <td>${type}</td>
      <td>GHS ${parseFloat(amount).toFixed(2)}</td>
      <td>${status}</td>
      <td>${description || "-"}</td>
    `;
    tbody.prepend(row);
  }

  function updateTransferButtons(){
    const transferMoreBtn = document.getElementById("transferMoreBtn");
    const transferLessBtn = document.getElementById("transferLessBtn");
    if(transferMoreBtn) transferMoreBtn.style.display = transferOffset < allTransfers.length ? "block" : "none";
    if(transferLessBtn) transferLessBtn.style.display = transferOffset > transferLimit ? "block" : "none";
  }

  function renderTransfers(reset = true){
    const tbody = document.querySelector("#transfersTable tbody");
    if(!tbody) return;

    if(reset){
      transferOffset = 0;
      tbody.innerHTML = "";
    }

    const nextSlice = allTransfers.slice(transferOffset, transferOffset + transferLimit);
    nextSlice.forEach(t=>{
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${t.date}</td>
        <td>${t.type}</td>
        <td>GHS ${parseFloat(t.amount).toFixed(2)}</td>
        <td>${t.status}</td>
        <td>${t.details || "-"}</td>
      `;
      tbody.appendChild(row);
    });

    transferOffset += nextSlice.length;
    updateTransferButtons();
  }

  function openModal(modal){
    if(modal) modal.style.display = "flex";
  }

  function closeModal(modal){
    if(modal) modal.style.display = "none";
  }

  function showToast(message, type = "success"){
    if(!toastRoot) return;
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastRoot.appendChild(toast);

    setTimeout(()=>{
      toast.classList.add("hide");
      setTimeout(()=> toast.remove(), 220);
    }, 2600);
  }

  populateSettings(getStoredSettings());
  notifications = getStoredNotifications();
  renderNotifications();
  updateSettingsTxSummary();
  renderSpentTrendChart();

  notifyBtn?.addEventListener("click", (e)=>{
    e.stopPropagation();
    notifyPanel?.classList.toggle("show");
    if(notifyPanel?.classList.contains("show")){
      markAllNotificationsRead();
    }
  });

  clearNotificationsBtn?.addEventListener("click", (e)=>{
    e.stopPropagation();
    notifications = [];
    saveNotifications();
    renderNotifications();
    showToast("Notifications cleared.", "info");
  });

  notifyPanel?.addEventListener("click", (e)=> e.stopPropagation());

  settingsDarkModeToggle?.addEventListener("change", ()=>{
    applyTheme(settingsDarkModeToggle.checked);
    saveSettings(true);
  });
  settingsAccentColor?.addEventListener("change", ()=>{
    applyAccent(settingsAccentColor.value);
    saveSettings(true);
  });

  [
    settingsNotificationsToggle,
    settingsBundleAlerts,
    settingsEmailAlerts,
    settingsSmsToggle,
    settingsTwoFactor,
    settingsLanguage,
    settingsRegion,
    settingsPreferredPayment,
    settingsAutoTopUp,
    settingsProfileVisibility,
    settingsAnalytics,
    settingsDefaultTxType,
    settingsDefaultView
  ].forEach(el => el?.addEventListener("change", ()=> saveSettings(true)));

  [settingsUsername, settingsEmail, settingsAvatarUrl].forEach(el =>
    el?.addEventListener("input", ()=> saveSettings(true))
  );

  settingsUsername?.addEventListener("input", updateProfilePreview);
  settingsEmail?.addEventListener("input", updateProfilePreview);

  settingsAvatarUrl?.addEventListener("change", ()=>{
    const url = settingsAvatarUrl.value.trim();
    if(!url) return;
    if(settingsAvatarPreview) settingsAvatarPreview.src = url;
    if(avatarImg) avatarImg.src = url;
    localStorage.setItem("avatar", url);
    saveSettings(true);
  });

  settingsAvatarUpload?.addEventListener("change", ()=>{
    const file = settingsAvatarUpload.files?.[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      const dataUrl = String(reader.result || "");
      if(settingsAvatarPreview) settingsAvatarPreview.src = dataUrl;
      if(avatarImg) avatarImg.src = dataUrl;
      if(settingsAvatarUrl) settingsAvatarUrl.value = dataUrl;
      localStorage.setItem("avatar", dataUrl);
      saveSettings(true);
    };
    reader.readAsDataURL(file);
  });

  settingsSaveBtn?.addEventListener("click", ()=> saveSettings(false, true));
  settingsResetBtn?.addEventListener("click", ()=>{
    const resetSettings = { ...defaultSettings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(resetSettings));
    localStorage.setItem("avatar", resetSettings.avatar);
    if(avatarImg) avatarImg.src = resetSettings.avatar;
    populateSettings(defaultSettings);
    showToast("Settings: Reset to default values.", "info");
  });

  linkPaymentBtn?.addEventListener("click", ()=>{
    linkPaymentBtn.dataset.linked = "true";
    linkPaymentBtn.textContent = "Method Linked";
    if(unlinkPaymentBtn){
      unlinkPaymentBtn.disabled = false;
      unlinkPaymentBtn.style.opacity = "1";
    }
    saveSettings(true);
    showToast("Wallet: Payment method linked.", "success");
    pushNotification("Wallet", "Payment method linked successfully.");
  });

  unlinkPaymentBtn?.addEventListener("click", ()=>{
    linkPaymentBtn.dataset.linked = "false";
    linkPaymentBtn.textContent = "Link Method";
    unlinkPaymentBtn.disabled = true;
    unlinkPaymentBtn.style.opacity = "0.5";
    saveSettings(true);
    showToast("Wallet: Payment method unlinked.", "info");
    pushNotification("Wallet", "Payment method unlinked.");
  });

  reportBugBtn?.addEventListener("click", ()=> showToast("Support: Bug report captured.", "success"));
  faqLink?.addEventListener("click", (e)=>{
    e.preventDefault();
    showToast("Support: FAQ opened. Check Help Center topics.", "info");
  });

  submitComplaintBtn?.addEventListener("click", async ()=>{
    const message = complaintMessage?.value?.trim() || "";
    const issueType = complaintIssueType?.value || "General";

    if(message.length < 5){
      showToast("Customer Service: Please enter a detailed complaint.", "error");
      return;
    }

    if(!token){
      showToast("Please login to submit complaint.", "error");
      setTimeout(()=>{ window.location.href = "/login.html"; }, 800);
      return;
    }

    try{
      const res = await apiFetch("/user/support-tickets", {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:"Bearer " + token },
        body: JSON.stringify({ issueType, message })
      });
      const data = await res.json();
      if(!res.ok){
        throw new Error(data.message || "Failed to submit complaint.");
      }
      complaintMessage.value = "";
      showToast("Customer Service: Complaint submitted successfully.", "success");
      pushNotification("Customer Service", `Complaint submitted (${issueType}).`);
    }catch(err){
      if(err.message !== "Unauthorized"){
        showToast(err.message || "Failed to submit complaint. Please try again.", "error");
      }
    }
  });

  clearDataBtn?.addEventListener("click", ()=> openModal(clearDataModal));
  deleteAccountBtn?.addEventListener("click", ()=> openModal(deleteAccountModal));
  document.querySelectorAll(".close-modal-btn").forEach(btn=>{
    btn.addEventListener("click", ()=> closeModal(document.getElementById(btn.dataset.modal)));
  });
  clearDataModal?.addEventListener("click", (e)=>{ if(e.target === clearDataModal) closeModal(clearDataModal); });
  deleteAccountModal?.addEventListener("click", (e)=>{ if(e.target === deleteAccountModal) closeModal(deleteAccountModal); });
  confirmClearDataBtn?.addEventListener("click", ()=>{
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem("avatar");
    populateSettings(defaultSettings);
    closeModal(clearDataModal);
    showToast("Actions: Local data cleared.", "success");
  });
  confirmDeleteAccountBtn?.addEventListener("click", ()=>{
    closeModal(deleteAccountModal);
    showToast("Actions: Delete request submitted for confirmation.", "error");
  });

  // =========================  
  // LOAD BALANCE  
  // =========================  
  async function loadBalance(){  
    if(!token) return;
    try{  
      const res = await apiFetch("/user/profile",{  
        headers:{ Authorization:"Bearer " + token }  
      });  
      const user = await res.json();  
      document.getElementById("balance").innerText =  
        parseFloat(user.wallet_balance || 0).toFixed(2);  

      const displayName = String(user.username || "").trim() || "Mojo";
      if(welcomeTitle) welcomeTitle.textContent = `Welcome back, ${displayName}!`;

      // Keep settings profile fields in sync when available.
      if(settingsUsername && !settingsUsername.value) settingsUsername.value = displayName;
      if(settingsEmail && !settingsEmail.value && user.email) settingsEmail.value = user.email;
      updateProfilePreview();
    }catch(err){ if(err.message !== "Unauthorized") console.log(err); }  
  }  

  // =========================  
  // LOAD TRANSACTIONS  
  // =========================  
  async function loadTransactions(reset=true){  
    if(!token) return;
    try{  
      const res = await apiFetch("/user/transactions",{  
        headers:{ Authorization:"Bearer " + token }  
      });  
      const data = await res.json();  
      if(!data.transactions) return;  

      const tbody = document.querySelector("#purchaseHistoryTable tbody");  

      if(reset){  
        allTransactions = data.transactions;  
        purchaseTransactions = allTransactions.filter(isPurchaseTransaction);
        txOffset = 0;  
        tbody.innerHTML = "";  
      }  

      const nextSlice = purchaseTransactions.slice(txOffset, txOffset + txLimit);  
      nextSlice.forEach(tx=>{  
        const row = document.createElement("tr");  
        row.innerHTML = `  
          <td>${new Date(tx.createdAt).toLocaleString()}</td>  
          <td>${tx.type}</td>  
          <td>GHS ${parseFloat(tx.amount).toFixed(2)}</td>  
          <td>${tx.status}</td>  
          <td>${tx.description || "-"}</td>  
        `;  
        tbody.appendChild(row);  
      });  

      txOffset += nextSlice.length;  

      const moreBtn = document.getElementById("purchaseMoreBtn");  
      const lessBtn = document.getElementById("purchaseLessBtn");  

      if(moreBtn) moreBtn.style.display = txOffset < purchaseTransactions.length ? "block" : "none";  
      if(lessBtn) lessBtn.style.display = txOffset > txLimit ? "block" : "none";  
      updateSettingsTxSummary();
      updateTotalOrders();
      updateTotalSpent();

    }catch(err){ if(err.message !== "Unauthorized") console.log(err); }  
  }  

  // =========================  
  // TRANSACTION BUTTONS  
  // =========================  
  document.getElementById("purchaseMoreBtn")?.addEventListener("click", ()=> loadTransactions(false));  
  document.getElementById("purchaseLessBtn")?.addEventListener("click", ()=>{  
    if(txOffset <= txLimit) return;  
    const tbody = document.querySelector("#purchaseHistoryTable tbody");  
    for(let i=0;i<txLimit;i++){ if(tbody.lastChild) tbody.removeChild(tbody.lastChild); }  
    txOffset -= txLimit;  
    document.getElementById("purchaseLessBtn").style.display = txOffset > txLimit ? "block" : "none";  
    document.getElementById("purchaseMoreBtn").style.display = txOffset < purchaseTransactions.length ? "block" : "none";  
  });  
  document.getElementById("clearPurchaseHistoryBtn")?.addEventListener("click", async ()=>{  
    if(!confirm("Are you sure you want to clear purchased history?")) return;  
    // Always clear current purchased-history view immediately.
    purchaseTransactions = [];
    txOffset = 0;
    const tbody = document.querySelector("#purchaseHistoryTable tbody");
    if(tbody) tbody.innerHTML = "";
    const moreBtn = document.getElementById("purchaseMoreBtn");
    const lessBtn = document.getElementById("purchaseLessBtn");
    if(moreBtn) moreBtn.style.display = "none";
    if(lessBtn) lessBtn.style.display = "none";
    updateSettingsTxSummary();
    updateTotalOrders();
    updateTotalSpent();
    showToast("Purchased history cleared", "success");
  });  

  // =========================  
  // ADD FUNDS  
  // =========================  
  document.getElementById("fundBtn")?.addEventListener("click", async ()=>{  
    if(!token){
      showToast("Please login to add funds.", "error");
      setTimeout(()=>{ window.location.href = "/login.html"; }, 800);
      return;
    }
    let amount = document.getElementById("fundAmount").value;  
    if(!amount){ showToast("Wallet: Enter amount.", "error"); return; }  
    amount = parseFloat(amount);  
    try{
      const initRes = await apiFetch("/user/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type":"application/json",
          Authorization:"Bearer " + token
        },
        body: JSON.stringify({ amount })
      });
      const initData = await initRes.json();
      if(!initRes.ok || !initData.authorization_url || !initData.reference){
        return showToast(initData.message || "Unable to start payment.", "error");
      }

      const payWindow = window.open(
        initData.authorization_url,
        "paystackCheckout",
        "width=520,height=700,menubar=no,toolbar=no,location=no,status=no"
      );

      if(!payWindow){
        // Popup blocked fallback.
        window.location.href = initData.authorization_url;
        return;
      }

      document.getElementById("fundMessage").innerText = "Payment window opened. Complete payment to fund wallet.";

      const verifyAfterClose = async ()=>{
        try{
          const verifyRes = await apiFetch("/user/paystack/verify", {
            method: "POST",
            headers: {
              "Content-Type":"application/json",
              Authorization:"Bearer " + token,
              "x-idempotency-key": createIdempotencyKey("paystack-verify")
            },
            body: JSON.stringify({ reference: initData.reference })
          });
          const verifyData = await verifyRes.json();
          if(!verifyRes.ok){
            return showToast(verifyData.message || "Payment not confirmed yet.", "error");
          }

          document.getElementById("fundMessage").innerText = verifyData.message || "Wallet funded successfully";
          await loadBalance();
          await loadTransactions(true);
          document.getElementById("fundAmount").value = "";

          updateSettingsTxSummary();
          showToast("Wallet funded successfully via Paystack.", "success");
          pushNotification("Wallet", `Funds added: GHS ${amount.toFixed(2)}.`);
        }catch(err){
          if(err.message !== "Unauthorized"){
            showToast("Payment verification failed. Please try Refresh Balance.", "error");
          }
        }
      };

      const watch = setInterval(async ()=>{
        if(payWindow.closed){
          clearInterval(watch);
          await verifyAfterClose();
        }
      }, 1200);

    }catch(err){ if(err.message !== "Unauthorized") console.log(err); }  
  });  

  // =========================  
  // LOGOUT  
  // =========================  
  function doLogout(){
    localStorage.removeItem("token");  
    window.location.href="/login.html";  
  }
  document.getElementById("logoutBtn")?.addEventListener("click", doLogout);  
  settingsLogoutBtn?.addEventListener("click", doLogout);

  // =========================  
  // TRANSACTIONS CARD TOGGLE  
  // =========================  
  const purchaseHistoryCard = document.getElementById("purchaseHistoryCard");  
  document.getElementById("sidebarPurchasedHistoryBtn")?.addEventListener("click", ()=>{  
    if(purchaseHistoryCard){  
      purchaseHistoryCard.style.display = purchaseHistoryCard.style.display === "none" ? "block" : "none";  
      if(purchaseHistoryCard.style.display === "block" && token) loadTransactions(true);  
    }  
  });  

  // =========================  
  // AVATAR TOGGLE  
  // =========================  
  const avatarBox = document.getElementById("avatarBox");  
  const avatarMenu = document.getElementById("avatarMenu");  

  const savedAvatar = localStorage.getItem("avatar");  
  if(savedAvatar) avatarImg.src = savedAvatar;  

  avatarBox?.addEventListener("click", ()=>{  
    if(avatarMenu) avatarMenu.style.display = avatarMenu.style.display === "flex" ? "none" : "flex";  
  });  

  avatarMenu?.querySelectorAll("img").forEach(img=>{  
    img.addEventListener("click", ()=>{  
      avatarImg.src = img.src;  
      if(settingsAvatarPreview) settingsAvatarPreview.src = img.src;
      if(settingsAvatarUrl) settingsAvatarUrl.value = img.src;
      localStorage.setItem("avatar", img.src);  
      saveSettings(true);
      if(avatarMenu) avatarMenu.style.display = "none";  
    });  
  });  

  document.addEventListener("click",(e)=>{  
    if(notifyPanel && notifyBtn && !notifyPanel.contains(e.target) && !notifyBtn.contains(e.target)){
      notifyPanel.classList.remove("show");
    }
    if(avatarBox && avatarMenu && !avatarBox.contains(e.target) && !avatarMenu.contains(e.target)){  
      avatarMenu.style.display = "none";  
    }  
  });  

  // =========================  
  // TRANSFERS LOGIC (KEEP ORIGINAL)  
  // =========================  
  function addToTransfers(action, amount, details, status = "Success"){  
    if(!isTransferTransactionType(action)) return;
    let transfersCard = document.getElementById("transfersCard");  
    if(!transfersCard){  
      transfersCard = document.createElement("div");  
      transfersCard.id = "transfersCard";  
      transfersCard.className = "card";  
      transfersCard.style.display = "none";  
      transfersCard.innerHTML = `  
        <h3>Transfers History</h3>  
        <table id="transfersTable">  
          <thead>  
            <tr>  
              <th>Date</th>  
              <th>Type</th>
              <th>Amount</th>  
              <th>Status</th>
              <th>Details</th>  
            </tr>  
          </thead>  
          <tbody></tbody>  
        </table>
        <div style="display:flex; justify-content:space-between; margin-top:10px;">
          <div style="display:flex; gap:5px; width:48%;">
            <button id="transferMoreBtn" style="width:48%;">More</button>
            <button id="transferLessBtn" style="width:48%; display:none;">Less</button>
          </div>
          <button id="clearTransfersHistoryBtn" style="background:#e74c3c; width:48%;">Clear Transfers History</button>
        </div>
      `;  
      document.querySelector(".container").appendChild(transfersCard);  
    }  

    allTransfers.unshift({
      date: new Date().toLocaleString(),
      type: action,
      amount,
      status,
      details
    });
    renderTransfers(true);
  }  

  // =========================  
  // WIZARD STYLE QUICK ACTIONS FIXED  
  // =========================  
  const wizardModal = document.getElementById("wizardModal");  
  const wizardStep1 = document.getElementById("wizardStep1");  
  const wizardStep2 = document.getElementById("wizardStep2");  
  const wizardFormTable = document.getElementById("wizardFormTable");  
  const wizardBackBtn = document.getElementById("wizardBackBtn");  
  const wizardSubmitBtn = document.getElementById("wizardSubmitBtn");  

  const sendMoneyBtn = document.getElementById("sendMoneyBtn");  
  const airtimeBtn = document.getElementById("airtimeBtn");  
  const transfersBtn = document.getElementById("transfersBtn");  
  const payBillsBtn = document.getElementById("payBillsBtn");  
  const mtnBtn = document.getElementById("mtnBtn");
  const airtelBtn = document.getElementById("airtelBtn");
  const telecelBtn = document.getElementById("telecelBtn");
  const galleryImage = document.getElementById("galleryImage");

  // -------------------------
  // GALLERY ROTATION (CSP-SAFE)
  // -------------------------
  if(galleryImage){
    const galleryImages = [
      "images/bundles-bg.jpg",
      "images/1st-bg.jpg",
      "images/2nd-bg.jpg",
      "images/3rd-bg.jpg"
    ];

    galleryImages.forEach(src => {
      const img = new Image();
      img.src = src;
      img.onerror = ()=> console.warn("Image not found:", src);
    });

    let galleryIndex = 0;
    galleryImage.src = galleryImages[galleryIndex];

    setInterval(()=>{
      galleryImage.style.opacity = 0;
      setTimeout(()=>{
        galleryIndex = (galleryIndex + 1) % galleryImages.length;
        galleryImage.src = galleryImages[galleryIndex];
        galleryImage.style.opacity = 1;
      }, 400);
    }, 8000);
  }

  // -------------------------
  // SEND MONEY (2-step wizard)
  // -------------------------
  sendMoneyBtn?.addEventListener("click", ()=>{
    wizardModal.style.display = "flex";
    wizardStep1.style.display = "block";
    wizardStep2.style.display = "none";
    wizardFormTable.innerHTML = "";
    wizardBackBtn.style.display = "none";
  });

  // Step 1: choose Mobile Money or Bank
  document.querySelectorAll(".wizardOption").forEach(opt=>{
    opt.addEventListener("click", ()=>{
      const type = opt.dataset.type;
      wizardStep1.style.display = "none";
      wizardStep2.style.display = "block";
      wizardBackBtn.style.display = "inline-block";
      if(type === "Bank"){
        wizardFormTable.innerHTML = `
          <tr><td>Type:</td><td><input readonly value="${type}"></td></tr>
          <tr><td>Amount:</td><td><input type="number" placeholder="Enter Amount"></td></tr>
          <tr><td>Bank Name:</td><td><input type="text" placeholder="e.g. GCB Bank"></td></tr>
          <tr><td>Account Number:</td><td><input type="number" placeholder="Enter account number"></td></tr>
        `;
      }else{
        wizardFormTable.innerHTML = `
          <tr><td>Type:</td><td><input readonly value="${type}"></td></tr>
          <tr><td>Amount:</td><td><input type="number" placeholder="Enter Amount"></td></tr>
          <tr><td>Receiver Number:</td><td><input type="number" placeholder="Enter receiver number"></td></tr>
        `;
      }
    });
  });

  wizardBackBtn.onclick = ()=>{
    wizardStep2.style.display = "none";
    wizardStep1.style.display = "block";
  };

  wizardSubmitBtn.onclick = async ()=>{
    if(wizardStep2.style.display === "block"){
      const inputs = wizardFormTable.querySelectorAll("input");
      if(inputs.length >= 3){ // Send Money
        const type = inputs[0].value;
        const amount = parseFloat(inputs[1].value || "0");
        const isBank = type === "Bank";
        const bankName = isBank ? (inputs[2].value || "").trim() : "";
        const accountNumber = isBank ? parseInt(inputs[3]?.value || "", 10) : null;
        const receiverNumber = !isBank ? parseInt(inputs[2].value || "", 10) : null;
        if(!amount || (!isBank && !receiverNumber) || (isBank && (!bankName || !accountNumber))){
          return showToast("Send Money: Fill all fields.", "error");
        }
        if(!token){
          showToast("Please login to send money.", "error");
          setTimeout(()=>{ window.location.href = "/login.html"; }, 800);
          return;
        }
        try{
          const payload = isBank
            ? { accountNumber, bankName, amount }
            : { receiverNumber, amount };
          const res = await apiFetch("/user/transfer", {
            method: "POST",
            headers: {
              "Content-Type":"application/json",
              Authorization:"Bearer " + token,
              "x-idempotency-key": createIdempotencyKey("wallet-transfer")
            },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if(!res.ok){
            return showToast(data.message || "Send Money failed.", "error");
          }
        }catch(err){
          if(err.message !== "Unauthorized") showToast("Send Money failed.", "error");
          return;
        }
        const destination = isBank
          ? `Bank: ${bankName}, Account: ${accountNumber}`
          : `Receiver number: ${receiverNumber}`;
        addToTransfers("Send Money", amount, `${destination}, Type: ${type}`, "Success");
        showToast(`Send Money successful: GHS ${amount} (${type})`, "success");
        pushNotification("Transfer", `Sent GHS ${amount} via ${type}.`);
        await loadBalance();
        await loadTransactions(true);
      }
    }
    wizardModal.style.display = "none";
    wizardStep1.style.display = "block";
    wizardStep2.style.display = "block";
  };

  wizardModal.onclick = e=>{
    if(e.target === wizardModal) wizardModal.style.display = "none";
  };

  // -------------------------
  // AIRTIME TOP-UP (single step)
  // -------------------------
  airtimeBtn?.addEventListener("click", ()=>{
    wizardModal.style.display = "flex";
    wizardStep1.style.display = "none";
    wizardStep2.style.display = "block";
    wizardBackBtn.style.display = "none";
    wizardFormTable.innerHTML = `
      <tr><td>Mobile Network:</td><td><input placeholder="e.g., MTN, Vodafone"></td></tr>
      <tr><td>Phone Number:</td><td><input placeholder="Enter number"></td></tr>
      <tr><td>Amount:</td><td><input type="number" placeholder="Enter amount"></td></tr>
    `;
    wizardSubmitBtn.onclick = async ()=>{
      const inputs = wizardFormTable.querySelectorAll("input");
      const network = inputs[0].value;
      const number = inputs[1].value;
      const amount = inputs[2].value;
      if(!network || !number || !amount) return showToast("Airtime Top-up: Fill all fields.", "error");
      if(!token){
        showToast("Please login to buy airtime.", "error");
        setTimeout(()=>{ window.location.href = "/login.html"; }, 800);
        return;
      }
      try{
        const res = await apiFetch("/user/purchase", {
          method: "POST",
          headers: {
            "Content-Type":"application/json",
            Authorization:"Bearer " + token,
            "x-idempotency-key": createIdempotencyKey("airtime-purchase")
          },
          body: JSON.stringify({ phone: number, amount: parseFloat(amount) })
        });
        const data = await res.json();
        if(!res.ok){
          return showToast(data.message || "Airtime purchase failed.", "error");
        }
      }catch(err){
        if(err.message !== "Unauthorized") showToast("Airtime purchase failed.", "error");
        return;
      }
      appendPurchasedHistoryRow("Airtime Top-up", amount, "Success", `Phone: ${number}, Network: ${network}`);
      updateSettingsTxSummary();
      incrementTotalOrders(1);
      incrementTotalSpent(amount);
      showToast(`Airtime Top-up successful: GHS ${amount} to ${number} (${network})`, "success");
      pushNotification("Purchased History", `Airtime top-up: GHS ${amount} (${network}).`);
      await loadBalance();
      await loadTransactions(true);
      wizardModal.style.display = "none";
    };
  });

  // -------------------------
  // BUNDLE PURCHASE (MTN / AIRTEL / TELECEL)
  // -------------------------
  function openBundleModal(title, bundles){
    wizardModal.style.display = "flex";
    wizardStep1.style.display = "none";
    wizardStep2.style.display = "block";
    wizardBackBtn.style.display = "none";
    wizardSubmitBtn.style.display = "inline-block";

    if(wizardStep2) wizardStep2.style.background = "";

    const options = bundles.map(b =>
      `<option value="${b.price}" data-name="${b.name}">
        ${b.name} - GHS ${b.price}
      </option>`
    ).join("");

    wizardFormTable.innerHTML = `
      <tr>
        <td>${title}:</td>
        <td>
          <select id="bundleSelect">
            <option value="">Select Bundle</option>
            ${options}
          </select>
        </td>
      </tr>
      <tr>
        <td>Phone Number:</td>
        <td><input id="bundleNumber" placeholder="Enter number"></td>
      </tr>
      <tr>
        <td>Amount:</td>
        <td><input id="bundleAmount" readonly placeholder="Auto-filled"></td>
      </tr>
    `;

    const bundleSelect = document.getElementById("bundleSelect");
    const amountInput = document.getElementById("bundleAmount");

    bundleSelect?.addEventListener("change", ()=>{
      amountInput.value = bundleSelect.value;
    });

    wizardSubmitBtn.onclick = async ()=>{
      const selected = bundleSelect?.options?.[bundleSelect.selectedIndex];
      const bundleName = selected?.dataset?.name;
      const amount = bundleSelect?.value;
      const number = document.getElementById("bundleNumber")?.value;

      if(!bundleName || !amount || !number){
        return showToast(`${title}: Fill all fields.`, "error");
      }
      if(!token){
        showToast("Please login to purchase bundles.", "error");
        setTimeout(()=>{ window.location.href = "/login.html"; }, 800);
        return;
      }
      try{
        const res = await apiFetch("/user/purchase", {
          method: "POST",
          headers: {
            "Content-Type":"application/json",
            Authorization:"Bearer " + token,
            "x-idempotency-key": createIdempotencyKey("bundle-purchase")
          },
          body: JSON.stringify({ phone: number, amount: parseFloat(amount) })
        });
        const data = await res.json();
        if(!res.ok){
          return showToast(data.message || `${title} purchase failed.`, "error");
        }
      }catch(err){
        if(err.message !== "Unauthorized") showToast(`${title} purchase failed.`, "error");
        return;
      }

      appendPurchasedHistoryRow(title, amount, "Success", `Phone: ${number}, Bundle: ${bundleName}`);
      updateSettingsTxSummary();
      incrementTotalOrders(1);
      incrementTotalSpent(amount);
      showToast(`${title}: ${bundleName} purchased for ${number}`, "success");
      pushNotification("Purchased History", `${title}: ${bundleName} purchased.`);
      await loadBalance();
      await loadTransactions(true);
      wizardModal.style.display = "none";
    };
  }

  mtnBtn?.addEventListener("click", ()=>{
    openBundleModal(
      "MTN Data Bundles",
      [
        {name:"1GB", price:5},
        {name:"2GB", price:10},
        {name:"5GB", price:20}
      ]
    );
  });

  airtelBtn?.addEventListener("click", ()=>{
    openBundleModal(
      "AirtelTigo Bundles",
      [
        {name:"1GB", price:4},
        {name:"3GB", price:12},
        {name:"6GB", price:22}
      ]
    );
  });

  telecelBtn?.addEventListener("click", ()=>{
    openBundleModal(
      "Telecel Bundles",
      [
        {name:"1GB", price:3},
        {name:"2GB", price:8},
        {name:"4GB", price:18}
      ]
    );
  });

  // -------------------------
  // TRANSFERS & PAY BILLS (keep original)
  // -------------------------
  transfersBtn?.addEventListener("click", ()=>{
    const transfersCard = document.getElementById("transfersCard");
    if(!transfersCard) return;
    transfersCard.style.display = transfersCard.style.display === "none" ? "block" : "none";
    if(transfersCard.style.display === "block"){
      renderTransfers(true);
      transfersCard.scrollIntoView({behavior:"smooth"});
    }
  });

  document.getElementById("transferMoreBtn")?.addEventListener("click", ()=> renderTransfers(false));
  document.getElementById("transferLessBtn")?.addEventListener("click", ()=>{
    const tbody = document.querySelector("#transfersTable tbody");
    if(!tbody || transferOffset <= transferLimit) return;
    for(let i=0; i<transferLimit; i++){
      if(tbody.lastChild) tbody.removeChild(tbody.lastChild);
    }
    transferOffset -= transferLimit;
    updateTransferButtons();
  });
  document.getElementById("clearTransfersHistoryBtn")?.addEventListener("click", ()=>{
    if(!confirm("Are you sure you want to clear transfers history?")) return;
    allTransfers = [];
    transferOffset = 0;
    const tbody = document.querySelector("#transfersTable tbody");
    if(tbody) tbody.innerHTML = "";
    updateTransferButtons();
    showToast("Transfers history cleared.", "success");
  });

  payBillsBtn?.addEventListener("click", ()=>{
    wizardModal.style.display = "flex";
    wizardStep1.style.display = "none";
    wizardStep2.style.display = "block";
    wizardBackBtn.style.display = "none";
    wizardFormTable.innerHTML = `
      <tr><td>Bill Type:</td><td><input placeholder="e.g. Electricity"></td></tr>
      <tr><td>Reference No:</td><td><input placeholder="Enter reference"></td></tr>
      <tr><td>Amount:</td><td><input type="number" placeholder="Enter amount"></td></tr>
    `;
    wizardSubmitBtn.onclick = async ()=>{
      const inputs = wizardFormTable.querySelectorAll("input");
      const billType = inputs[0].value;
      const reference = inputs[1].value;
      const amount = inputs[2].value;
      if(!billType || !reference || !amount) return showToast("Pay Bills: Fill all fields.", "error");
      if(!token){
        showToast("Please login to pay bills.", "error");
        setTimeout(()=>{ window.location.href = "/login.html"; }, 800);
        return;
      }
      try{
        const res = await apiFetch("/user/pay-bill", {
          method: "POST",
          headers: {
            "Content-Type":"application/json",
            Authorization:"Bearer " + token,
            "x-idempotency-key": createIdempotencyKey("bill-payment")
          },
          body: JSON.stringify({ billType, reference, amount: parseFloat(amount) })
        });
        const data = await res.json();
        if(!res.ok){
          return showToast(data.message || "Pay Bills failed.", "error");
        }
      }catch(err){
        if(err.message !== "Unauthorized") showToast("Pay Bills failed.", "error");
        return;
      }
      addToTransfers("Pay Bills", amount, `Bill: ${billType}, Ref: ${reference}`, "Success");
      showToast(`Pay Bills successful: GHS ${amount} (${billType})`, "success");
      pushNotification("Transfer", `Bill paid: ${billType} (GHS ${amount}).`);
      await loadBalance();
      await loadTransactions(true);
      wizardModal.style.display = "none";
    };
  });

});
