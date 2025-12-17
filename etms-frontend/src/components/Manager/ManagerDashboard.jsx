import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { tasksAPI, usersAPI, activitiesAPI } from '../../services/api';
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import Notifications from '../Notifications/Notifications';
import SearchableSelect from '../SearchableSelect/SearchableSelect';
import { formatDistanceToNow } from 'date-fns';
import { 
  LayoutDashboard, 
  ClipboardList, 
  CheckSquare, 
  ListChecks,
  LogOut,
  UserCircle2,
  Eye,
  Paperclip,
  Download,
  FileText,
  X,
  Clock,
  Edit,
  UserPlus,
  Upload,
  Trash2,
  ChevronDown,
  ChevronRight,
  Users,
  MessageSquare,
  FileBarChart,
  Reply,
  Send
} from 'lucide-react';
import '../Admin/AdminDashboard.css';
import '../Admin/AllTasks.css';
import '../Admin/DashboardOverview.css';
import '../Admin/CreateTask.css';
import '../Admin/UserManagement.css';
import logo from '../../assets/Harischandra_Mills_logo.jpg';
import ManagerUserManagement from './ManagerUserManagement';

const ManagerDashboard = () => {
  const toast = useToast();
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, taskId: null });
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '' },
    { id: 'mytasks', label: 'My Tasks', icon: ClipboardList, path: 'mytasks' },
    { id: 'assigned', label: 'Assigned Tasks', icon: ListChecks, path: 'assigned' },
    { id: 'create', label: 'Create Subtask', icon: CheckSquare, path: 'create' },
    { id: 'reports', label: 'Staff Reports', icon: FileBarChart, path: 'reports' },
    { id: 'users', label: 'Staff Management', icon: Users, path: 'users' },
  ];

  // Sync activeMenu with current URL
  const getActiveMenuFromPath = () => {
    const currentPath = location.pathname.replace('/manager/', '').replace('/manager', '');
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
    navigate(`/manager/${item.path}`);
  };

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <UserCircle2 size={32} />
          <h2>Welcome, {user?.name || 'Manager'}</h2>
        </div>
        <div className="header-right">
          <Notifications />
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
            <p>ETMS - Manager</p>
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
            <Route path="/" element={<ManagerDashboardOverview />} />
            <Route path="mytasks" element={<MyTasks />} />
            <Route path="assigned" element={<AssignedTasks />} />
            <Route path="create" element={<CreateSubtask />} />
            <Route path="reports" element={<StaffReports />} />
            <Route path="users" element={<ManagerUserManagement />} />
            <Route path="*" element={<Navigate to="/manager" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const ManagerDashboardOverview = () => {
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, inProgress: 0 });
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await tasksAPI.getStats();
        setStats(response.data.stats);
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
      case 'task_created':
      case 'subtask_created':
        return <ClipboardList size={16} />;
      case 'task_completed':
      case 'subtask_completed':
        return <CheckSquare size={16} />;
      case 'task_updated':
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

