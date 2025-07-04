const mongoose = require('mongoose');

const expenseSettingsSchema = new mongoose.Schema({
  ratePerKm: { type: Number, default: 2.40, min: 0 },
  headOfficeAmount: { type: Number, default: 150, min: 0 },
  outsideHeadOfficeAmount: { type: Number, default: 175, min: 0 },
}, { timestamps: true });

module.exports = mongoose.model('ExpenseSettings', expenseSettingsSchema);