const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Manager = require('../models/Manager');
const Staff = require('../models/Staff');

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

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user in the role-specific collection
    const UserModel = getUserModel(decoded.role);
    
    if (!UserModel) {
      return res.status(401).json({ message: 'Invalid role in token' });
    }

    const user = await UserModel.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (user.status !== 'Active') {
      return res.status(401).json({ message: 'User account is inactive' });
    }

    // Add role to user object
    req.user = { ...user.toObject(), role: decoded.role };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.' 
      });
    }
    next();
  };
};

module.exports = { auth, authorize };
