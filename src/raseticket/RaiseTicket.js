const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Removed required: true
  userName: { type: String },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);