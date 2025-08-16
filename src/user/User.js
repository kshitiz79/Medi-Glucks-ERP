// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  expenses: { type: String }, // Consider changing to Number or Array if appropriate
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
    required: true
  },
  pin: { type: String },
  phone: { type: String },
  emailVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpire: { type: Date },
  pinExpire: { type: Date },
  headOffice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HeadOffice',
    required: function () {
      // HeadOffice is only required for Manager and User roles
      const rolesWithoutHeadOffice = [
        'Super Admin',
        'Admin',
        'Opps Team',
        'National Head',
        'State Head',
        'Zonal Manager',
        'Area Manager'
      ];
      return !rolesWithoutHeadOffice.includes(this.role);
    }
  },
  // For Area Managers, they report to a Manager instead of HeadOffice
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function () {
      return false; // Not required anymore since Area Managers can have multiple managers
    }
  },
  // For Area Managers, they can report to multiple Managers
  managers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // For Zonal Managers, they manage Area Managers
  areaManagers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // For State Head role
  state: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'State',
    required: function () {
      return this.role === 'State Head';
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);