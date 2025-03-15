// backend/src/sales/SalesModel.js
const mongoose = require('mongoose');

const SalesActivitySchema = new mongoose.Schema({
  doctorName: { type: String, required: true },
  salesRep: { type: String, required: true },
  callNotes: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  dateTime: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('SalesActivity', SalesActivitySchema);
