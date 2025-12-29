const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Department name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
// Unique name only among active departments (partial index)
departmentSchema.index(
  { name: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);
// Helpful filter index
departmentSchema.index({ isActive: 1 });

module.exports = mongoose.model('Department', departmentSchema);