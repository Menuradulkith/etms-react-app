import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useDepartments } from '../../context/DepartmentContext';
import { usersAPI, departmentsAPI } from '../../services/api';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  CheckSquare, 
  FileText, 
  LogOut,
  UserCircle2,
  Building2,
  Plus,
  X,
  Trash2
} from 'lucide-react';
import DashboardOverview from './DashboardOverview';
import UserManagement from './UserManagement';
import CreateTask from './CreateTask';
import AllTasks from './AllTasks';
import Reports from './Reports';
import Notifications from '../Notifications/Notifications';
import './AdminDashboard.css';
import logo from '../../assets/Harischandra_Mills_logo.jpg';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const toast = useToast();
  const { 
    departments: contextDepartments, 
    loading: loadingDepts, 
    createDepartment, 
    deleteDepartment,
    fetchDepartments 
  } = useDepartments();
  
  // Department modal state
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');

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

  const handleOpenDeptModal = async () => {
    setShowDeptModal(true);
    await fetchDepartments();
  };

  const handleAddDepartment = async () => {
    if (!newDeptName.trim()) {
      toast.error('Please enter a department name');
      return;
    }
    if (contextDepartments.includes(newDeptName.trim())) {
      toast.error('Department already exists');
      return;
    }

    try {
      await createDepartment({ 
        name: newDeptName.trim(),
        description: ''
      });
      
      setNewDeptName('');
      toast.success(`Department "${newDeptName.trim()}" created successfully`);
    } catch (error) {
      console.error('Error creating department:', error);
      toast.error(error.response?.data?.message || 'Failed to create department');
    }
  };

  const handleDeleteDepartment = async (deptName) => {
    try {
      // Find the department ID from the backend
      const response = await departmentsAPI.getAll();
      const dept = response.data.departments.find(d => d.name === deptName);
      
      if (dept) {
        await deleteDepartment(dept._id);
        toast.success(`Department "${deptName}" deleted successfully`);
      } else {
        toast.error('Department not found');
      }
    } catch (error) {
      console.error('Error deleting department:', error);
      toast.error('Failed to delete department');
    }
  };

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
          <button className="dept-btn" onClick={handleOpenDeptModal} title="Manage Departments">
            <Building2 size={20} />
          </button>
          <Notifications />
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

      {/* Department Management Modal */}
      {showDeptModal && (
        <div className="modal-overlay" onClick={() => setShowDeptModal(false)}>
          <div className="dept-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="dept-modal-header">
              <h2><Building2 size={24} /> Manage Departments</h2>
              <button className="close-btn" onClick={() => setShowDeptModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="dept-modal-body">
              <div className="dept-add-section">
                <input
                  type="text"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="Enter new department name..."
                  className="dept-input"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddDepartment()}
                />
                <button className="dept-add-btn" onClick={handleAddDepartment}>
                  <Plus size={18} />
                  Add
                </button>
              </div>

              <div className="dept-list-section">
                <h3>Existing Departments ({contextDepartments.length})</h3>
                {loadingDepts ? (
                  <p className="dept-loading">Loading departments...</p>
                ) : contextDepartments.length === 0 ? (
                  <p className="dept-empty">No departments found. Add one above.</p>
                ) : (
                  <ul className="dept-list">
                    {contextDepartments.map((dept) => (
                      <li key={dept} className="dept-item">
                        <span className="dept-name">{dept}</span>
                        <button 
                          className="dept-delete-btn" 
                          onClick={() => handleDeleteDepartment(dept)}
                          title="Remove from list"
                        >
                          <Trash2 size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <p className="dept-note">
                Note: Departments created here are saved in the database and can be assigned to users. Deleting removes the department permanently.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
