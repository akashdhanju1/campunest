const express  = require('express');
const router   = express.Router();
const supabase = require('../supabaseClient');

// ── GET ALL LISTINGS ──────────────────────────────────────
// GET /api/listings
// Query params: ?type=flat&city=Ludhiana&max_price=8000
router.get('/', async (req, res) => {
  const { type, max_price } = req.query;

  let query = supabase
    .from('listings')
    .select('*')
    .eq('is_active', true)       // only approved/paid listings
    .order('created_at', { ascending: false });

  if (type)      query = query.eq('type', type);
  if (max_price) query = query.lte('price', parseInt(max_price));

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json({ listings: data });
});


// ── GET ONE LISTING ───────────────────────────────────────
// GET /api/listings/:id
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Listing not found' });

  res.json({ listing: data });
});


// ── ADD NEW LISTING ───────────────────────────────────────
// POST /api/listings
// Body: { owner_id, title, type, price, area, city, description,
//         features, owner_name, owner_phone }
router.post('/', async (req, res) => {
  const {
    owner_id, title, type, price,
    area, city, description,
    features, owner_name, owner_phone
  } = req.body;

  if (!owner_id || !title || !type || !price || !owner_phone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { data, error } = await supabase
    .from('listings')
    .insert([{
      owner_id,
      title,
      type,           // 'flat' | 'pg' | 'hostel' | 'room'
      price,
      area,
      city: city || 'Ludhiana',
      description,
      features,       // array e.g. ['WiFi', 'AC', 'Meals']
      owner_name,
      owner_phone,
      is_active: false,   // becomes true after payment
      is_verified: false  // admin verifies manually
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.status(201).json({
    message: 'Listing created. Complete payment to go live.',
    listing: data
  });
});


// ── ACTIVATE LISTING (called after payment success) ───────
// PATCH /api/listings/:id/activate
router.patch('/:id/activate', async (req, res) => {
  const { data, error } = await supabase
    .from('listings')
    .update({ is_active: true })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ message: 'Listing is now live ✅', listing: data });
});


// ── DELETE LISTING ────────────────────────────────────────
// DELETE /api/listings/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ message: 'Listing deleted' });
});


module.exports = router;