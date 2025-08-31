// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // ONLY REQUIRED FIELDS FOR SUBMISSION
  employeeCode: {
    type: String,
    required: [true, 'Employee Code is required'],
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Full Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email Address is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  mobileNumber: {
    type: String,
    required: [true, 'Mobile Number is required'],
    trim: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female'],
    required: [true, 'Gender is required']
  },
  role: {
    type: String,
    enum: [
      'Super Admin',
      'Admin',
      'Opps Team', 
      'National Head',
      'State Head',
      'Zonal Manager',
      'Area Manager',
      'Manager',
      'User'
    ],
    required: [true, 'Role is required']
  },

  // HEAD OFFICE - Optional for simplified creation, admin can assign later
  headOffice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HeadOffice'
  },

  // Multiple head offices for roles that support it
  headOffices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HeadOffice'
  }],

  // OPTIONAL REFERENCES - Not required for initial submission but can be filled by admin later
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  designation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Designation'
  },
  employmentType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmploymentType'
  },
  state: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'State'
  },
  
  manager: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Role-specific relationships
  managers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  areaManagers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // OPTIONAL EMPLOYMENT DETAILS
  salaryType: {
    type: String,
    enum: ['Monthly', 'Yearly'],
    default: 'Monthly'
  },
  salaryAmount: {
    type: Number
  },
  address: {
    type: String
  },
  dateOfBirth: {
    type: Date
  },
  dateOfJoining: {
    type: Date
  },

  // OPTIONAL BANK DETAILS
  bankDetails: {
    bankName: { type: String },
    branchName: { type: String },
    accountNo: { type: String },
    ifscCode: { type: String }
  },

  // OPTIONAL LEGAL DOCUMENTS - Cloudinary URLs
  legalDocuments: {
    aadharCard: { type: String }, // Cloudinary URL
    panCard: { type: String }, // Cloudinary URL
    drivingLicense: { type: String }, // Cloudinary URL - Optional
    passportPhoto: { type: String } // Cloudinary URL
  },

  // OPTIONAL EMERGENCY CONTACT
  emergencyContact: {
    contactNumber: { type: String },
    contactPersonName: { type: String },
    relation: { type: String },
    address: { type: String }
  },

  // OPTIONAL REFERENCE
  reference: {
    name: { type: String },
    contactNumber: { type: String }
  },

  // STATUS
  isActive: {
    type: Boolean,
    default: true
  },

  // EMAIL VERIFICATION FIELDS
  otp: {
    type: String,
    default: null
  },
  otpExpire: {
    type: Date,
    default: null
  },
  emailVerified: {
    type: Boolean,
    default: false // Will be set to true for admin-created accounts
  },
  emailVerifiedAt: {
    type: Date,
    default: null
  },
  pin: {
    type: String,
    default: null
  },
  pinExpire: {
    type: Date,
    default: null
  },

  // AUDIT FIELDS
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { 
  timestamps: true 
});

// Pre-save middleware to hash passwords
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Custom validation for role-specific requirements - Only validate if fields are being set
userSchema.pre('validate', function(next) {
  // Skip validation for initial creation - admin can complete later
  if (this.isNew && this.role) {
    // Only validate if the role-specific fields are actually being set
    // This allows admin to create basic user first, then complete profile later
    
    // State Head validation - only if state field is being modified
    if (this.role === 'State Head' && this.isModified('state') && !this.state) {
      return next(new Error('State Head role requires state assignment'));
    }
    
    // Area Manager validation - only if managers field is being modified
    if (this.role === 'Area Manager' && this.isModified('managers') && (!this.managers || this.managers.length === 0)) {
      return next(new Error('Area Manager role requires at least one Manager assignment'));
    }
    
    // Zonal Manager validation - only if areaManagers field is being modified
    if (this.role === 'Zonal Manager' && this.isModified('areaManagers') && (!this.areaManagers || this.areaManagers.length === 0)) {
      return next(new Error('Zonal Manager role requires at least one Area Manager assignment'));
    }
  }
  
  next();
});

module.exports = mongoose.model('User', userSchema);