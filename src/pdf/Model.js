// backend/src/pdf/PdfFile.js
const mongoose = require('mongoose');

const pdfFileSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    fileUrl: { type: String, required: true }, // We'll store a signed URL or a reference URL
    fileKey: { type: String, required: true }, // The S3 object key (e.g., '123123_myfile.pdf')
  },
  { timestamps: true }
);

module.exports = mongoose.model('PdfFile', pdfFileSchema);
