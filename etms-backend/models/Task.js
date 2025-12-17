const mongoose = require('mongoose');

// Task entity according to ER diagram
// task_id, task_name, description, due_date, status, assigned_to (Manager)
const taskSchema = new mongoose.Schema({
  task_id: {
    type: String,
    unique: true
  },
  task_name: {
    type: String,
    required: [true, 'Task name is required'],
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
    ref: 'Manager',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'attachments.uploadedByModel'
    },
    uploadedByModel: {
      type: String,
      enum: ['Admin', 'Manager']
    },
    uploadedByName: String,
    category: {
      type: String,
      enum: ['task_file', 'work_file'],
      default: 'task_file'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    text: {
      type: String,
      required: true
    },
    commentBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'comments.commentByModel'
    },
    commentByModel: {
      type: String,
      enum: ['Admin', 'Manager']
    },
    commentByName: String,
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  completedAt: Date
}, {
  timestamps: true
});

// Generate task number before saving (T0001, T0002, etc.)
taskSchema.pre('save', async function(next) {
  if (!this.task_id) {
    try {
      let taskId;
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        const lastTask = await mongoose.model('Task').findOne({})
          .sort({ task_id: -1 })
          .select('task_id');
        
        let nextNumber = 1;
        if (lastTask && lastTask.task_id) {
          const lastNumber = parseInt(lastTask.task_id.substring(1));
          nextNumber = lastNumber + 1;
        }
        
        taskId = `T${String(nextNumber).padStart(4, '0')}`;
        
        const existing = await mongoose.model('Task').findOne({ task_id: taskId });
        if (!existing) {
          this.task_id = taskId;
          break;
        }
        
        attempts++;
      }
      
      if (!this.task_id) {
        return next(new Error('Failed to generate unique task number'));
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
taskSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'Completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Task', taskSchema);
