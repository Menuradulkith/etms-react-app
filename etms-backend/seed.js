const mongoose = require('mongoose');
const User = require('./models/User');
const Admin = require('./models/Admin');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Check if admin already exists
    let adminUser = await User.findOne({ user_name: 'admin' });
    if (!adminUser) {
      // Create admin user
      adminUser = new User({
        user_name: 'admin',
        email: 'admin@harischandramills.com',
        password: 'admin123',
        role: 'Admin',
        status: 'Active',
        mustChangePassword: true
      });
      await adminUser.save();
      
      // Create admin profile
      const admin = new Admin({
        aid: adminUser._id,
        name: 'System Administrator',
        email: 'admin@harischandramills.com'
      });
      await admin.save();
      
      console.log('✓ Default admin user created');
    } else {
      console.log('✓ Admin user already exists');
    }

    console.log('\n=================================');
    console.log('Database seeded successfully!');
    console.log('=================================\n');
    console.log('Default Admin Credentials:\n');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('\n  Note: Admin will be required to change password on first login.');
    console.log('\n=================================\n');

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    mongoose.connection.close();
    process.exit(1);
  }
};

seedAdmin();
