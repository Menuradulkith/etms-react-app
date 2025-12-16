import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { tasksAPI, activitiesAPI } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import { 
  LayoutDashboard, 
  ClipboardList, 
  CheckSquare,
  ListChecks,
  LogOut,
  UserCircle2,
  Clock,
  Edit,
  Paperclip,
  Download,
  FileText,
  X
} from 'lucide-react';
import '../Admin/AdminDashboard.css';
import '../Admin/AllTasks.css';
import '../Admin/DashboardOverview.css';
import logo from '../../assets/Harischandra_Mills_logo.jpg';

const StaffDashboard = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '' },
    { id: 'mytasks', label: 'My Assigned Tasks', icon: ClipboardList, path: 'mytasks' },
    { id: 'completed', label: 'Completed Tasks', icon: CheckSquare, path: 'completed' },
  ];

  // Sync activeMenu with current URL
  const getActiveMenuFromPath = () => {
    const currentPath = location.pathname.replace('/staff/', '').replace('/staff', '');
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
    navigate(`/staff/${item.path}`);
  };

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <UserCircle2 size={32} />
          <h2>Welcome, {user?.name || 'Staff'}</h2>
        </div>
        <div className="header-right">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        <aside className="sidebar">
          <div className="sidebar-header">
            <img src={logo} alt="Harischandra Mills" className="sidebar-logo" />
            <p>ETMS - Staff</p>
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

        <main className="main-content">
          <Routes>
            <Route path="/" element={<StaffDashboardOverview />} />
            <Route path="mytasks" element={<MyAssignedTasks />} />
            <Route path="completed" element={<CompletedTasks />} />
            <Route path="*" element={<Navigate to="/staff" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const StaffDashboardOverview = () => {
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, inProgress: 0 });
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await tasksAPI.getStats();
        const data = response.data.stats;
        // Staff sees only their subtask stats
        setStats({ 
          total: data.subtasks?.total || 0,
          pending: data.subtasks?.pending || 0,
          inProgress: data.subtasks?.inProgress || 0,
          completed: data.subtasks?.completed || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    fetchStats();
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const response = await activitiesAPI.getRecent(10);
      setActivities(response.data.activities || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoadingActivities(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'subtask_created':
        return <ClipboardList size={16} />;
      case 'subtask_completed':
        return <CheckSquare size={16} />;
      case 'subtask_updated':
        return <Edit size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  const getActivityColor = (type) => {
    if (type.includes('created')) return '#10b981';
    if (type.includes('completed')) return '#3b82f6';
    if (type.includes('updated')) return '#f59e0b';
    return '#6b7280';
  };

  return (
    <div className="dashboard-overview">
      <h1 className="page-title">Dashboard Overview</h1>
      <div className="stats-grid">
        <div className="stat-card" style={{ borderLeftColor: '#3b82f6' }}>
          <div className="stat-icon" style={{ backgroundColor: '#dbeafe', color: '#3b82f6' }}>
            <ClipboardList size={28} />
          </div>
          <div className="stat-info">
            <h3>Total Tasks</h3>
            <p className="stat-value">{stats.total}</p>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#f59e0b' }}>
          <div className="stat-icon" style={{ backgroundColor: '#fef3c7', color: '#f59e0b' }}>
            <Clock size={28} />
          </div>
          <div className="stat-info">
            <h3>Pending</h3>
            <p className="stat-value">{stats.pending}</p>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#8b5cf6' }}>
          <div className="stat-icon" style={{ backgroundColor: '#ede9fe', color: '#8b5cf6' }}>
            <ListChecks size={28} />
          </div>
          <div className="stat-info">
            <h3>In Progress</h3>
            <p className="stat-value">{stats.inProgress}</p>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#10b981' }}>
          <div className="stat-icon" style={{ backgroundColor: '#d1fae5', color: '#10b981' }}>
            <CheckSquare size={28} />
          </div>
          <div className="stat-info">
            <h3>Completed</h3>
            <p className="stat-value">{stats.completed}</p>
          </div>
        </div>
      </div>

      <div className="recent-activity">
        <h2>Recent Activities</h2>
        <div className="activity-list">
          {loadingActivities ? (
            <p className="loading-text">Loading activities...</p>
          ) : activities.length === 0 ? (
            <p className="no-activities">No recent activities</p>
          ) : (
            activities.map((activity) => (
              <div key={activity._id} className="activity-item">
                <div 
                  className="activity-indicator" 
                  style={{ backgroundColor: getActivityColor(activity.type) }}
                >
                  {getActivityIcon(activity.type)}
                </div>
                <div className="activity-content">
                  <p className="activity-text">{activity.description}</p>
                  <span className="activity-time">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const MyAssignedTasks = () => {
  const toast = useToast();
  const [subtasks, setSubtasks] = useState([]);
  const [filteredSubtasks, setFilteredSubtasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [viewingSubtaskAttachments, setViewingSubtaskAttachments] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  useEffect(() => {
    fetchSubtasks();
  }, []);

  useEffect(() => {
    filterSubtasks();
  }, [subtasks, searchTerm, statusFilter, priorityFilter]);

  const fetchSubtasks = async () => {
    setLoading(true);
    try {
      // Fetch subtasks assigned to this staff member (filtered by backend)
      const response = await tasksAPI.getSubtasks();
      // Filter for non-completed subtasks
      const pendingSubtasks = (response.data.subtasks || []).filter(
        st => st.status !== 'Completed'
      );
      setSubtasks(pendingSubtasks);
    } catch (error) {
      console.error('Error fetching subtasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSubtasks = () => {
    let filtered = subtasks;

    if (statusFilter !== 'All') {
      filtered = filtered.filter(st => st.status === statusFilter);
    }

    if (priorityFilter !== 'All') {
      filtered = filtered.filter(st => st.priority === priorityFilter);
    }

    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(st =>
        st.subtaskNo?.toLowerCase().includes(searchLower) ||
        st.subtaskName?.toLowerCase().includes(searchLower) ||
        st.description?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredSubtasks(filtered);
  };

  const handleSearchChange = (e) => setSearchTerm(e.target.value);
  const handleStatusFilterChange = (e) => setStatusFilter(e.target.value);
  const handlePriorityFilterChange = (e) => setPriorityFilter(e.target.value);

  const handleStatusUpdate = async (subtaskId, newStatus) => {
    try {
      await tasksAPI.updateSubtaskStatus(subtaskId, newStatus);
      if (newStatus === 'Completed') {
        // Remove from list if completed
        setSubtasks(subtasks.filter(st => st._id !== subtaskId));
      } else {
        setSubtasks(subtasks.map(st => 
          st._id === subtaskId ? { ...st, status: newStatus } : st
        ));
      }
      toast.success('Task status updated!');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  // Attachment handlers
  const handleOpenAttachments = (subtask) => {
    setViewingSubtaskAttachments(subtask);
    setShowAttachmentsModal(true);
  };

  const handleCloseAttachments = () => {
    setShowAttachmentsModal(false);
    setViewingSubtaskAttachments(null);
  };

  const handleDownloadAttachment = async (attachmentId, originalName) => {
    try {
      const response = await tasksAPI.downloadSubtaskAttachment(viewingSubtaskAttachments._id, attachmentId);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      toast.error('Failed to download attachment');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="all-tasks">
      <h1 className="page-title">My Assigned Tasks</h1>
      
      {/* Filter and Search Section */}
      <div className="filter-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by task no, name, or description..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>
        <div className="status-filter">
          <label htmlFor="status-filter">Status:</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="filter-select"
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
          </select>
        </div>
        <div className="status-filter">
          <label htmlFor="priority-filter">Priority:</label>
          <select
            id="priority-filter"
            value={priorityFilter}
            onChange={handlePriorityFilterChange}
            className="filter-select"
          >
            <option value="All">All Priority</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p>Loading tasks...</p>
      ) : filteredSubtasks.length === 0 ? (
        <p>No tasks assigned to you</p>
      ) : (
        <div className="table-container">
          <table className="tasks-table">
            <thead>
              <tr>
                <th>Task No</th>
                <th>Task Name</th>
                <th>Description</th>
                <th>Due Date</th>
                <th>Priority</th>
                <th>Files</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubtasks.map((subtask) => (
                <tr key={subtask._id}>
                  <td>{subtask.subtaskNo}</td>
                  <td>{subtask.subtaskName}</td>
                  <td>{subtask.description?.substring(0, 50)}...</td>
                  <td>{new Date(subtask.dueDate).toLocaleDateString()}</td>
                  <td>
                    <span className={`priority-badge priority-${subtask.priority?.toLowerCase() || 'medium'}`}>
                      {subtask.priority || 'Medium'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="action-btn btn-attachments"
                      onClick={() => handleOpenAttachments(subtask)}
                      title="View Attachments"
                    >
                      <Paperclip size={16} />
                      <span className="attachment-count">{subtask.attachments?.length || 0}</span>
                    </button>
                  </td>
                  <td>
                    <span className={`status-badge status-${subtask.status.toLowerCase().replace(' ', '-')}`}>
                      {subtask.status}
                    </span>
                  </td>
                  <td>
                    <select 
                      value={subtask.status} 
                      onChange={(e) => handleStatusUpdate(subtask._id, e.target.value)}
                      className="status-select"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Attachments Modal (View Only for Staff) */}
      {showAttachmentsModal && viewingSubtaskAttachments && (
        <div className="modal-overlay" onClick={handleCloseAttachments}>
          <div className="modal-content attachments-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Attachments - {viewingSubtaskAttachments.subtaskName}</h2>
              <button className="close-btn" onClick={handleCloseAttachments}>
                <X size={20} />
              </button>
            </div>

            <div className="existing-attachments">
              <h3>Files ({viewingSubtaskAttachments.attachments?.length || 0})</h3>
              {viewingSubtaskAttachments.attachments && viewingSubtaskAttachments.attachments.length > 0 ? (
                <div className="attachments-list">
                  {viewingSubtaskAttachments.attachments.map((attachment) => (
                    <div key={attachment._id} className="attachment-item">
                      <FileText size={20} />
                      <div className="attachment-info">
                        <span className="attachment-name">{attachment.originalName}</span>
                        <span className="attachment-size">{formatFileSize(attachment.size)}</span>
                      </div>
                      <button
                        className="btn-download"
                        onClick={() => handleDownloadAttachment(attachment._id, attachment.originalName)}
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-attachments">No attachments for this task</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CompletedTasks = () => {
  const toast = useToast();
  const [subtasks, setSubtasks] = useState([]);
  const [filteredSubtasks, setFilteredSubtasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [viewingSubtaskAttachments, setViewingSubtaskAttachments] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');

  useEffect(() => {
    fetchSubtasks();
  }, []);

  useEffect(() => {
    filterSubtasks();
  }, [subtasks, searchTerm, priorityFilter]);

  const fetchSubtasks = async () => {
    setLoading(true);
    try {
      const response = await tasksAPI.getSubtasks({ status: 'Completed' });
      setSubtasks(response.data.subtasks || []);
    } catch (error) {
      console.error('Error fetching subtasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSubtasks = () => {
    let filtered = subtasks;

    if (priorityFilter !== 'All') {
      filtered = filtered.filter(st => st.priority === priorityFilter);
    }

    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(st =>
        st.subtaskNo?.toLowerCase().includes(searchLower) ||
        st.subtaskName?.toLowerCase().includes(searchLower) ||
        st.description?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredSubtasks(filtered);
  };

  const handleSearchChange = (e) => setSearchTerm(e.target.value);
  const handlePriorityFilterChange = (e) => setPriorityFilter(e.target.value);

  // Attachment handlers
  const handleOpenAttachments = (subtask) => {
    setViewingSubtaskAttachments(subtask);
    setShowAttachmentsModal(true);
  };

  const handleCloseAttachments = () => {
    setShowAttachmentsModal(false);
    setViewingSubtaskAttachments(null);
  };

  const handleDownloadAttachment = async (attachmentId, originalName) => {
    try {
      const response = await tasksAPI.downloadSubtaskAttachment(viewingSubtaskAttachments._id, attachmentId);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      toast.error('Failed to download attachment');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="all-tasks">
      <h1 className="page-title">Completed Tasks</h1>
      
      {/* Filter and Search Section */}
      <div className="filter-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by task no, name, or description..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>
        <div className="status-filter">
          <label htmlFor="priority-filter">Priority:</label>
          <select
            id="priority-filter"
            value={priorityFilter}
            onChange={handlePriorityFilterChange}
            className="filter-select"
          >
            <option value="All">All Priority</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p>Loading tasks...</p>
      ) : filteredSubtasks.length === 0 ? (
        <p>No completed tasks yet</p>
      ) : (
        <div className="table-container">
          <table className="tasks-table">
            <thead>
              <tr>
                <th>Task No</th>
                <th>Task Name</th>
                <th>Description</th>
                <th>Due Date</th>
                <th>Priority</th>
                <th>Files</th>
                <th>Completed At</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubtasks.map((subtask) => (
                <tr key={subtask._id}>
                  <td>{subtask.subtaskNo}</td>
                  <td>{subtask.subtaskName}</td>
                  <td>{subtask.description?.substring(0, 50)}...</td>
                  <td>{new Date(subtask.dueDate).toLocaleDateString()}</td>
                  <td>
                    <span className={`priority-badge priority-${subtask.priority?.toLowerCase() || 'medium'}`}>
                      {subtask.priority || 'Medium'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="action-btn btn-attachments"
                      onClick={() => handleOpenAttachments(subtask)}
                      title="View Attachments"
                    >
                      <Paperclip size={16} />
                      <span className="attachment-count">{subtask.attachments?.length || 0}</span>
                    </button>
                  </td>
                  <td>{subtask.updatedAt ? new Date(subtask.updatedAt).toLocaleDateString() : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Attachments Modal (View Only for Staff) */}
      {showAttachmentsModal && viewingSubtaskAttachments && (
        <div className="modal-overlay" onClick={handleCloseAttachments}>
          <div className="modal-content attachments-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Attachments - {viewingSubtaskAttachments.subtaskName}</h2>
              <button className="close-btn" onClick={handleCloseAttachments}>
                <X size={20} />
              </button>
            </div>

            <div className="existing-attachments">
              <h3>Files ({viewingSubtaskAttachments.attachments?.length || 0})</h3>
              {viewingSubtaskAttachments.attachments && viewingSubtaskAttachments.attachments.length > 0 ? (
                <div className="attachments-list">
                  {viewingSubtaskAttachments.attachments.map((attachment) => (
                    <div key={attachment._id} className="attachment-item">
                      <FileText size={20} />
                      <div className="attachment-info">
                        <span className="attachment-name">{attachment.originalName}</span>
                        <span className="attachment-size">{formatFileSize(attachment.size)}</span>
                      </div>
                      <button
                        className="btn-download"
                        onClick={() => handleDownloadAttachment(attachment._id, attachment.originalName)}
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-attachments">No attachments for this task</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;
