const mongoose = require('mongoose');

const stockistSchema = new mongoose.Schema({
  firmName: { type: String, required: true },
  registeredBusinessName: { type: String },
  natureOfBusiness: {
    type: String,
    enum: ['Proprietorship', 'Partnership', 'Private Ltd.', 'Public Ltd.'],
    required: true,
  },
  gstNumber: { type: String, unique: true },
  drugLicenseNumber: { type: String, unique: true },
  panNumber: { type: String, unique: true },
  registeredOfficeAddress: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  contactPerson: { type: String },
  designation: { type: String },
  mobileNumber: { type: String, required: true },
  emailAddress: { type: String, unique: true },
  website: { type: String },
  yearsInBusiness: { type: Number },
  areasOfOperation: { type: [String] },
  currentPharmaDistributorships: { type: [String] },
  annualTurnover: [
    {
      year: { type: Number },
      amount: { type: Number },
    },
  ],
  warehouseFacility: { type: Boolean, default: false },
  storageFacilitySize: { type: Number },
  coldStorageAvailable: { type: Boolean, default: false },
  numberOfSalesRepresentatives: { type: Number },
  bankDetails: {
    bankName: { type: String },
    branch: { type: String },
    accountNumber: { type: String },
    ifscCode: { type: String },
  },
  headOffice: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'HeadOffice', 
    required: true 
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Stockist', stockistSchema);