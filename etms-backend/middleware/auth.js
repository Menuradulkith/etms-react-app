const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Manager = require('../models/Manager');
const Staff = require('../models/Staff');

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

    // Get role-specific data
    let roleData = null;
    if (user.role === 'Admin') {
      roleData = await Admin.findOne({ aid: user._id });
    } else if (user.role === 'Manager') {
      roleData = await Manager.findOne({ mid: user._id });
    } else if (user.role === 'Staff') {
      roleData = await Staff.findOne({ sid: user._id });
    }

    // Combine user and role-specific data
    req.user = {
      _id: user._id,
      user_name: user.user_name,
      role: user.role,
      status: user.status,
      name: roleData?.name,
      department: roleData?.department,
      roleId: roleData?._id
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
