// ─────────────────────────────────────────────────────────
// CampusNest — Frontend API connector
// Save this as: frontend/api.js
// Add to index.html: <script src="api.js"></script>
// ─────────────────────────────────────────────────────────

const API_URL = 'https://campunest.onrender.com/api';  // change to your live URL after deployment

// ── AUTH ─────────────────────────────────────────────────

async function signupUser(name, phone, password, role) {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, password, role })
  });
  return res.json();
}

async function loginUser(phone, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password })
  });
  return res.json();
}


// ── LISTINGS ──────────────────────────────────────────────

async function fetchListings(type = '', max_price = '') {
  let url = `${API_URL}/listings?`;
  if (type)      url += `type=${type}&`;
  if (max_price) url += `max_price=${max_price}`;

  const res = await fetch(url);
  return res.json();   // returns { listings: [...] }
}

async function addListing(listingData) {
  const res = await fetch(`${API_URL}/listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(listingData)
  });
  return res.json();   // returns { listing: { id, ... } }
}


// ── PAYMENTS ─────────────────────────────────────────────

async function startPayment(listing_id, plan, ownerName) {
  // Step 1: Create Razorpay order from backend
  const res  = await fetch(`${API_URL}/payments/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listing_id, plan })
  });
  const data = await res.json();

  // Step 2: Open Razorpay checkout popup
  const options = {
    key:         data.key_id,
    amount:      data.amount,
    currency:    data.currency,
    name:        'CampusNest',
    description: `${plan === 'featured' ? 'Featured' : 'Basic'} Listing Fee`,
    order_id:    data.order_id,
    prefill: { name: ownerName },
    theme: { color: '#1a6b4a' },

    handler: async function(response) {
      // Step 3: Verify payment on backend
      const verify = await fetch(`${API_URL}/payments/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id:   response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature:  response.razorpay_signature,
          listing_id
        })
      });
      const result = await verify.json();
      alert(result.message);         // show success message
      window.location.reload();      // reload to show live listing
    }
  };

  const rzp = new window.Razorpay(options);
  rzp.open();
}


// ── HELPER: Load listings into the page ──────────────────

// ── HELPER: Load real listings into the page ──────────────

let realListings = [];

async function loadListingsOnPage(filter = 'all') {
  const result = await fetchListings(filter === 'all' ? '' : filter);
  const grid = document.getElementById('listingsGrid');
  if (!grid) return;

  if (!result.listings || result.listings.length === 0) {
    grid.innerHTML = `<div style="text-align:center;padding:3rem;color:#888;grid-column:1/-1">No listings found</div>`;
    return;
  }

  grid.innerHTML = result.listings.map(l => `
    <div class="listing-card">
      <div class="card-image">
        ${l.image_url
          ? `<img src="${l.image_url}" alt="${l.title}">`
          : `<div style="background:#e8f0ec;height:200px;display:flex;align-items:center;justify-content:center;color:#aaa">No photo yet</div>`}
        <div class="card-badge ${l.type === 'pg' ? 'pg' : l.type === 'hostel' ? 'hostel' : ''}">${l.type.toUpperCase()}</div>
        ${l.is_verified ? '<div class="verified-badge">✓ Verified</div>' : ''}
      </div>
      <div class="card-body">
        <div class="card-price">₹${l.price.toLocaleString()} <span>/ month</span></div>
        <div class="card-title">${l.title}</div>
        <div class="card-location">📍 ${l.area}, ${l.city}</div>
        <div class="card-features">
          ${(l.features || []).map(f => `<span class="feature-tag">${f}</span>`).join('')}
        </div>
        <div class="card-footer">
          <div class="owner-info">
            <div class="owner-avatar">${l.owner_name.slice(0,2).toUpperCase()}</div>
            <span class="owner-name">${l.owner_name}</span>
          </div>
          <button class="card-contact-btn" onclick="revealContact('${l.owner_phone}')">Contact</button>
        </div>
      </div>
    </div>
  `).join('');
}


function revealContact(phone) {
  const user = JSON.parse(localStorage.getItem('campusnest_user') || 'null');
  if (!user) {
    alert('Please login to see contact details');
    return;
  }
  window.open(`https://wa.me/91${phone}`, '_blank');
}
// ── FORM HANDLERS ──────────────────────────────────────────

async function handleLogin() {
  const phone = document.getElementById('loginPhone').value;
  const password = document.getElementById('loginPassword').value;

  if (!phone || !password) {
    alert('Please enter phone and password');
    return;
  }

  const result = await loginUser(phone, password);

  if (result.error) {
    alert('❌ ' + result.error);
  } else {
    localStorage.setItem('campusnest_user', JSON.stringify(result.user));
    closeModal('login');
    showToast('✅ Logged in successfully!');
    renderNavAccount();
  }
}

async function handleSignup() {
  const name = document.getElementById('signupName').value;
  const phone = document.getElementById('signupPhone').value;
  const role = document.getElementById('signupRole').value;
  const password = document.getElementById('signupPassword').value;

  if (!name || !phone || !password) {
    alert('Please fill all fields');
    return;
  }

  const result = await signupUser(name, phone, password, role);

  if (result.error) {
    alert('❌ ' + result.error);
  } else {
    localStorage.setItem('campusnest_user', JSON.stringify(result.user));
    closeModal('signup');
    showToast('🎉 Account created! Welcome to CampusNest');
    renderNavAccount();
  }
}
// ── ACCOUNT UI STATE ──────────────────────────────────────

function renderNavAccount() {
  const nav = document.getElementById('navActions');
  const user = JSON.parse(localStorage.getItem('campusnest_user') || 'null');

  if (user) {
    const initials = user.name ? user.name.slice(0, 2).toUpperCase() : 'U';
    nav.innerHTML = `
      <div class="account-menu" style="position:relative;display:inline-block">
        <div onclick="toggleAccountDropdown()" style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:6px 12px;border-radius:8px;background:#f0f4f2">
          <div style="width:32px;height:32px;border-radius:50%;background:var(--brand,#1a6b4a);color:white;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px">${initials}</div>
          <span style="font-weight:500">${user.name}</span>
        </div>
        <div id="accountDropdown" style="display:none;position:absolute;right:0;top:48px;background:white;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.15);min-width:160px;overflow:hidden;z-index:100">
          <div style="padding:10px 16px;font-size:13px;color:#888;border-bottom:1px solid #eee">${user.phone || ''}</div>
          <div onclick="logoutUser()" style="padding:10px 16px;cursor:pointer;color:#c0392b" onmouseover="this.style.background='#f9f9f9'" onmouseout="this.style.background='white'">Logout</div>
        </div>
      </div>
    `;
  } else {
    nav.innerHTML = `
      <button class="btn btn-ghost" onclick="openModal('login')">Login</button>
      <button class="btn btn-primary" onclick="openModal('signup')">Sign Up Free</button>
    `;
  }
}

function toggleAccountDropdown() {
  const d = document.getElementById('accountDropdown');
  d.style.display = d.style.display === 'none' ? 'block' : 'none';
}

function logoutUser() {
  localStorage.removeItem('campusnest_user');
  showToast('Logged out successfully');
  renderNavAccount();
}

// Run on page load
document.addEventListener('DOMContentLoaded', renderNavAccount);