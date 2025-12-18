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
const Notification = require('../models/Notification');
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
      const staff = await Staff.findOne({ sid: req.user.id });
      if (staff) query.assigned_to = staff._id;
    } else if (req.user.role === 'Manager') {
      // Manager should see subtasks for tasks assigned to them
      // This includes subtasks created by Admin (unassigned) and subtasks they created
      const manager = await Manager.findOne({ mid: req.user.id });
      if (manager) {
        // Find all tasks assigned to this manager
        const managerTasks = await Task.find({ assigned_to: manager._id }).select('_id');
        const taskIds = managerTasks.map(t => t._id);
        query.task_id = { $in: taskIds };
      }
    }

    const subtasks = await SubTask.find(query)
      .populate({
        path: 'assigned_to',
        populate: { path: 'sid', select: 'user_name' }
      })
      .populate('createdBy')
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
      const manager = await Manager.findOne({ mid: req.user.id });
      if (manager) {
        taskQuery.assigned_to = manager._id;
        // Manager stats show only their tasks, not subtasks they created
        subtaskQuery._id = null; // This ensures no subtasks are counted for manager
      }
    } else if (req.user.role === 'Staff') {
      const staff = await Staff.findOne({ sid: req.user.id });
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
      const manager = await Manager.findOne({ mid: req.user.id });
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

    // If user is Admin, include subtasks for each task
    let tasksWithSubtasks = tasks;
    if (req.user.role === 'Admin') {
      tasksWithSubtasks = await Promise.all(tasks.map(async (task) => {
        const subtasks = await SubTask.find({ task_id: task._id })
          .populate({
            path: 'assigned_to',
            populate: { path: 'sid', select: 'user_name' }
          })
          .populate('createdBy')
          .sort({ createdAt: -1 });
        
        return {
          ...task.toObject(),
          subtasks: subtasks
        };
      }));
    }

    res.json({
      success: true,
      count: tasksWithSubtasks.length,
      tasks: tasksWithSubtasks
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

    const admin = await Admin.findOne({ aid: req.user.id });
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
// @desc    Create new subtask (Admin creates without assignment, Manager creates with assignment)
// @access  Private (Admin or Manager)
router.post('/subtasks', auth, authorize('Admin', 'Manager'), [
  body('subtask_name').trim().notEmpty().withMessage('Subtask name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('due_date').isISO8601().withMessage('Valid due date is required'),
  body('task_id').notEmpty().withMessage('Parent task is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { subtask_name, description, due_date, assigned_to, task_id, priority } = req.body;

    const task = await Task.findById(task_id);
    if (!task) {
      return res.status(404).json({ message: 'Parent task not found' });
    }

    let createdById = null;
    let createdByModelType = null;
    let staffMember = null;

    if (req.user.role === 'Admin') {
      // Admin creates subtask without assignment
      const admin = await Admin.findOne({ aid: req.user.id });
      if (!admin) {
        return res.status(404).json({ message: 'Admin not found' });
      }
      createdById = admin._id;
      createdByModelType = 'Admin';
    } else if (req.user.role === 'Manager') {
      // Manager creates subtask with assignment
      const manager = await Manager.findOne({ mid: req.user.id });
      if (!manager) {
        return res.status(404).json({ message: 'Manager not found' });
      }
      
      // Verify manager is assigned to this task
      if (task.assigned_to.toString() !== manager._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to create subtask for this task' });
      }

      // Staff assignment is required for Manager
      if (!assigned_to) {
        return res.status(400).json({ message: 'Assigned staff is required' });
      }

      staffMember = await Staff.findById(assigned_to);
      if (!staffMember) {
        return res.status(404).json({ message: 'Assigned staff not found' });
      }

      createdById = manager._id;
      createdByModelType = 'Manager';
    }

    const subtask = new SubTask({
      subtask_name,
      description,
      due_date,
      priority: priority || 'Medium',
      assigned_to: staffMember ? staffMember._id : null,
      task_id: task._id,
      createdBy: createdById,
      createdByModel: createdByModelType
    });

    await subtask.save();

    const populatedSubtask = await SubTask.findById(subtask._id)
      .populate({
        path: 'assigned_to',
        populate: { path: 'sid', select: 'user_name' }
      })
      .populate('createdBy')
      .populate('task_id');

    // Log activity
    const activityDesc = staffMember 
      ? `Subtask "${subtask_name}" created and assigned to ${staffMember.name}`
      : `Subtask "${subtask_name}" created (unassigned)`;
    
    await logActivity({
      type: 'subtask_created',
      description: activityDesc,
      user: req.user,
      relatedId: subtask._id,
      relatedModel: 'SubTask',
      metadata: { 
        subtaskId: subtask.subtask_id, 
        assignedTo: staffMember ? staffMember._id.toString() : null, 
        staffName: staffMember ? staffMember.name : null,
        createdByRole: createdByModelType
      }
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

// @route   PUT /api/tasks/subtasks/:id/assign
// @desc    Assign staff to a subtask (Manager only)
// @access  Private (Manager)
router.put('/subtasks/:id/assign', auth, authorize('Manager'), async (req, res) => {
  try {
    const { assigned_to } = req.body;

    if (!assigned_to) {
      return res.status(400).json({ message: 'Staff member is required' });
    }

    const subtask = await SubTask.findById(req.params.id).populate('task_id');
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    // Verify manager is assigned to the parent task
    const manager = await Manager.findOne({ mid: req.user.id });
    if (!manager) {
      return res.status(404).json({ message: 'Manager not found' });
    }

    if (subtask.task_id.assigned_to.toString() !== manager._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to assign staff to this subtask' });
    }

    const staff = await Staff.findById(assigned_to);
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    subtask.assigned_to = staff._id;
    await subtask.save();

    const populatedSubtask = await SubTask.findById(subtask._id)
      .populate({
        path: 'assigned_to',
        populate: { path: 'sid', select: 'user_name' }
      })
      .populate('task_id');

    // Log activity
    await logActivity({
      type: 'subtask_assigned',
      description: `Subtask "${subtask.subtask_name}" assigned to ${staff.name}`,
      user: req.user,
      relatedId: subtask._id,
      relatedModel: 'SubTask',
      metadata: { 
        subtaskId: subtask.subtask_id, 
        assignedTo: staff._id.toString(), 
        staffName: staff.name 
      }
    });

    res.json({
      success: true,
      message: 'Staff assigned successfully',
      subtask: populatedSubtask
    });
  } catch (error) {
    console.error('Assign subtask error:', error);
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

    let updaterName = 'System';
    let updaterModel = 'Admin';
    let updaterId = null;

    if (req.user.role === 'Manager') {
      const manager = await Manager.findOne({ mid: req.user.id });
      if (task.assigned_to.toString() !== manager._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this task' });
      }
      updaterName = manager.name;
      updaterModel = 'Manager';
      updaterId = manager._id;
    } else if (req.user.role === 'Admin') {
      const admin = await Admin.findOne({ aid: req.user.id });
      updaterName = admin?.name || 'Admin';
      updaterModel = 'Admin';
      updaterId = admin?._id;
    } else {
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

    // Create notifications for status changes
    if (req.body.status === 'Completed') {
      if (req.user.role === 'Manager') {
        // Notify Admin when Manager completes task
        const admin = await Admin.findById(task.createdBy);
        if (admin) {
          await Notification.create({
            type: 'task_completed',
            title: 'Task Completed',
            message: `${updaterName} (Manager) completed task ${task.task_id}: "${task.task_name}"`,
            recipient: admin.aid,
            recipientModel: 'User',
            sender: updaterId,
            senderModel: 'Manager',
            senderName: updaterName,
            relatedTask: task._id,
            taskNo: task.task_id
          });
        }
      } else if (req.user.role === 'Admin') {
        // Notify assigned Manager when Admin completes task
        const manager = await Manager.findById(task.assigned_to);
        if (manager) {
          await Notification.create({
            type: 'task_completed',
            title: 'Task Completed',
            message: `${updaterName} (Admin) marked task ${task.task_id}: "${task.task_name}" as completed`,
            recipient: manager.mid,
            recipientModel: 'User',
            sender: updaterId,
            senderModel: 'Admin',
            senderName: updaterName,
            relatedTask: task._id,
            taskNo: task.task_id
          });
        }
      }
    } else if (req.body.status === 'In Progress' && oldStatus === 'Pending') {
      // Notify when task moves to In Progress
      if (req.user.role === 'Manager') {
        const admin = await Admin.findById(task.createdBy);
        if (admin) {
          await Notification.create({
            type: 'status_update',
            title: 'Task In Progress',
            message: `${updaterName} (Manager) started working on task ${task.task_id}: "${task.task_name}"`,
            recipient: admin.aid,
            recipientModel: 'User',
            sender: updaterId,
            senderModel: 'Manager',
            senderName: updaterName,
            relatedTask: task._id,
            taskNo: task.task_id
          });
        }
      }
    }

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
    const manager = await Manager.findOne({ mid: req.user.id });
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
      .populate('createdBy')
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

    const subtask = await SubTask.findById(req.params.id).populate('task_id');
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    let updaterName = 'System';
    let updaterModel = 'Staff';
    let updaterId = null;

    if (req.user.role === 'Staff') {
      const staff = await Staff.findOne({ sid: req.user.id });
      if (subtask.assigned_to.toString() !== staff._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this subtask' });
      }
      updaterName = staff.name;
      updaterModel = 'Staff';
      updaterId = staff._id;
    } else if (req.user.role === 'Manager') {
      const manager = await Manager.findOne({ mid: req.user.id });
      if (subtask.createdBy.toString() !== manager._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this subtask' });
      }
      updaterName = manager.name;
      updaterModel = 'Manager';
      updaterId = manager._id;
    } else if (req.user.role === 'Admin') {
      const admin = await Admin.findOne({ aid: req.user.id });
      updaterName = admin?.name || 'Admin';
      updaterModel = 'Admin';
      updaterId = admin?._id;
    } else {
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

    // Create notifications for status changes
    const parentTask = subtask.task_id;
    
    if (req.body.status === 'Completed') {
      if (req.user.role === 'Staff') {
        // Notify Manager (subtask creator)
        const manager = await Manager.findById(subtask.createdBy);
        if (manager) {
          await Notification.create({
            type: 'subtask_completed',
            title: 'Subtask Completed',
            message: `${updaterName} (Staff) completed subtask ${subtask.subtask_no}: "${subtask.subtask_name}"`,
            recipient: manager.mid,
            recipientModel: 'User',
            sender: updaterId,
            senderModel: 'Staff',
            senderName: updaterName,
            relatedSubTask: subtask._id,
            subtaskNo: subtask.subtask_no,
            relatedTask: parentTask?._id,
            taskNo: parentTask?.task_id
          });
        }

        // Also notify Manager assigned to parent task (if different)
        if (parentTask && parentTask.assigned_to) {
          const assignedManager = await Manager.findById(parentTask.assigned_to);
          if (assignedManager && (!manager || assignedManager._id.toString() !== manager._id.toString())) {
            await Notification.create({
              type: 'subtask_completed',
              title: 'Subtask Completed',
              message: `${updaterName} (Staff) completed subtask ${subtask.subtask_no}: "${subtask.subtask_name}"`,
              recipient: assignedManager.mid,
              recipientModel: 'User',
              sender: updaterId,
              senderModel: 'Staff',
              senderName: updaterName,
              relatedSubTask: subtask._id,
              subtaskNo: subtask.subtask_no,
              relatedTask: parentTask._id,
              taskNo: parentTask.task_id
            });
          }
        }

        // Notify Admin (task creator)
        if (parentTask && parentTask.createdBy) {
          const admin = await Admin.findById(parentTask.createdBy);
          if (admin) {
            await Notification.create({
              type: 'subtask_completed',
              title: 'Subtask Completed',
              message: `${updaterName} (Staff) completed subtask ${subtask.subtask_no}: "${subtask.subtask_name}"`,
              recipient: admin.aid,
              recipientModel: 'User',
              sender: updaterId,
              senderModel: 'Staff',
              senderName: updaterName,
              relatedSubTask: subtask._id,
              subtaskNo: subtask.subtask_no,
              relatedTask: parentTask._id,
              taskNo: parentTask.task_id
            });
          }
        }
      } else if (req.user.role === 'Manager') {
        // Notify Admin and assigned Staff
        if (parentTask && parentTask.createdBy) {
          const admin = await Admin.findById(parentTask.createdBy);
          if (admin) {
            await Notification.create({
              type: 'subtask_completed',
              title: 'Subtask Completed',
              message: `${updaterName} (Manager) completed subtask ${subtask.subtask_no}: "${subtask.subtask_name}"`,
              recipient: admin.aid,
              recipientModel: 'User',
              sender: updaterId,
              senderModel: 'Manager',
              senderName: updaterName,
              relatedSubTask: subtask._id,
              subtaskNo: subtask.subtask_no,
              relatedTask: parentTask._id,
              taskNo: parentTask.task_id
            });
          }
        }
        
        if (subtask.assigned_to) {
          const staff = await Staff.findById(subtask.assigned_to);
          if (staff) {
            await Notification.create({
              type: 'subtask_completed',
              title: 'Subtask Completed',
              message: `${updaterName} (Manager) marked subtask ${subtask.subtask_no}: "${subtask.subtask_name}" as completed`,
              recipient: staff.sid,
              recipientModel: 'User',
              sender: updaterId,
              senderModel: 'Manager',
              senderName: updaterName,
              relatedSubTask: subtask._id,
              subtaskNo: subtask.subtask_no,
              relatedTask: parentTask?._id,
              taskNo: parentTask?.task_id
            });
          }
        }
      }
    } else if (req.body.status === 'In Progress' && oldStatus === 'Pending') {
      // Notify when subtask moves to In Progress
      if (req.user.role === 'Staff') {
        const manager = await Manager.findById(subtask.createdBy);
        if (manager) {
          await Notification.create({
            type: 'status_update',
            title: 'Subtask In Progress',
            message: `${updaterName} (Staff) started working on subtask ${subtask.subtask_no}: "${subtask.subtask_name}"`,
            recipient: manager.mid,
            recipientModel: 'User',
            sender: updaterId,
            senderModel: 'Staff',
            senderName: updaterName,
            relatedSubTask: subtask._id,
            subtaskNo: subtask.subtask_no,
            relatedTask: parentTask?._id,
            taskNo: parentTask?.task_id
          });
        }
      }
    }

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

    const manager = await Manager.findOne({ mid: req.user.id });
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
      submitted_by: req.user.id,
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
// @access  Private (Admin or Manager)
router.post('/subtasks/:id/attachments', auth, authorize('Admin', 'Manager'), upload.array('attachments', 10), async (req, res) => {
  try {
    const subtask = await SubTask.findById(req.params.id);
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    // Verify authorization - Admin can always add, Manager must have created or be assigned to parent task
    if (req.user.role === 'Manager') {
      const manager = await Manager.findOne({ mid: req.user.id });
      // Manager can add attachments if they created the subtask OR if they're assigned to the parent task
      const parentTask = await Task.findById(subtask.task_id);
      const isCreator = manager && subtask.createdBy && subtask.createdBy.toString() === manager._id.toString();
      const isAssignedManager = manager && parentTask && parentTask.assigned_to && parentTask.assigned_to.toString() === manager._id.toString();
      if (!isCreator && !isAssignedManager) {
        return res.status(403).json({ message: 'Not authorized to add attachments to this subtask' });
      }
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    // Get uploader info
    let uploaderId, uploaderModel, uploaderName;
    if (req.user.role === 'Admin') {
      const admin = await Admin.findOne({ aid: req.user.id });
      uploaderId = admin?._id;
      uploaderModel = 'Admin';
      uploaderName = admin?.name || 'Admin';
    } else if (req.user.role === 'Manager') {
      const manager = await Manager.findOne({ mid: req.user.id });
      uploaderId = manager?._id;
      uploaderModel = 'Manager';
      uploaderName = manager?.name || 'Manager';
    }

    // Determine attachment category - Admin/Manager uploads during task creation are task_file
    // Work-related uploads by staff or ongoing uploads are work_file
    const category = req.body.category || 'work_file';

    const newAttachments = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      uploadedBy: uploaderId,
      uploadedByModel: uploaderModel,
      uploadedByName: uploaderName,
      category: category,
      uploadedAt: new Date()
    }));

    subtask.attachments.push(...newAttachments);
    await subtask.save();

    // Create notifications for file upload
    const parentTask = await Task.findById(subtask.task_id);
    const fileNames = req.files.map(f => f.originalname).join(', ');
    
    if (req.user.role === 'Admin') {
      // Notify assigned Manager
      const manager = await Manager.findById(parentTask.assigned_to);
      if (manager) {
        await Notification.create({
          type: 'attachment',
          title: 'New Attachment on Subtask',
          message: `${uploaderName} (Admin) uploaded files to subtask ${subtask.subtask_no}: ${fileNames}`,
          recipient: manager.mid,
          recipientModel: 'User',
          sender: uploaderId,
          senderModel: 'Admin',
          senderName: uploaderName,
          relatedSubTask: subtask._id,
          subtaskNo: subtask.subtask_no,
          relatedTask: parentTask._id,
          taskNo: parentTask.task_id
        });
      }
      
      // Notify assigned Staff if any
      if (subtask.assigned_to) {
        const staff = await Staff.findById(subtask.assigned_to);
        if (staff) {
          await Notification.create({
            type: 'attachment',
            title: 'New Attachment on Subtask',
            message: `${uploaderName} (Admin) uploaded files to subtask ${subtask.subtask_no}: ${fileNames}`,
            recipient: staff.sid,
            recipientModel: 'User',
            sender: uploaderId,
            senderModel: 'Admin',
            senderName: uploaderName,
            relatedSubTask: subtask._id,
            subtaskNo: subtask.subtask_no,
            relatedTask: parentTask._id,
            taskNo: parentTask.task_id
          });
        }
      }
    } else if (req.user.role === 'Manager') {
      // Notify Admin (task creator)
      const admin = await Admin.findById(parentTask.createdBy);
      if (admin) {
        await Notification.create({
          type: 'attachment',
          title: 'New Attachment on Subtask',
          message: `${uploaderName} (Manager) uploaded files to subtask ${subtask.subtask_no}: ${fileNames}`,
          recipient: admin.aid,
          recipientModel: 'User',
          sender: uploaderId,
          senderModel: 'Manager',
          senderName: uploaderName,
          relatedSubTask: subtask._id,
          subtaskNo: subtask.subtask_no,
          relatedTask: parentTask._id,
          taskNo: parentTask.task_id
        });
      }
      
      // Notify assigned Staff if any
      if (subtask.assigned_to) {
        const staff = await Staff.findById(subtask.assigned_to);
        if (staff) {
          await Notification.create({
            type: 'attachment',
            title: 'New Attachment on Subtask',
            message: `${uploaderName} (Manager) uploaded files to subtask ${subtask.subtask_no}: ${fileNames}`,
            recipient: staff.sid,
            recipientModel: 'User',
            sender: uploaderId,
            senderModel: 'Manager',
            senderName: uploaderName,
            relatedSubTask: subtask._id,
            subtaskNo: subtask.subtask_no,
            relatedTask: parentTask._id,
            taskNo: parentTask.task_id
          });
        }
      }
    }

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
      const manager = await Manager.findOne({ mid: req.user.id });
      if (!manager || subtask.createdBy.toString() !== manager._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to access attachments' });
      }
    } else if (req.user.role === 'Staff') {
      const staff = await Staff.findOne({ sid: req.user.id });
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
      const manager = await Manager.findOne({ mid: req.user.id });
      if (!manager || subtask.createdBy.toString() !== manager._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to access this attachment' });
      }
    } else if (req.user.role === 'Staff') {
      const staff = await Staff.findOne({ sid: req.user.id });
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
// @access  Private (Admin or Manager)
router.delete('/subtasks/:id/attachments/:attachmentId', auth, authorize('Admin', 'Manager'), async (req, res) => {
  try {
    const subtask = await SubTask.findById(req.params.id);
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    // Verify authorization - Admin can always delete, Manager must have created or be assigned to parent task
    if (req.user.role === 'Manager') {
      const manager = await Manager.findOne({ mid: req.user.id });
      const parentTask = await Task.findById(subtask.task_id);
      const isCreator = manager && subtask.createdBy && subtask.createdBy.toString() === manager._id.toString();
      const isAssignedManager = manager && parentTask && parentTask.assigned_to && parentTask.assigned_to.toString() === manager._id.toString();
      if (!isCreator && !isAssignedManager) {
        return res.status(403).json({ message: 'Not authorized to delete attachments from this subtask' });
      }
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

    // Get uploader info (Admin)
    const admin = await Admin.findOne({ aid: req.user.id });
    const uploaderId = admin?._id;
    const uploaderName = admin?.name || 'Admin';
    
    // Category: task_file for initial uploads, work_file for ongoing work
    const category = req.body.category || 'task_file';

    const newAttachments = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      uploadedBy: uploaderId,
      uploadedByModel: 'Admin',
      uploadedByName: uploaderName,
      category: category,
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
      const manager = await Manager.findOne({ mid: req.user.id });
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
      const manager = await Manager.findOne({ mid: req.user.id });
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

// ============================================
// COMMENT ROUTES FOR TASKS
// ============================================

// @route   POST /api/tasks/:id/comments
// @desc    Add a comment to a task (Admin, Manager)
// @access  Private (Admin, Manager)
router.post('/:id/comments', auth, authorize('Admin', 'Manager'), async (req, res) => {
  try {
    const { text, replyTo } = req.body;
    
    if (!text || text.trim() === '') {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    let commentBy, commentByModel, commentByName;

    if (req.user.role === 'Admin') {
      const admin = await Admin.findOne({ aid: req.user.id });
      if (!admin) {
        return res.status(403).json({ message: 'Admin not found' });
      }
      commentBy = admin._id;
      commentByModel = 'Admin';
      commentByName = admin.name;
    } else if (req.user.role === 'Manager') {
      const manager = await Manager.findOne({ mid: req.user.id });
      if (!manager || task.assigned_to.toString() !== manager._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to comment on this task' });
      }
      commentBy = manager._id;
      commentByModel = 'Manager';
      commentByName = manager.name;
    }

    // Get the parent comment text if replying
    let replyToText = null;
    if (replyTo) {
      const parentComment = task.comments.id(replyTo);
      if (parentComment) {
        replyToText = parentComment.text;
      }
    }

    const comment = {
      text: text.trim(),
      commentBy,
      commentByModel,
      commentByName,
      replyTo: replyTo || null,
      replyToText,
      createdAt: new Date()
    };

    task.comments.push(comment);
    await task.save();

    // Create notifications based on who commented
    if (req.user.role === 'Admin') {
      // Notify assigned manager
      const manager = await Manager.findById(task.assigned_to);
      if (manager) {
        await Notification.create({
          type: 'comment',
          title: 'New Comment on Task',
          message: `${commentByName} (Admin) commented on task ${task.task_id}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
          recipient: manager.mid,
          recipientModel: 'User',
          sender: commentBy,
          senderModel: 'Admin',
          senderName: commentByName,
          relatedTask: task._id,
          taskNo: task.task_id
        });
      }
    } else if (req.user.role === 'Manager') {
      // Notify Admin (task creator)
      const admin = await Admin.findById(task.createdBy);
      if (admin) {
        await Notification.create({
          type: 'comment',
          title: 'New Comment on Task',
          message: `${commentByName} (Manager) commented on task ${task.task_id}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
          recipient: admin._id,
          recipientModel: 'Admin',
          sender: commentBy,
          senderModel: 'Manager',
          senderName: commentByName,
          relatedTask: task._id,
          taskNo: task.task_id
        });
      }
    }

    res.json({
      success: true,
      message: 'Comment added successfully',
      comment: task.comments[task.comments.length - 1]
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/tasks/:id/comments
// @desc    Get all comments for a task
// @access  Private (Admin, Manager assigned to task)
router.get('/:id/comments', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check access
    if (req.user.role === 'Manager') {
      const manager = await Manager.findOne({ mid: req.user.id });
      if (!manager || task.assigned_to.toString() !== manager._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to view comments' });
      }
    } else if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to view comments' });
    }

    res.json({
      success: true,
      comments: task.comments
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============================================
// COMMENT ROUTES FOR SUBTASKS
// ============================================

// @route   POST /api/tasks/subtasks/:id/comments
// @desc    Add a comment to a subtask (Staff, Manager, or Admin)
// @access  Private (Staff assigned, Manager assigned to parent task, or Admin)
router.post('/subtasks/:id/comments', auth, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim() === '') {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const subtask = await SubTask.findById(req.params.id).populate('task_id');
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    let commenterId, commenterModel, commenterName;
    let notifyRecipients = [];

    if (req.user.role === 'Staff') {
      // Verify the staff is assigned to this subtask
      const staff = await Staff.findOne({ sid: req.user.id });
      if (!staff || !subtask.assigned_to || subtask.assigned_to.toString() !== staff._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to comment on this subtask' });
      }
      commenterId = staff._id;
      commenterModel = 'Staff';
      commenterName = staff.name;
      
      // Notify Manager (parent task assignee) and Admin (task creator)
      const parentTask = await Task.findById(subtask.task_id);
      if (parentTask?.assigned_to) {
        notifyRecipients.push({ id: parentTask.assigned_to, model: 'Manager' });
      }
      if (parentTask?.createdBy) {
        notifyRecipients.push({ id: parentTask.createdBy, model: 'Admin' });
      }
    } else if (req.user.role === 'Manager') {
      const manager = await Manager.findOne({ mid: req.user.id });
      // Manager can comment if assigned to parent task
      const parentTask = await Task.findById(subtask.task_id);
      if (!manager || !parentTask || parentTask.assigned_to.toString() !== manager._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to comment on this subtask' });
      }
      commenterId = manager._id;
      commenterModel = 'Manager';
      commenterName = manager.name;
      
      // Notify Staff (if assigned) and Admin
      if (subtask.assigned_to) {
        notifyRecipients.push({ id: subtask.assigned_to, model: 'Staff' });
      }
      if (parentTask?.createdBy) {
        notifyRecipients.push({ id: parentTask.createdBy, model: 'Admin' });
      }
    } else if (req.user.role === 'Admin') {
      const admin = await Admin.findOne({ aid: req.user.id });
      commenterId = admin._id;
      commenterModel = 'Admin';
      commenterName = admin?.name || 'Admin';
      
      // Notify Manager (parent task assignee) and Staff (if assigned)
      const parentTask = await Task.findById(subtask.task_id);
      if (parentTask?.assigned_to) {
        notifyRecipients.push({ id: parentTask.assigned_to, model: 'Manager' });
      }
      if (subtask.assigned_to) {
        notifyRecipients.push({ id: subtask.assigned_to, model: 'Staff' });
      }
    } else {
      return res.status(403).json({ message: 'Not authorized to comment' });
    }

    const comment = {
      text: text.trim(),
      commentBy: commenterId,
      commentByModel: commenterModel,
      commentByName: commenterName,
      replyTo: req.body.replyTo || null,
      replyToText: null,
      createdAt: new Date()
    };

    // Get the parent comment text if replying
    if (req.body.replyTo) {
      const parentComment = subtask.comments.id(req.body.replyTo);
      if (parentComment) {
        comment.replyToText = parentComment.text;
      }
    }

    subtask.comments.push(comment);
    await subtask.save();

    // Create notifications for relevant parties
    for (const recipient of notifyRecipients) {
      await Notification.create({
        type: 'comment',
        title: 'New Comment on Subtask',
        message: `${commenterName} (${commenterModel}) commented on subtask ${subtask.subtask_id}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
        recipient: recipient.id,
        recipientModel: recipient.model,
        sender: commenterId,
        senderModel: commenterModel,
        senderName: commenterName,
        relatedSubTask: subtask._id,
        relatedTask: subtask.task_id?._id,
        subtaskNo: subtask.subtask_id,
        taskNo: subtask.task_id?.task_id
      });
    }

    res.json({
      success: true,
      message: 'Comment added successfully',
      comment: subtask.comments[subtask.comments.length - 1]
    });
  } catch (error) {
    console.error('Add subtask comment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/tasks/subtasks/:id/comments
// @desc    Get all comments for a subtask
// @access  Private (Admin, Manager assigned to parent task, Staff assigned to subtask)
router.get('/subtasks/:id/comments', auth, async (req, res) => {
  try {
    const subtask = await SubTask.findById(req.params.id).populate('task_id');
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    // Check access
    if (req.user.role === 'Staff') {
      const staff = await Staff.findOne({ sid: req.user.id });
      if (!staff || !subtask.assigned_to || subtask.assigned_to.toString() !== staff._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to view comments' });
      }
    } else if (req.user.role === 'Manager') {
      const manager = await Manager.findOne({ mid: req.user.id });
      // Manager can view if assigned to parent task
      const parentTask = subtask.task_id;
      if (!manager || !parentTask || parentTask.assigned_to?.toString() !== manager._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to view comments' });
      }
    } else if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to view comments' });
    }

    res.json({
      success: true,
      comments: subtask.comments
    });
  } catch (error) {
    console.error('Get subtask comments error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============================================
// MANAGER ATTACHMENT UPLOAD FOR TASKS
// ============================================

// @route   POST /api/tasks/:id/manager-attachments
// @desc    Manager uploads attachment to their assigned task
// @access  Private (Manager)
router.post('/:id/manager-attachments', auth, authorize('Manager'), upload.array('attachments', 5), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Verify the manager is assigned to this task
    const manager = await Manager.findOne({ mid: req.user.id });
    if (!manager || task.assigned_to.toString() !== manager._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to add attachments to this task' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    // Manager uploads during ongoing work are categorized as work_file
    const category = req.body.category || 'work_file';

    const newAttachments = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      uploadedBy: manager._id,
      uploadedByModel: 'Manager',
      uploadedByName: manager.name,
      category: category,
      uploadedAt: new Date()
    }));

    task.attachments.push(...newAttachments);
    await task.save();

    // Create notification for Admin
    const admin = await Admin.findById(task.createdBy);
    if (admin) {
      await Notification.create({
        type: 'attachment',
        title: 'New Attachment Added',
        message: `${manager.name} added ${req.files.length} attachment(s) to task ${task.task_id}`,
        recipient: admin._id,
        recipientModel: 'Admin',
        sender: manager._id,
        senderModel: 'Manager',
        senderName: manager.name,
        relatedTask: task._id,
        taskNo: task.task_id
      });
    }

    res.json({
      success: true,
      message: 'Attachments uploaded successfully',
      attachments: task.attachments
    });
  } catch (error) {
    console.error('Manager upload attachment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============================================
// STAFF ATTACHMENT UPLOAD FOR SUBTASKS
// ============================================

// @route   POST /api/tasks/subtasks/:id/staff-attachments
// @desc    Staff uploads attachment to their assigned subtask
// @access  Private (Staff)
router.post('/subtasks/:id/staff-attachments', auth, authorize('Staff'), upload.array('attachments', 5), async (req, res) => {
  try {
    const subtask = await SubTask.findById(req.params.id).populate('task_id');
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    // Verify the staff is assigned to this subtask
    const staff = await Staff.findOne({ sid: req.user.id });
    if (!staff || subtask.assigned_to.toString() !== staff._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to add attachments to this subtask' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    // Staff uploads are always work_file (during task execution)
    const newAttachments = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      uploadedBy: staff._id,
      uploadedByModel: 'Staff',
      uploadedByName: staff.name,
      category: 'work_file',
      uploadedAt: new Date()
    }));

    subtask.attachments.push(...newAttachments);
    await subtask.save();

    // Create notification for Manager who created subtask
    const manager = await Manager.findById(subtask.createdBy);
    if (manager) {
      await Notification.create({
        type: 'attachment',
        title: 'New Attachment Added',
        message: `${staff.name} added ${req.files.length} attachment(s) to subtask ${subtask.subtask_id}`,
        recipient: manager.mid,
        recipientModel: 'User',
        sender: staff._id,
        senderModel: 'Staff',
        senderName: staff.name,
        relatedSubTask: subtask._id,
        relatedTask: subtask.task_id?._id,
        subtaskNo: subtask.subtask_id,
        taskNo: subtask.task_id?.task_id
      });
    }

    // Also notify Manager assigned to parent task (if different)
    const parentTask = subtask.task_id;
    if (parentTask && parentTask.assigned_to) {
      const assignedManager = await Manager.findById(parentTask.assigned_to);
      if (assignedManager && (!manager || assignedManager._id.toString() !== manager._id.toString())) {
        await Notification.create({
          type: 'attachment',
          title: 'New Attachment Added',
          message: `${staff.name} added ${req.files.length} attachment(s) to subtask ${subtask.subtask_id}`,
          recipient: assignedManager.mid,
          recipientModel: 'User',
          sender: staff._id,
          senderModel: 'Staff',
          senderName: staff.name,
          relatedSubTask: subtask._id,
          relatedTask: parentTask._id,
          subtaskNo: subtask.subtask_id,
          taskNo: parentTask.task_id
        });
      }
    }

    // Notify Admin (task creator)
    if (parentTask && parentTask.createdBy) {
      const admin = await Admin.findById(parentTask.createdBy);
      if (admin) {
        await Notification.create({
          type: 'attachment',
          title: 'New Attachment Added',
          message: `${staff.name} (Staff) added ${req.files.length} attachment(s) to subtask ${subtask.subtask_id}`,
          recipient: admin.aid,
          recipientModel: 'User',
          sender: staff._id,
          senderModel: 'Staff',
          senderName: staff.name,
          relatedSubTask: subtask._id,
          relatedTask: parentTask._id,
          subtaskNo: subtask.subtask_id,
          taskNo: parentTask.task_id
        });
      }
    }

    res.json({
      success: true,
      message: 'Attachments uploaded successfully',
      attachments: subtask.attachments
    });
  } catch (error) {
    console.error('Staff upload attachment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
