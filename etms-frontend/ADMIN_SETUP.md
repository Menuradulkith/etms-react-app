# Admin Account Setup Guide

## Quick Start - Login to Admin Account

Since there is no signup endpoint for admin accounts, you need to seed the database with an admin user.

### Step 1: Run the Seed Script

Navigate to the backend directory and run:

```bash
cd etms-backend
npm run seed
```

### Step 2: Login Credentials

After running the seed script, use these credentials to log in:

#### Admin Account
- **Username:** `admin`
- **Password:** `admin123`
- **Role:** Admin

#### Manager Accounts
- **Manager 1:**
  - Username: `manager1`
  - Password: `manager123`
  - Department: Production

- **Manager 2:**
  - Username: `manager2`
  - Password: `manager123`
  - Department: Quality Assurance

#### Staff Accounts
- **Staff 1 (Mike Johnson):**
  - Username: `staff1`
  - Password: `staff123`
  - Department: Production
  - Designation: Machine Operator

- **Staff 2 (Sarah Williams):**
  - Username: `staff2`
  - Password: `staff123`
  - Department: Quality Assurance
  - Designation: QA Inspector

- **Staff 3 (David Brown):**
  - Username: `staff3`
  - Password: `staff123`
  - Department: Production
  - Designation: Supervisor

## What the Seed Script Does

The `seed.js` script:

1. **Connects to MongoDB** using the URI from your `.env` file
2. **Creates Admin User** in the Admin collection
3. **Creates Manager Users** in the Manager collection with department assignments
4. **Creates Staff Users** in the Staff collection with department and designation, linked to managers
5. **Displays all login credentials** in the console

## Database Collections Created

The seed script creates users in three separate MongoDB collections:

- **Admin** - Admin user(s)
- **Manager** - Manager user(s) with department field
- **Staff** - Staff user(s) with department, designation, and createdBy reference

## Running the Seed Script

### Command
```bash
npm run seed
```

### Expected Output
```
✓ Connected to MongoDB
✓ Admin user created
✓ Manager users created
✓ Staff users created

=================================
Database seeded successfully!
=================================

Login Credentials:

Admin:
  Username: admin
  Password: admin123

Manager 1:
  Username: manager1
  Password: manager123

Manager 2:
  Username: manager2
  Password: manager123

Staff 1:
  Username: staff1
  Password: staff123

Staff 2:
  Username: staff2
  Password: staff123

Staff 3:
  Username: staff3
  Password: staff123

=================================
```

## How to Login

1. Open the application in your browser (typically `http://localhost:3000`)
2. Go to the Login page
3. Select Role: **Admin**
4. Enter Username: **admin**
5. Enter Password: **admin123**
6. Click Login

## Creating More Admin Accounts

Currently, there is no admin signup feature. To create additional admin accounts:

1. **Option 1:** Edit `seed.js` and add more admin users, then re-run `npm run seed`
2. **Option 2:** Manually insert admin documents into MongoDB using MongoDB Compass or shell:

```javascript
db.admins.insertOne({
  name: "Another Admin",
  username: "admin2",
  email: "admin2@harischandramills.com",
  password: "your_hashed_password", // Must be hashed with bcrypt
  status: "Active",
  createdAt: new Date(),
  updatedAt: new Date()
})
```

## Database Structure

### Admin Collection
```javascript
{
  _id: ObjectId,
  name: String,
  username: String (unique),
  email: String (unique),
  password: String (hashed with bcrypt),
  status: String ("Active" or "Inactive"),
  createdAt: Date,
  updatedAt: Date
}
```

### Manager Collection
```javascript
{
  _id: ObjectId,
  name: String,
  username: String (unique),
  email: String (unique),
  password: String (hashed with bcrypt),
  department: String,
  status: String ("Active" or "Inactive"),
  createdAt: Date,
  updatedAt: Date
}
```

### Staff Collection
```javascript
{
  _id: ObjectId,
  name: String,
  username: String (unique),
  email: String (unique),
  password: String (hashed with bcrypt),
  department: String,
  designation: String,
  status: String ("Active" or "Inactive"),
  createdBy: ObjectId (reference to Manager),
  createdAt: Date,
  updatedAt: Date
}
```

## Troubleshooting

### "Cannot find module './models/Admin'"
- Make sure all three model files exist: `Admin.js`, `Manager.js`, `Staff.js`

### "Connection refused"
- Check that MongoDB is running
- Verify `MONGODB_URI` in your `.env` file is correct
- Example: `MONGODB_URI=mongodb://localhost:27017/etms`

### "Duplicate key error"
- The seed script might have already been run and users exist
- Either delete the collections or uncomment the clear commands in `seed.js`:
  ```javascript
  await Admin.deleteMany({});
  await Manager.deleteMany({});
  await Staff.deleteMany({});
  ```

### "Password is invalid"
- Make sure you're using the exact password from the seed script output
- Default admin password is: `admin123`

## Next Steps

After logging in as Admin, you can:

1. **Create/Manage Users** - Go to User Management to add/edit/delete managers and staff
2. **Create Tasks** - Create tasks and assign them to managers
3. **View Dashboard** - See system statistics and task overview
4. **Generate Reports** - Create and download reports
5. **Manage Staff** - Through manager accounts that you created
