# 🚀 QUICK START - Admin Login Setup

## Step 1: Run Seed Script
```bash
cd etms-backend
npm run seed
```

## Step 2: Login Credentials

### 🔐 Admin Account (Primary)
```
Role: Admin
Username: admin
Password: admin123
```

### 👔 Manager Accounts
```
Manager 1:
  Username: manager1
  Password: manager123
  Department: Production

Manager 2:
  Username: manager2
  Password: manager123
  Department: Quality Assurance
```

### 👨‍💼 Staff Accounts
```
Staff 1 - Mike Johnson:
  Username: staff1
  Password: staff123

Staff 2 - Sarah Williams:
  Username: staff2
  Password: staff123

Staff 3 - David Brown:
  Username: staff3
  Password: staff123
```

## Step 3: Start Application
```bash
# Terminal 1 - Backend
cd etms-backend
npm run dev

# Terminal 2 - Frontend
npm run dev
```

## Step 4: Login
1. Open http://localhost:3000
2. Select Role: **Admin**
3. Enter Username: **admin**
4. Enter Password: **admin123**
5. Click Login

## What You Can Do as Admin

✅ **Manage Users**
- Create, Edit, Delete Managers and Staff
- Filter by role and search by name/email
- Set user status (Active/Inactive)

✅ **Create Tasks**
- Assign tasks to managers
- Set priorities and due dates
- Attach files

✅ **View Dashboard**
- Task statistics
- System overview

✅ **View All Tasks**
- Filter by status
- Search by task name
- See manager tasks only

✅ **Generate Reports**
- Monthly task reports
- User activity reports
- Task summaries

## Database Collections Created

The seed script automatically creates three collections:

- **admin** - Admin user(s)
- **manager** - Manager user(s) with department field
- **staff** - Staff user(s) linked to their managers

---

**Note:** Each role has its own separate user collection in MongoDB. This provides:
- Better data isolation
- Role-specific fields (e.g., department for managers/staff)
- Cleaner architecture
- Easier to scale features per role

For detailed information, see `ADMIN_SETUP.md`
