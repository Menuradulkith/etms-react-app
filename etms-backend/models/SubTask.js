const mongoose = require('mongoose');

// SubTask entity according to ER diagram
// subtask_id, subtask_name, description, due_date, status, assigned_to (Staff)
const subTaskSchema = new mongoose.Schema({
  subtask_id: {
    type: String,
    unique: true
  },
  subtask_name: {
    type: String,
    required: [true, 'Subtask name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  due_date: {
    type: Date,
    required: [true, 'Due date is required']
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  assigned_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  task_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Manager',
    required: true
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    mimetype: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  completedAt: Date
}, {
  timestamps: true
});

// Generate subtask number before saving (ST0001, ST0002, etc.)
subTaskSchema.pre('save', async function(next) {
  if (!this.subtask_id) {
    try {
      let subtaskId;
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        const lastSubTask = await mongoose.model('SubTask').findOne({})
          .sort({ subtask_id: -1 })
          .select('subtask_id');
        
        let nextNumber = 1;
        if (lastSubTask && lastSubTask.subtask_id) {
          const lastNumber = parseInt(lastSubTask.subtask_id.substring(2));
          nextNumber = lastNumber + 1;
        }
        
        subtaskId = `ST${String(nextNumber).padStart(4, '0')}`;
        
        const existing = await mongoose.model('SubTask').findOne({ subtask_id: subtaskId });
        if (!existing) {
          this.subtask_id = subtaskId;
          break;
        }
        
        attempts++;
      }
      
      if (!this.subtask_id) {
        return next(new Error('Failed to generate unique subtask number'));
      }
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Update completedAt when status changes to Completed
subTaskSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'Completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('SubTask', subTaskSchema);
