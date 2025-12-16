const mongoose = require('mongoose');

// Report entity according to ER diagram
// task_id (FK), subtask_id (FK), task-name, submitted_by, date, comment
const reportSchema = new mongoose.Schema({
  task_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  subtask_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubTask'
  },
  task_name: {
    type: String,
    required: [true, 'Task name is required'],
    trim: true
  },
  submitted_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  comment: {
    type: String,
    required: [true, 'Comment is required']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);