const MyTasks = () => {
  const toast = useToast();
  const chatEndRef = useRef(null);
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [viewingTaskAttachments, setViewingTaskAttachments] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingTask, setViewingTask] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [taskComments, setTaskComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [subtasks, setSubtasks] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  
  // Subtask attachment state
  const [showSubtaskAttachmentsModal, setShowSubtaskAttachmentsModal] = useState(false);
  const [viewingSubtaskAttachments, setViewingSubtaskAttachments] = useState(null);
  const [subtaskAttachments, setSubtaskAttachments] = useState([]);
  const [newSubtaskAttachments, setNewSubtaskAttachments] = useState([]);
  const [uploadingSubtaskAttachments, setUploadingSubtaskAttachments] = useState(false);
  
  // Subtask view modal state
  const [showSubtaskViewModal, setShowSubtaskViewModal] = useState(false);
  const [viewingSubtask, setViewingSubtask] = useState(null);
  const [subtaskViewAttachments, setSubtaskViewAttachments] = useState([]);
  const [subtaskComments, setSubtaskComments] = useState([]);
  const [newSubtaskComment, setNewSubtaskComment] = useState('');
  const [submittingSubtaskComment, setSubmittingSubtaskComment] = useState(false);
  const [subtaskReplyingTo, setSubtaskReplyingTo] = useState(null);
  const [loadingSubtaskComments, setLoadingSubtaskComments] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchStaffMembers();
  }, []);

  // Check for notification redirect and open task/subtask modal
  useEffect(() => {
    const checkNotificationRedirect = async () => {
      const highlightTaskId = sessionStorage.getItem('highlightTaskId');
      const highlightSubtaskId = sessionStorage.getItem('highlightSubtaskId');
      
      if (highlightSubtaskId && subtasks.length > 0) {
        // Find the subtask and open its modal
        const subtask = subtasks.find(st => st._id === highlightSubtaskId);
        if (subtask) {
          handleViewSubtask(subtask);
          sessionStorage.removeItem('highlightSubtaskId');
          sessionStorage.removeItem('highlightTaskId');
        }
      } else if (highlightTaskId && tasks.length > 0) {
        // Find the task and open its modal
        handleView(highlightTaskId);
        sessionStorage.removeItem('highlightTaskId');
      }
    };
    
    checkNotificationRedirect();
  }, [tasks, subtasks]);

  useEffect(() => {
    filterTasks();
  }, [tasks, searchTerm, statusFilter]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      // Fetch Manager Tasks (tasks assigned to manager by admin)
      const [tasksResponse, subtasksResponse] = await Promise.all([
        tasksAPI.getAll(),
        tasksAPI.getSubtasks()
      ]);
      setTasks(tasksResponse.data.tasks);
      setSubtasks(subtasksResponse.data.subtasks || []);
      
      // Expand all tasks by default
      const expanded = {};
      (tasksResponse.data.tasks || []).forEach(task => {
        expanded[task._id] = true;
      });
      setExpandedTasks(expanded);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffMembers = async () => {
    try {
      const response = await usersAPI.getStaff();
      setStaffMembers(response.data.staff || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const getTaskSubtasks = (taskId) => {
    return subtasks.filter(st => {
      const subtaskTaskId = st.taskId?._id || st.taskId;
      return subtaskTaskId === taskId;
    });
  };

  const toggleTaskExpand = (taskId) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const handleAssignSubtask = async (subtaskId, staffId) => {
    try {
      await tasksAPI.assignSubtaskToStaff(subtaskId, staffId);
      toast.success('Subtask assigned successfully!');
      fetchTasks(); // Refresh to show updated assignment
    } catch (error) {
      console.error('Error assigning subtask:', error);
      toast.error('Failed to assign subtask');
    }
  };

  const filterTasks = () => {
    let filtered = tasks;

    if (statusFilter !== 'All') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(task =>
        task.taskNo?.toLowerCase().includes(searchLower) ||
        task.taskName?.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredTasks(filtered);
  };

  const handleSearchChange = (e) => setSearchTerm(e.target.value);
  const handleStatusFilterChange = (e) => setStatusFilter(e.target.value);

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      await tasksAPI.updateStatus(taskId, newStatus);
      setTasks(tasks.map(task => 
        task._id === taskId ? { ...task, status: newStatus } : task
      ));
      toast.success('Task status updated!');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleView = async (taskId) => {
    try {
      const response = await tasksAPI.getById(taskId);
      setViewingTask(response.data.task);
      setShowViewModal(true);
      
      // Fetch comments
      setLoadingComments(true);
      try {
        const commentsResponse = await tasksAPI.getTaskComments(taskId);
        setTaskComments(commentsResponse.data.comments || []);
      } catch (error) {
        console.error('Error fetching comments:', error);
        setTaskComments([]);
      } finally {
        setLoadingComments(false);
      }
    } catch (error) {
      console.error('Error fetching task:', error);
      toast.error('Failed to load task details');
    }
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setViewingTask(null);
    setTaskComments([]);
    setNewComment('');
    setReplyingTo(null);
    setSelectedFiles([]);
  };

  // Check if comment is from current user (Manager)
  const isOwnComment = (comment) => {
    return comment.commentByModel === 'Manager';
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !viewingTask) return;
    
    setSubmittingComment(true);
    try {
      await tasksAPI.addTaskComment(viewingTask._id, newComment.trim(), replyingTo?._id);
      toast.success('Comment added successfully!');
      setNewComment('');
      setReplyingTo(null);
      
      // Refresh comments
      const commentsResponse = await tasksAPI.getTaskComments(viewingTask._id);
      setTaskComments(commentsResponse.data.comments || []);
      
      // Scroll to bottom
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const handleUploadFiles = async () => {
    if (selectedFiles.length === 0 || !viewingTask) return;
    
    setUploadingFiles(true);
    try {
      await tasksAPI.uploadManagerAttachments(viewingTask._id, selectedFiles);
      toast.success('Files uploaded successfully!');
      setSelectedFiles([]);
      // Refresh task to get updated attachments
      const response = await tasksAPI.getById(viewingTask._id);
      setViewingTask(response.data.task);
      fetchTasks();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploadingFiles(false);
    }
  };

  const getStatusClass = (status) => {
    switch(status) {
      case 'Pending': return 'pending';
      case 'In Progress': return 'in-progress';
      case 'Completed': return 'completed';
      case 'Cancelled': return 'cancelled';
      default: return '';
    }
  };

  const handleOpenAttachments = async (task) => {
    // Fetch fresh task data with attachments
    try {
      const response = await tasksAPI.getById(task._id);
      setViewingTaskAttachments(response.data.task);
      setShowAttachmentsModal(true);
    } catch (error) {
      console.error('Error fetching attachments:', error);
      toast.error('Failed to load attachments');
    }
  };

  const handleCloseAttachments = () => {
    setShowAttachmentsModal(false);
    setViewingTaskAttachments(null);
  };

  const handleDownloadAttachment = async (attachmentId, originalName) => {
    try {
      const response = await tasksAPI.downloadAttachment(viewingTaskAttachments._id, attachmentId);
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

  // Subtask attachment handlers
  const handleOpenSubtaskAttachments = (subtask) => {
    setViewingSubtaskAttachments(subtask);
    setSubtaskAttachments(subtask.attachments || []);
    setShowSubtaskAttachmentsModal(true);
  };

  const handleCloseSubtaskAttachments = () => {
    setShowSubtaskAttachmentsModal(false);
    setViewingSubtaskAttachments(null);
    setSubtaskAttachments([]);
    setNewSubtaskAttachments([]);
  };

  const handleSubtaskFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setNewSubtaskAttachments(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const handleRemoveNewSubtaskAttachment = (index) => {
    setNewSubtaskAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadSubtaskAttachments = async () => {
    if (!viewingSubtaskAttachments || newSubtaskAttachments.length === 0) return;
    
    setUploadingSubtaskAttachments(true);
    try {
      const response = await tasksAPI.uploadSubtaskAttachments(viewingSubtaskAttachments._id, newSubtaskAttachments);
      setSubtaskAttachments(response.data.attachments || []);
      setNewSubtaskAttachments([]);
      toast.success('Attachments uploaded successfully!');
      fetchTasks(); // Refresh the task list
    } catch (error) {
      console.error('Error uploading subtask attachments:', error);
      toast.error('Failed to upload attachments');
    } finally {
      setUploadingSubtaskAttachments(false);
    }
  };

  const handleDownloadSubtaskAttachment = async (attachmentId, originalName) => {
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

  const handleDeleteSubtaskAttachment = async (attachmentId) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return;
    
    try {
      const response = await tasksAPI.deleteSubtaskAttachment(viewingSubtaskAttachments._id, attachmentId);
      setSubtaskAttachments(response.data.attachments || []);
      toast.success('Attachment deleted successfully!');
      fetchTasks(); // Refresh the task list
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error('Failed to delete attachment');
    }
  };

  // Subtask view modal handlers
  const handleViewSubtask = async (subtask) => {
    try {
      setViewingSubtask({
        subtaskNo: subtask.subtaskNo,
        subtaskName: subtask.subtaskName,
        description: subtask.description,
        status: subtask.status,
        dueDate: subtask.dueDate,
        assignedTo: subtask.assignedTo,
        _id: subtask._id
      });
      setSubtaskViewAttachments(subtask.attachments || []);
      
      // Fetch comments for this subtask
      try {
        const commentsResponse = await tasksAPI.getSubtaskComments(subtask._id);
        setSubtaskComments(commentsResponse.data.comments || []);
      } catch (err) {
        console.error('Error fetching subtask comments:', err);
        setSubtaskComments([]);
      }
      
      setShowSubtaskViewModal(true);
    } catch (error) {
      console.error('Error opening subtask view:', error);
      toast.error('Failed to load subtask details');
    }
  };

  const handleCloseSubtaskViewModal = () => {
    setShowSubtaskViewModal(false);
    setViewingSubtask(null);
    setSubtaskViewAttachments([]);
    setSubtaskComments([]);
    setNewSubtaskComment('');
    setSubtaskReplyingTo(null);
  };

  // Check if subtask comment is from current user (Manager)
  const isOwnSubtaskComment = (comment) => {
    return comment.commentByModel === 'Manager';
  };

  const handleAddSubtaskComment = async () => {
    if (!newSubtaskComment.trim() || !viewingSubtask) return;
    
    setSubmittingSubtaskComment(true);
    try {
      await tasksAPI.addSubtaskComment(viewingSubtask._id, newSubtaskComment.trim(), subtaskReplyingTo?._id);
      toast.success('Comment added successfully!');
      setNewSubtaskComment('');
      setSubtaskReplyingTo(null);
      
      // Refresh comments
      const commentsResponse = await tasksAPI.getSubtaskComments(viewingSubtask._id);
      setSubtaskComments(commentsResponse.data.comments || []);
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmittingSubtaskComment(false);
    }
  };

  const handleDownloadSubtaskViewAttachment = async (attachmentId, originalName) => {
    try {
      const response = await tasksAPI.downloadSubtaskAttachment(viewingSubtask._id, attachmentId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      toast.error('Failed to download attachment');
    }
  };

  return (
    <div className="all-tasks">
      <h1 className="page-title">My Tasks</h1>
      
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
          <label htmlFor="status-select">Filter by Status:</label>
          <select
            id="status-select"
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="filter-select"
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p>Loading tasks...</p>
      ) : filteredTasks.length === 0 ? (
        <p>No tasks found</p>
      ) : (
        <div className="table-container">
          <div className="table-scroll-wrapper">
          <table className="tasks-table">
            <thead>
              <tr>
                <th>Task No</th>
                <th>Task Name</th>
                <th>Description</th>
                <th>Due Date</th>
                <th>Files</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <React.Fragment key={task._id}>
                  <tr
                    className={expandedTasks[task._id] ? 'task-row expanded clickable-row' : 'task-row clickable-row'}
                    onClick={() => handleView(task._id)}
                  >
                    <td>
                      <div className="task-no-cell">
                        {getTaskSubtasks(task._id).length > 0 && (
                          <button
                            className="expand-btn"
                            onClick={(e) => { e.stopPropagation(); toggleTaskExpand(task._id); }}
                            title={expandedTasks[task._id] ? 'Collapse subtasks' : 'Expand subtasks'}
                          >
                            {expandedTasks[task._id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        )}
                        <span>{task.taskNo}</span>
                        {getTaskSubtasks(task._id).length > 0 && (
                          <span className="subtask-count-badge">{getTaskSubtasks(task._id).length}</span>
                        )}
                      </div>
                    </td>
                    <td>{task.taskName}</td>
                    <td>{task.description.substring(0, 50)}...</td>
                    <td>{new Date(task.dueDate).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="action-btn btn-attachments"
                        onClick={(e) => { e.stopPropagation(); handleOpenAttachments(task); }}
                        title="View Attachments"
                      >
                        <Paperclip size={16} />
                        <span className="attachment-count">{task.attachments?.length || 0}</span>
                      </button>
                    </td>
                    <td>
                      <span className={`status-badge status-${task.status.toLowerCase().replace(' ', '-')}`}>
                        {task.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <select 
                          value={task.status} 
                          onChange={(e) => handleStatusUpdate(task._id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="status-select"
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                  {/* Subtasks rows */}
                  {expandedTasks[task._id] && getTaskSubtasks(task._id).map((subtask) => (
                    <tr 
                      key={subtask._id} 
                      className={`subtask-row clickable-row ${!subtask.assignedTo ? 'unassigned-subtask' : ''}`}
                      onClick={() => handleViewSubtask(subtask)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div className="subtask-indicator">
                          <span className="subtask-line"></span>
                          <span className="subtask-no">{subtask.subtaskNo}</span>
                        </div>
                      </td>
                      <td className="subtask-name">{subtask.subtaskName}</td>
                      <td>{subtask.description?.substring(0, 40)}...</td>
                      <td>{new Date(subtask.dueDate).toLocaleDateString()}</td>
                      <td>
                        <button 
                          className="action-btn btn-attachments"
                          onClick={(e) => { e.stopPropagation(); handleOpenSubtaskAttachments(subtask); }}
                          title="Manage Attachments"
                        >
                          <Paperclip size={14} />
                          <span className="attachment-count">{subtask.attachments?.length || 0}</span>
                        </button>
                      </td>
                      <td>
                        <span className={`status-badge status-${subtask.status?.toLowerCase().replace(' ', '-')}`}>
                          {subtask.status}
                        </span>
                      </td>
                      <td>
                        {subtask.assignedTo ? (
                          <span className="assigned-staff">{subtask.assignedTo.name}</span>
                        ) : (
                          <div className="assign-cell" onClick={(e) => e.stopPropagation()}>
                            <SearchableSelect
                              className="table-cell"
                              options={staffMembers.map(s => ({ label: s.name, value: s._id }))}
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAssignSubtask(subtask._id, e.target.value);
                                }
                              }}
                              placeholder="Assign to..."
                              searchPlaceholder="Search staff..."
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Attachments Modal (View Only for Manager) */}
      {showAttachmentsModal && viewingTaskAttachments && (
        <div className="modal-overlay" onClick={handleCloseAttachments}>
          <div className="modal-content attachments-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Attachments - {viewingTaskAttachments.taskName}</h2>
              <button className="close-btn" onClick={handleCloseAttachments}>
                <X size={20} />
              </button>
            </div>

            <div className="existing-attachments">
              <h3>Files ({viewingTaskAttachments.attachments?.length || 0})</h3>
              {viewingTaskAttachments.attachments && viewingTaskAttachments.attachments.length > 0 ? (
                <div className="attachments-list">
                  {viewingTaskAttachments.attachments.map((attachment) => (
                    <div key={attachment._id} className="attachment-item">
                      <FileText size={20} />
                      <div className="attachment-info">
                        <span className="attachment-name">{attachment.originalName}</span>
                        <div className="attachment-meta">
                          <span className="attachment-size">{formatFileSize(attachment.size)}</span>
                          {attachment.uploadedByName && (
                            <span className="attachment-uploader">
                              by {attachment.uploadedByName} 
                              <span className={`uploader-role ${attachment.uploadedByModel?.toLowerCase()}`}>
                                ({attachment.uploadedByModel})
                              </span>
                            </span>
                          )}
                        </div>
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

      {/* View Task Modal */}
      {showViewModal && viewingTask && (
        <div className="modal-overlay" onClick={handleCloseViewModal}>
          <div className="modal-content view-task-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Task Details</h2>
              <button className="close-btn" onClick={handleCloseViewModal}>
                <X size={20} />
              </button>
            </div>

            <div className="view-task-content">
              <div className="view-task-row">
                <label>Task No:</label>
                <span>{viewingTask.taskNo}</span>
              </div>

              <div className="view-task-row">
                <label>Task Name:</label>
                <span>{viewingTask.taskName}</span>
              </div>

              <div className="view-task-row">
                <label>Description:</label>
                <p className="task-description">{viewingTask.description}</p>
              </div>

              <div className="view-task-grid">
                <div className="view-task-row">
                  <label>Assigned By:</label>
                  <span>{viewingTask.createdBy?.name || 'Admin'}</span>
                </div>

                <div className="view-task-row">
                  <label>Due Date:</label>
                  <span>{new Date(viewingTask.dueDate).toLocaleDateString()}</span>
                </div>

                <div className="view-task-row">
                  <label>Priority:</label>
                  <span className={`priority-badge priority-${viewingTask.priority?.toLowerCase()}`}>
                    {viewingTask.priority}
                  </span>
                </div>

                <div className="view-task-row">
                  <label>Status:</label>
                  <span className={`status-badge ${getStatusClass(viewingTask.status)}`}>
                    {viewingTask.status}
                  </span>
                </div>
              </div>

              <div className="view-task-row">
                <label>Attachments:</label>
                <span>{viewingTask.attachments?.length || 0} file(s)</span>
              </div>

              {/* Upload Attachments Section */}
              <div className="view-task-row upload-section">
                <label>Add Attachments:</label>
                <div className="upload-controls">
                  <input
                    type="file"
                    id="manager-file-upload"
                    multiple
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    accept=".jpeg,.jpg,.png,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  />
                  <label htmlFor="manager-file-upload" className="file-upload-btn">
                    <Upload size={16} />
                    Choose Files
                  </label>
                  {selectedFiles.length > 0 && (
                    <div className="selected-files">
                      <span>{selectedFiles.length} file(s) selected</span>
                      <button 
                        className="upload-btn" 
                        onClick={handleUploadFiles}
                        disabled={uploadingFiles}
                      >
                        {uploadingFiles ? 'Uploading...' : 'Upload'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Comments Section */}
              <div className="comments-section chat-style">
                <h3><MessageSquare size={18} /> Comments</h3>
                
                <div className="chat-comments-container">
                  {loadingComments ? (
                    <p className="loading-text">Loading comments...</p>
                  ) : taskComments.length === 0 ? (
                    <p className="no-comments">No comments yet. Start the conversation!</p>
                  ) : (
                    taskComments.map((comment, index) => {
                      const isOwn = isOwnComment(comment);
                      
                      return (
                        <div key={comment._id || index} className={`chat-message ${isOwn ? 'own' : 'other'}`}>
                          <div className={`chat-bubble ${isOwn ? 'own' : 'other'}`}>
                            <div className="chat-header">
                              <span className="chat-author">{comment.commentByName || 'Unknown'}</span>
                              <span className={`chat-role role-${comment.commentByModel?.toLowerCase()}`}>
                                {comment.commentByModel}
                              </span>
                            </div>
                            
                            {comment.replyToText && (
                              <div className="reply-indicator">
                                <Reply size={12} />
                                <span className="reply-preview">{comment.replyToText.substring(0, 50)}{comment.replyToText.length > 50 ? '...' : ''}</span>
                              </div>
                            )}
                            
                            <p className="chat-text">{comment.text}</p>
                            
                            <div className="chat-footer">
                              <span className="chat-time">
                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                              </span>
                              <button 
                                className="reply-btn"
                                onClick={() => setReplyingTo(comment)}
                                title="Reply to this comment"
                              >
                                <Reply size={14} /> Reply
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>
                
                {/* Reply indicator */}
                {replyingTo && (
                  <div className="replying-to-indicator">
                    <Reply size={14} />
                    <span>Replying to {replyingTo.commentByName}: "{replyingTo.text.substring(0, 40)}{replyingTo.text.length > 40 ? '...' : ''}"</span>
                    <button className="cancel-reply-btn" onClick={() => setReplyingTo(null)}>
                      <X size={14} />
                    </button>
                  </div>
                )}
                
                {/* Comment input */}
                <div className="chat-input-container">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={replyingTo ? "Type your reply..." : "Type a comment..."}
                    onKeyPress={(e) => e.key === 'Enter' && !submittingComment && handleAddComment()}
                    disabled={submittingComment}
                  />
                  <button 
                    className="send-btn"
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || submittingComment}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>

              <div className="view-task-row">
                <label>Created At:</label>
                <span>{new Date(viewingTask.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="modal-buttons">
              <button className="btn-cancel" onClick={handleCloseViewModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtask Attachments Modal */}
      {showSubtaskAttachmentsModal && viewingSubtaskAttachments && (
        <div className="modal-overlay" onClick={handleCloseSubtaskAttachments}>
          <div className="modal-content attachments-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Attachments - {viewingSubtaskAttachments.subtaskName}</h2>
              <button className="close-btn" onClick={handleCloseSubtaskAttachments}>
                <X size={20} />
              </button>
            </div>

            {/* Upload new attachments */}
            <div className="upload-section" style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ marginBottom: '12px' }}>Add Attachments</h3>
              <div className="file-input-wrapper">
                <input
                  type="file"
                  id="subtask-attachment-upload"
                  onChange={handleSubtaskFileSelect}
                  multiple
                  style={{ display: 'none' }}
                  accept=".jpeg,.jpg,.png,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                />
                <label htmlFor="subtask-attachment-upload" className="file-upload-btn">
                  <Upload size={16} />
                  Choose Files
                </label>
              </div>
              
              {newSubtaskAttachments.length > 0 && (
                <div className="new-files-list" style={{ marginTop: '12px' }}>
                  {newSubtaskAttachments.map((file, index) => (
                    <div key={index} className="new-file-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <FileText size={14} />
                      <span>{file.name}</span>
                      <span style={{ color: '#6b7280', fontSize: '12px' }}>({formatFileSize(file.size)})</span>
                      <button 
                        className="btn-delete-attachment"
                        onClick={() => handleRemoveNewSubtaskAttachment(index)}
                        style={{ marginLeft: 'auto' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button 
                    className="btn-submit"
                    onClick={handleUploadSubtaskAttachments}
                    disabled={uploadingSubtaskAttachments}
                    style={{ marginTop: '8px' }}
                  >
                    {uploadingSubtaskAttachments ? 'Uploading...' : 'Upload Files'}
                  </button>
                </div>
              )}
            </div>

            {/* Existing attachments */}
            <div className="existing-attachments" style={{ padding: '16px' }}>
              <h3>Current Attachments ({subtaskAttachments.length})</h3>
              {subtaskAttachments.length > 0 ? (
                <div className="attachments-list">
                  {subtaskAttachments.map((attachment) => (
                    <div key={attachment._id} className="attachment-item">
                      <FileText size={20} />
                      <div className="attachment-info">
                        <span className="attachment-name">{attachment.originalName}</span>
                        <div className="attachment-meta">
                          <span className="attachment-size">{formatFileSize(attachment.size)}</span>
                          {attachment.uploadedByName && (
                            <span className="attachment-uploader">
                              by {attachment.uploadedByName} 
                              <span className={`uploader-role ${attachment.uploadedByModel?.toLowerCase()}`}>
                                ({attachment.uploadedByModel})
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="attachment-actions">
                        <button
                          className="btn-download"
                          onClick={() => handleDownloadSubtaskAttachment(attachment._id, attachment.originalName)}
                          title="Download"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          className="btn-delete-attachment"
                          onClick={() => handleDeleteSubtaskAttachment(attachment._id)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-attachments">No attachments for this subtask</p>
              )}
            </div>

            <div className="modal-buttons">
              <button className="btn-cancel" onClick={handleCloseSubtaskAttachments}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtask View Modal */}
      {showSubtaskViewModal && viewingSubtask && (
        <div className="modal-overlay" onClick={handleCloseSubtaskViewModal}>
          <div className="modal-content view-task-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Subtask Details</h2>
              <button className="close-btn" onClick={handleCloseSubtaskViewModal}>
                <X size={20} />
              </button>
            </div>

            <div className="view-task-content">
              <div className="view-task-row">
                <label>Subtask No:</label>
                <span>{viewingSubtask.subtaskNo}</span>
              </div>

              <div className="view-task-row">
                <label>Subtask Name:</label>
                <span>{viewingSubtask.subtaskName}</span>
              </div>

              <div className="view-task-row">
                <label>Description:</label>
                <p className="task-description">{viewingSubtask.description}</p>
              </div>

              <div className="view-task-row">
                <label>Due Date:</label>
                <span>{new Date(viewingSubtask.dueDate).toLocaleDateString()}</span>
              </div>

              <div className="view-task-row">
                <label>Status:</label>
                <span className={`status-badge status-${viewingSubtask.status?.toLowerCase().replace(' ', '-')}`}>
                  {viewingSubtask.status}
                </span>
              </div>

              <div className="view-task-row">
                <label>Assigned To:</label>
                <span>{viewingSubtask.assignedTo?.name || 'Not assigned'}</span>
              </div>

              {/* Attachments Section */}
              <div className="attachments-section">
                <h3><Paperclip size={16} /> Attachments ({subtaskViewAttachments.length})</h3>
                {subtaskViewAttachments.length > 0 ? (
                  <div className="attachments-list">
                    {subtaskViewAttachments.map((attachment) => (
                      <div key={attachment._id} className="attachment-item">
                        <FileText size={16} />
                        <div className="attachment-info">
                          <span className="attachment-name">{attachment.originalName}</span>
                          <div className="attachment-meta">
                            <span className="attachment-size">{formatFileSize(attachment.size)}</span>
                            {attachment.uploadedByName && (
                              <span className="attachment-uploader">
                                by {attachment.uploadedByName} 
                                <span className={`uploader-role ${attachment.uploadedByModel?.toLowerCase()}`}>
                                  ({attachment.uploadedByModel})
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          className="btn-download"
                          onClick={() => handleDownloadSubtaskViewAttachment(attachment._id, attachment.originalName)}
                          title="Download"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-attachments">No attachments</p>
                )}
              </div>

              {/* Chat Comments Section */}
              <div className="comments-section chat-style">
                <h3><MessageSquare size={16} /> Comments</h3>
                
                <div className="chat-comments-container">
                  {subtaskComments.length === 0 ? (
                    <p className="no-comments">No comments yet. Start the conversation!</p>
                  ) : (
                    subtaskComments.map((comment, index) => {
                      const isOwn = isOwnSubtaskComment(comment);
                      
                      return (
                        <div key={comment._id || index} className={`chat-message ${isOwn ? 'own' : 'other'}`}>
                          <div className={`chat-bubble ${isOwn ? 'own' : 'other'}`}>
                            <div className="chat-header">
                              <span className="chat-author">{comment.commentByName || 'Unknown'}</span>
                              <span className={`chat-role role-${comment.commentByModel?.toLowerCase()}`}>
                                {comment.commentByModel}
                              </span>
                            </div>
                            
                            {comment.replyToText && (
                              <div className="reply-indicator">
                                <Reply size={12} />
                                <span className="reply-preview">{comment.replyToText.substring(0, 50)}{comment.replyToText.length > 50 ? '...' : ''}</span>
                              </div>
                            )}
                            
                            <p className="chat-text">{comment.text}</p>
                            
                            <div className="chat-footer">
                              <span className="chat-time">
                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                              </span>
                              <button 
                                className="reply-btn"
                                onClick={() => setSubtaskReplyingTo(comment)}
                                title="Reply to this comment"
                              >
                                <Reply size={14} /> Reply
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                
                {/* Reply indicator */}
                {subtaskReplyingTo && (
                  <div className="replying-to-indicator">
                    <Reply size={14} />
                    <span>Replying to {subtaskReplyingTo.commentByName}: "{subtaskReplyingTo.text.substring(0, 40)}{subtaskReplyingTo.text.length > 40 ? '...' : ''}"</span>
                    <button className="cancel-reply-btn" onClick={() => setSubtaskReplyingTo(null)}>
                      <X size={14} />
                    </button>
                  </div>
                )}
                
                {/* Comment input */}
                <div className="chat-input-container">
                  <input
                    type="text"
                    value={newSubtaskComment}
                    onChange={(e) => setNewSubtaskComment(e.target.value)}
                    placeholder={subtaskReplyingTo ? "Type your reply..." : "Type a comment..."}
                    onKeyPress={(e) => e.key === 'Enter' && !submittingSubtaskComment && handleAddSubtaskComment()}
                    disabled={submittingSubtaskComment}
                  />
                  <button 
                    className="send-btn"
                    onClick={handleAddSubtaskComment}
                    disabled={!newSubtaskComment.trim() || submittingSubtaskComment}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-buttons">
              <button className="btn-cancel" onClick={handleCloseSubtaskViewModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AssignedTasks = () => {
  const toast = useToast();
  const chatEndRef = useRef(null);
  const [subtasks, setSubtasks] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [groupedTasks, setGroupedTasks] = useState([]);
  const [filteredGroupedTasks, setFilteredGroupedTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [staffMembers, setStaffMembers] = useState([]);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, subtaskId: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [staffFilter, setStaffFilter] = useState('All');
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [viewingSubtaskAttachments, setViewingSubtaskAttachments] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingSubtask, setViewingSubtask] = useState(null);
  const [subtaskComments, setSubtaskComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newSubtaskComment, setNewSubtaskComment] = useState('');
  const [submittingSubtaskComment, setSubmittingSubtaskComment] = useState(false);
  const [subtaskReplyingTo, setSubtaskReplyingTo] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState(null);
  const [editFormData, setEditFormData] = useState({
    subtaskName: '',
    description: '',
    dueDate: '',
    assignedTo: '',
    status: '',
    priority: 'Medium'
  });
  const [expandedTasks, setExpandedTasks] = useState({});

  useEffect(() => {
    fetchData();
    fetchStaffMembers();
  }, []);

  // Check for notification redirect and open subtask modal
  useEffect(() => {
    const checkNotificationRedirect = () => {
      const highlightSubtaskId = sessionStorage.getItem('highlightSubtaskId');
      
      if (highlightSubtaskId && subtasks.length > 0) {
        // Find the subtask and open its modal
        const subtask = subtasks.find(st => st._id === highlightSubtaskId);
        if (subtask) {
          handleView(subtask);
          sessionStorage.removeItem('highlightSubtaskId');
          sessionStorage.removeItem('highlightTaskId');
        }
      }
    };
    
    checkNotificationRedirect();
  }, [subtasks]);

  useEffect(() => {
    groupSubtasksByTask();
  }, [subtasks, tasks]);

  useEffect(() => {
    filterGroupedTasks();
  }, [groupedTasks, searchTerm, statusFilter, staffFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch both tasks and subtasks
      const [tasksResponse, subtasksResponse] = await Promise.all([
        tasksAPI.getAll(),
        tasksAPI.getSubtasks()
      ]);
      setTasks(tasksResponse.data.tasks || []);
      setSubtasks(subtasksResponse.data.subtasks || []);
      
      // Expand all tasks by default
      const expanded = {};
      (tasksResponse.data.tasks || []).forEach(task => {
        expanded[task._id] = true;
      });
      setExpandedTasks(expanded);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubtasks = async () => {
    try {
      const response = await tasksAPI.getSubtasks();
      setSubtasks(response.data.subtasks || []);
    } catch (error) {
      console.error('Error fetching subtasks:', error);
    }
  };

  const fetchStaffMembers = async () => {
    try {
      const response = await usersAPI.getStaff();
      setStaffMembers(response.data.staff || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const groupSubtasksByTask = () => {
    const grouped = tasks.map(task => {
      const taskSubtasks = subtasks.filter(st => {
        // Handle both populated and non-populated taskId
        const subtaskTaskId = st.taskId?._id || st.taskId;
        // Only include assigned subtasks (those with assignedTo)
        return subtaskTaskId === task._id && st.assignedTo;
      });
      return {
        ...task,
        subtasks: taskSubtasks
      };
    }).filter(task => task.subtasks.length > 0); // Only show tasks with assigned subtasks
    
    setGroupedTasks(grouped);
  };

  const filterGroupedTasks = () => {
    let filtered = groupedTasks.map(task => {
      let filteredSubtasks = task.subtasks;

      if (statusFilter !== 'All') {
        filteredSubtasks = filteredSubtasks.filter(st => st.status === statusFilter);
      }

      if (staffFilter !== 'All') {
        filteredSubtasks = filteredSubtasks.filter(st => st.assignedTo?._id === staffFilter);
      }

      if (searchTerm.trim() !== '') {
        const searchLower = searchTerm.toLowerCase();
        filteredSubtasks = filteredSubtasks.filter(st =>
          st.subtaskNo?.toLowerCase().includes(searchLower) ||
          st.subtaskName?.toLowerCase().includes(searchLower) ||
          st.description?.toLowerCase().includes(searchLower) ||
          st.assignedTo?.name?.toLowerCase().includes(searchLower) ||
          task.taskNo?.toLowerCase().includes(searchLower) ||
          task.taskName?.toLowerCase().includes(searchLower)
        );
      }

      return {
        ...task,
        subtasks: filteredSubtasks
      };
    }).filter(task => task.subtasks.length > 0);

    setFilteredGroupedTasks(filtered);
  };

  const toggleTaskExpand = (taskId) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const handleSearchChange = (e) => setSearchTerm(e.target.value);
  const handleStatusFilterChange = (e) => setStatusFilter(e.target.value);
  const handleStaffFilterChange = (e) => setStaffFilter(e.target.value);

  const handleReassign = async (subtaskId, newStaffId) => {
    try {
      // Use the new assign API for unassigned subtasks, or update for reassignment
      await tasksAPI.assignSubtaskToStaff(subtaskId, newStaffId);
      fetchData(); // Refresh both tasks and subtasks
      toast.success('Subtask assigned successfully!');
    } catch (error) {
      console.error('Error assigning subtask:', error);
      toast.error('Failed to assign subtask');
    }
  };

  const handleDeleteClick = (subtaskId) => {
    setConfirmModal({ isOpen: true, subtaskId });
  };

  const handleConfirmDelete = async () => {
    const { subtaskId } = confirmModal;
    try {
      await tasksAPI.deleteSubtask(subtaskId);
      fetchSubtasks();
      toast.success('Subtask deleted successfully!');
      setConfirmModal({ isOpen: false, subtaskId: null });
    } catch (error) {
      console.error('Error deleting subtask:', error);
      toast.error('Failed to delete subtask');
    }
  };

  const handleCancelDelete = () => {
    setConfirmModal({ isOpen: false, subtaskId: null });
  };

  // View handlers
  const handleView = async (subtask) => {
    setViewingSubtask(subtask);
    setShowViewModal(true);
    
    // Fetch comments for this subtask
    setLoadingComments(true);
    try {
      const commentsResponse = await tasksAPI.getSubtaskComments(subtask._id);
      setSubtaskComments(commentsResponse.data.comments || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setSubtaskComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setViewingSubtask(null);
    setSubtaskComments([]);
    setNewSubtaskComment('');
    setSubtaskReplyingTo(null);
  };

  // Check if comment is from current user (Manager)
  const isOwnSubtaskComment = (comment) => {
    return comment.commentByModel === 'Manager';
  };

  // Add comment to subtask (chat style)
  const handleAddSubtaskComment = async () => {
    if (!newSubtaskComment.trim() || !viewingSubtask) return;
    
    setSubmittingSubtaskComment(true);
    try {
      await tasksAPI.addSubtaskComment(viewingSubtask._id, newSubtaskComment.trim(), subtaskReplyingTo?._id);
      toast.success('Comment added successfully!');
      setNewSubtaskComment('');
      setSubtaskReplyingTo(null);
      
      // Refresh comments
      const commentsResponse = await tasksAPI.getSubtaskComments(viewingSubtask._id);
      setSubtaskComments(commentsResponse.data.comments || []);
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmittingSubtaskComment(false);
    }
  };

  // Edit handlers
  const handleEdit = (subtask) => {
    setEditingSubtask(subtask);
    setEditFormData({
      subtaskName: subtask.subtaskName || '',
      description: subtask.description || '',
      dueDate: subtask.dueDate ? new Date(subtask.dueDate).toISOString().split('T')[0] : '',
      assignedTo: subtask.assignedTo?._id || '',
      status: subtask.status || 'Pending',
      priority: subtask.priority || 'Medium'
    });
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingSubtask(null);
    setEditFormData({
      subtaskName: '',
      description: '',
      dueDate: '',
      assignedTo: '',
      status: '',
      priority: 'Medium'
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await tasksAPI.updateSubtask(editingSubtask._id, {
        subtaskName: editFormData.subtaskName,
        description: editFormData.description,
        dueDate: editFormData.dueDate,
        assignedTo: editFormData.assignedTo,
        status: editFormData.status,
        priority: editFormData.priority
      });
      toast.success('Subtask updated successfully!');
      fetchSubtasks();
      handleCloseEditModal();
    } catch (error) {
      console.error('Error updating subtask:', error);
      toast.error('Failed to update subtask');
    }
  };

  const getStatusClass = (status) => {
    switch(status) {
      case 'Pending': return 'pending';
      case 'In Progress': return 'in-progress';
      case 'Completed': return 'completed';
      case 'Cancelled': return 'cancelled';
      default: return '';
    }
  };

  // Attachment handlers
  const handleOpenAttachments = (subtask) => {
    setViewingSubtaskAttachments(subtask);
    setShowAttachmentsModal(true);
    setSelectedFiles([]);
  };

  const handleCloseAttachments = () => {
    setShowAttachmentsModal(false);
    setViewingSubtaskAttachments(null);
    setSelectedFiles([]);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadFiles = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setUploading(true);
    try {
      await tasksAPI.uploadSubtaskAttachments(viewingSubtaskAttachments._id, selectedFiles);
      toast.success('Files uploaded successfully!');
      fetchSubtasks();
      // Refresh the subtask data
      const updatedSubtask = subtasks.find(st => st._id === viewingSubtaskAttachments._id);
      if (updatedSubtask) {
        const response = await tasksAPI.getSubtaskAttachments(viewingSubtaskAttachments._id);
        setViewingSubtaskAttachments({
          ...viewingSubtaskAttachments,
          attachments: response.data.attachments
        });
      }
      setSelectedFiles([]);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
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

  const handleDeleteAttachment = async (attachmentId) => {
    try {
      await tasksAPI.deleteSubtaskAttachment(viewingSubtaskAttachments._id, attachmentId);
      toast.success('Attachment deleted successfully!');
      fetchSubtasks();
      // Update the modal view
      setViewingSubtaskAttachments({
        ...viewingSubtaskAttachments,
        attachments: viewingSubtaskAttachments.attachments.filter(a => a._id !== attachmentId)
      });
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error('Failed to delete attachment');
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
      <h1 className="page-title">Assigned Subtasks to Staff</h1>
      
      {/* Filter and Search Section */}
      <div className="filter-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by task, subtask, or staff..."
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
            <option value="Completed">Completed</option>
          </select>
        </div>
        <div className="status-filter">
          <label htmlFor="staff-filter">Staff:</label>
          <SearchableSelect
            className="filter-select"
            options={[
              { label: 'All Staff', value: 'All' },
              ...staffMembers.map(s => ({ label: s.name, value: s._id }))
            ]}
            value={staffFilter}
            onChange={handleStaffFilterChange}
            placeholder="Select Staff"
            searchPlaceholder="Search staff..."
          />
        </div>
      </div>

      {loading ? (
        <p>Loading subtasks...</p>
      ) : filteredGroupedTasks.length === 0 ? (
        <p>No subtasks found</p>
      ) : (
        <div className="grouped-tasks-container">
          {filteredGroupedTasks.map((task) => (
            <div key={task._id} className="task-group">
              {/* Parent Task Header */}
              <div 
                className="task-group-header"
                onClick={() => toggleTaskExpand(task._id)}
              >
                <div className="task-group-toggle">
                  {expandedTasks[task._id] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
                <div className="task-group-info">
                  <span className="task-group-no">{task.taskNo}</span>
                  <span className="task-group-name">{task.taskName}</span>
                  <span className={`priority-badge priority-${task.priority?.toLowerCase() || 'medium'}`}>
                    {task.priority || 'Medium'}
                  </span>
                  <span className={`status-badge status-${task.status?.toLowerCase().replace(' ', '-')}`}>
                    {task.status}
                  </span>
                </div>
                <div className="task-group-count">
                  {task.subtasks.length} subtask{task.subtasks.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Subtasks Table */}
              {expandedTasks[task._id] && (
                <div className="subtasks-table-wrapper">
                  <table className="tasks-table subtasks-table">
                    <thead>
                      <tr>
                        <th>Subtask No</th>
                        <th>Subtask Name</th>
                        <th>Description</th>
                        <th>Assigned To</th>
                        <th>Due Date</th>
                        <th>Priority</th>
                        <th>Files</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {task.subtasks.map((subtask) => (
                        <tr
                          key={subtask._id}
                          className={`clickable-row ${!subtask.assignedTo ? 'unassigned-subtask' : ''}`}
                          onClick={() => handleView(subtask)}
                        >
                          <td>{subtask.subtaskNo}</td>
                          <td>{subtask.subtaskName}</td>
                          <td>{subtask.description?.substring(0, 40)}...</td>
                          <td>
                            {subtask.assignedTo ? (
                              subtask.assignedTo.name
                            ) : (
                              <div className="unassigned-cell" onClick={(e) => e.stopPropagation()}>
                                <span className="unassigned-badge">Unassigned</span>
                                <select
                                  className="assign-select"
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleReassign(subtask._id, e.target.value);
                                    }
                                  }}
                                  defaultValue=""
                                >
                                  <option value="">Assign to...</option>
                                  {staffMembers.map((staff) => (
                                    <option key={staff._id} value={staff._id}>
                                      {staff.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </td>
                          <td>{new Date(subtask.dueDate).toLocaleDateString()}</td>
                          <td>
                            <span className={`priority-badge priority-${subtask.priority?.toLowerCase() || 'medium'}`}>
                              {subtask.priority || 'Medium'}
                            </span>
                          </td>
                          <td>
                            <button
                              className="action-btn btn-attachments"
                              onClick={(e) => { e.stopPropagation(); handleOpenAttachments(subtask); }}
                              title="Manage Attachments"
                            >
                              <Paperclip size={16} />
                              <span className="attachment-count">{subtask.attachments?.length || 0}</span>
                            </button>
                          </td>
                          <td>
                            <span className={`status-badge status-${subtask.status?.toLowerCase().replace(' ', '-')}`}>
                              {subtask.status}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="action-btn btn-edit"
                                onClick={(e) => { e.stopPropagation(); handleEdit(subtask); }}
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                className="action-btn btn-delete"
                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(subtask._id); }}
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title="Delete Subtask"
        message="Are you sure you want to delete this subtask? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isDangerous={true}
      />

      {/* Attachments Modal for Subtasks */}
      {showAttachmentsModal && viewingSubtaskAttachments && (
        <div className="modal-overlay" onClick={handleCloseAttachments}>
          <div className="modal-content attachments-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Attachments - {viewingSubtaskAttachments.subtaskName}</h2>
              <button className="close-btn" onClick={handleCloseAttachments}>
                <X size={20} />
              </button>
            </div>

            {/* Upload Section */}
            <div className="upload-section">
              <h3>Upload New Files</h3>
              <div className="file-input-container">
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  id="file-upload"
                  className="file-input"
                />
                <label htmlFor="file-upload" className="file-label">
                  <Upload size={20} />
                  Choose Files
                </label>
              </div>
              
              {selectedFiles.length > 0 && (
                <div className="selected-files">
                  <h4>Selected Files:</h4>
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="selected-file-item">
                      <FileText size={16} />
                      <span>{file.name}</span>
                      <span className="file-size">({formatFileSize(file.size)})</span>
                      <button 
                        className="remove-file-btn"
                        onClick={() => handleRemoveFile(index)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button 
                    className="btn-upload" 
                    onClick={handleUploadFiles}
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading...' : 'Upload Files'}
                  </button>
                </div>
              )}
            </div>

            {/* Existing Attachments */}
            <div className="existing-attachments">
              <h3>Files ({viewingSubtaskAttachments.attachments?.length || 0})</h3>
              {viewingSubtaskAttachments.attachments && viewingSubtaskAttachments.attachments.length > 0 ? (
                <div className="attachments-list">
                  {viewingSubtaskAttachments.attachments.map((attachment) => (
                    <div key={attachment._id} className="attachment-item">
                      <FileText size={20} />
                      <div className="attachment-info">
                        <span className="attachment-name">{attachment.originalName}</span>
                        <div className="attachment-meta">
                          <span className="attachment-size">{formatFileSize(attachment.size)}</span>
                          {attachment.uploadedByName && (
                            <span className="attachment-uploader">
                              by {attachment.uploadedByName} 
                              <span className={`uploader-role ${attachment.uploadedByModel?.toLowerCase()}`}>
                                ({attachment.uploadedByModel})
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="attachment-actions">
                        <button
                          className="btn-download"
                          onClick={() => handleDownloadAttachment(attachment._id, attachment.originalName)}
                          title="Download"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          className="btn-delete-attachment"
                          onClick={() => handleDeleteAttachment(attachment._id)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-attachments">No attachments for this subtask</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Subtask Modal */}
      {showViewModal && viewingSubtask && (
        <div className="modal-overlay" onClick={handleCloseViewModal}>
          <div className="modal-content view-task-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Subtask Details</h2>
              <button className="close-btn" onClick={handleCloseViewModal}>
                <X size={20} />
              </button>
            </div>

            <div className="view-task-content">
              <div className="view-task-row">
                <label>Subtask No:</label>
                <span>{viewingSubtask.subtaskNo}</span>
              </div>

              <div className="view-task-row">
                <label>Subtask Name:</label>
                <span>{viewingSubtask.subtaskName}</span>
              </div>

              <div className="view-task-row">
                <label>Description:</label>
                <p className="task-description">{viewingSubtask.description}</p>
              </div>

              <div className="view-task-grid">
                <div className="view-task-row">
                  <label>Assigned To:</label>
                  <span>{viewingSubtask.assignedTo?.name || 'N/A'}</span>
                </div>

                <div className="view-task-row">
                  <label>Due Date:</label>
                  <span>{new Date(viewingSubtask.dueDate).toLocaleDateString()}</span>
                </div>

                <div className="view-task-row">
                  <label>Priority:</label>
                  <span className={`priority-badge priority-${viewingSubtask.priority?.toLowerCase() || 'medium'}`}>
                    {viewingSubtask.priority || 'Medium'}
                  </span>
                </div>

                <div className="view-task-row">
                  <label>Status:</label>
                  <span className={`status-badge ${getStatusClass(viewingSubtask.status)}`}>
                    {viewingSubtask.status}
                  </span>
                </div>

                <div className="view-task-row">
                  <label>Attachments:</label>
                  <span>{viewingSubtask.attachments?.length || 0} file(s)</span>
                </div>
              </div>

              <div className="view-task-row">
                <label>Created At:</label>
                <span>{new Date(viewingSubtask.createdAt).toLocaleString()}</span>
              </div>

              {/* Chat Comments Section */}
              <div className="comments-section chat-style">
                <h3><MessageSquare size={18} /> Comments</h3>
                
                <div className="chat-comments-container">
                  {loadingComments ? (
                    <p className="loading-text">Loading comments...</p>
                  ) : subtaskComments.length === 0 ? (
                    <p className="no-comments">No comments yet. Start the conversation!</p>
                  ) : (
                    subtaskComments.map((comment, index) => {
                      const isOwn = isOwnSubtaskComment(comment);
                      
                      return (
                        <div key={comment._id || index} className={`chat-message ${isOwn ? 'own' : 'other'}`}>
                          <div className={`chat-bubble ${isOwn ? 'own' : 'other'}`}>
                            <div className="chat-header">
                              <span className="chat-author">{comment.commentByName || 'Unknown'}</span>
                              <span className={`chat-role role-${comment.commentByModel?.toLowerCase()}`}>
                                {comment.commentByModel}
                              </span>
                            </div>
                            
                            {comment.replyToText && (
                              <div className="reply-indicator">
                                <Reply size={12} />
                                <span className="reply-preview">{comment.replyToText.substring(0, 50)}{comment.replyToText.length > 50 ? '...' : ''}</span>
                              </div>
                            )}
                            
                            <p className="chat-text">{comment.text}</p>
                            
                            <div className="chat-footer">
                              <span className="chat-time">
                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                              </span>
                              <button 
                                className="reply-btn"
                                onClick={() => setSubtaskReplyingTo(comment)}
                                title="Reply to this comment"
                              >
                                <Reply size={14} /> Reply
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>
                
                {/* Reply indicator */}
                {subtaskReplyingTo && (
                  <div className="replying-to-indicator">
                    <Reply size={14} />
                    <span>Replying to {subtaskReplyingTo.commentByName}: "{subtaskReplyingTo.text.substring(0, 40)}{subtaskReplyingTo.text.length > 40 ? '...' : ''}"</span>
                    <button className="cancel-reply-btn" onClick={() => setSubtaskReplyingTo(null)}>
                      <X size={14} />
                    </button>
                  </div>
                )}
                
                {/* Comment input */}
                <div className="chat-input-container">
                  <input
                    type="text"
                    value={newSubtaskComment}
                    onChange={(e) => setNewSubtaskComment(e.target.value)}
                    placeholder={subtaskReplyingTo ? "Type your reply..." : "Type a comment..."}
                    onKeyPress={(e) => e.key === 'Enter' && !submittingSubtaskComment && handleAddSubtaskComment()}
                    disabled={submittingSubtaskComment}
                  />
                  <button 
                    className="send-btn"
                    onClick={handleAddSubtaskComment}
                    disabled={!newSubtaskComment.trim() || submittingSubtaskComment}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-buttons">
              <button className="btn-cancel" onClick={handleCloseViewModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subtask Modal */}
      {showEditModal && editingSubtask && (
        <div className="modal-overlay" onClick={handleCloseEditModal}>
          <div className="modal-content edit-task-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Subtask - {editingSubtask.subtaskNo}</h2>
              <button className="close-btn" onClick={handleCloseEditModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="edit-task-form">
              <div className="form-group">
                <label>Subtask Name</label>
                <input
                  type="text"
                  value={editFormData.subtaskName}
                  onChange={(e) => setEditFormData({ ...editFormData, subtaskName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  rows={4}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={editFormData.dueDate}
                    onChange={(e) => setEditFormData({ ...editFormData, dueDate: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Assigned To</label>
                  <SearchableSelect
                    options={staffMembers.map(s => ({ label: s.name, value: s._id }))}
                    value={editFormData.assignedTo}
                    onChange={(e) => setEditFormData({ ...editFormData, assignedTo: e.target.value })}
                    placeholder="Select Staff Member"
                    searchPlaceholder="Search staff..."
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    required
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={editFormData.priority}
                    onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })}
                    required
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="modal-buttons">
                <button type="button" className="btn-cancel" onClick={handleCloseEditModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-create">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const CreateSubtask = () => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    subtaskName: '',
    description: '',
    dueDate: new Date(),
    assignedTo: '',
    taskId: '', // Parent Task ID
    priority: 'Medium'
  });
  const [staffMembers, setStaffMembers] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);

  useEffect(() => {
    fetchStaffMembers();
    fetchMyTasks();
  }, []);

  const fetchStaffMembers = async () => {
    try {
      const response = await usersAPI.getStaff();
      setStaffMembers(response.data.staff || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      setError('Failed to load staff members');
    }
  };

  const fetchMyTasks = async () => {
    try {
      const response = await tasksAPI.getAll();
      // Filter for tasks assigned to this manager
      setMyTasks(response.data.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError('Failed to load tasks');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.assignedTo) {
      setError('Please select a staff member');
      setLoading(false);
      return;
    }

    if (!formData.taskId) {
      setError('Please select a parent task');
      setLoading(false);
      return;
    }

    try {
      const submitData = {
        subtaskName: formData.subtaskName,
        description: formData.description,
        dueDate: formData.dueDate.toISOString(),
        assignedTo: formData.assignedTo,
        taskId: formData.taskId,
        priority: formData.priority
      };
      const response = await tasksAPI.createSubtask(submitData);
      
      // If files are selected, upload them to the newly created subtask
      if (selectedFiles.length > 0 && response.data.subtask) {
        try {
          await tasksAPI.uploadSubtaskAttachments(response.data.subtask._id, selectedFiles);
          toast.success('Subtask created with attachments successfully!');
        } catch (uploadError) {
          console.error('Error uploading attachments:', uploadError);
          toast.success('Subtask created but failed to upload some attachments');
        }
      } else {
        toast.success('Subtask created successfully!');
      }
      
      handleCancel();
    } catch (error) {
      console.error('Error creating subtask:', error);
      toast.error(error.response?.data?.message || 'Failed to create subtask');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCancel = () => {
    setFormData({
      subtaskName: '',
      description: '',
      dueDate: new Date(),
      assignedTo: '',
      taskId: '',
      priority: 'Medium'
    });
    setSelectedFiles([]);
    setError('');
  };

  return (
    <div className="create-task">
      <h1 className="page-title">Create Subtask for Staff</h1>
      {error && <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
      
      <form onSubmit={handleSubmit} className="task-form">
        {/* Parent Task Selection */}
        <div className="form-group">
          <label>Select Parent Task *</label>
          <SearchableSelect
            options={myTasks.map(t => ({ label: `${t.taskNo} - ${t.taskName}`, value: t._id }))}
            value={formData.taskId}
            onChange={(e) => setFormData({ ...formData, taskId: e.target.value })}
            placeholder="Select a task to create subtask for"
            searchPlaceholder="Search tasks..."
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Subtask Name</label>
          <input
            type="text"
            value={formData.subtaskName}
            onChange={(e) => setFormData({ ...formData, subtaskName: e.target.value })}
            placeholder="Enter subtask name"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter subtask description"
            rows={5}
            required
            disabled={loading}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Due Date</label>
            <input
              type="date"
              value={formData.dueDate.toISOString().split('T')[0]}
              onChange={(e) => setFormData({ ...formData, dueDate: new Date(e.target.value) })}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Assign To</label>
            <SearchableSelect
              options={staffMembers.map(s => ({ label: `${s.name} (${s.username})`, value: s._id }))}
              value={formData.assignedTo}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              placeholder="Select Staff Member"
              searchPlaceholder="Search staff..."
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              required
              disabled={loading}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>

        {/* File Attachments Section */}
        <div className="form-group">
          <label>Attachments (Optional)</label>
          <div className="file-input-container">
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              id="create-subtask-file-upload"
              className="file-input"
              disabled={loading}
            />
            <label htmlFor="create-subtask-file-upload" className="file-label">
              <Upload size={20} />
              Choose Files
            </label>
            <span className="file-hint">Max 10MB per file. Supported: jpg, png, pdf, doc, docx, xls, xlsx, txt</span>
          </div>
          
          {selectedFiles.length > 0 && (
            <div className="selected-files-list">
              <h4>Selected Files ({selectedFiles.length}):</h4>
              {selectedFiles.map((file, index) => (
                <div key={index} className="selected-file-item">
                  <FileText size={16} />
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">({formatFileSize(file.size)})</span>
                  <button 
                    type="button"
                    className="remove-file-btn"
                    onClick={() => handleRemoveFile(index)}
                    disabled={loading}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="button-group">
          <button type="button" className="btn-cancel" onClick={handleCancel} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn-create" disabled={loading}>
            {loading ? 'Creating...' : 'Create Subtask'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Staff Reports Component
const StaffReports = () => {
  const toast = useToast();
  const [subtasks, setSubtasks] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [reportData, setReportData] = useState({
    totalAssigned: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    overdue: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    calculateReportData();
  }, [subtasks, selectedStaff]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subtasksResponse, staffResponse] = await Promise.all([
        tasksAPI.getSubtasks(),
        usersAPI.getStaff()
      ]);
      setSubtasks(subtasksResponse.data.subtasks || []);
      setStaffMembers(staffResponse.data.staff || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const calculateReportData = () => {
    let filtered = subtasks;
    
    if (selectedStaff !== 'All') {
      filtered = filtered.filter(st => st.assignedTo?._id === selectedStaff);
    }

    const now = new Date();
    const completed = filtered.filter(st => st.status === 'Completed').length;
    const inProgress = filtered.filter(st => st.status === 'In Progress').length;
    const pending = filtered.filter(st => st.status === 'Pending').length;
    const overdue = filtered.filter(st => 
      st.status !== 'Completed' && new Date(st.dueDate) < now
    ).length;

    setReportData({
      totalAssigned: filtered.length,
      completed,
      inProgress,
      pending,
      overdue
    });
  };

  const getFilteredSubtasks = () => {
    let filtered = subtasks;
    
    if (selectedStaff !== 'All') {
      filtered = filtered.filter(st => st.assignedTo?._id === selectedStaff);
    }
    
    if (selectedStatus !== 'All') {
      filtered = filtered.filter(st => st.status === selectedStatus);
    }
    
    return filtered;
  };

  const getStatusClass = (status) => {
    switch(status) {
      case 'Pending': return 'pending';
      case 'In Progress': return 'in-progress';
      case 'Completed': return 'completed';
      case 'Cancelled': return 'cancelled';
      default: return '';
    }
  };

  const getStaffPerformance = () => {
    const staffPerformance = [];
    
    staffMembers.forEach(staff => {
      const staffSubtasks = subtasks.filter(st => st.assignedTo?._id === staff._id);
      const total = staffSubtasks.length;
      const completed = staffSubtasks.filter(st => st.status === 'Completed').length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      if (total > 0) {
        staffPerformance.push({
          ...staff,
          total,
          completed,
          inProgress: staffSubtasks.filter(st => st.status === 'In Progress').length,
          pending: staffSubtasks.filter(st => st.status === 'Pending').length,
          completionRate
        });
      }
    });
    
    return staffPerformance.sort((a, b) => b.completionRate - a.completionRate);
  };

  if (loading) {
    return <div className="all-tasks"><p>Loading reports...</p></div>;
  }

  return (
    <div className="all-tasks">
      <h1 className="page-title">Staff Work Reports</h1>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card" style={{ borderLeftColor: '#3b82f6' }}>
          <div className="stat-icon" style={{ backgroundColor: '#dbeafe', color: '#3b82f6' }}>
            <ClipboardList size={28} />
          </div>
          <div className="stat-info">
            <h3>Total Assigned</h3>
            <p className="stat-value">{reportData.totalAssigned}</p>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#10b981' }}>
          <div className="stat-icon" style={{ backgroundColor: '#d1fae5', color: '#10b981' }}>
            <CheckSquare size={28} />
          </div>
          <div className="stat-info">
            <h3>Completed</h3>
            <p className="stat-value">{reportData.completed}</p>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#f59e0b' }}>
          <div className="stat-icon" style={{ backgroundColor: '#fef3c7', color: '#f59e0b' }}>
            <Clock size={28} />
          </div>
          <div className="stat-info">
            <h3>In Progress</h3>
            <p className="stat-value">{reportData.inProgress}</p>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#ef4444' }}>
          <div className="stat-icon" style={{ backgroundColor: '#fee2e2', color: '#ef4444' }}>
            <Clock size={28} />
          </div>
          <div className="stat-info">
            <h3>Overdue</h3>
            <p className="stat-value">{reportData.overdue}</p>
          </div>
        </div>
      </div>

      {/* Staff Performance Table */}
      <div className="table-container" style={{ marginBottom: '24px' }}>
        <h2 style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', margin: 0 }}>
          <FileBarChart size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          Staff Performance Summary
        </h2>
        <div className="table-scroll-wrapper">
          <table className="tasks-table">
            <thead>
              <tr>
                <th>Staff Name</th>
                <th>Department</th>
                <th>Total Tasks</th>
                <th>Completed</th>
                <th>In Progress</th>
                <th>Pending</th>
                <th>Completion Rate</th>
              </tr>
            </thead>
            <tbody>
              {getStaffPerformance().length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center' }}>No staff assignments yet</td>
                </tr>
              ) : (
                getStaffPerformance().map((staff) => (
                  <tr key={staff._id}>
                    <td><strong>{staff.name}</strong></td>
                    <td>{staff.department || 'N/A'}</td>
                    <td>{staff.total}</td>
                    <td style={{ color: '#10b981' }}>{staff.completed}</td>
                    <td style={{ color: '#3b82f6' }}>{staff.inProgress}</td>
                    <td style={{ color: '#f59e0b' }}>{staff.pending}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ 
                          width: '100px', 
                          height: '8px', 
                          backgroundColor: '#e5e7eb', 
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{ 
                            width: `${staff.completionRate}%`, 
                            height: '100%', 
                            backgroundColor: staff.completionRate >= 70 ? '#10b981' : staff.completionRate >= 40 ? '#f59e0b' : '#ef4444',
                            borderRadius: '4px'
                          }} />
                        </div>
                        <span style={{ fontWeight: 'bold' }}>{staff.completionRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-section">
        <div className="status-filter">
          <label>Filter by Staff:</label>
          <SearchableSelect
            className="filter-select"
            options={[
              { label: 'All Staff', value: 'All' },
              ...staffMembers.map(s => ({ label: s.name, value: s._id }))
            ]}
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            placeholder="Select Staff"
            searchPlaceholder="Search staff..."
          />
        </div>
        <div className="status-filter">
          <label>Filter by Status:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Detailed Task List */}
      <div className="table-container">
        <h2 style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', margin: 0 }}>
          Detailed Task List
        </h2>
        <div className="table-scroll-wrapper">
          <table className="tasks-table">
            <thead>
              <tr>
                <th>Subtask No</th>
                <th>Subtask Name</th>
                <th>Assigned To</th>
                <th>Due Date</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredSubtasks().length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center' }}>No subtasks found</td>
                </tr>
              ) : (
                getFilteredSubtasks().map((subtask) => (
                  <tr key={subtask._id}>
                    <td>{subtask.subtaskNo}</td>
                    <td>{subtask.subtaskName}</td>
                    <td>{subtask.assignedTo?.name || 'Unassigned'}</td>
                    <td>{new Date(subtask.dueDate).toLocaleDateString()}</td>
                    <td>
                      <span className={`priority-badge priority-${subtask.priority?.toLowerCase()}`}>
                        {subtask.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusClass(subtask.status)}`}>
                        {subtask.status}
                      </span>
                    </td>
                    <td>{new Date(subtask.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
