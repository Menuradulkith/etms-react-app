const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['comment', 'attachment', 'status_update', 'task_assigned', 'subtask_assigned', 'task_completed', 'subtask_completed'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  // The user who will receive the notification
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'recipientModel',
    required: true
  },
  recipientModel: {
    type: String,
    enum: ['Admin', 'Manager', 'User', 'Staff'],
    required: true
  },
  // The user who triggered the notification
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'senderModel'
  },
  senderModel: {
    type: String,
    enum: ['Admin', 'Manager', 'Staff']
  },
  senderName: String,
  // Related task or subtask
  relatedTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  relatedSubTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubTask'
  },
  taskNo: String,
  subtaskNo: String,
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
