const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Manager = require('../models/Manager');
const Staff = require('../models/Staff');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get model based on role
const getUserModel = (role) => {
  switch(role) {
    case 'Admin':
      return Admin;
    case 'Manager':
      return Manager;
    case 'Staff':
      return Staff;
    default:
      return null;
  }
};

// Generate JWT Token
const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public (or Admin only in production)
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['Admin', 'Manager', 'Staff']).withMessage('Invalid role')
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, username, email, password, role, department, designation } = req.body;
    const UserModel = getUserModel(role);

    if (!UserModel) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Check if user exists in the specific role collection
    const existingUser = await UserModel.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email or username' });
    }

    // Create new user with role-specific data
    const userData = {
      name,
      username,
      email,
      password,
      ...(role === 'Manager' && { department }),
      ...(role === 'Staff' && { department, designation })
    };

    const user = new UserModel(userData);
    await user.save();

    // Generate token
    const token = generateToken(user._id, role);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  body('role').isIn(['Admin', 'Manager', 'Staff']).withMessage('Role is required')
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, role } = req.body;

    // Find user in base User collection
    const user = await User.findOne({ user_name: username.toLowerCase() });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if the user's role matches the requested role
    if (user.role !== role) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (user.status !== 'Active') {
      return res.status(401).json({ message: 'Account is inactive. Please contact administrator.' });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Get additional user details from role-specific collection
    const UserModel = getUserModel(role);
    let roleSpecificUser = null;
    
    if (UserModel) {
      if (role === 'Admin') {
        roleSpecificUser = await UserModel.findOne({ aid: user._id });
      } else if (role === 'Manager') {
        roleSpecificUser = await UserModel.findOne({ mid: user._id });
      } else if (role === 'Staff') {
        roleSpecificUser = await UserModel.findOne({ sid: user._id });
      }
    }

    // Generate token
    const token = generateToken(user._id, role);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: roleSpecificUser ? roleSpecificUser.name : user.user_name,
        username: user.user_name,
        email: user.email,
        role: role,
        department: roleSpecificUser?.department,
        designation: roleSpecificUser?.designation
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      user: req.user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', auth, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    // Get user from base User collection with password
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    user.mustChangePassword = false; // User has changed from default password
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
