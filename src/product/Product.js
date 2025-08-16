const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  salt: { type: String, required: false },
  description: { type: String, required: false },
  dosage: { type: String, required: false },
  image: { type: String, required: false }, 
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
