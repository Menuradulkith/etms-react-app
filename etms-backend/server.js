const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');
const activityRoutes = require('./routes/activities');
const notificationRoutes = require('./routes/notifications');
const departmentRoutes = require('./routes/departments');
const Department = require('./models/Department');

const app = express();

// CORS Configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
  console.log('✓ MongoDB Connected Successfully');
  // Ensure Department indexes are correct (allow re-adding deleted names)
  try {
    // Drop legacy global unique index on name if exists
    const indexes = await Department.collection.indexes();
    const legacyNameIndex = indexes.find(i => i.name === 'name_1');
    if (legacyNameIndex && legacyNameIndex.unique) {
      await Department.collection.dropIndex('name_1');
      console.log('• Dropped legacy Department name_1 unique index');
    }
    // Create partial unique index for active departments
    await Department.collection.createIndex(
      { name: 1 },
      { unique: true, partialFilterExpression: { isActive: true } }
    );
    console.log('• Ensured partial unique index on Department.name (isActive=true)');
  } catch (idxErr) {
    console.error('Index setup warning:', idxErr?.message || idxErr);
  }
})
.catch((err) => console.error('✗ MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/departments', departmentRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'ETMS API Server',
    version: '1.0.0',
    status: 'running'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});
