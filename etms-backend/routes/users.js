const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Manager = require('../models/Manager');
const Staff = require('../models/Staff');
const { auth, authorize } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');
const { sendWelcomeEmail } = require('../utils/emailService');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Admin)
router.get('/', auth, authorize('Admin'), async (req, res) => {
  try {
    const { role, status, search } = req.query;
    
    let userQuery = {};
    
    if (role) userQuery.role = role;
    if (status) userQuery.status = status;
    if (search) {
      userQuery.user_name = { $regex: search, $options: 'i' };
    }

    const users = await User.find(userQuery)
      .select('-password')
      .sort({ createdAt: -1 });

    // Enrich users with role-specific data
    const enrichedUsers = await Promise.all(users.map(async (user) => {
      let roleData = null;
      if (user.role === 'Admin') {
        roleData = await Admin.findOne({ aid: user._id });
      } else if (user.role === 'Manager') {
        roleData = await Manager.findOne({ mid: user._id });
      } else if (user.role === 'Staff') {
        roleData = await Staff.findOne({ sid: user._id });
      }

      return {
        _id: user._id,
        user_name: user.user_name,
        email: user.email,
        role: user.role,
        status: user.status,
        name: roleData?.name,
        department: roleData?.department,
        roleId: roleData?._id,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    }));

    res.json({
      success: true,
      count: enrichedUsers.length,
      users: enrichedUsers
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let roleData = null;
    if (user.role === 'Admin') {
      roleData = await Admin.findOne({ aid: user._id });
    } else if (user.role === 'Manager') {
      roleData = await Manager.findOne({ mid: user._id });
    } else if (user.role === 'Staff') {
      roleData = await Staff.findOne({ sid: user._id });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        user_name: user.user_name,
        role: user.role,
        status: user.status,
        name: roleData?.name,
        department: roleData?.department,
        roleId: roleData?._id
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/users
// @desc    Create new user
// @access  Private (Admin only)
router.post('/', auth, authorize('Admin'), [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('user_name').trim().notEmpty().withMessage('Username is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['Admin', 'Manager', 'Staff']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, user_name, email, password, role, department } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ user_name: user_name.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this username' });
    }

    // Check if email exists
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Store plain password for email before hashing
    const plainPassword = password;

    // Create base user (password will be hashed by User model pre-save hook)
    const user = new User({
      user_name: user_name.toLowerCase(),
      email: email.toLowerCase(),
      password: password,
      role,
      status: 'Active',
      mustChangePassword: true
    });
    await user.save();

    // Create role-specific record
    let roleRecord;
    if (role === 'Admin') {
      roleRecord = new Admin({ aid: user._id, name, email: email.toLowerCase() });
    } else if (role === 'Manager') {
      roleRecord = new Manager({ mid: user._id, name, email: email.toLowerCase(), department: department || 'General' });
    } else if (role === 'Staff') {
      roleRecord = new Staff({ sid: user._id, name, email: email.toLowerCase(), department: department || 'General' });
    }
    await roleRecord.save();

    // Send welcome email
    const emailResult = await sendWelcomeEmail({
      email: email,
      name: name,
      username: user_name,
      password: plainPassword,
      role: role
    });

    // Log activity
    await logActivity({
      type: 'user_created',
      description: `New ${role} "${name}" (${user_name}) was created`,
      user: req.user,
      relatedId: user._id,
      relatedModel: 'User',
      metadata: { newUserRole: role, newUserName: name }
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      emailSent: emailResult.success,
      user: {
        _id: user._id,
        user_name: user.user_name,
        email: user.email,
        role: user.role,
        name: name,
        department: roleRecord?.department
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Admin only)
router.put('/:id', auth, authorize('Admin'), [
  body('name').optional().trim().notEmpty(),
  body('email').optional().trim().isEmail().withMessage('Valid email is required'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('status').optional().isIn(['Active', 'Inactive']),
  body('department').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, status, department } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if new email already exists (if changing email)
    if (email && email.toLowerCase() !== user.email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already in use by another user' });
      }
      user.email = email.toLowerCase();
    }

    // Update base user (password will be hashed by User model pre-save hook if modified)
    if (password) {
      user.password = password;
    }
    if (status) user.status = status;
    await user.save();

    // Update role-specific record
    let roleModel;
    let roleQuery;
    if (user.role === 'Admin') {
      roleModel = Admin;
      roleQuery = { aid: user._id };
    } else if (user.role === 'Manager') {
      roleModel = Manager;
      roleQuery = { mid: user._id };
    } else if (user.role === 'Staff') {
      roleModel = Staff;
      roleQuery = { sid: user._id };
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    if (department && (user.role === 'Manager' || user.role === 'Staff')) {
      updateData.department = department;
    }

    await roleModel.updateOne(roleQuery, updateData);

    const roleData = await roleModel.findOne(roleQuery);

    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        _id: user._id,
        user_name: user.user_name,
        role: user.role,
        status: user.status,
        name: roleData?.name,
        department: roleData?.department
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Admin only)
router.delete('/:id', auth, authorize('Admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting yourself
    if (user._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Delete role-specific record
    if (user.role === 'Admin') {
      await Admin.deleteOne({ aid: user._id });
    } else if (user.role === 'Manager') {
      await Manager.deleteOne({ mid: user._id });
    } else if (user.role === 'Staff') {
      await Staff.deleteOne({ sid: user._id });
    }

    // Delete base user
    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/users/:id/reset-password
// @desc    Admin resets user password (for forgotten passwords)
// @access  Private (Admin only)
router.post('/:id/reset-password', auth, authorize('Admin'), [
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { newPassword } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent resetting own password through this route
    if (user._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ message: 'Cannot reset your own password. Use change password instead.' });
    }

    // Get user's name for logging
    let userName = user.user_name;
    if (user.role === 'Manager') {
      const manager = await Manager.findOne({ mid: user._id });
      userName = manager?.name || user.user_name;
    } else if (user.role === 'Staff') {
      const staff = await Staff.findOne({ sid: user._id });
      userName = staff?.name || user.user_name;
    }

    // Update password and set mustChangePassword flag
    user.password = newPassword;
    user.mustChangePassword = true; // Force user to change password on next login
    await user.save();

    // Log activity
    await logActivity({
      type: 'password_reset',
      description: `Password was reset for ${user.role} "${userName}" (${user.user_name}) by Admin`,
      user: req.user,
      relatedId: user._id,
      relatedModel: 'User',
      metadata: { targetUserRole: user.role, targetUserName: userName }
    });

    res.json({
      success: true,
      message: `Password reset successfully for ${userName}. User will be required to change password on next login.`
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/users/managers/list
// @desc    Get all managers
// @access  Private
router.get('/managers/list', auth, async (req, res) => {
  try {
    const managers = await Manager.find()
      .populate('mid', 'user_name status');

    const activeManagers = managers.filter(m => m.mid?.status === 'Active');

    res.json({
      success: true,
      count: activeManagers.length,
      managers: activeManagers.map(m => ({
        _id: m._id,
        name: m.name,
        department: m.department,
        user_name: m.mid?.user_name,
        role: 'Manager'
      }))
    });
  } catch (error) {
    console.error('Get managers error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/users/staff/list
// @desc    Get all staff (for Admin) or staff in manager's department (for Manager)
// @access  Private (Manager, Admin)
router.get('/staff/list', auth, authorize('Admin', 'Manager'), async (req, res) => {
  try {
    let staffQuery = {};
    
    // If manager, filter by their department
    if (req.user.role === 'Manager') {
      const manager = await Manager.findOne({ mid: req.user.id });
      if (manager && manager.department) {
        staffQuery.department = manager.department;
      }
    }
    
    const staff = await Staff.find(staffQuery)
      .populate('sid', 'user_name status');

    const activeStaff = staff.filter(s => s.sid?.status === 'Active');

    res.json({
      success: true,
      count: activeStaff.length,
      staff: activeStaff.map(s => ({
        _id: s._id,
        name: s.name,
        department: s.department,
        user_name: s.sid?.user_name,
        role: 'Staff'
      }))
    });
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== MANAGER USER MANAGEMENT ROUTES ==========
// These routes allow Managers to manage Staff users only

// @route   GET /api/users/manager/staff
// @desc    Get all staff users (for Manager user management) - filtered by manager's department
// @access  Private (Manager)
router.get('/manager/staff', auth, authorize('Manager'), async (req, res) => {
  try {
    const { search } = req.query;
    
    // Get the manager's department
    const manager = await Manager.findOne({ mid: req.user.id });
    if (!manager) {
      return res.status(404).json({ message: 'Manager profile not found' });
    }
    const managerDepartment = manager.department;
    
    // Find all staff in the same department
    const staffInDepartment = await Staff.find({ department: managerDepartment });
    const staffUserIds = staffInDepartment.map(s => s.sid);
    
    let userQuery = { role: 'Staff', _id: { $in: staffUserIds } };
    
    if (search) {
      userQuery.user_name = { $regex: search, $options: 'i' };
    }

    const users = await User.find(userQuery)
      .select('-password')
      .sort({ createdAt: -1 });

    // Enrich users with Staff data
    const enrichedUsers = await Promise.all(users.map(async (user) => {
      const staffData = await Staff.findOne({ sid: user._id });

      return {
        _id: user._id,
        user_name: user.user_name,
        email: user.email,
        role: user.role,
        status: user.status,
        name: staffData?.name,
        department: staffData?.department,
        roleId: staffData?._id,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    }));

    res.json({
      success: true,
      count: enrichedUsers.length,
      users: enrichedUsers
    });
  } catch (error) {
    console.error('Get staff users error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/users/manager/staff
// @desc    Create new staff user (by Manager) - auto-assigns manager's department
// @access  Private (Manager)
router.post('/manager/staff', auth, authorize('Manager'), [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('user_name').trim().notEmpty().withMessage('Username is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, user_name, email, password } = req.body;

    // Get the manager's department to auto-assign
    const manager = await Manager.findOne({ mid: req.user.id });
    if (!manager) {
      return res.status(404).json({ message: 'Manager profile not found' });
    }
    const managerDepartment = manager.department;

    // Check if user exists
    const existingUser = await User.findOne({ user_name: user_name.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this username' });
    }

    // Check if email exists
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Store plain password for email before hashing
    const plainPassword = password;

    // Create base user (password will be hashed by User model pre-save hook)
    const user = new User({
      user_name: user_name.toLowerCase(),
      email: email.toLowerCase(),
      password: password,
      role: 'Staff',
      status: 'Active',
      mustChangePassword: true
    });
    await user.save();

    // Create Staff record with manager's department
    const staffRecord = new Staff({ 
      sid: user._id, 
      name, 
      email: email.toLowerCase(), 
      department: managerDepartment 
    });
    await staffRecord.save();

    // Send welcome email
    const emailResult = await sendWelcomeEmail({
      email: email,
      name: name,
      username: user_name,
      password: plainPassword,
      role: 'Staff'
    });

    // Log activity
    await logActivity({
      type: 'user_created',
      description: `New Staff "${name}" (${user_name}) was created by Manager in ${managerDepartment} department`,
      user: req.user,
      relatedId: user._id,
      relatedModel: 'User',
      metadata: { newUserRole: 'Staff', newUserName: name, createdByManager: true, department: managerDepartment }
    });

    res.status(201).json({
      success: true,
      message: 'Staff user created successfully',
      emailSent: emailResult.success,
      user: {
        _id: user._id,
        user_name: user.user_name,
        email: user.email,
        role: user.role,
        name: name,
        department: staffRecord.department
      }
    });
  } catch (error) {
    console.error('Create staff user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/users/manager/staff/:id
// @desc    Update staff user (by Manager) - department is not changeable, always uses manager's department
// @access  Private (Manager)
router.put('/manager/staff/:id', auth, authorize('Manager'), [
  body('name').optional().trim().notEmpty(),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, password } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Ensure the user is Staff only
    if (user.role !== 'Staff') {
      return res.status(403).json({ message: 'Managers can only update Staff users' });
    }

    // Verify this staff member belongs to the manager's department
    const manager = await Manager.findOne({ mid: req.user.id });
    const staffData = await Staff.findOne({ sid: user._id });
    if (!manager || !staffData || staffData.department !== manager.department) {
      return res.status(403).json({ message: 'You can only update staff members in your department' });
    }

    // Update base user (password will be hashed by User model pre-save hook if modified)
    if (password) {
      user.password = password;
    }
    await user.save();

    // Update Staff record (name only, department is fixed)
    const updateData = {};
    if (name) updateData.name = name;

    if (Object.keys(updateData).length > 0) {
      await Staff.updateOne({ sid: user._id }, updateData);
    }

    const updatedStaffData = await Staff.findOne({ sid: user._id });

    res.json({
      success: true,
      message: 'Staff user updated successfully',
      user: {
        _id: user._id,
        user_name: user.user_name,
        role: user.role,
        status: user.status,
        name: updatedStaffData?.name,
        department: updatedStaffData?.department
      }
    });
  } catch (error) {
    console.error('Update staff user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/users/manager/staff/:id
// @desc    Delete staff user (by Manager)
// @access  Private (Manager)
router.delete('/manager/staff/:id', auth, authorize('Manager'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Ensure the user is Staff only
    if (user.role !== 'Staff') {
      return res.status(403).json({ message: 'Managers can only delete Staff users' });
    }

    // Delete Staff record
    await Staff.deleteOne({ sid: user._id });

    // Delete base user
    await User.findByIdAndDelete(req.params.id);

    // Log activity
    await logActivity({
      type: 'user_deleted',
      description: `Staff user was deleted by Manager`,
      user: req.user,
      relatedId: req.params.id,
      relatedModel: 'User',
      metadata: { deletedByManager: true }
    });

    res.json({
      success: true,
      message: 'Staff user deleted successfully'
    });
  } catch (error) {
    console.error('Delete staff user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
