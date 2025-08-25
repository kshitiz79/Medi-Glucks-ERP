// models/State.js
const mongoose = require('mongoose');

const stateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'State name is required'],
    trim: true,
    unique: true
  },
  code: {
    type: String,
    required: [true, 'State code is required'],
    trim: true,
    uppercase: true,
    unique: true,
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
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient queries
stateSchema.index({ name: 1, isActive: 1 });
// Note: code field already has unique: true which creates an index automatically

module.exports = mongoose.model('State', stateSchema);