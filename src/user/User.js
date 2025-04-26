// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  expenses: { type: String }, // Consider changing to Number or Array if appropriate
  role: { 
    type: String, 
    enum: [
    
   
      'Super Admin', 
      'Admin', 
      'Opps Team', 
      'National Head', 
      'State Head', 
      'Zonal Manager', 
      'Area Manager', 
      'Manager',
      'User'
    ],
    required: true 
  },
  phone: { type: String },
  headOffice: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'HeadOffice' 
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
