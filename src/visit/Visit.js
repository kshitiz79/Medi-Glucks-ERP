const mongoose = require('mongoose');

// Ensure Product model is loaded
require('../product/Product');

const visitSchema = new mongoose.Schema({
  // Visit Information
  dateOfVisit: { type: Date, required: true },
  dayOfWeek: { type: String, required: true },
  representativeName: { type: String, required: true },
  representativeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  areaTerritory: { type: String, required: true },
  visitedWithCoworker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  
  // Doctor Details
  doctorChemistName: { type: String, required: true },
  specialisation: { type: String, required: true },
  purposeOfVisit: { type: String, required: true },
  
  // Discussion & Products
  productsPromoted: { 
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], 
    default: [],
    required: false 
  },
  keyDiscussionPoints: { type: String, required: true },
  doctorInterestLevel: { type: String, required: true },
  doctorQueries: { type: String, required: false },
  expectedMonthlyVolume: { type: String, required: false },
  
  // Results & Follow-up
  productsAgreedToPrescribe: { 
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], 
    default: [],
    required: false 
  },
  productsNotAgreedToPrescribe: { 
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], 
    default: [],
    required: false 
  },
  actualOrdersSales: { type: String, required: false },
  followUpDate: { type: Date, required: false },
  
  // Market Analysis
  competitorBrands: { type: String, required: false },
  reasonsForPreferringCompetitor: { type: String, required: false },
  marketFeedback: { type: String, required: false },
  challengesFaced: { type: String, required: false },
  additionalNotes: { type: String, required: false },
  
  // Status
  status: { type: String, enum: ['draft', 'submitted', 'approved', 'rejected'], default: 'submitted' },
}, { timestamps: true });

// Populate references when querying
visitSchema.pre(/^find/, function(next) {
  this.populate('representativeId', 'name email role')
      .populate('visitedWithCoworker', 'name email role')
      .populate('productsPromoted', 'name description')
      .populate('productsAgreedToPrescribe', 'name description')
      .populate('productsNotAgreedToPrescribe', 'name description');
  next();
});

module.exports = mongoose.model('Visit', visitSchema);