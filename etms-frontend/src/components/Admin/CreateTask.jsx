import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Upload, X, FileText } from 'lucide-react';
import { tasksAPI, usersAPI, departmentsAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useDepartments } from '../../context/DepartmentContext';
import SearchableSelect from '../SearchableSelect/SearchableSelect';
import './CreateTask.css';

const CreateTask = () => {
  const toast = useToast();
  const { departments: contextDepartments, fetchDepartments } = useDepartments();
  const [formData, setFormData] = useState({
    taskName: '',
    description: '',
    dueDate: new Date(),
    department: '',
    assignedTo: '',
    priority: 'Medium'
  });

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [managers, setManagers] = useState([]);
  const [allManagers, setAllManagers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchManagers();
    fetchDepartments(); // Fetch departments when component mounts
  }, [fetchDepartments]);

  // Update local departments when context departments change
  useEffect(() => {
    const managerDepts = [...new Set(allManagers.map(m => m.department).filter(Boolean))];
    const allDepts = [...new Set([...contextDepartments, ...managerDepts])].sort();
    setDepartments(allDepts);
  }, [contextDepartments, allManagers]);

  // Filter managers when department changes
  useEffect(() => {
    if (formData.department) {
      const filteredManagers = allManagers.filter(m => m.department === formData.department);
      setManagers(filteredManagers);
      // Reset assignedTo if current selection is not in filtered list
      const isCurrentAssignedValid = filteredManagers.some(m => m._id === formData.assignedTo);
      if (!isCurrentAssignedValid) {
        setFormData(prev => ({ ...prev, assignedTo: '' }));
      }
    } else {
      setManagers(allManagers);
    }
  }, [formData.department, allManagers]);

  const fetchManagers = async () => {
    try {
      const response = await usersAPI.getManagers();
      const managersData = response.data.managers;
      setAllManagers(managersData);
      setManagers(managersData);
    } catch (error) {
      console.error('Error fetching managers:', error);
      toast.error('Failed to load managers');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.department) {
      toast.error('Please select a department');
      setLoading(false);
      return;
    }

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
      department: '',
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
              minDate={new Date()}
            />
          </div>

          <div className="form-group">
            <label>Department <span style={{color: 'red'}}>*</span></label>
            <SearchableSelect
              options={departments.map(dept => ({ label: dept, value: dept }))}
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="Select Department"
              searchPlaceholder="Search departments..."
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Assigned To <span style={{color: 'red'}}>*</span></label>
            <SearchableSelect
              options={managers.map(m => ({ label: `${m.name} (${m.username})`, value: m._id }))}
              value={formData.assignedTo}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              placeholder={formData.department ? "Select Manager" : "Select Department First"}
              searchPlaceholder="Search managers..."
              disabled={loading || !formData.department}
            />
          </div>

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
