const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary'); // Adjust path if needed
const Product = require('./Product'); // Adjust path if needed

// Use memory storage so files are kept in memory (not saved locally)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// @route   POST /api/products
// @desc    Create a new product with image upload to Cloudinary
router.post('/', upload.single('image'), async (req, res) => {
  try {
    let imageUrl = '';
    if (req.file) {
      // Upload the file buffer to Cloudinary using an upload stream
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream((error, result) => {
          if (error) return reject(error);
          resolve(result);
        });
        uploadStream.end(req.file.buffer);
      });
      imageUrl = result.secure_url;
    }

    // Ensure imageUrl is provided
    if (!imageUrl) {
      return res.status(400).json({ message: 'Image upload failed' });
    }

    const productData = {
      name: req.body.name,
      salt: req.body.salt,
      description: req.body.description,
      dosage: req.body.dosage,
      image: imageUrl, // Save Cloudinary URL
    };

    const product = new Product(productData);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/products
// @desc    Retrieve all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/products/:id
// @desc    Retrieve a single product by its ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
