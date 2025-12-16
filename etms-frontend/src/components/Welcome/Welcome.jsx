import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ClipboardList, Users, BarChart3 } from 'lucide-react';
import logo from '../../assets/Harischandra_Mills_logo.jpg';
import './Welcome.css';

const Welcome = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/login');
  };

  return (
    <div className="welcome-page">
      <div className="welcome-container">
        <div className="welcome-header">
          <img src={logo} alt="Harischandra Mills Logo" className="welcome-logo" />
          <h1 className="welcome-title">Harischandra Mills</h1>
          <h2 className="welcome-subtitle">Employee Task Management System</h2>
        </div>

        <div className="welcome-description">
          <p>
            Streamline your workflow, manage tasks efficiently, and boost productivity 
            with our comprehensive task management solution.
          </p>
        </div>

        <div className="welcome-features">
          <div className="feature-card">
            <div className="feature-icon">
              <ClipboardList size={32} />
            </div>
            <h3>Task Management</h3>
            <p>Create, assign, and track tasks with ease</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <Users size={32} />
            </div>
            <h3>Team Collaboration</h3>
            <p>Work together seamlessly across departments</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <BarChart3 size={32} />
            </div>
            <h3>Reports & Analytics</h3>
            <p>Monitor performance with detailed insights</p>
          </div>
        </div>

        <button className="btn-get-started" onClick={handleGetStarted}>
          Get Started
          <ArrowRight size={20} />
        </button>

        <div className="welcome-footer">
          <p>&copy; {new Date().getFullYear()} Harischandra Mills. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
