const mongoose = require('mongoose');

const travelLegSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to:   { type: String, required: true },
  km:   { type: Number, required: true, min: 0 },
}, { _id: false });

const expenseSchema = new mongoose.Schema({
  user:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName:        { type: String, required: true },
  category:        { type: String, enum: ['travel', 'daily'], required: true },
  description:     { type: String },
  bill:            { type: String },
  status:          { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  date:            { type: Date, default: Date.now },
  // travel-specific
  travelDetails:   [travelLegSchema],
  ratePerKm:       { type: Number, default: 2.40 },
  totalDistanceKm: { type: Number, default: 0 },
  // daily-specific
  dailyAllowanceType: { type: String, enum: ['headoffice', 'outside'] },
  // amount saved for reporting
  amount:          { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);