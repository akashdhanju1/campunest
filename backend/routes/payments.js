const express  = require('express');
const router   = express.Router();
const Razorpay = require('razorpay');
const crypto   = require('crypto');
const supabase = require('../supabaseClient');

// Razorpay loads only when payment is actually made
function getRazorpay() {
  return new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID || 'placeholder',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder'
  });
}


// ── CREATE ORDER ──────────────────────────────────────────
// POST /api/payments/create-order
// Body: { listing_id, plan }   plan = "basic"(100) | "featured"(200)
router.post('/create-order', async (req, res) => {
  const { listing_id, plan } = req.body;

  const amount = plan === 'featured' ? 200 : 100; // in rupees

  const options = {
    amount:   amount * 100,      // Razorpay uses paise (multiply by 100)
    currency: 'INR',
    receipt: `lst_${listing_id.slice(0, 30)}`,
    notes: {
      listing_id,
      plan
    }
  };

  try {
    const order = await getRazorpay().orders.create(options);

    // Save order in DB
    await supabase.from('payments').insert([{
      listing_id,
      razorpay_order_id: order.id,
      amount,
      plan,
      status: 'pending'
    }]);

    res.json({
      order_id:  order.id,
      amount:    order.amount,
      currency:  order.currency,
      key_id:    process.env.RAZORPAY_KEY_ID
    });
} catch (err) {
    console.log('Razorpay error:', err);
    res.status(500).json({ error: err.message, details: err });
  }
  }
);


// ── VERIFY PAYMENT ────────────────────────────────────────
// POST /api/payments/verify
// Body: { razorpay_order_id, razorpay_payment_id,
//         razorpay_signature, listing_id }
router.post('/verify', async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    listing_id
  } = req.body;

  // Step 1: Verify signature (security check)
  const body      = razorpay_order_id + '|' + razorpay_payment_id;
  const expected  = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expected !== razorpay_signature) {
    return res.status(400).json({ error: 'Payment verification failed' });
  }

  // Step 2: Mark payment as successful in DB
  await supabase
    .from('payments')
    .update({ status: 'paid', razorpay_payment_id })
    .eq('razorpay_order_id', razorpay_order_id);

  // Step 3: Activate the listing
  await supabase
    .from('listings')
    .update({ is_active: true })
    .eq('id', listing_id);

  res.json({ message: 'Payment successful! Your listing is now live 🎉' });
});


module.exports = router;