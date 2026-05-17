const express = require('express');
const router  = express.Router();
const supabase = require('../supabaseClient');

// ── SIGN UP ───────────────────────────────────────────────
// POST /api/auth/signup
// Body: { name, phone, password, role }   role = "student" | "owner"
router.post('/signup', async (req, res) => {
  const { name, phone, password, role } = req.body;

  if (!name || !phone || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Check if phone already exists
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('phone', phone)
    .single();

  if (existing) {
    return res.status(400).json({ error: 'Phone number already registered' });
  }

  // Insert new user
  const { data, error } = await supabase
    .from('users')
    .insert([{ name, phone, password, role }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.status(201).json({
    message: 'Account created successfully',
    user: { id: data.id, name: data.name, phone: data.phone, role: data.role }
  });
});


// ── LOGIN ─────────────────────────────────────────────────
// POST /api/auth/login
// Body: { phone, password }
router.post('/login', async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ error: 'Phone and password required' });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('phone', phone)
    .eq('password', password)
    .single();

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid phone or password' });
  }

  res.json({
    message: 'Login successful',
    user: { id: user.id, name: user.name, phone: user.phone, role: user.role }
  });
});


module.exports = router;