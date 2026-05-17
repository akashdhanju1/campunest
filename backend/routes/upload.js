const express     = require('express');
const router      = express.Router();
const cloudinary  = require('cloudinary').v2;
const multer      = require('multer');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer stores image in memory temporarily
const storage = multer.memoryStorage();
const upload  = multer({ storage });

// ── UPLOAD IMAGE ──────────────────────────────────────────
// POST /api/upload
// Form data: { image: file }
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'campusnest' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    res.json({
      message:   'Image uploaded successfully ✅',
      image_url: result.secure_url
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;