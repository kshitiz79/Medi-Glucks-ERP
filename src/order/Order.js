// backend/models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  salesRep_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product_details: [{
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
  }],
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Delivered'], 
    default: 'Pending' 
  },
  created_at: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);