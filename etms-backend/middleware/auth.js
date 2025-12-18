const jwt = require('jsonwebtoken');
const User = require('../models/User');
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
    
    // Find user in the base User collection
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (user.status !== 'Active') {
      return res.status(401).json({ message: 'User account is inactive' });
    }

    // Verify role matches
    if (user.role !== decoded.role) {
      return res.status(401).json({ message: 'Role mismatch in token' });
    }

    // Get additional details from role-specific collection
    const RoleModel = getUserModel(user.role);
    let roleDetails = null;
    
    if (RoleModel) {
      if (user.role === 'Admin') {
        roleDetails = await RoleModel.findOne({ aid: user._id });
      } else if (user.role === 'Manager') {
        roleDetails = await RoleModel.findOne({ mid: user._id });
      } else if (user.role === 'Staff') {
        roleDetails = await RoleModel.findOne({ sid: user._id });
      }
    }

    // Create user object with combined data
    req.user = {
      id: user._id,
      user_name: user.user_name,
      email: user.email,
      role: user.role,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      name: roleDetails?.name || user.user_name,
      department: roleDetails?.department,
      designation: roleDetails?.designation
    };
    
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
