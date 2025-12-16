const mongoose = require('mongoose');
const User = require('./models/User');
const Admin = require('./models/Admin');
const Manager = require('./models/Manager');
const Staff = require('./models/Staff');
require('dotenv').config();

const seedUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Admin
    let adminUser = await User.findOne({ user_name: 'admin' });
    if (!adminUser) {
      adminUser = new User({
        user_name: 'admin',
        email: 'admin@harischandramills.com',
        password: 'admin123',
        role: 'Admin',
        status: 'Active'
      });
      await adminUser.save();
      const admin = new Admin({
        aid: adminUser._id,
        name: 'Admin User'
      });
      await admin.save();
      console.log('✓ Admin user created');
    } else {
      console.log('✓ Admin user already exists');
    }

    // Manager
    let manager1User = await User.findOne({ user_name: 'manager1' });
    if (!manager1User) {
      manager1User = new User({
        user_name: 'manager1',
        email: 'john.doe@harischandramills.com',
        password: 'manager123',
        role: 'Manager',
        status: 'Active'
      });
      await manager1User.save();
      const manager1 = new Manager({
        mid: manager1User._id,
        name: 'John Doe',
        email: 'john.doe@harischandramills.com',
        department: 'Production'
      });
      await manager1.save();
      console.log('✓ Manager user created');
    } else {
      console.log('✓ Manager user already exists');
    }

    // Staff
    let staff1User = await User.findOne({ user_name: 'staff1' });
    if (!staff1User) {
      staff1User = new User({
        user_name: 'staff1',
        email: 'mike.johnson@harischandramills.com',
        password: 'staff123',
        role: 'Staff',
        status: 'Active'
      });
      await staff1User.save();
      const staff1 = new Staff({
        sid: staff1User._id,
        name: 'Mike Johnson',
        email: 'mike.johnson@harischandramills.com',
        department: 'Production'
      });
      await staff1.save();
      console.log('✓ Staff user created');
    } else {
      console.log('✓ Staff user already exists');
    }

    console.log('\n=================================');
    console.log('Database seeded successfully!');
    console.log('=================================\n');
    console.log('Login Credentials:\n');
    console.log('Admin:');
    console.log('  Username: admin');
    console.log('  Password: admin123\n');
    console.log('Manager 1:');
    console.log('  Username: manager1');
    console.log('  Password: manager123\n');
    console.log('Staff 1:');
    console.log('  Username: staff1');
    console.log('  Password: staff123\n');
    console.log('=================================\n');

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedUsers();
