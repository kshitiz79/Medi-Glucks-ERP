// models/masterModels.js
const mongoose = require('mongoose');

// Import existing models to avoid duplication
const HeadOffice = require('../headoffice/Model');
const State = require('../state/State');

// Branch Schema
const branchSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  code: { 
    type: String, 
    required: true, 
    unique: true,
    uppercase: true,
    trim: true
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Department Schema
const departmentSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  code: { 
    type: String, 
    required: true, 
    unique: true,
    uppercase: true,
    trim: true
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Employment Type Schema
const employmentTypeSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  code: { 
    type: String, 
    required: true, 
    unique: true,
    uppercase: true,
    trim: true
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Note: HeadOffice and State schemas are imported from their respective model files
// to avoid duplication and model overwrite errors

// Export all models - use existing models to avoid overwrite errors
const Branch = mongoose.models.Branch || mongoose.model('Branch', branchSchema);
const Department = mongoose.models.Department || mongoose.model('Department', departmentSchema);
const EmploymentType = mongoose.models.EmploymentType || mongoose.model('EmploymentType', employmentTypeSchema);

module.exports = {
  Branch,
  Department,
  EmploymentType,
  HeadOffice, // Imported from ../headoffice/Model
  State       // Imported from ../state/Model
};