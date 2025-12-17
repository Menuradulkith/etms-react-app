import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Upload, X, FileText } from 'lucide-react';
import { tasksAPI, usersAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import SearchableSelect from '../SearchableSelect/SearchableSelect';
import './CreateTask.css';

const CreateTask = () => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    taskName: '',
    description: '',
    dueDate: new Date(),
    assignedTo: '',
    priority: 'Medium'
  });

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      const response = await usersAPI.getManagers();
      setManagers(response.data.managers);
    } catch (error) {
      console.error('Error fetching managers:', error);
      toast.error('Failed to load managers');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.assignedTo) {
      toast.error('Please select a manager');
      setLoading(false);
      return;
    }

    try {
      // Prepare data with ISO8601 date format
      const submitData = {
        ...formData,
        dueDate: formData.dueDate.toISOString()
      };
      const response = await tasksAPI.create(submitData);
      
      // Upload attachments if any files are selected
      if (selectedFiles.length > 0) {
        try {
          await tasksAPI.uploadAttachments(response.data.task._id, selectedFiles);
          toast.success('Task created with attachments!');
        } catch (uploadError) {
          console.error('Error uploading attachments:', uploadError);
          toast.warning('Task created but some attachments failed to upload');
        }
      } else {
        toast.success('Task created successfully!');
      }
      
      handleCancel();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error(error.response?.data?.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      taskName: '',
      description: '',
      dueDate: new Date(),
      assignedTo: '',
      priority: 'Medium'
    });
    setSelectedFiles([]);
    setError('');
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
    // Reset the input so the same file can be selected again if removed
    e.target.value = '';
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="create-task">
      {error && <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
      
      <form onSubmit={handleSubmit} className="task-form">
        <div className="form-group">
          <label>Task Name</label>
          <input
            type="text"
            value={formData.taskName}
            onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
            placeholder="Enter task name"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter task description"
            rows={5}
            required
            disabled={loading}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Due Date</label>
            <DatePicker
              selected={formData.dueDate}
              onChange={(date) => setFormData({ ...formData, dueDate: date })}
              dateFormat="MM-dd-yyyy"
              className="date-picker"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Assigned To</label>
            <SearchableSelect
              options={managers.map(m => ({ label: `${m.name} (${m.username})`, value: m._id }))}
              value={formData.assignedTo}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
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
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              disabled={loading}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Attach Files</label>
          <div className="file-input-wrapper">
            <input
              type="file"
              id="file-upload"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              multiple
              disabled={loading}
              accept=".jpeg,.jpg,.png,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
            <label htmlFor="file-upload" className="file-upload-label">
              <Upload size={20} />
              Browse
            </label>
            <span className="file-name">
              {selectedFiles.length > 0
                ? `${selectedFiles.length} file(s) selected`
                : 'No file chosen'}
            </span>
          </div>
          
          {selectedFiles.length > 0 && (
            <div className="selected-files-list">
              {selectedFiles.map((file, index) => (
                <div key={index} className="selected-file-item">
                  <FileText size={16} />
                  <span className="file-info">
                    {file.name} ({formatFileSize(file.size)})
                  </span>
                  <button
                    type="button"
                    className="remove-file-btn"
                    onClick={() => removeFile(index)}
                    disabled={loading}
                  >
                    <X size={16} />
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
            {loading ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTask;
