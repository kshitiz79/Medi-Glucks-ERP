// models/State.js
const mongoose = require('mongoose');

const stateSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    unique: true,
    trim: true
  },
  code: { 
    type: String, 
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: 3
  },
  country: {
    type: String,
    default: 'India',
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true 
});

// Index for better performance
stateSchema.index({ name: 1 });
stateSchema.index({ code: 1 });

module.exports = mongoose.model('State', stateSchema);