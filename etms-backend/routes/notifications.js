const express = require('express');
const Notification = require('../models/Notification');
const Admin = require('../models/Admin');
const Manager = require('../models/Manager');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/notifications
// @desc    Get notifications for the logged-in user (Admin or Manager)
// @access  Private (Admin, Manager)
router.get('/', auth, authorize('Admin', 'Manager'), async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    let recipientId;
    let recipientModel;
    
    if (req.user.role === 'Admin') {
      const admin = await Admin.findOne({ aid: req.user._id });
      if (!admin) {
        return res.status(404).json({ message: 'Admin profile not found' });
      }
      recipientId = admin._id;
      recipientModel = 'Admin';
    } else if (req.user.role === 'Manager') {
      const manager = await Manager.findOne({ mid: req.user._id });
      if (!manager) {
        return res.status(404).json({ message: 'Manager profile not found' });
      }
      recipientId = manager._id;
      recipientModel = 'Manager';
    }

    let query = { recipient: recipientId, recipientModel };
    
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ ...query, isRead: false });
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({
      success: true,
      notifications,
      unreadCount,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/notifications/unread-count
// @desc    Get count of unread notifications
// @access  Private (Admin, Manager)
router.get('/unread-count', auth, authorize('Admin', 'Manager'), async (req, res) => {
  try {
    let recipientId;
    let recipientModel;
    
    if (req.user.role === 'Admin') {
      const admin = await Admin.findOne({ aid: req.user._id });
      if (!admin) {
        return res.status(404).json({ message: 'Admin profile not found' });
      }
      recipientId = admin._id;
      recipientModel = 'Admin';
    } else if (req.user.role === 'Manager') {
      const manager = await Manager.findOne({ mid: req.user._id });
      if (!manager) {
        return res.status(404).json({ message: 'Manager profile not found' });
      }
      recipientId = manager._id;
      recipientModel = 'Manager';
    }

    const count = await Notification.countDocuments({ 
      recipient: recipientId, 
      recipientModel,
      isRead: false 
    });

    res.json({
      success: true,
      unreadCount: count
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark a notification as read
// @access  Private (Admin, Manager)
router.put('/:id/read', auth, authorize('Admin', 'Manager'), async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Verify ownership
    let recipientId;
    if (req.user.role === 'Admin') {
      const admin = await Admin.findOne({ aid: req.user._id });
      recipientId = admin?._id;
    } else {
      const manager = await Manager.findOne({ mid: req.user._id });
      recipientId = manager?._id;
    }

    if (notification.recipient.toString() !== recipientId?.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this notification' });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private (Admin, Manager)
router.put('/mark-all-read', auth, authorize('Admin', 'Manager'), async (req, res) => {
  try {
    let recipientId;
    let recipientModel;
    
    if (req.user.role === 'Admin') {
      const admin = await Admin.findOne({ aid: req.user._id });
      recipientId = admin?._id;
      recipientModel = 'Admin';
    } else {
      const manager = await Manager.findOne({ mid: req.user._id });
      recipientId = manager?._id;
      recipientModel = 'Manager';
    }

    await Notification.updateMany(
      { recipient: recipientId, recipientModel, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification
// @access  Private (Admin, Manager)
router.delete('/:id', auth, authorize('Admin', 'Manager'), async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Verify ownership
    let recipientId;
    if (req.user.role === 'Admin') {
      const admin = await Admin.findOne({ aid: req.user._id });
      recipientId = admin?._id;
    } else {
      const manager = await Manager.findOne({ mid: req.user._id });
      recipientId = manager?._id;
    }

    if (notification.recipient.toString() !== recipientId?.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this notification' });
    }

    await notification.deleteOne();

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/notifications/clear-all
// @desc    Delete all notifications for the user
// @access  Private (Admin, Manager)
router.delete('/clear-all', auth, authorize('Admin', 'Manager'), async (req, res) => {
  try {
    let recipientId;
    let recipientModel;
    
    if (req.user.role === 'Admin') {
      const admin = await Admin.findOne({ aid: req.user._id });
      recipientId = admin?._id;
      recipientModel = 'Admin';
    } else {
      const manager = await Manager.findOne({ mid: req.user._id });
      recipientId = manager?._id;
      recipientModel = 'Manager';
    }

    await Notification.deleteMany({ recipient: recipientId, recipientModel });

    res.json({
      success: true,
      message: 'All notifications cleared'
    });
  } catch (error) {
    console.error('Clear all notifications error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
