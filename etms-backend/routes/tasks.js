const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const SubTask = require('../models/SubTask');
const Report = require('../models/Report');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Manager = require('../models/Manager');
const Staff = require('../models/Staff');
const { auth, authorize } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type.'));
    }
  }
});

// @route   GET /api/tasks/managers
// @desc    Get all managers (for task assignment dropdown)
// @access  Private (Admin)
router.get('/managers', auth, authorize('Admin'), async (req, res) => {
  try {
    const managers = await Manager.find().populate('mid', 'user_name status');
    res.json({
      success: true,
      managers: managers.map(m => ({
        _id: m._id,
        name: m.name,
        department: m.department,
        user_name: m.mid?.user_name,
        status: m.mid?.status
      }))
    });
  } catch (error) {
    console.error('Get managers error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/tasks/staff
// @desc    Get all staff (for subtask assignment dropdown)
// @access  Private (Manager)
router.get('/staff', auth, authorize('Manager', 'Admin'), async (req, res) => {
  try {
    const staff = await Staff.find().populate('sid', 'user_name status');
    res.json({
      success: true,
      staff: staff.map(s => ({
        _id: s._id,
        name: s.name,
        department: s.department,
        user_name: s.sid?.user_name,
        status: s.sid?.status
      }))
    });
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/tasks/subtasks
// @desc    Get all subtasks (Manager creates subtasks for Staff)
// @access  Private
router.get('/subtasks', auth, async (req, res) => {
  try {
    const { status, search, startDate, endDate, taskId } = req.query;
    let query = {};

    if (taskId) query.task_id = taskId;
    if (status) query.status = status;

    if (search) {
      query.$or = [
        { subtask_name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { subtask_id: { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      query.due_date = {};
      if (startDate) query.due_date.$gte = new Date(startDate);
      if (endDate) query.due_date.$lte = new Date(endDate);
    }

    // Role-based filtering
    if (req.user.role === 'Staff') {
      const staff = await Staff.findOne({ sid: req.user._id });
      if (staff) query.assigned_to = staff._id;
    } else if (req.user.role === 'Manager') {
      const manager = await Manager.findOne({ mid: req.user._id });
      if (manager) query.createdBy = manager._id;
    }

    const subtasks = await SubTask.find(query)
      .populate({
        path: 'assigned_to',
        populate: { path: 'sid', select: 'user_name' }
      })
      .populate({
        path: 'createdBy',
        populate: { path: 'mid', select: 'user_name' }
      })
      .populate('task_id')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: subtasks.length,
      subtasks
    });
  } catch (error) {
    console.error('Get subtasks error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/tasks/stats
// @desc    Get task statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    let taskQuery = {};
    let subtaskQuery = {};

    if (req.user.role === 'Manager') {
      const manager = await Manager.findOne({ mid: req.user._id });
      if (manager) {
        taskQuery.assigned_to = manager._id;
        // Manager stats show only their tasks, not subtasks they created
        subtaskQuery._id = null; // This ensures no subtasks are counted for manager
      }
    } else if (req.user.role === 'Staff') {
      const staff = await Staff.findOne({ sid: req.user._id });
      if (staff) subtaskQuery.assigned_to = staff._id;
    }

    const stats = {
      tasks: {
        total: await Task.countDocuments(taskQuery),
        pending: await Task.countDocuments({ ...taskQuery, status: 'Pending' }),
        inProgress: await Task.countDocuments({ ...taskQuery, status: 'In Progress' }),
        completed: await Task.countDocuments({ ...taskQuery, status: 'Completed' }),
        overdue: await Task.countDocuments({
          ...taskQuery,
          status: { $ne: 'Completed' },
          due_date: { $lt: new Date() }
        })
      },
      subtasks: {
        total: await SubTask.countDocuments(subtaskQuery),
        pending: await SubTask.countDocuments({ ...subtaskQuery, status: 'Pending' }),
        inProgress: await SubTask.countDocuments({ ...subtaskQuery, status: 'In Progress' }),
        completed: await SubTask.countDocuments({ ...subtaskQuery, status: 'Completed' }),
        overdue: await SubTask.countDocuments({
          ...subtaskQuery,
          status: { $ne: 'Completed' },
          due_date: { $lt: new Date() }
        })
      }
    };

    stats.total = stats.tasks.total + stats.subtasks.total;
    stats.pending = stats.tasks.pending + stats.subtasks.pending;
    stats.inProgress = stats.tasks.inProgress + stats.subtasks.inProgress;
    stats.completed = stats.tasks.completed + stats.subtasks.completed;
    stats.overdue = stats.tasks.overdue + stats.subtasks.overdue;

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/tasks/reports
// @desc    Get all reports
// @access  Private (Admin, Manager)
router.get('/reports', auth, authorize('Admin', 'Manager'), async (req, res) => {
  try {
    const { task_id, subtask_id, startDate, endDate } = req.query;
    let query = {};

    if (task_id) query.task_id = task_id;
    if (subtask_id) query.subtask_id = subtask_id;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const reports = await Report.find(query)
      .populate('task_id')
      .populate('subtask_id')
      .populate({
        path: 'submitted_by',
        select: 'user_name role'
      })
      .sort({ date: -1 });

    res.json({
      success: true,
      count: reports.length,
      reports
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/tasks
// @desc    Get all tasks (Admin creates tasks for Managers)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { status, search, startDate, endDate } = req.query;
    let query = {};

    if (status) query.status = status;

    if (search) {
      query.$or = [
        { task_name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { task_id: { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      query.due_date = {};
      if (startDate) query.due_date.$gte = new Date(startDate);
      if (endDate) query.due_date.$lte = new Date(endDate);
    }

    if (req.user.role === 'Manager') {
      const manager = await Manager.findOne({ mid: req.user._id });
      if (manager) query.assigned_to = manager._id;
    } else if (req.user.role === 'Staff') {
      return res.json({ success: true, count: 0, tasks: [] });
    }

    const tasks = await Task.find(query)
      .populate({
        path: 'assigned_to',
        populate: { path: 'mid', select: 'user_name' }
      })
      .populate({
        path: 'createdBy',
        populate: { path: 'aid', select: 'user_name' }
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: tasks.length,
      tasks
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/tasks/:id
// @desc    Get task by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate({
        path: 'assigned_to',
        populate: { path: 'mid', select: 'user_name' }
      })
      .populate({
        path: 'createdBy',
        populate: { path: 'aid', select: 'user_name' }
      });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const subtasks = await SubTask.find({ task_id: task._id })
      .populate({
        path: 'assigned_to',
        populate: { path: 'sid', select: 'user_name' }
      });

    res.json({
      success: true,
      task: { ...task.toObject(), subtasks }
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/tasks
// @desc    Create new task (Admin assigns to Manager)
// @access  Private (Admin only)
router.post('/', auth, authorize('Admin'), [
  body('task_name').trim().notEmpty().withMessage('Task name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('due_date').isISO8601().withMessage('Valid due date is required'),
  body('assigned_to').notEmpty().withMessage('Assigned manager is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { task_name, description, due_date, assigned_to, priority } = req.body;

    const manager = await Manager.findById(assigned_to);
    if (!manager) {
      return res.status(404).json({ message: 'Assigned manager not found' });
    }

    const admin = await Admin.findOne({ aid: req.user._id });
    if (!admin) {
      return res.status(404).json({ message: 'Admin record not found' });
    }

    const task = new Task({
      task_name,
      description,
      due_date,
      priority: priority || 'Medium',
      assigned_to: manager._id,
      createdBy: admin._id
    });

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate({
        path: 'assigned_to',
        populate: { path: 'mid', select: 'user_name' }
      })
      .populate({
        path: 'createdBy',
        populate: { path: 'aid', select: 'user_name' }
      });

    // Log activity
    await logActivity({
      type: 'task_created',
      description: `Task "${task_name}" created and assigned to ${manager.name}`,
      user: req.user,
      relatedId: task._id,
      relatedModel: 'Task',
      metadata: { taskId: task.task_id, assignedTo: manager._id.toString(), managerName: manager.name }
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task: populatedTask
    });
  } catch (error) {
    console.error('Create task error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Duplicate key error. Please try again.' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/tasks/subtasks
// @desc    Create new subtask (Manager assigns to Staff)
// @access  Private (Manager only)
router.post('/subtasks', auth, authorize('Manager'), [
  body('subtask_name').trim().notEmpty().withMessage('Subtask name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('due_date').isISO8601().withMessage('Valid due date is required'),
  body('assigned_to').notEmpty().withMessage('Assigned staff is required'),
  body('task_id').notEmpty().withMessage('Parent task is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { subtask_name, description, due_date, assigned_to, task_id, priority } = req.body;

    const staff = await Staff.findById(assigned_to);
    if (!staff) {
      return res.status(404).json({ message: 'Assigned staff not found' });
    }

    const manager = await Manager.findOne({ mid: req.user._id });
    const task = await Task.findById(task_id);
    
    if (!task) {
      return res.status(404).json({ message: 'Parent task not found' });
    }

    if (task.assigned_to.toString() !== manager._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to create subtask for this task' });
    }

    const subtask = new SubTask({
      subtask_name,
      description,
      due_date,
      priority: priority || 'Medium',
      assigned_to: staff._id,
      task_id: task._id,
      createdBy: manager._id
    });

    await subtask.save();

    const populatedSubtask = await SubTask.findById(subtask._id)
      .populate({
        path: 'assigned_to',
        populate: { path: 'sid', select: 'user_name' }
      })
      .populate({
        path: 'createdBy',
        populate: { path: 'mid', select: 'user_name' }
      })
      .populate('task_id');

    // Log activity
    await logActivity({
      type: 'subtask_created',
      description: `Subtask "${subtask_name}" created and assigned to ${staff.name}`,
      user: req.user,
      relatedId: subtask._id,
      relatedModel: 'SubTask',
      metadata: { subtaskId: subtask.subtask_id, assignedTo: staff._id.toString(), staffName: staff.name, managerId: manager._id.toString() }
    });

    res.status(201).json({
      success: true,
      message: 'Subtask created successfully',
      subtask: populatedSubtask
    });
  } catch (error) {
    console.error('Create subtask error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Duplicate key error. Please try again.' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update task
// @access  Private (Admin only)
router.put('/:id', auth, authorize('Admin'), async (req, res) => {
  try {
    const { task_name, description, due_date, assigned_to, status, priority } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task_name) task.task_name = task_name;
    if (description) task.description = description;
    if (due_date) task.due_date = due_date;
    if (assigned_to) {
      const manager = await Manager.findById(assigned_to);
      if (!manager) {
        return res.status(404).json({ message: 'Manager not found' });
      }
      task.assigned_to = assigned_to;
    }
    if (status) task.status = status;
    if (priority) task.priority = priority;

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate({
        path: 'assigned_to',
        populate: { path: 'mid', select: 'user_name' }
      })
      .populate({
        path: 'createdBy',
        populate: { path: 'aid', select: 'user_name' }
      });

    res.json({
      success: true,
      message: 'Task updated successfully',
      task: updatedTask
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/tasks/:id/status
// @desc    Update task status (Manager can mark complete)
// @access  Private
router.put('/:id/status', auth, [
  body('status').isIn(['Pending', 'In Progress', 'Completed', 'Cancelled']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (req.user.role === 'Manager') {
      const manager = await Manager.findOne({ mid: req.user._id });
      if (task.assigned_to.toString() !== manager._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this task' });
      }
    } else if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const oldStatus = task.status;
    task.status = req.body.status;
    if (req.body.status === 'Completed') {
      task.completedAt = new Date();
    }
    await task.save();

    // Log activity
    const activityType = req.body.status === 'Completed' ? 'task_completed' : 'task_updated';
    await logActivity({
      type: activityType,
      description: `Task "${task.task_name}" status changed from ${oldStatus} to ${req.body.status}`,
      user: req.user,
      relatedId: task._id,
      relatedModel: 'Task',
      metadata: { taskId: task.task_id, oldStatus, newStatus: req.body.status }
    });

    res.json({
      success: true,
      message: 'Task status updated successfully',
      task
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/tasks/subtasks/:id
// @desc    Update subtask
// @access  Private (Manager only)
router.put('/subtasks/:id', auth, authorize('Manager'), async (req, res) => {
  try {
    const { subtask_name, description, due_date, assigned_to, status, priority } = req.body;

    const subtask = await SubTask.findById(req.params.id);
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    // Verify manager owns this subtask
    const manager = await Manager.findOne({ mid: req.user._id });
    if (subtask.createdBy.toString() !== manager._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this subtask' });
    }

    if (subtask_name) subtask.subtask_name = subtask_name;
    if (description) subtask.description = description;
    if (due_date) subtask.due_date = due_date;
    if (assigned_to) {
      const staff = await Staff.findById(assigned_to);
      if (!staff) {
        return res.status(404).json({ message: 'Staff not found' });
      }
      subtask.assigned_to = assigned_to;
    }
    if (status) {
      subtask.status = status;
      if (status === 'Completed') {
        subtask.completedAt = new Date();
      }
    }
    if (priority) subtask.priority = priority;

    await subtask.save();

    const updatedSubtask = await SubTask.findById(subtask._id)
      .populate({
        path: 'assigned_to',
        populate: { path: 'sid', select: 'user_name' }
      })
      .populate({
        path: 'createdBy',
        populate: { path: 'mid', select: 'user_name' }
      })
      .populate('task_id');

    res.json({
      success: true,
      message: 'Subtask updated successfully',
      subtask: updatedSubtask
    });
  } catch (error) {
    console.error('Update subtask error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/tasks/subtasks/:id/status
// @desc    Update subtask status (Staff can mark complete)
// @access  Private
router.put('/subtasks/:id/status', auth, [
  body('status').isIn(['Pending', 'In Progress', 'Completed', 'Cancelled']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const subtask = await SubTask.findById(req.params.id);
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    if (req.user.role === 'Staff') {
      const staff = await Staff.findOne({ sid: req.user._id });
      if (subtask.assigned_to.toString() !== staff._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this subtask' });
      }
    } else if (req.user.role === 'Manager') {
      const manager = await Manager.findOne({ mid: req.user._id });
      if (subtask.createdBy.toString() !== manager._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this subtask' });
      }
    } else if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const oldStatus = subtask.status;
    subtask.status = req.body.status;
    if (req.body.status === 'Completed') {
      subtask.completedAt = new Date();
    }
    await subtask.save();

    // Log activity
    const activityType = req.body.status === 'Completed' ? 'subtask_completed' : 'subtask_updated';
    await logActivity({
      type: activityType,
      description: `Subtask "${subtask.subtask_name}" status changed from ${oldStatus} to ${req.body.status}`,
      user: req.user,
      relatedId: subtask._id,
      relatedModel: 'SubTask',
      metadata: { subtaskId: subtask.subtask_id, oldStatus, newStatus: req.body.status }
    });

    res.json({
      success: true,
      message: 'Subtask status updated successfully',
      subtask
    });
  } catch (error) {
    console.error('Update subtask status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete task
// @access  Private (Admin only)
router.delete('/:id', auth, authorize('Admin'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await SubTask.deleteMany({ task_id: task._id });
    await Task.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Task and related subtasks deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/tasks/subtasks/:id
// @desc    Delete subtask
// @access  Private (Manager)
router.delete('/subtasks/:id', auth, authorize('Manager'), async (req, res) => {
  try {
    const subtask = await SubTask.findById(req.params.id);
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    const manager = await Manager.findOne({ mid: req.user._id });
    if (subtask.createdBy.toString() !== manager._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this subtask' });
    }

    await SubTask.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Subtask deleted successfully'
    });
  } catch (error) {
    console.error('Delete subtask error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/tasks/reports
// @desc    Submit a report
// @access  Private (Staff, Manager)
router.post('/reports', auth, authorize('Staff', 'Manager'), [
  body('task_id').notEmpty().withMessage('Task ID is required'),
  body('comment').trim().notEmpty().withMessage('Comment is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { task_id, subtask_id, comment } = req.body;

    const task = await Task.findById(task_id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (subtask_id) {
      const subtask = await SubTask.findById(subtask_id);
      if (!subtask) {
        return res.status(404).json({ message: 'Subtask not found' });
      }
    }

    const report = new Report({
      task_id,
      subtask_id: subtask_id || null,
      task_name: task.task_name,
      submitted_by: req.user._id,
      comment,
      date: new Date()
    });

    await report.save();

    const populatedReport = await Report.findById(report._id)
      .populate('task_id')
      .populate('subtask_id')
      .populate({
        path: 'submitted_by',
        select: 'user_name role'
      });

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      report: populatedReport
    });
  } catch (error) {
    console.error('Submit report error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ====================== SUBTASK ATTACHMENTS ======================
// NOTE: These routes MUST come before /:id/attachments routes to avoid route conflicts

// @route   POST /api/tasks/subtasks/:id/attachments
// @desc    Upload attachments to a subtask
// @access  Private (Manager who created the subtask)
router.post('/subtasks/:id/attachments', auth, authorize('Manager'), upload.array('attachments', 10), async (req, res) => {
  try {
    const subtask = await SubTask.findById(req.params.id);
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    // Verify the manager created this subtask
    const manager = await Manager.findOne({ mid: req.user._id });
    if (!manager || subtask.createdBy.toString() !== manager._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to add attachments to this subtask' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const newAttachments = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      uploadedAt: new Date()
    }));

    subtask.attachments.push(...newAttachments);
    await subtask.save();

    res.json({
      success: true,
      message: 'Files uploaded successfully',
      attachments: subtask.attachments
    });
  } catch (error) {
    console.error('Upload subtask attachments error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/tasks/subtasks/:id/attachments
// @desc    Get all attachments for a subtask
// @access  Private (Manager who created, or Staff assigned to subtask)
router.get('/subtasks/:id/attachments', auth, async (req, res) => {
  try {
    const subtask = await SubTask.findById(req.params.id);
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    // Check access - Manager who created or Staff assigned
    if (req.user.role === 'Manager') {
      const manager = await Manager.findOne({ mid: req.user._id });
      if (!manager || subtask.createdBy.toString() !== manager._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to access attachments' });
      }
    } else if (req.user.role === 'Staff') {
      const staff = await Staff.findOne({ sid: req.user._id });
      if (!staff || subtask.assigned_to.toString() !== staff._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to access attachments' });
      }
    } else if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to access attachments' });
    }

    res.json({
      success: true,
      attachments: subtask.attachments
    });
  } catch (error) {
    console.error('Get subtask attachments error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/tasks/subtasks/:id/attachments/:attachmentId
// @desc    Download a subtask attachment
// @access  Private (Manager who created, or Staff assigned to subtask)
router.get('/subtasks/:id/attachments/:attachmentId', auth, async (req, res) => {
  try {
    const subtask = await SubTask.findById(req.params.id);
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    // Check access - Manager who created or Staff assigned
    if (req.user.role === 'Manager') {
      const manager = await Manager.findOne({ mid: req.user._id });
      if (!manager || subtask.createdBy.toString() !== manager._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to access this attachment' });
      }
    } else if (req.user.role === 'Staff') {
      const staff = await Staff.findOne({ sid: req.user._id });
      if (!staff || subtask.assigned_to.toString() !== staff._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to access this attachment' });
      }
    } else if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to access this attachment' });
    }

    const attachment = subtask.attachments.id(req.params.attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', attachment.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    res.download(filePath, attachment.originalName);
  } catch (error) {
    console.error('Download subtask attachment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/tasks/subtasks/:id/attachments/:attachmentId
// @desc    Delete a subtask attachment
// @access  Private (Manager who created the subtask)
router.delete('/subtasks/:id/attachments/:attachmentId', auth, authorize('Manager'), async (req, res) => {
  try {
    const subtask = await SubTask.findById(req.params.id);
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    // Verify the manager created this subtask
    const manager = await Manager.findOne({ mid: req.user._id });
    if (!manager || subtask.createdBy.toString() !== manager._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete attachments from this subtask' });
    }

    const attachment = subtask.attachments.id(req.params.attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '..', 'uploads', attachment.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from database
    subtask.attachments.pull(req.params.attachmentId);
    await subtask.save();

    res.json({
      success: true,
      message: 'Attachment deleted successfully',
      attachments: subtask.attachments
    });
  } catch (error) {
    console.error('Delete subtask attachment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ====================== TASK ATTACHMENTS ======================

// @route   POST /api/tasks/:id/attachments
// @desc    Upload attachments to a task
// @access  Private (Admin only)
router.post('/:id/attachments', auth, authorize('Admin'), upload.array('attachments', 10), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const newAttachments = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      uploadedAt: new Date()
    }));

    task.attachments.push(...newAttachments);
    await task.save();

    res.json({
      success: true,
      message: 'Files uploaded successfully',
      attachments: task.attachments
    });
  } catch (error) {
    console.error('Upload attachments error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/tasks/:id/attachments/:attachmentId
// @desc    Download an attachment
// @access  Private (Admin, Manager assigned to task)
router.get('/:id/attachments/:attachmentId', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check access - Admin or assigned Manager
    if (req.user.role === 'Manager') {
      const manager = await Manager.findOne({ mid: req.user._id });
      if (!manager || task.assigned_to.toString() !== manager._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to access this attachment' });
      }
    } else if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to access this attachment' });
    }

    const attachment = task.attachments.id(req.params.attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', attachment.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    res.download(filePath, attachment.originalName);
  } catch (error) {
    console.error('Download attachment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/tasks/:id/attachments/:attachmentId
// @desc    Delete an attachment
// @access  Private (Admin only)
router.delete('/:id/attachments/:attachmentId', auth, authorize('Admin'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const attachment = task.attachments.id(req.params.attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '..', 'uploads', attachment.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from database
    task.attachments.pull(req.params.attachmentId);
    await task.save();

    res.json({
      success: true,
      message: 'Attachment deleted successfully',
      attachments: task.attachments
    });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/tasks/:id/attachments
// @desc    Get all attachments for a task
// @access  Private (Admin, Manager assigned to task)
router.get('/:id/attachments', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check access - Admin or assigned Manager
    if (req.user.role === 'Manager') {
      const manager = await Manager.findOne({ mid: req.user._id });
      if (!manager || task.assigned_to.toString() !== manager._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to access attachments' });
      }
    } else if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to access attachments' });
    }

    res.json({
      success: true,
      attachments: task.attachments
    });
  } catch (error) {
    console.error('Get attachments error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
