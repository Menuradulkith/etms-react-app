import React, { useState } from 'react';
import { Settings, User, Lock, Eye, EyeOff, AlertCircle, CheckCircle, X } from 'lucide-react';
import { authAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import './AdminSettingsModal.css';

const AdminSettingsModal = ({ isOpen, onClose }) => {
  const toast = useToast();
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password validation (only if new password is provided)
  const passwordValidations = newPassword ? {
    minLength: newPassword.length >= 8,
    hasUppercase: /[A-Z]/.test(newPassword),
    hasLowercase: /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    matches: newPassword === confirmPassword
  } : null;

  const isPasswordValid = !newPassword || (
    passwordValidations?.minLength && 
    passwordValidations?.hasUppercase && 
    passwordValidations?.hasLowercase && 
    passwordValidations?.hasNumber &&
    passwordValidations?.matches
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!currentPassword) {
      setError('Current password is required');
      return;
    }

    if (!newUsername && !newPassword) {
      setError('Please enter a new username or password to update');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword && !isPasswordValid) {
      setError('Password does not meet the requirements');
      return;
    }

    setLoading(true);
    try {
      await authAPI.updateProfile(
        currentPassword,
        newUsername || undefined,
        newPassword || undefined
      );
      
      toast.success('Profile updated successfully!');
      
      // If username was changed, logout and redirect to login
      if (newUsername) {
        toast.info('Username changed. Please login again with your new credentials.');
        setTimeout(() => {
          logout();
        }, 1500);
      } else {
        handleClose();
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update profile';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewUsername('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="admin-settings-overlay">
      <div className="admin-settings-modal">
        <div className="admin-settings-header">
          <div className="header-content">
            <Settings size={24} className="header-icon" />
            <div>
              <h2>Admin Settings</h2>
              <p>Update your username or password</p>
            </div>
          </div>
          <button className="close-btn" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="admin-settings-form">
          <div className="current-info">
            <p><strong>Current Username:</strong> {user?.username || 'N/A'}</p>
          </div>

          <div className="form-section">
            <h3>
              <Lock size={18} />
              Verify Identity
            </h3>
            <div className="form-group">
              <label>
                Current Password <span className="required">*</span>
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>
              <User size={18} />
              Change Username (Optional)
            </h3>
            <div className="form-group">
              <label>New Username</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter new username (leave empty to keep current)"
                autoComplete="off"
              />
              {newUsername && (
                <p className="field-note">
                  <AlertCircle size={14} />
                  Changing username will require you to login again
                </p>
              )}
            </div>
          </div>

          <div className="form-section">
            <h3>
              <Lock size={18} />
              Change Password (Optional)
            </h3>
            <div className="form-group">
              <label>New Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (leave empty to keep current)"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {newPassword && (
              <>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="password-requirements">
                  <h4>Password Requirements:</h4>
                  <ul>
                    <li className={passwordValidations?.minLength ? 'valid' : ''}>
                      {passwordValidations?.minLength ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                      At least 8 characters
                    </li>
                    <li className={passwordValidations?.hasUppercase ? 'valid' : ''}>
                      {passwordValidations?.hasUppercase ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                      One uppercase letter
                    </li>
                    <li className={passwordValidations?.hasLowercase ? 'valid' : ''}>
                      {passwordValidations?.hasLowercase ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                      One lowercase letter
                    </li>
                    <li className={passwordValidations?.hasNumber ? 'valid' : ''}>
                      {passwordValidations?.hasNumber ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                      One number
                    </li>
                    <li className={passwordValidations?.hasSpecial ? 'valid' : ''}>
                      {passwordValidations?.hasSpecial ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                      One special character (recommended)
                    </li>
                    <li className={passwordValidations?.matches ? 'valid' : ''}>
                      {passwordValidations?.matches ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                      Passwords match
                    </li>
                  </ul>
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={handleClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-submit" 
              disabled={loading || !currentPassword || (!newUsername && !newPassword) || !isPasswordValid}
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminSettingsModal;
