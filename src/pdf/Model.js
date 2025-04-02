// backend/src/pdf/PdfFile.js
const mongoose = require('mongoose');

const pdfFileSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    fileUrl: { type: String, required: true }, // We'll store a signed URL or a reference URL
    fileKey: { type: String, required: true },
    type: {
      type: String,
      enum: ['pdf', 'brochure'],
      default: 'pdf',
      required: true,
    }, 
  },
  

  { timestamps: true }
);

module.exports = mongoose.model('PdfFile', pdfFileSchema);
