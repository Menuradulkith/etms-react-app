import React, { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, X } from 'lucide-react';
import { authAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import './ChangePasswordModal.css';

const ChangePasswordModal = ({ isOpen, onClose, onPasswordChanged, isFirstLogin = false }) => {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password validation
  const passwordValidations = {
    minLength: newPassword.length >= 8,
    hasUppercase: /[A-Z]/.test(newPassword),
    hasLowercase: /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    matches: newPassword === confirmPassword && newPassword !== ''
  };

  const isPasswordValid = passwordValidations.minLength && 
    passwordValidations.hasUppercase && 
    passwordValidations.hasLowercase && 
    passwordValidations.hasNumber &&
    passwordValidations.matches;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Please fill in all required fields');
      return;
    }

    if (!isFirstLogin && !currentPassword) {
      setError('Please enter your current password');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (!isPasswordValid) {
      setError('Password does not meet the requirements');
      return;
    }

    setLoading(true);
    try {
      if (isFirstLogin) {
        await authAPI.forceChangePassword(newPassword);
      } else {
        await authAPI.changePassword(currentPassword, newPassword);
      }
      
      toast.success('Password changed successfully!');
      
      // Update user data in localStorage to reflect mustChangePassword = false
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        userData.mustChangePassword = false;
        localStorage.setItem('user', JSON.stringify(userData));
      }
      
      onPasswordChanged();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to change password';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!isFirstLogin) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="change-password-overlay">
      <div className="change-password-modal">
        <div className="change-password-header">
          <div className="header-content">
            <Lock size={24} className="header-icon" />
            <div>
              <h2>{isFirstLogin ? 'Create New Password' : 'Change Password'}</h2>
              <p>
                {isFirstLogin 
                  ? 'For security, please set a new password for your account'
                  : 'Enter your current password and choose a new one'}
              </p>
            </div>
          </div>
          {!isFirstLogin && (
            <button className="close-btn" onClick={handleClose}>
              <X size={20} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="change-password-form">
          {!isFirstLogin && (
            <div className="form-group">
              <label>
                <Lock size={16} />
                Current Password
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
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
          )}

          <div className="form-group">
            <label>
              <Lock size={16} />
              New Password <span className="required">*</span>
            </label>
            <div className="password-input-wrapper">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
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

          <div className="form-group">
            <label>
              <Lock size={16} />
              Confirm New Password <span className="required">*</span>
            </label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
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
              <li className={passwordValidations.minLength ? 'valid' : ''}>
                {passwordValidations.minLength ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                At least 8 characters
              </li>
              <li className={passwordValidations.hasUppercase ? 'valid' : ''}>
                {passwordValidations.hasUppercase ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                One uppercase letter
              </li>
              <li className={passwordValidations.hasLowercase ? 'valid' : ''}>
                {passwordValidations.hasLowercase ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                One lowercase letter
              </li>
              <li className={passwordValidations.hasNumber ? 'valid' : ''}>
                {passwordValidations.hasNumber ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                One number
              </li>
              <li className={passwordValidations.hasSpecial ? 'valid' : ''}>
                {passwordValidations.hasSpecial ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                One special character (recommended)
              </li>
              <li className={passwordValidations.matches ? 'valid' : ''}>
                {passwordValidations.matches ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                Passwords match
              </li>
            </ul>
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="form-actions">
            {!isFirstLogin && (
              <button type="button" className="btn-cancel" onClick={handleClose}>
                Cancel
              </button>
            )}
            <button 
              type="submit" 
              className="btn-submit" 
              disabled={loading || !isPasswordValid}
            >
              {loading ? 'Changing Password...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
