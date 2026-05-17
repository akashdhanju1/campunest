// ─────────────────────────────────────────────────────────
// CampusNest — Frontend API connector
// Save this as: frontend/api.js
// Add to index.html: <script src="api.js"></script>
// ─────────────────────────────────────────────────────────

const API_URL = 'http://localhost:3000/api';  // change to your live URL after deployment

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

async function loadListingsOnPage() {
  const result = await fetchListings();
  const grid   = document.getElementById('listingsGrid');
  if (!grid || !result.listings) return;

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