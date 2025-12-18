import React, { useState, useEffect } from 'react';
import { UserPlus, Edit2, Trash2 } from 'lucide-react';
import { usersAPI, departmentsAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useDepartments } from '../../context/DepartmentContext';
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import SearchableSelect from '../SearchableSelect/SearchableSelect';
import './UserManagement.css';

const UserManagement = () => {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const { departments: contextDepartments, fetchDepartments } = useDepartments();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, userId: null, userRole: null });
  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    email: '',
    role: 'Staff',
    department: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchDepartments(); // Fetch departments when component mounts
  }, [fetchDepartments]);

  // Update local departments when context departments change
  useEffect(() => {
    const userDepts = [...new Set(users.map(u => u.department).filter(Boolean))];
    const allDepts = [...new Set([...contextDepartments, ...userDepts])].sort();
    setDepartments(allDepts);
  }, [contextDepartments, users]);

  // Filter users whenever search term or filters change
  useEffect(() => {
    filterUsers(searchTerm, roleFilter, departmentFilter);
  }, [users, searchTerm, roleFilter, departmentFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await usersAPI.getAll();
      // Filter out the current admin user
      const filteredUsers = response.data.users.filter(user => user._id !== currentUser?.id);
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = (search, role, department) => {
    let filtered = users;

    // Filter by role
    if (role !== 'All') {
      filtered = filtered.filter(user => user.role === role);
    }

    // Filter by department
    if (department !== 'All') {
      filtered = filtered.filter(user => user.department === department);
    }

    // Filter by search term (name or username)
    if (search.trim() !== '') {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(user =>
        (user.name && user.name.toLowerCase().includes(searchLower)) ||
        (user.username && user.username.toLowerCase().includes(searchLower))
      );
    }

    setFilteredUsers(filtered);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleRoleFilterChange = (e) => {
    setRoleFilter(e.target.value);
  };

  const handleDepartmentFilterChange = (e) => {
    setDepartmentFilter(e.target.value);
  };

  const handleAddUser = () => {
    setShowModal(true);
    setEditingId(null);
    setNewUser({ name: '', username: '', email: '', role: 'Staff', department: '', password: '', confirmPassword: '' });
    setError('');
  };

  const handleEdit = (user) => {
    setEditingId(user._id);
    setEditingRole(user.role);
    setNewUser({
      name: user.name || '',
      username: user.username || '',
      email: user.email || '',
      role: user.role,
      department: user.department || '',
      password: '',
      confirmPassword: ''
    });
    setShowModal(true);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate required fields for new user
    if (!editingId) {
      if (!newUser.name || !newUser.username || !newUser.email || !newUser.password) {
        const errorMsg = 'Username, Email, Name, and Password are required';
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newUser.email)) {
        const errorMsg = 'Please enter a valid email address';
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }
    }

    // Validate password match
    if (newUser.password && newUser.password !== newUser.confirmPassword) {
      setError('Passwords do not match');
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      if (editingId) {
        // Update existing user - don't send empty password
        const updateData = {
          name: newUser.name,
          email: newUser.email,
          department: newUser.department
        };
        // Only include password if it's not empty
        if (newUser.password && newUser.password.trim() !== '') {
          updateData.password = newUser.password;
        }
        await usersAPI.update(editingId, updateData);
        toast.success('User updated successfully!');
      } else {
        // Create new user
        await usersAPI.create(newUser);
        toast.success('User created successfully!');
      }
      setShowModal(false);
      setEditingId(null);
      setEditingRole(null);
      setNewUser({ name: '', username: '', email: '', role: 'Staff', department: '', password: '', confirmPassword: '' });
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save user';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id) => {
    setConfirmModal({ isOpen: true, userId: id });
  };

  const handleConfirmDelete = async () => {
    const { userId } = confirmModal;
    try {
      await usersAPI.delete(userId);
      fetchUsers();
      toast.success('User deleted successfully!');
      setConfirmModal({ isOpen: false, userId: null, userRole: null });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleCancelDelete = () => {
    setConfirmModal({ isOpen: false, userId: null, userRole: null });
  };

  return (
    <div className="user-management">
      <div className="page-header">
        <h1 className="page-title">User Management</h1>
        <button className="btn-add-user" onClick={handleAddUser} disabled={loading}>
          <UserPlus size={20} />
          Add New User
        </button>
      </div>
      
      {error && !showModal && <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
      
      {/* Filter and Search Section */}
      <div className="filter-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name, username, or email..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>
        <div className="role-filter">
          <label htmlFor="department-select">Filter by Department:</label>
          <select
            id="department-select"
            value={departmentFilter}
            onChange={handleDepartmentFilterChange}
            className="filter-select"
          >
            <option value="All">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
        <div className="role-filter">
          <label htmlFor="role-select">Filter by Role:</label>
          <select
            id="role-select"
            value={roleFilter}
            onChange={handleRoleFilterChange}
            className="filter-select"
          >
            <option value="All">All Roles</option>
            <option value="Manager">Manager</option>
            <option value="Staff">Staff</option>
          </select>
        </div>
      </div>
      
      {loading && !showModal ? (
        <div>Loading users...</div>
      ) : (
        <div className="table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center' }}>No users found</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>{user.username}</td>
                    <td>{user.email || '-'}</td>
                    <td>
                      <span className={`role-badge role-${user.role.toLowerCase()}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>{user.department || '-'}</td>
                    <td>
                      <span className={`status-badge ${user.status.toLowerCase()}`}>
                        {user.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="action-btn btn-edit" 
                          onClick={() => handleEdit(user)}
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          className="action-btn btn-delete" 
                          onClick={() => handleDeleteClick(user._id)}
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? 'Edit User' : 'Add New User'}</h2>
            {error && <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  disabled={loading}
                  placeholder="Enter full name"
                />
              </div>
              <div className="form-group">
                <label>Username <span style={{color: 'red'}}>*</span></label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  required
                  disabled={loading || editingId}
                  autoComplete="off"
                  placeholder="Enter username"
                />
              </div>
              <div className="form-group">
                <label>Email <span style={{color: 'red'}}>*</span></label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                  disabled={loading}
                  placeholder="Enter email address"
                  autoComplete="off"
                />
              </div>
              <div className="form-group">
                <label>Department <span style={{color: 'red'}}>*</span></label>
                <SearchableSelect
                  options={departments.map(dept => ({ label: dept, value: dept }))}
                  value={newUser.department}
                  onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  placeholder="Select or type department"
                  searchPlaceholder="Search departments..."
                  disabled={loading}
                  allowCustom={true}
                />
              </div>
              <div className="form-group">
                <label>Password <span style={{color: 'red'}}>*</span></label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required={!editingId}
                  minLength={6}
                  disabled={loading}
                  placeholder={editingId ? 'Leave empty to keep current password' : 'Enter password'}
                  autoComplete="new-password"
                />
              </div>
              <div className="form-group">
                <label>Confirm Password <span style={{color: 'red'}}>*</span></label>
                <input
                  type="password"
                  value={newUser.confirmPassword}
                  onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                  required={!editingId || newUser.password !== ''}
                  minLength={6}
                  disabled={loading}
                  placeholder={editingId ? 'Confirm new password' : 'Confirm password'}
                  autoComplete="new-password"
                />
              </div>
              <div className="form-group">
                <label>Role <span style={{color: 'red'}}>*</span></label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  disabled={loading || editingId}
                >
                  <option value="Manager">Manager</option>
                  <option value="Staff">Staff</option>
                </select>
              </div>
              <div className="modal-buttons">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? (editingId ? 'Updating...' : 'Adding...') : (editingId ? 'Update User' : 'Add User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isDangerous={true}
      />
    </div>
  );
};


export default UserManagement;