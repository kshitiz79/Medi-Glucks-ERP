// src/models/StockistVisit.js
const mongoose = require('mongoose');

const stockistVisitSchema = new mongoose.Schema({
  stockist: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Stockist', 
    required: true 
  },
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  date: { type: Date, required: true },
  notes: { type: String, required: true },
  confirmed: { type: Boolean, default: false },
  latitude: { type: Number },
  longitude: { type: Number },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('StockistVisit', stockistVisitSchema);