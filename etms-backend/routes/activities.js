const express = require('express');
const Activity = require('../models/Activity');
const Manager = require('../models/Manager');
const Staff = require('../models/Staff');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/activities
// @desc    Get recent activities based on user role
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    let query = {};

    // Filter activities based on user role - each role sees only their own activities
    if (req.user.role === 'Admin') {
      // Admin sees only admin activities (activities performed by admins)
      query = { userRole: 'Admin' };
    } else if (req.user.role === 'Manager') {
      // Manager sees only their own activities
      query = { userId: req.user._id };
    } else if (req.user.role === 'Staff') {
      // Staff sees only their own activities
      query = { userId: req.user._id };
    }

    const activities = await Activity.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      activities
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/activities
// @desc    Create a new activity (internal use)
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { type, description, relatedId, relatedModel, metadata } = req.body;

    const activity = new Activity({
      type,
      description,
      userId: req.user._id,
      userName: req.user.user_name,
      userRole: req.user.role,
      relatedId,
      relatedModel,
      metadata
    });

    await activity.save();

    res.status(201).json({
      success: true,
      activity
    });
  } catch (error) {
    console.error('Create activity error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
