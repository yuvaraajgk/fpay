import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

// Register a new user — one email = one account (name/business cannot duplicate under another signup)
export const register = async (req, res) => {
  try {
    const { name, password, businessName, logoUrl } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({ message: 'A valid email is required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message:
          'This email is already registered. Each email can have only one account. Sign in with that email or use a different address.'
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await User.create({
      name: name?.trim(),
      email,
      password: hashedPassword,
      businessName: (businessName || '').trim(),
      logoUrl: logoUrl || ''
    });

    // Generate JWT token (expires in 7 days)
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data (without password) and token
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
        logoUrl: user.logoUrl
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        message:
          'This email is already registered. Each email can have only one account. Sign in with that email or use a different address.'
      });
    }
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { password } = req.body;
    const email = normalizeEmail(req.body.email);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Compare password with hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token (expires in 7 days)
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data (without password) and token
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
        logoUrl: user.logoUrl
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};
