// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  expenses: { type: String },
  role: { 
    type: String, 
    enum: ['Admin', 'User'], // Only Admin and User roles
    required: true 
  },
  phone: { type: String },
  headOffice: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'HeadOffice' // assuming your head office model is named 'HeadOffice'
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
