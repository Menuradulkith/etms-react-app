import React, { useState, useEffect } from 'react';
import { UserPlus, Edit2, Trash2 } from 'lucide-react';
import { usersAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import '../Admin/UserManagement.css';

const ManagerUserManagement = () => {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, userId: null });
  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users whenever search term changes
  useEffect(() => {
    filterUsers(searchTerm);
  }, [users, searchTerm]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await usersAPI.getStaffForManager();
      // Filter out the current user (should not be in list anyway as they're a manager)
      const filteredUsers = response.data.users.filter(user => user._id !== currentUser?.id);
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching staff users:', error);
      toast.error('Failed to load staff users');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = (search) => {
    let filtered = users;

    // Filter by search term (name or username)
    if (search.trim() !== '') {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(user =>
        (user.name && user.name.toLowerCase().includes(searchLower)) ||
        (user.username && user.username.toLowerCase().includes(searchLower)) ||
        (user.email && user.email.toLowerCase().includes(searchLower))
      );
    }

    setFilteredUsers(filtered);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleAddUser = () => {
    setShowModal(true);
    setEditingId(null);
    setNewUser({ name: '', username: '', email: '', password: '', confirmPassword: '' });
    setError('');
  };

  const handleEdit = (user) => {
    setEditingId(user._id);
    setNewUser({
      name: user.name || '',
      username: user.username || '',
      email: user.email || '',
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
          department: newUser.department
        };
        // Only include password if it's not empty
        if (newUser.password && newUser.password.trim() !== '') {
          updateData.password = newUser.password;
        }
        await usersAPI.updateStaffByManager(editingId, updateData);
        toast.success('Staff user updated successfully!');
      } else {
        // Create new staff user
        await usersAPI.createStaffByManager(newUser);
        toast.success('Staff user created successfully!');
      }
      setShowModal(false);
      setEditingId(null);
      setNewUser({ name: '', username: '', email: '', department: '', password: '', confirmPassword: '' });
      fetchUsers();
    } catch (error) {
      console.error('Error saving staff user:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save staff user';
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
      await usersAPI.deleteStaffByManager(userId);
      fetchUsers();
      toast.success('Staff user deleted successfully!');
      setConfirmModal({ isOpen: false, userId: null });
    } catch (error) {
      console.error('Error deleting staff user:', error);
      toast.error(error.response?.data?.message || 'Failed to delete staff user');
    }
  };

  const handleCancelDelete = () => {
    setConfirmModal({ isOpen: false, userId: null });
  };

  return (
    <div className="user-management">
      <div className="page-header">
        <h1 className="page-title">Staff Management</h1>
        <button className="btn-add-user" onClick={handleAddUser} disabled={loading}>
          <UserPlus size={20} />
          Add New Staff
        </button>
      </div>
      
      {error && !showModal && <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
      
      {/* Search Section */}
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
      </div>
      
      {loading && !showModal ? (
        <div>Loading staff users...</div>
      ) : (
        <div className="table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Department</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center' }}>No staff users found</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>{user.username}</td>
                    <td>{user.email || '-'}</td>
                    <td>{user.department || '-'}</td>
                    <td>
                      <span className={`status-badge ${user.status?.toLowerCase()}`}>
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
            <h2>{editingId ? 'Edit Staff' : 'Add New Staff'}</h2>
            {error && <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Full Name <span style={{color: 'red'}}>*</span></label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  disabled={loading}
                  placeholder="Enter full name"
                  required
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
                  disabled={loading || editingId}
                  placeholder="Enter email address"
                  autoComplete="off"
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
              <div className="modal-buttons">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? (editingId ? 'Updating...' : 'Adding...') : (editingId ? 'Update Staff' : 'Add Staff')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title="Delete Staff"
        message="Are you sure you want to delete this staff user? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isDangerous={true}
      />
    </div>
  );
};

export default ManagerUserManagement;
