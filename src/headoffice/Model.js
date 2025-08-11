// models/HeadOffice.js
const mongoose = require('mongoose');

const headOfficeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'State',
      required: false // Not compulsory as requested
    },
    pincode: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Index for better performance
headOfficeSchema.index({ name: 1 });
headOfficeSchema.index({ state: 1 });

module.exports = mongoose.model('HeadOffice', headOfficeSchema);
