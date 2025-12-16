const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const Manager = require('./models/Manager');
const Staff = require('./models/Staff');
require('dotenv').config();

const seedUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');


    // Create admin user
    const admin = new Admin({
      name: 'Admin User',
      username: 'admin',
      email: 'admin@harischandramills.com',
      password: 'admin123',
      status: 'Active'
    });
    await admin.save();
    console.log('✓ Admin user created');

    // Create manager users
    const manager1 = new Manager({
      name: 'John Doe',
      username: 'manager1',
      email: 'john.doe@harischandramills.com',
      password: 'manager123',
      department: 'Production',
      status: 'Active'
    });
    await manager1.save();

    console.log('✓ Manager users created');

    // Create staff users
    const staff1 = new Staff({
      name: 'Mike Johnson',
      username: 'staff1',
      email: 'mike.johnson@harischandramills.com',
      password: 'staff123',
      department: 'Production',
      designation: 'Machine Operator',
      status: 'Active',
      createdBy: manager1._id
    });
    await staff1.save();

    console.log('✓ Staff users created');

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
