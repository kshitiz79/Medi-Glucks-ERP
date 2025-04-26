// src/models/ChemistVisit.js
const mongoose = require('mongoose');

const chemistVisitSchema = new mongoose.Schema({
  chemist: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Chemist', 
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
  latitude: { type: Number }, // Stored when confirmed
  longitude: { type: Number }, // Stored when confirmed
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ChemistVisit', chemistVisitSchema);