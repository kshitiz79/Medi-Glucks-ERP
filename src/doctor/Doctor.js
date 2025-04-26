const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialization: { type: String, required: true },
  location: { type: String }, // Keep this for address string
  latitude: { type: Number }, // New field for latitude
  longitude: { type: Number }, // New field for longitude
  email: { type: String },
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
    salesRep: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String }
  }],
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema);