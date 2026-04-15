import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  businessName: {
    type: String,
    trim: true,
    default: ''
  },
  logoUrl: {
    type: String,
    default: ''
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

export default mongoose.model('User', userSchema);
