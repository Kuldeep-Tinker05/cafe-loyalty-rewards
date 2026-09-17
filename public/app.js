// BrewPoints staff app - vanilla JS + fetch against the REST API.
const $ = (id) => document.getElementById(id);
let token = localStorage.getItem("bp_token") || null;
let staff = JSON.parse(localStorage.getItem("bp_staff") || "null");
let mode = "login";
let state = { page: 1, limit: 8, search: "", sort: "created_at", order: "desc" };

async function api(path, opts = {}) {
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Request failed");
  return body;
}

// ---- auth ------------------------------------------------------------------
function setTab(m) {
  mode = m;
  $("tabLogin").classList.toggle("active", m === "login");
  $("tabRegister").classList.toggle("active", m === "register");
  $("regName").classList.toggle("hidden", m !== "register");
  $("authSubmit").textContent = m === "login" ? "Login" : "Create account";
  $("authErr").textContent = "";
}
$("tabLogin").onclick = () => setTab("login");
$("tabRegister").onclick = () => setTab("register");

$("authSubmit").onclick = async () => {
  $("authErr").textContent = "";
  try {
    const payload = { email: $("fEmail").value.trim(), password: $("fPass").value };
    if (mode === "register") payload.name = $("fName").value.trim();
    const data = await api(`/auth/${mode}`, { method: "POST", body: JSON.stringify(payload) });
    token = data.token;
    staff = data.staff;
    localStorage.setItem("bp_token", token);
    localStorage.setItem("bp_staff", JSON.stringify(staff));
    showApp();
  } catch (e) {
    $("authErr").textContent = e.message;
  }
};

function logout() {
  token = null;
  staff = null;
  localStorage.clear();
  location.reload();
}

