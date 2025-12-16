const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Manager = require('../models/Manager');
const Staff = require('../models/Staff');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get role-specific model
const getRoleModel = (role) => {
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
  body('user_name').trim().notEmpty().withMessage('Username is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['Admin', 'Manager', 'Staff']).withMessage('Invalid role')
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, user_name, password, role, department } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ user_name: user_name.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this username' });
    }

    // Create base user (password will be hashed by User model pre-save hook)
    const user = new User({
      user_name: user_name.toLowerCase(),
      password: password,
      role,
      status: 'Active'
    });
    await user.save();

    // Create role-specific record
    const RoleModel = getRoleModel(role);
    let roleRecord;
    
    if (role === 'Admin') {
      roleRecord = new Admin({ aid: user._id, name });
    } else if (role === 'Manager') {
      roleRecord = new Manager({ mid: user._id, name, department: department || 'General' });
    } else if (role === 'Staff') {
      roleRecord = new Staff({ sid: user._id, name, department: department || 'General' });
    }
    
    await roleRecord.save();

    // Generate token
    const token = generateToken(user._id, role);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: name,
        user_name: user.user_name,
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
    const user = await User.findOne({ user_name: username.toLowerCase(), role });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (user.status !== 'Active') {
      return res.status(401).json({ message: 'Account is inactive. Please contact administrator.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Get role-specific data
    const RoleModel = getRoleModel(role);
    let roleRecord;
    
    if (role === 'Admin') {
      roleRecord = await Admin.findOne({ aid: user._id });
    } else if (role === 'Manager') {
      roleRecord = await Manager.findOne({ mid: user._id });
    } else if (role === 'Staff') {
      roleRecord = await Staff.findOne({ sid: user._id });
    }

    // Generate token
    const token = generateToken(user._id, role);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: roleRecord?.name || user.user_name,
        user_name: user.user_name,
        role: role,
        department: roleRecord?.department,
        mustChangePassword: user.mustChangePassword || false
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

    // Get user from User collection
    const user = await User.findById(req.user._id);
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Update password (pre-save hook will hash it)
    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/force-change-password
// @desc    Force change password on first login (no current password required)
// @access  Private
router.post('/force-change-password', auth, [
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { newPassword } = req.body;

    // Get user from User collection
    const user = await User.findById(req.user._id);
    
    // Verify user must change password
    if (!user.mustChangePassword) {
      return res.status(400).json({ message: 'Password change not required. Use regular change password endpoint.' });
    }

    // Update password (pre-save hook will hash it)
    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Force change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
