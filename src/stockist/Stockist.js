const mongoose = require('mongoose');

const stockistSchema = new mongoose.Schema({
  firmName: { type: String, required: true },
  registeredBusinessName: { type: String , required: true },
  natureOfBusiness: {
    type: String,
    enum: ['Proprietorship', 'Partnership', 'Private Ltd.', 'Public Ltd.'],
    required: true,
  },
  gstNumber: { type: String },
  drugLicenseNumber: { type: String },
  panNumber: { type: String },
  registeredOfficeAddress: { type: String  , required: true},
  latitude: { type: Number },
  longitude: { type: Number },
  contactPerson: { type: String  , required: true},
  designation: { type: String },
  mobileNumber: { type: String },
  emailAddress: { type: String },
  website: { type: String },
  yearsInBusiness: { type: Number , required: true },
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