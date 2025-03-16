const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialization: { type: String, required: true },
  location: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  registration_number: { type: String, required: true, unique: true },
  years_of_experience: { type: Number, required: true },
  date_of_birth: { type: Date },
  gender: { type: String, required: true },
  anniversary: { type: Date },
  headOffice: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'HeadOffice', 
    required: true 
  },
  visit_history: [{
    date: { type: Date, required: true },
    notes: { type: String },
    confirmed: { type: Boolean, default: false },
    // The user (sales rep) who scheduled the visit
    salesRep: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // New field to store the user’s name who scheduled the visit
    userName: { type: String }
  }],
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema);
