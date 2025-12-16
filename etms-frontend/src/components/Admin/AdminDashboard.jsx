import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  CheckSquare, 
  FileText, 
  LogOut,
  UserCircle2 
} from 'lucide-react';
import DashboardOverview from './DashboardOverview';
import UserManagement from './UserManagement';
import CreateTask from './CreateTask';
import AllTasks from './AllTasks';
import Reports from './Reports';
import './AdminDashboard.css';
import logo from '../../assets/Harischandra_Mills_logo.jpg';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '' },
    { id: 'users', label: 'User Management', icon: Users, path: 'users' },
    { id: 'create', label: 'Create Task', icon: ClipboardList, path: 'create' },
    { id: 'alltasks', label: 'All Tasks', icon: CheckSquare, path: 'tasks' },
    { id: 'reports', label: 'Reports', icon: FileText, path: 'reports' },
  ];

  // Sync activeMenu with current URL
  const getActiveMenuFromPath = () => {
    const currentPath = location.pathname.replace('/admin/', '').replace('/admin', '');
    const menuItem = menuItems.find(item => item.path === currentPath);
    return menuItem ? menuItem.id : 'dashboard';
  };

  const [activeMenu, setActiveMenu] = useState(getActiveMenuFromPath);

  useEffect(() => {
    setActiveMenu(getActiveMenuFromPath());
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMenuClick = (item) => {
    setActiveMenu(item.id);
    navigate(`/admin/${item.path}`);
  };

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <UserCircle2 size={32} />
          <h2>Welcome, {user?.name || 'Admin'}</h2>
        </div>
        <div className="header-right">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <img src={logo} alt="Harischandra Mills" className="sidebar-logo" />
            <p>ETMS - Admin</p>
          </div>
          <nav className="sidebar-nav">
            {menuItems.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${activeMenu === item.id ? 'active' : ''}`}
                onClick={() => handleMenuClick(item)}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<DashboardOverview />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="create" element={<CreateTask />} />
            <Route path="tasks" element={<AllTasks />} />
            <Route path="reports" element={<Reports />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
