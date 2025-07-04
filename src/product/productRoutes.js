const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary'); 
const Product = require('./Product'); 


const storage = multer.memoryStorage();
const upload = multer({ storage });


router.post('/', upload.single('image'), async (req, res) => {
  try {
    let imageUrl = '';
    if (req.file) {

      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream((error, result) => {
          if (error) return reject(error);
          resolve(result);
        });
        uploadStream.end(req.file.buffer);
      });
      imageUrl = result.secure_url;
    }


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

module.exports = router;
