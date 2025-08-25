const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary'); 
const Product = require('./Product'); 


const storage = multer.memoryStorage();
const upload = multer({ storage });


router.post('/', upload.single('image'), async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.name || req.body.name.trim() === '') {
      return res.status(400).json({ message: 'Product name is required' });
    }

    let imageUrl = '';
    if (req.file) {
      try {
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream((error, result) => {
            if (error) return reject(error);
            resolve(result);
          });
          uploadStream.end(req.file.buffer);
        });
        imageUrl = result.secure_url;
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        // Continue without image if upload fails
      }
    }

    const productData = {
      name: req.body.name.trim(),
      salt: req.body.salt ? req.body.salt.trim() : '',
      description: req.body.description ? req.body.description.trim() : '',
      dosage: req.body.dosage ? req.body.dosage.trim() : '',
      image: imageUrl, // Save Cloudinary URL or empty string
    };

    const product = new Product(productData);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    console.error('Product creation error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


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

// UPDATE product
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Validate required fields
    if (!req.body.name || req.body.name.trim() === '') {
      return res.status(400).json({ message: 'Product name is required' });
    }

    let imageUrl = product.image; // Keep existing image by default
    
    if (req.file) {
      try {
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream((error, result) => {
            if (error) return reject(error);
            resolve(result);
          });
          uploadStream.end(req.file.buffer);
        });
        imageUrl = result.secure_url;
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        return res.status(400).json({ message: 'Image upload failed' });
      }
    }

    const updatedData = {
      name: req.body.name.trim(),
      salt: req.body.salt ? req.body.salt.trim() : '',
      description: req.body.description ? req.body.description.trim() : '',
      dosage: req.body.dosage ? req.body.dosage.trim() : '',
      image: imageUrl,
    };

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true, runValidators: true }
    );

    res.json(updatedProduct);
  } catch (error) {
    console.error('Product update error:', error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE product
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Product deletion error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Simple test route for adding products with just name
router.post('/simple', async (req, res) => {
  try {
    console.log('Simple product creation request:', req.body);
    
    if (!req.body.name || req.body.name.trim() === '') {
      return res.status(400).json({ message: 'Product name is required' });
    }

    const productData = {
      name: req.body.name.trim(),
      salt: req.body.salt || '',
      description: req.body.description || '',
      dosage: req.body.dosage || '',
      image: '',
    };

    const product = new Product(productData);
    await product.save();
    
    console.log('Product created successfully:', product);
    res.status(201).json(product);
  } catch (error) {
    console.error('Simple product creation error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
