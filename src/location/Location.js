// src/location/Location.js
const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    // If you’re not using auth for this demo, you can leave this optional
    required: false 
  },
  userName: { 
    type: String 
  },
  latitude: { 
    type: Number, 
    required: true 
  },
  longitude: { 
    type: Number, 
    required: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Location', locationSchema);
