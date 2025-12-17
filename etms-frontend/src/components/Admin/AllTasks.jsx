import React, { useState, useEffect, useRef } from 'react';
import { Edit2, Trash2, Upload, Download, X, FileText, Paperclip, ChevronDown, ChevronRight, MessageSquare, Plus, Send, Reply, FolderOpen, Briefcase } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { tasksAPI, usersAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import SearchableSelect from '../SearchableSelect/SearchableSelect';
import { format, formatDistanceToNow } from 'date-fns';
import './AllTasks.css';

const AllTasks = () => {
  const toast = useToast();
  const { user } = useAuth();
  const chatEndRef = useRef(null);
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [managers, setManagers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, taskId: null });
  const [attachmentConfirmModal, setAttachmentConfirmModal] = useState({ isOpen: false, taskId: null, attachmentId: null });
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [viewingTaskAttachments, setViewingTaskAttachments] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingTask, setViewingTask] = useState(null);
  const [taskComments, setTaskComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newAttachments, setNewAttachments] = useState([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState({});
  
  // Chat/Comment state
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // Subtask comment state
  const [newSubtaskComment, setNewSubtaskComment] = useState('');
  const [subtaskReplyingTo, setSubtaskReplyingTo] = useState(null);
  const [submittingSubtaskComment, setSubmittingSubtaskComment] = useState(false);
  
  // Attachment tab state
  const [attachmentTab, setAttachmentTab] = useState('task_file');
  
  // Subtask creation state
  const [showSubtaskModal, setShowSubtaskModal] = useState(false);
  const [selectedTaskForSubtask, setSelectedTaskForSubtask] = useState(null);
  const [subtaskFormData, setSubtaskFormData] = useState({
    subtaskName: '',
    description: '',
    dueDate: new Date(),
    priority: 'Medium'
  });
  const [creatingSubtask, setCreatingSubtask] = useState(false);
  
  // Subtask view state
  const [showSubtaskViewModal, setShowSubtaskViewModal] = useState(false);
  const [viewingSubtask, setViewingSubtask] = useState(null);
  const [subtaskComments, setSubtaskComments] = useState([]);
  const [loadingSubtaskComments, setLoadingSubtaskComments] = useState(false);
  const [subtaskAttachments, setSubtaskAttachments] = useState([]);
  const [newSubtaskAttachments, setNewSubtaskAttachments] = useState([]);
  const [uploadingSubtaskAttachments, setUploadingSubtaskAttachments] = useState(false);
  const [subtaskAttachmentConfirmModal, setSubtaskAttachmentConfirmModal] = useState({ isOpen: false, subtaskId: null, attachmentId: null });
  const [subtaskAttachmentTab, setSubtaskAttachmentTab] = useState('task_file');
  
  const [editFormData, setEditFormData] = useState({
    taskName: '',
    description: '',
    dueDate: new Date(),
    assignedTo: '',
    priority: 'Medium',
    status: 'Pending'
  });

  useEffect(() => {
    fetchTasks();
    fetchManagers();
  }, []);

  // Filter tasks whenever search term or status filter changes
  useEffect(() => {
    filterTasks(searchTerm, statusFilter);
  }, [tasks, searchTerm, statusFilter]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      // Fetch only manager tasks (tasks assigned to managers by admin)
      const response = await tasksAPI.getAll({ taskType: 'manager' });
      console.log('Tasks response:', response);
      console.log('Tasks data:', response.data);
      setTasks(response.data.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      console.error('Error response:', error.response);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const filterTasks = (search, status) => {
    let filtered = tasks;

    // Filter by status
    if (status !== 'All') {
      filtered = filtered.filter(task => task.status === status);
    }

    // Filter by search term (task no, name, or description)
    if (search.trim() !== '') {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(task =>
        task.taskNo.toLowerCase().includes(searchLower) ||
        task.taskName.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower)
      );
    }

    setFilteredTasks(filtered);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
  };

  const fetchManagers = async () => {
    try {
      const response = await usersAPI.getManagers();
      setManagers(response.data.managers);
    } catch (error) {
      console.error('Error fetching managers:', error);
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setEditFormData({
      taskName: task.taskName,
      description: task.description,
      dueDate: new Date(task.dueDate),
      assignedTo: task.assignedTo._id,
      priority: task.priority,
      status: task.status
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const submitData = {
        ...editFormData,
        dueDate: editFormData.dueDate.toISOString()
      };
      await tasksAPI.update(editingTask._id, submitData);
      toast.success('Task updated successfully!');
      setShowEditModal(false);
      setEditingTask(null);
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error(error.response?.data?.message || 'Failed to update task');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCancel = () => {
    setShowEditModal(false);
    setEditingTask(null);
    setError('');
  };

  const handleDeleteClick = (id) => {
    setConfirmModal({ isOpen: true, taskId: id });
  };

  const handleConfirmDelete = async () => {
    const id = confirmModal.taskId;
    try {
      await tasksAPI.delete(id);
      fetchTasks();
      toast.success('Task deleted successfully!');
      setConfirmModal({ isOpen: false, taskId: null });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error(error.response?.data?.message || 'Failed to delete task');
    }
  };

  const handleCancelDelete = () => {
    setConfirmModal({ isOpen: false, taskId: null });
  };

  const toggleTaskExpand = (taskId) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  // Subtask creation functions
  const handleOpenSubtaskModal = (task) => {
    setSelectedTaskForSubtask(task);
    setSubtaskFormData({
      subtaskName: '',
      description: '',
      dueDate: new Date(),
      priority: 'Medium'
    });
    setShowSubtaskModal(true);
  };

  const handleCloseSubtaskModal = () => {
    setShowSubtaskModal(false);
    setSelectedTaskForSubtask(null);
    setSubtaskFormData({
      subtaskName: '',
      description: '',
      dueDate: new Date(),
      priority: 'Medium'
    });
  };

  const handleSubtaskSubmit = async (e) => {
    e.preventDefault();
    setCreatingSubtask(true);
    
    try {
      const submitData = {
        subtaskName: subtaskFormData.subtaskName,
        description: subtaskFormData.description,
        dueDate: subtaskFormData.dueDate.toISOString(),
        priority: subtaskFormData.priority,
        taskId: selectedTaskForSubtask._id
        // Note: No assignedTo - Admin creates without assignment, Manager assigns later
      };
      
      await tasksAPI.createSubtask(submitData);
      toast.success('Subtask created successfully! Manager can now assign it to staff.');
      handleCloseSubtaskModal();
      fetchTasks(); // Refresh to show the new subtask
    } catch (error) {
      console.error('Error creating subtask:', error);
      toast.error(error.response?.data?.message || 'Failed to create subtask');
    } finally {
      setCreatingSubtask(false);
    }
  };

  const handleView = async (id) => {
    try {
      const response = await tasksAPI.getById(id);
      setViewingTask(response.data.task);
      setShowViewModal(true);
      
      // Fetch comments for this task
      setLoadingComments(true);
      try {
        const commentsResponse = await tasksAPI.getTaskComments(id);
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

  // Subtask view handlers
  const handleViewSubtask = async (subtask) => {
    setViewingSubtask(subtask);
    setShowSubtaskViewModal(true);
    setSubtaskAttachments(subtask.attachments || []);
    
    // Fetch comments for this subtask
    setLoadingSubtaskComments(true);
    try {
      const commentsResponse = await tasksAPI.getSubtaskComments(subtask._id);
      setSubtaskComments(commentsResponse.data.comments || []);
    } catch (error) {
      console.error('Error fetching subtask comments:', error);
      setSubtaskComments([]);
    } finally {
      setLoadingSubtaskComments(false);
    }
  };

  const handleCloseSubtaskViewModal = () => {
    setShowSubtaskViewModal(false);
    setViewingSubtask(null);
    setSubtaskComments([]);
    setSubtaskAttachments([]);
    setNewSubtaskAttachments([]);
  };

  // Subtask attachment handlers
  const handleSubtaskFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setNewSubtaskAttachments(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const handleRemoveNewSubtaskAttachment = (index) => {
    setNewSubtaskAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadSubtaskAttachments = async () => {
    if (!viewingSubtask || newSubtaskAttachments.length === 0) return;
    
    setUploadingSubtaskAttachments(true);
    try {
      const response = await tasksAPI.uploadSubtaskAttachments(viewingSubtask._id, newSubtaskAttachments);
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
      const response = await tasksAPI.downloadSubtaskAttachment(viewingSubtask._id, attachmentId);
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

  const handleDeleteSubtaskAttachmentClick = (attachmentId) => {
    setSubtaskAttachmentConfirmModal({ 
      isOpen: true, 
      subtaskId: viewingSubtask._id, 
      attachmentId 
    });
  };

  const handleConfirmDeleteSubtaskAttachment = async () => {
    const { subtaskId, attachmentId } = subtaskAttachmentConfirmModal;
    try {
      const response = await tasksAPI.deleteSubtaskAttachment(subtaskId, attachmentId);
      setSubtaskAttachments(response.data.attachments || []);
      toast.success('Attachment deleted successfully!');
      fetchTasks(); // Refresh the task list
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error('Failed to delete attachment');
    } finally {
      setSubtaskAttachmentConfirmModal({ isOpen: false, subtaskId: null, attachmentId: null });
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setViewingTask(null);
    setTaskComments([]);
    setNewComment('');
    setReplyingTo(null);
  };

  // Add comment to task (chat style)
  const handleAddTaskComment = async () => {
    if (!newComment.trim() || !viewingTask) return;
    
    setSubmittingComment(true);
    try {
      await tasksAPI.addTaskComment(viewingTask._id, newComment.trim(), replyingTo?._id);
      toast.success('Comment added!');
      setNewComment('');
      setReplyingTo(null);
      
      // Refresh comments
      const response = await tasksAPI.getTaskComments(viewingTask._id);
      setTaskComments(response.data.comments || []);
      
      // Scroll to bottom of chat
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

  // Get parent comment for replies
  const getParentComment = (replyToId, comments) => {
    return comments.find(c => c._id === replyToId);
  };

  // Check if comment is from current user
  const isOwnComment = (comment) => {
    return comment.commentByModel === 'Admin';
  };

  // Filter attachments by category
  const getTaskFileAttachments = (attachments) => {
    return (attachments || []).filter(a => a.category === 'task_file' || !a.category);
  };

  const getWorkFileAttachments = (attachments) => {
    return (attachments || []).filter(a => a.category === 'work_file');
  };

  // Add comment to subtask (chat style)
  const handleAddSubtaskComment = async () => {
    if (!newSubtaskComment.trim() || !viewingSubtask) return;
    
    setSubmittingSubtaskComment(true);
    try {
      await tasksAPI.addSubtaskComment(viewingSubtask._id, newSubtaskComment.trim(), subtaskReplyingTo?._id);
      toast.success('Comment added!');
      setNewSubtaskComment('');
      setSubtaskReplyingTo(null);
      
      // Refresh comments
      const response = await tasksAPI.getSubtaskComments(viewingSubtask._id);
      setSubtaskComments(response.data.comments || []);
    } catch (error) {
      console.error('Error adding subtask comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmittingSubtaskComment(false);
    }
  };

  // Check if subtask comment is from current user
  const isOwnSubtaskComment = (comment) => {
    return comment.commentByModel === 'Admin';
  };

  const getStatusClass = (status) => {
    switch(status) {
      case 'Pending':
        return 'pending';
      case 'In Progress':
        return 'in-progress';
      case 'Completed':
        return 'completed';
      case 'Cancelled':
        return 'cancelled';
      default:
        return '';
    }
  };

  // Attachment handling functions
  const handleOpenAttachments = async (task) => {
    // Fetch fresh task data to get latest attachments
    try {
      const response = await tasksAPI.getById(task._id);
      setViewingTaskAttachments(response.data.task);
      setNewAttachments([]);
      setShowAttachmentsModal(true);
    } catch (error) {
      console.error('Error fetching task attachments:', error);
      toast.error('Failed to load attachments');
    }
  };

  const handleCloseAttachments = () => {
    setShowAttachmentsModal(false);
    setViewingTaskAttachments(null);
    setNewAttachments([]);
  };

  const handleNewAttachmentChange = (e) => {
    const files = Array.from(e.target.files);
    setNewAttachments(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const removeNewAttachment = (index) => {
    setNewAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadAttachments = async () => {
    if (newAttachments.length === 0) return;
    
    setUploadingAttachments(true);
    try {
      await tasksAPI.uploadAttachments(viewingTaskAttachments._id, newAttachments);
      toast.success('Attachments uploaded successfully!');
      setNewAttachments([]);
      // Refresh task data
      const response = await tasksAPI.getById(viewingTaskAttachments._id);
      setViewingTaskAttachments(response.data.task);
      fetchTasks();
    } catch (error) {
      console.error('Error uploading attachments:', error);
      toast.error('Failed to upload attachments');
    } finally {
      setUploadingAttachments(false);
    }
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

  const handleDeleteAttachmentClick = (attachmentId) => {
    setAttachmentConfirmModal({ 
      isOpen: true, 
      taskId: viewingTaskAttachments._id, 
      attachmentId 
    });
  };

  const handleConfirmDeleteAttachment = async () => {
    const { taskId, attachmentId } = attachmentConfirmModal;
    try {
      await tasksAPI.deleteAttachment(taskId, attachmentId);
      toast.success('Attachment deleted successfully!');
      // Refresh task data
      const response = await tasksAPI.getById(taskId);
      setViewingTaskAttachments(response.data.task);
      fetchTasks();
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error('Failed to delete attachment');
    } finally {
      setAttachmentConfirmModal({ isOpen: false, taskId: null, attachmentId: null });
    }
  };

  const handleCancelDeleteAttachment = () => {
    setAttachmentConfirmModal({ isOpen: false, taskId: null, attachmentId: null });
  };

  return (
    <div className="all-tasks">
      <h1 className="page-title">All Tasks</h1>
      
      {error && <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
      
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
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>
      
      {loading ? (
        <div>Loading tasks...</div>
      ) : (
        <div className="table-container">
          <div className="table-scroll-wrapper">
            <table className="tasks-table">
              <thead>
              <tr>
                <th>Task No</th>
                <th>Task Name</th>
                <th>Description</th>
                <th>Assigned To</th>
                <th>Due Date</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Files</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center' }}>No tasks found</td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <React.Fragment key={task._id}>
                    <tr 
                      className={expandedTasks[task._id] ? 'task-row expanded clickable-row' : 'task-row clickable-row'}
                      onClick={() => handleView(task._id)}
                    >
                      <td>
                        <div className="task-no-cell">
                          {task.subtasks && task.subtasks.length > 0 && (
                            <button
                              className="expand-btn"
                              onClick={(e) => { e.stopPropagation(); toggleTaskExpand(task._id); }}
                              title={expandedTasks[task._id] ? 'Collapse subtasks' : 'Expand subtasks'}
                            >
                              {expandedTasks[task._id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          )}
                          <span>{task.taskNo}</span>
                          {task.subtasks && task.subtasks.length > 0 && (
                            <span className="subtask-count-badge">{task.subtasks.length}</span>
                          )}
                        </div>
                      </td>
                      <td>{task.taskName}</td>
                      <td>{task.description.substring(0, 50)}...</td>
                      <td>{task.assignedTo?.name}</td>
                      <td>{format(new Date(task.dueDate), 'MM-dd-yyyy')}</td>
                      <td>{task.priority}</td>
                      <td>
                        <span className={`status-badge ${getStatusClass(task.status)}`}>
                          {task.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="action-btn btn-attachments"
                          onClick={(e) => { e.stopPropagation(); handleOpenAttachments(task); }}
                          title="Attachments"
                        >
                          <Paperclip size={16} />
                          <span className="attachment-count">{task.attachments?.length || 0}</span>
                        </button>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn btn-add-subtask"
                            onClick={(e) => { e.stopPropagation(); handleOpenSubtaskModal(task); }}
                            title="Add Subtask"
                          >
                            <Plus size={18} />
                          </button>
                          <button
                            className="action-btn btn-edit"
                            onClick={(e) => { e.stopPropagation(); handleEdit(task); }}
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            className="action-btn btn-delete"
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(task._id); }}
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Subtasks rows */}
                    {expandedTasks[task._id] && task.subtasks && task.subtasks.map((subtask) => (
                      <tr 
                        key={subtask._id} 
                        className="subtask-row clickable-row"
                        onClick={() => handleViewSubtask(subtask)}
                      >
                        <td>
                          <div className="subtask-indicator">
                            <span className="subtask-line"></span>
                            <span className="subtask-no">{subtask.subtaskNo}</span>
                          </div>
                        </td>
                        <td className="subtask-name">{subtask.subtaskName}</td>
                        <td>{subtask.description?.substring(0, 50)}...</td>
                        <td>
                          {subtask.assignedTo?.name || (
                            <span className="unassigned-badge">Unassigned</span>
                          )}
                        </td>
                        <td>{format(new Date(subtask.dueDate), 'MM-dd-yyyy')}</td>
                        <td>{subtask.priority}</td>
                        <td>
                          <span className={`status-badge ${getStatusClass(subtask.status)}`}>
                            {subtask.status}
                          </span>
                        </td>
                        <td>
                          <span className="attachment-count-static">
                            <Paperclip size={14} />
                            {subtask.attachments?.length || 0}
                          </span>
                        </td>
                        <td>
                          <span className="subtask-label">Subtask</span>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay" onClick={handleEditCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Task</h2>
            {error && <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>Task Name</label>
                <input
                  type="text"
                  value={editFormData.taskName}
                  onChange={(e) => setEditFormData({ ...editFormData, taskName: e.target.value })}
                  placeholder="Enter task name"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="Enter task description"
                  rows={4}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Due Date</label>
                  <DatePicker
                    selected={editFormData.dueDate}
                    onChange={(date) => setEditFormData({ ...editFormData, dueDate: date })}
                    dateFormat="MM-dd-yyyy"
                    className="date-picker"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>Assigned To</label>
                  <SearchableSelect
                    options={managers.map(m => ({ label: `${m.name} (${m.username})`, value: m._id }))}
                    value={editFormData.assignedTo}
                    onChange={(e) => setEditFormData({ ...editFormData, assignedTo: e.target.value })}
                    placeholder="Select Manager"
                    searchPlaceholder="Search managers..."
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={editFormData.priority}
                    onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })}
                    disabled={loading}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    disabled={loading}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="modal-buttons">
                <button type="button" className="btn-cancel" onClick={handleEditCancel} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isDangerous={true}
      />

      <ConfirmationModal
        isOpen={attachmentConfirmModal.isOpen}
        title="Delete Attachment"
        message="Are you sure you want to delete this attachment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDeleteAttachment}
        onCancel={handleCancelDeleteAttachment}
        isDangerous={true}
      />

      <ConfirmationModal
        isOpen={subtaskAttachmentConfirmModal.isOpen}
        title="Delete Subtask Attachment"
        message="Are you sure you want to delete this attachment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDeleteSubtaskAttachment}
        onCancel={() => setSubtaskAttachmentConfirmModal({ isOpen: false, subtaskId: null, attachmentId: null })}
        isDangerous={true}
      />

      {/* Attachments Modal */}
      {showAttachmentsModal && viewingTaskAttachments && (
        <div className="modal-overlay" onClick={handleCloseAttachments}>
          <div className="modal-content attachments-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Attachments - {viewingTaskAttachments.taskName}</h2>
              <button className="close-btn" onClick={handleCloseAttachments}>
                <X size={20} />
              </button>
            </div>

            {/* Existing Attachments */}
            <div className="existing-attachments">
              <h3>Current Attachments ({viewingTaskAttachments.attachments?.length || 0})</h3>
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
                          onClick={() => handleDeleteAttachmentClick(attachment._id)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-attachments">No attachments yet</p>
              )}
            </div>

            {/* Add New Attachments */}
            <div className="add-attachments">
              <h3>Add New Attachments</h3>
              <div className="file-input-wrapper">
                <input
                  type="file"
                  id="new-attachments"
                  onChange={handleNewAttachmentChange}
                  style={{ display: 'none' }}
                  multiple
                  accept=".jpeg,.jpg,.png,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                />
                <label htmlFor="new-attachments" className="file-upload-label">
                  <Upload size={20} />
                  Browse Files
                </label>
              </div>

              {newAttachments.length > 0 && (
                <div className="new-attachments-list">
                  {newAttachments.map((file, index) => (
                    <div key={index} className="new-attachment-item">
                      <FileText size={16} />
                      <span className="file-info">{file.name} ({formatFileSize(file.size)})</span>
                      <button
                        type="button"
                        className="remove-file-btn"
                        onClick={() => removeNewAttachment(index)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    className="btn-upload"
                    onClick={handleUploadAttachments}
                    disabled={uploadingAttachments}
                  >
                    {uploadingAttachments ? 'Uploading...' : 'Upload Files'}
                  </button>
                </div>
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
                  <label>Assigned To:</label>
                  <span>{viewingTask.assignedTo?.name || 'N/A'}</span>
                </div>

                <div className="view-task-row">
                  <label>Due Date:</label>
                  <span>{format(new Date(viewingTask.dueDate), 'MM-dd-yyyy')}</span>
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

              <div className="view-task-row">
                <label>Created At:</label>
                <span>{format(new Date(viewingTask.createdAt), 'MM-dd-yyyy HH:mm')}</span>
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
                      const parentComment = comment.replyTo ? getParentComment(comment.replyTo, taskComments) : null;
                      
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
                    onKeyPress={(e) => e.key === 'Enter' && !submittingComment && handleAddTaskComment()}
                    disabled={submittingComment}
                  />
                  <button 
                    className="send-btn"
                    onClick={handleAddTaskComment}
                    disabled={!newComment.trim() || submittingComment}
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

      {/* Create Subtask Modal */}
      {showSubtaskModal && selectedTaskForSubtask && (
        <div className="modal-overlay" onClick={handleCloseSubtaskModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Subtask</h2>
              <button className="close-btn" onClick={handleCloseSubtaskModal}>
                <X size={20} />
              </button>
            </div>
            
            <div className="subtask-parent-info">
              <p><strong>Parent Task:</strong> {selectedTaskForSubtask.taskNo} - {selectedTaskForSubtask.taskName}</p>
              <p><strong>Assigned Manager:</strong> {selectedTaskForSubtask.assignedTo?.name || 'N/A'}</p>
            </div>
            
            <form onSubmit={handleSubtaskSubmit}>
              <div className="form-group">
                <label>Subtask Name *</label>
                <input
                  type="text"
                  value={subtaskFormData.subtaskName}
                  onChange={(e) => setSubtaskFormData({ ...subtaskFormData, subtaskName: e.target.value })}
                  placeholder="Enter subtask name"
                  required
                  disabled={creatingSubtask}
                />
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={subtaskFormData.description}
                  onChange={(e) => setSubtaskFormData({ ...subtaskFormData, description: e.target.value })}
                  placeholder="Enter subtask description"
                  rows={4}
                  required
                  disabled={creatingSubtask}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Due Date *</label>
                  <DatePicker
                    selected={subtaskFormData.dueDate}
                    onChange={(date) => setSubtaskFormData({ ...subtaskFormData, dueDate: date })}
                    dateFormat="MM-dd-yyyy"
                    className="date-picker"
                    disabled={creatingSubtask}
                    minDate={new Date()}
                  />
                </div>

                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={subtaskFormData.priority}
                    onChange={(e) => setSubtaskFormData({ ...subtaskFormData, priority: e.target.value })}
                    disabled={creatingSubtask}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="form-info-note">
                <p>📋 Note: This subtask will be created without staff assignment. The assigned manager ({selectedTaskForSubtask.assignedTo?.name || 'N/A'}) can assign it to a staff member.</p>
              </div>

              <div className="modal-buttons">
                <button type="button" className="btn-cancel" onClick={handleCloseSubtaskModal} disabled={creatingSubtask}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={creatingSubtask}>
                  {creatingSubtask ? 'Creating...' : 'Create Subtask'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Subtask Modal */}
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

              <div className="view-task-grid">
                <div className="view-task-row">
                  <label>Assigned To:</label>
                  <span>
                    {viewingSubtask.assignedTo?.name || (
                      <span className="unassigned-badge">Unassigned - Waiting for Manager</span>
                    )}
                  </span>
                </div>

                <div className="view-task-row">
                  <label>Due Date:</label>
                  <span>{format(new Date(viewingSubtask.dueDate), 'MM-dd-yyyy')}</span>
                </div>

                <div className="view-task-row">
                  <label>Priority:</label>
                  <span className={`priority-badge priority-${viewingSubtask.priority?.toLowerCase()}`}>
                    {viewingSubtask.priority}
                  </span>
                </div>

                <div className="view-task-row">
                  <label>Status:</label>
                  <span className={`status-badge ${getStatusClass(viewingSubtask.status)}`}>
                    {viewingSubtask.status}
                  </span>
                </div>
              </div>

              <div className="view-task-row">
                <label>Created At:</label>
                <span>{format(new Date(viewingSubtask.createdAt), 'MM-dd-yyyy HH:mm')}</span>
              </div>

              {/* Attachments Section */}
              <div className="attachments-section">
                <h3><Paperclip size={18} /> Attachments ({subtaskAttachments.length})</h3>
                
                {/* Upload new attachments */}
                <div className="upload-section">
                  <div className="file-input-wrapper">
                    <input
                      type="file"
                      id="subtask-file-upload"
                      onChange={handleSubtaskFileSelect}
                      multiple
                      style={{ display: 'none' }}
                      accept=".jpeg,.jpg,.png,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    />
                    <label htmlFor="subtask-file-upload" className="file-upload-btn">
                      <Upload size={16} />
                      Add Files
                    </label>
                  </div>
                  
                  {/* New files to upload */}
                  {newSubtaskAttachments.length > 0 && (
                    <div className="new-files-list">
                      {newSubtaskAttachments.map((file, index) => (
                        <div key={index} className="new-file-item">
                          <FileText size={14} />
                          <span className="file-name">{file.name}</span>
                          <span className="file-size">({formatFileSize(file.size)})</span>
                          <button 
                            className="remove-file-btn"
                            onClick={() => handleRemoveNewSubtaskAttachment(index)}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <button 
                        className="btn-upload"
                        onClick={handleUploadSubtaskAttachments}
                        disabled={uploadingSubtaskAttachments}
                      >
                        {uploadingSubtaskAttachments ? 'Uploading...' : 'Upload Files'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Existing attachments */}
                <div className="attachments-list">
                  {subtaskAttachments.length === 0 ? (
                    <p className="no-attachments">No attachments yet</p>
                  ) : (
                    subtaskAttachments.map((attachment) => (
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
                        <div className="attachment-actions">
                          <button 
                            className="btn-download"
                            onClick={() => handleDownloadSubtaskAttachment(attachment._id, attachment.originalName)}
                            title="Download"
                          >
                            <Download size={14} />
                          </button>
                          <button 
                            className="btn-delete-attachment"
                            onClick={() => handleDeleteSubtaskAttachmentClick(attachment._id)}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Chat Comments Section */}
              <div className="comments-section chat-style">
                <h3><MessageSquare size={18} /> Comments</h3>
                
                <div className="chat-comments-container">
                  {loadingSubtaskComments ? (
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

export default AllTasks;
