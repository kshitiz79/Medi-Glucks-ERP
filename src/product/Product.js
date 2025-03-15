// backend/models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  dosage: { type: String, required: true },
  brochure_url: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);