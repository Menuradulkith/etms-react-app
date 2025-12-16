const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Admin entity according to ER diagram
// aid (FK to User), name
const adminSchema = new mongoose.Schema({
  aid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Admin', adminSchema);
