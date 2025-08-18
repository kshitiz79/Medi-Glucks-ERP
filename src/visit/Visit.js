const mongoose = require('mongoose');

// Ensure Product model is loaded
require('../product/Product');

const visitSchema = new mongoose.Schema({
  // Visit Information
  representativeName: { type: String, required: true },
  representativeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  areaTerritory: { type: String, required: false },
  visitedWithCoworker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  
  // Doctor Details
  doctorChemistName: { type: String, required: false },
  specialisation: { type: String, required: false },
  totalNumberOfVisits: { type: Number, default: 1, required: false },
  purposeOfVisit: { type: String, required: false },
  
  // Discussion & Products
  productsPromoted: { 
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], 
    default: [],
    required: false 
  },
  keyDiscussionPoints: { type: String, required: false },
  doctorInterestLevel: { type: String, required: false },
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