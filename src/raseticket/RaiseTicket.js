const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Removed required: true
  userName: { type: String },
  status: {
    type: String,
    enum: ['IN PROGRESS', 'RESOLVED', 'REJECTED', 'CLOSED'],
    default: 'IN PROGRESS', // Default status when the ticket is created
  },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);
