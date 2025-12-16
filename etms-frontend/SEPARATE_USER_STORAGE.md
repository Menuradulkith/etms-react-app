# Separate User Account Storage Implementation

## Overview
User accounts for Admin, Manager, and Staff roles are now stored in separate MongoDB collections instead of a single User collection. This provides better data isolation and role-specific fields.

## Changes Made

### Backend Models
1. **Admin.js** - Admin user collection (fields: name, username, email, password, status)
2. **Manager.js** - Manager user collection (fields: name, username, email, password, department, status)
3. **Staff.js** - Staff user collection (fields: name, username, email, password, department, designation, status, createdBy)

### Backend Routes
1. **auth.js**
   - Updated register endpoint to store users in role-specific collections
   - Updated login endpoint to fetch from role-specific collection
   - JWT token now includes role for identification
   - Change password uses role-specific collection

2. **users.js**
   - GET /api/users - Fetches from all role-specific collections
   - GET /api/users/:role/:id - Get specific user from role collection
   - POST /api/users - Creates user in role-specific collection
   - PUT /api/users/:role/:id - Updates user in role-specific collection
   - DELETE /api/users/:role/:id - Deletes user from role-specific collection
   - GET /api/users/managers/list - Fetches active managers
   - GET /api/users/staff/list - Fetches active staff

3. **middleware/auth.js**
   - Updated to decode role from JWT token
   - Fetches user from correct role-specific collection
   - Adds role to req.user object

### Frontend API Service
Updated `src/services/api.js` usersAPI methods:
- `update(id, userData, role)` - Pass role as third parameter for role-based endpoint
- `delete(id, role)` - Pass role as second parameter for role-based endpoint

### Frontend Component
Updated `UserManagement.jsx`:
- Added `editingRole` state to track which role is being edited
- Added `userRole` to confirmModal state for delete operations
- Updated handleDeleteClick to pass role
- Updated handleConfirmDelete to use role in API call

## Database Collections

### Admin Collection
- _id
- name
- username (unique)
- email (unique)
- password (hashed)
- status (Active/Inactive)
- createdAt, updatedAt

### Manager Collection
- _id
- name
- username (unique)
- email (unique)
- password (hashed)
- department
- status (Active/Inactive)
- createdAt, updatedAt

### Staff Collection
- _id
- name
- username (unique)
- email (unique)
- password (hashed)
- department
- designation
- status (Active/Inactive)
- createdBy (reference to Manager creating the staff)
- createdAt, updatedAt

## API Endpoint Changes

### Before
```
PUT /api/users/:id
DELETE /api/users/:id
```

### After
```
PUT /api/users/:role/:id
DELETE /api/users/:role/:id
```

Where role is one of: Admin, Manager, Staff

## JWT Token Structure
Token now includes role for proper user routing:
```
{
  id: userId,
  role: 'Admin'|'Manager'|'Staff'
}
```

## Migration Steps
1. Create new separate models: Admin.js, Manager.js, Staff.js
2. Create new routes/users.js with role-based endpoints
3. Update routes/auth.js for separate authentication
4. Update middleware/auth.js to handle role-based user lookup
5. Update frontend API service methods
6. Update UserManagement component to pass roles
7. Test all CRUD operations for each role

## Backward Compatibility
- Old User model can be kept for reference but is no longer used
- All new data goes to role-specific collections
- Existing User collection data would need to be migrated manually if needed
