import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { User, Lock, Shield, LogIn, RotateCcw, ArrowLeft } from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal/ChangePasswordModal';
import logo from '../assets/Harischandra_Mills_logo.jpg';
import './Login.css';

const Login = () => {
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Select');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingRole, setPendingRole] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const navigateToRole = (userRole) => {
    switch(userRole) {
      case 'Admin':
        navigate('/admin');
        break;
      case 'Manager':
        navigate('/manager');
        break;
      case 'Staff':
        navigate('/staff');
        break;
      default:
        toast.error('Invalid role selected');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password || role === 'Select') {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    const result = await login(username, password, role);
    setLoading(false);
    
    if (result.success) {
      // Check if user must change password on first login
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        if (userData.mustChangePassword) {
          setPendingRole(role);
          setShowPasswordModal(true);
          return;
        }
      }
      
      // Navigate based on role
      navigateToRole(role);
    } else {
      toast.error(result.message || 'Invalid credentials');
    }
  };

  const handlePasswordChanged = () => {
    setShowPasswordModal(false);
    toast.success('Password updated successfully! Welcome to ETMS.');
    navigateToRole(pendingRole);
  };

  const handleClear = () => {
    setUsername('');
    setPassword('');
    setRole('Select');
    setError('');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <Link to="/" className="back-link">
            <ArrowLeft size={16} />
            Back to Home
          </Link>
          <img src={logo} alt="Harischandra Mills Logo" className="login-logo" />
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">Sign in to continue to ETMS</p>
        </div>
        
        <div className="login-form-wrapper">
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label>
                <User size={16} className="label-icon" />
                Username
              </label>
              <div className="input-wrapper">
                
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div className="form-group">
              <label>
                <Lock size={16} className="label-icon" />
                Password
              </label>
              <div className="input-wrapper">
                
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div className="form-group">
              <label>
                <Shield size={16} className="label-icon" />
                Role
              </label>
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                className="role-select"
              >
                <option value="Select">Select your role</option>
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Staff">Staff</option>
              </select>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="button-group">
              <button type="submit" className="btn-login" disabled={loading}>
                <LogIn size={18} />
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <button type="button" className="btn-clear" onClick={handleClear}>
                <RotateCcw size={18} />
                Clear
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* First Login Password Change Modal */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => {}}
        onPasswordChanged={handlePasswordChanged}
        isFirstLogin={true}
      />
    </div>
  );
};

export default Login;
