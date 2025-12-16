import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Eye, Upload, Download, X, FileText, Paperclip } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { tasksAPI, usersAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import { format } from 'date-fns';
import './AllTasks.css';

const AllTasks = () => {
  const toast = useToast();
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
  const [newAttachments, setNewAttachments] = useState([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
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

  const handleView = async (id) => {
    try {
      const response = await tasksAPI.getById(id);
      setViewingTask(response.data.task);
      setShowViewModal(true);
    } catch (error) {
      console.error('Error fetching task:', error);
      toast.error('Failed to load task details');
    }
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setViewingTask(null);
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

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
                  <tr key={task._id}>
                    <td>{task.taskNo}</td>
                    <td>{task.taskName}</td>
                    <td>{task.description.substring(0, 50)}...</td>
                    <td>{task.assignedTo.name}</td>
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
                        onClick={() => handleOpenAttachments(task)}
                        title="Attachments"
                      >
                        <Paperclip size={16} />
                        <span className="attachment-count">{task.attachments?.length || 0}</span>
                      </button>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-btn btn-view"
                          onClick={() => handleView(task._id)}
                          title="View"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          className="action-btn btn-edit"
                          onClick={() => handleEdit(task)}
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          className="action-btn btn-delete"
                          onClick={() => handleDeleteClick(task._id)}
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
                  <select
                    value={editFormData.assignedTo}
                    onChange={(e) => setEditFormData({ ...editFormData, assignedTo: e.target.value })}
                    required
                    disabled={loading}
                  >
                    <option value="">Select Manager</option>
                    {managers.map((manager) => (
                      <option key={manager._id} value={manager._id}>
                        {manager.name} ({manager.username})
                      </option>
                    ))}
                  </select>
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
                        <span className="attachment-size">{formatFileSize(attachment.size)}</span>
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
            </div>

            <div className="modal-buttons">
              <button className="btn-cancel" onClick={handleCloseViewModal}>
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