// ---- app shell -------------------------------------------------------------
function showApp() {
  $("authView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  $("whoami").innerHTML = `${staff.name} · <a href="#" id="logoutLink">Logout</a>`;
  $("logoutLink").onclick = (e) => (e.preventDefault(), logout());
  loadMembers();
}

// ---- members list ----------------------------------------------------------
async function loadMembers() {
  const { search, sort, order, page, limit } = state;
  const qs = new URLSearchParams({ search, sort, order, page, limit }).toString();
  try {
    const { data, total, pages } = await api(`/members?${qs}`);
    $("memberRows").innerHTML = data.length
      ? data
          .map(
            (m) => `<tr data-id="${m.id}">
        <td>${esc(m.name)}</td><td>${esc(m.phone)}</td>
        <td><span class="tier-badge ${m.tier.toLowerCase()}">${m.tier}</span></td>
        <td>${m.lifetime_points}</td><td>${m.balance_points}</td>
        <td><button class="btn btn-sm openBtn">Open</button></td></tr>`
          )
          .join("")
      : `<tr><td colspan="6" class="empty">No members found</td></tr>`;
    $("pageInfo").textContent = `Page ${page} of ${pages || 1} · ${total} members`;
    document.querySelectorAll(".openBtn").forEach((b) => {
      b.onclick = () => openMember(b.closest("tr").dataset.id);
    });
  } catch (e) {
    if (/token/i.test(e.message)) logout();
  }
}

$("searchBtn").onclick = () => ((state.search = $("phoneInput").value.trim()), (state.page = 1), loadMembers());
$("phoneInput").addEventListener("keydown", (e) => e.key === "Enter" && $("searchBtn").click());
$("sortSel").onchange = () => ((state.sort = $("sortSel").value), loadMembers());
$("orderSel").onchange = () => ((state.order = $("orderSel").value), loadMembers());
$("prevBtn").onclick = () => state.page > 1 && ((state.page--), loadMembers());
$("nextBtn").onclick = () => ((state.page++), loadMembers());

// ---- create member ---------------------------------------------------------
$("newBtn").onclick = () => {
  $("modalCard").innerHTML = `
    <h2>New member</h2>
    <div class="field"><label>Name</label><input id="nmName" /></div>
    <div class="field"><label>Phone</label><input id="nmPhone" /></div>
    <div class="field"><label>Email (optional)</label><input id="nmEmail" /></div>
    <p class="err" id="nmErr"></p>
    <div class="row"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" id="nmSave">Create</button></div>`;
  openModal();
  $("nmSave").onclick = async () => {
    try {
      await api("/members", {
        method: "POST",
        body: JSON.stringify({
          name: $("nmName").value.trim(),
          phone: $("nmPhone").value.trim(),
          email: $("nmEmail").value.trim() || null,
        }),
      });
      closeModal();
      loadMembers();
    } catch (e) {
      $("nmErr").textContent = e.message;
    }
  };
};

// ---- member detail ---------------------------------------------------------
async function openMember(id) {
  const m = await api(`/members/${id}`);
  const nextTier = m.tier === "Bronze" ? "Silver (500)" : m.tier === "Silver" ? "Gold (2000)" : "Max tier";
  $("modalCard").innerHTML = `
    <button class="close" onclick="closeModal()">✕</button>
    <div class="detail-head">
      <div><h2>${esc(m.name)}</h2><div class="muted">${esc(m.phone)}${m.email ? " · " + esc(m.email) : ""}</div></div>
      <span class="tier-badge ${m.tier.toLowerCase()} big">${m.tier}</span>
    </div>
    <div class="stats">
      <div class="stat"><span>${m.lifetime_points}</span>Lifetime</div>
      <div class="stat"><span>${m.balance_points}</span>Balance</div>
      <div class="stat"><span>${nextTier}</span>Next tier</div>
    </div>
    <div class="action-grid">
      <div class="box">
        <h3>Record purchase</h3>
        <input id="buyAmt" type="number" placeholder="Amount ₹" />
        <button class="btn btn-primary" id="buyBtn">Add purchase</button>
      </div>
      <div class="box">
        <h3>Redeem points</h3>
        <input id="redAmt" type="number" step="100" placeholder="Points (×100)" />
        <button class="btn btn-primary" id="redBtn">Redeem</button>
      </div>
    </div>
    <p class="err" id="detErr"></p>
    <h3 class="hist-h">History</h3>
    <div class="history">${
      m.transactions.length
        ? m.transactions
            .map(
              (t) => `<div class="hrow">
        <span class="tag ${t.type}">${t.type}</span>
        <span>${t.type === "purchase" ? "₹" + t.amount : "₹" + t.amount + " off"}</span>
        <span class="${t.points_delta >= 0 ? "pos" : "neg"}">${t.points_delta >= 0 ? "+" : ""}${t.points_delta} pts</span>
        <span class="muted">${t.created_at}</span></div>`
            )
            .join("")
        : '<div class="muted">No transactions yet</div>'
    }</div>`;
  openModal();

  $("buyBtn").onclick = async () => {
    try {
      const r = await api(`/members/${id}/purchase`, {
        method: "POST",
        body: JSON.stringify({ amount: Number($("buyAmt").value) }),
      });
      openMember(id);
      loadMembers();
      flash(`+${r.pointsEarned} points awarded`);
    } catch (e) {
      $("detErr").textContent = e.message;
    }
  };
  $("redBtn").onclick = async () => {
    try {
      const r = await api(`/members/${id}/redeem`, {
        method: "POST",
        body: JSON.stringify({ points: Number($("redAmt").value) }),
      });
      openMember(id);
      loadMembers();
      flash(`Redeemed ${r.pointsRedeemed} pts → ₹${r.discountValue} off`);
    } catch (e) {
      $("detErr").textContent = e.message;
    }
  };
}

// ---- modal + utils ---------------------------------------------------------
function openModal() { $("modal").classList.remove("hidden"); }
function closeModal() { $("modal").classList.add("hidden"); }
window.closeModal = closeModal;
$("modal").onclick = (e) => e.target === $("modal") && closeModal();

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function flash(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// ---- boot ------------------------------------------------------------------
if (token && staff) showApp();
else setTab("login");
