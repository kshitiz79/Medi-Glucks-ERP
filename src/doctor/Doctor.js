// models/Doctor.js

const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  name:                    { type: String, required: true },
  specialization:          { type: String },
  location:                { type: String },
  latitude:                { type: Number },
  longitude:               { type: Number },
  email:                   { type: String },
  phone:                   { type: String },
  registration_number:     { type: String },       // no unique: true any more
  years_of_experience:     { type: Number },
  date_of_birth:           { type: Date },
  gender:                  { type: String },
  anniversary:             { type: Date },

  headOffice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HeadOffice',
    required: true
  },

  visit_history: [{
    date:      { type: Date,   required: true },
    notes:     { type: String },
    confirmed: { type: Boolean, default: false },
    salesRep:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName:  { type: String }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Doctor', doctorSchema);
