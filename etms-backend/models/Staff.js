const mongoose = require('mongoose');

// Staff entity according to ER diagram
// sid (FK to User), name, department, email
const staffSchema = new mongoose.Schema({
  sid: {
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

module.exports = mongoose.model('Staff', staffSchema);
