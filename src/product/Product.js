const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  salt: { type: String, required: true },
  description: { type: String, required: true },
  dosage: { type: String, required: true },
  image: { type: String, required: true }, 
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
