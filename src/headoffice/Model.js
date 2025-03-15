// models/HeadOffice.js
const mongoose = require('mongoose');

const headOfficeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    // Additional fields can be added here as needed
  },
  { timestamps: true }
);

module.exports = mongoose.model('HeadOffice', headOfficeSchema);
