const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes    = require('./routes/auth');
const listingRoutes = require('./routes/listings');
const paymentRoutes = require('./routes/payments');
const uploadRoutes  = require('./routes/upload');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth',     authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/upload',   uploadRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'CampusNest API is running ✅' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});