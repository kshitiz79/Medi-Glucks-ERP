// backend/models/Expense.js
const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected'], 
    default: 'Pending' 
  },
  date: { type: Date, default: Date.now },
  receipt_url: { type: String }, // Optional: URL to uploaded receipt
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);