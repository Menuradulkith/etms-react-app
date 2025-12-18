const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Department = require('../models/Department');
const { auth, authorize } = require('../middleware/auth');

// @route   GET /api/departments
// @desc    Get all departments
// @access  Private (Admin, Manager)
router.get('/', auth, authorize('Admin', 'Manager'), async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true })
      .sort({ name: 1 })
      .populate('createdBy', 'user_name');

    res.json({
      success: true,
      count: departments.length,
      departments: departments.map(dept => ({
        _id: dept._id,
        name: dept.name,
        description: dept.description,
        createdBy: dept.createdBy?.user_name,
        createdAt: dept.createdAt
      }))
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/departments
// @desc    Create new department
// @access  Private (Admin only)
router.post('/', auth, authorize('Admin'), [
  body('name').trim().notEmpty().withMessage('Department name is required'),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description } = req.body;

    // Check if department already exists
    const existingDept = await Department.findOne({ 
      name: { $regex: `^${name}$`, $options: 'i' },
      isActive: true 
    });

    if (existingDept) {
      return res.status(400).json({ message: 'Department already exists' });
    }

    const department = new Department({
      name: name.trim(),
      description: description?.trim() || '',
      createdBy: req.user._id
    });

    await department.save();

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      department: {
        _id: department._id,
        name: department.name,
        description: department.description,
        createdAt: department.createdAt
      }
    });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/departments/:id
// @desc    Update department
// @access  Private (Admin only)
router.put('/:id', auth, authorize('Admin'), [
  body('name').optional().trim().notEmpty().withMessage('Department name cannot be empty'),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description } = req.body;

    const department = await Department.findById(req.params.id);
    if (!department || !department.isActive) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check if new name conflicts with existing department
    if (name && name.toLowerCase() !== department.name.toLowerCase()) {
      const existingDept = await Department.findOne({ 
        name: { $regex: `^${name}$`, $options: 'i' },
        isActive: true,
        _id: { $ne: department._id }
      });

      if (existingDept) {
        return res.status(400).json({ message: 'Department name already exists' });
      }
      department.name = name.trim();
    }

    if (description !== undefined) {
      department.description = description.trim();
    }

    await department.save();

    res.json({
      success: true,
      message: 'Department updated successfully',
      department: {
        _id: department._id,
        name: department.name,
        description: department.description,
        createdAt: department.createdAt
      }
    });
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/departments/:id
// @desc    Delete department (soft delete)
// @access  Private (Admin only)
router.delete('/:id', auth, authorize('Admin'), async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department || !department.isActive) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Soft delete - mark as inactive instead of removing
    department.isActive = false;
    await department.save();

    res.json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;