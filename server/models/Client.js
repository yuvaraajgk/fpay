import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  freelancerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Freelancer ID is required'],
    index: true // Index for faster queries when filtering by freelancer
  },
  name: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Client email is required'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  company: {
    type: String,
    trim: true,
    default: ''
  },
  address: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Compound index: freelancerId + email for faster lookups
// This ensures a freelancer can't have duplicate client emails
clientSchema.index({ freelancerId: 1, email: 1 }, { unique: true });

export default mongoose.model('Client', clientSchema);


//This file defines the structure (schema) for storing client information in MongoDB, including fields like name, email, phone, company, and the freelancer who owns the client.It also adds validation rules and indexes to prevent duplicate client emails for the same freelancer and to improve database query performance.