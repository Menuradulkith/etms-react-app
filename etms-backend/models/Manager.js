const mongoose = require('mongoose');

// Manager entity according to ER diagram
// mid (FK to User), name, department, email
const managerSchema = new mongoose.Schema({
  mid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Manager', managerSchema);
