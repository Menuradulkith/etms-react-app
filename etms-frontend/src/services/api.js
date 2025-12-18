import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (username, password, role) =>
    api.post('/auth/login', { username, password, role }),
  
  register: (userData) =>
    api.post('/auth/register', userData),
  
  getMe: () =>
    api.get('/auth/me'),
  
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
  
  forceChangePassword: (newPassword) =>
    api.post('/auth/force-change-password', { newPassword }),
  
  updateProfile: (currentPassword, newUsername, newPassword) =>
    api.put('/auth/update-profile', { currentPassword, newUsername, newPassword }),
};

// Activities API
export const activitiesAPI = {
  getRecent: (limit = 10) =>
    api.get('/activities', { params: { limit } }),
};

// Helper function to transform user data from backend to frontend format
const transformUserFromBackend = (user) => ({
  _id: user._id,
  username: user.user_name,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  department: user.department,
  roleId: user.roleId,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

// Users API
export const usersAPI = {
  getAll: async (params) => {
    const response = await api.get('/users', { params });
    return {
      ...response,
      data: {
        ...response.data,
        users: (response.data.users || []).map(transformUserFromBackend)
      }
    };
  },
  
  getById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return {
      ...response,
      data: {
        ...response.data,
        user: response.data.user ? transformUserFromBackend(response.data.user) : null
      }
    };
  },
  
  create: (userData) => {
    // Map frontend field names to backend field names
    const mappedData = {
      name: userData.name,
      user_name: userData.username,
      email: userData.email,
      password: userData.password,
      role: userData.role,
      department: userData.department
    };
    return api.post('/users', mappedData);
  },
  
  update: (id, userData) => {
    const mappedData = {};
    if (userData.name) mappedData.name = userData.name;
    if (userData.email) mappedData.email = userData.email;
    if (userData.password) mappedData.password = userData.password;
    if (userData.status) mappedData.status = userData.status;
    if (userData.department) mappedData.department = userData.department;
    return api.put(`/users/${id}`, mappedData);
  },
  
  delete: (id) =>
    api.delete(`/users/${id}`),
  
  resetPassword: (id, newPassword) =>
    api.post(`/users/${id}/reset-password`, { newPassword }),
  
  getManagers: async () => {
    const response = await api.get('/users/managers/list');
    return {
      ...response,
      data: {
        ...response.data,
        managers: (response.data.managers || []).map(m => ({
          _id: m._id,
          name: m.name,
          username: m.user_name,
          department: m.department,
          role: m.role
        }))
      }
    };
  },
  
  getStaff: async () => {
    const response = await api.get('/users/staff/list');
    return {
      ...response,
      data: {
        ...response.data,
        staff: (response.data.staff || []).map(s => ({
          _id: s._id,
          name: s.name,
          username: s.user_name,
          department: s.department,
          role: s.role
        }))
      }
    };
  },

  // Manager Staff Management APIs
  getStaffForManager: async (params) => {
    const response = await api.get('/users/manager/staff', { params });
    return {
      ...response,
      data: {
        ...response.data,
        users: (response.data.users || []).map(transformUserFromBackend)
      }
    };
  },

  createStaffByManager: (userData) => {
    const mappedData = {
      name: userData.name,
      user_name: userData.username,
      email: userData.email,
      password: userData.password,
      department: userData.department
    };
    return api.post('/users/manager/staff', mappedData);
  },

  updateStaffByManager: (id, userData) => {
    const mappedData = {};
    if (userData.name) mappedData.name = userData.name;
    if (userData.password) mappedData.password = userData.password;
    if (userData.department) mappedData.department = userData.department;
    return api.put(`/users/manager/staff/${id}`, mappedData);
  },

  deleteStaffByManager: (id) =>
    api.delete(`/users/manager/staff/${id}`),
};

// Helper functions to transform task data between frontend and backend formats
const transformTaskFromBackend = (task) => ({
  _id: task._id,
  taskNo: task.task_id,
  taskName: task.task_name,
  description: task.description,
  dueDate: task.due_date,
  status: task.status,
  priority: task.priority,
  attachments: task.attachments || [],
  assignedTo: task.assigned_to ? {
    _id: task.assigned_to._id,
    name: task.assigned_to.name,
    department: task.assigned_to.department,
    username: task.assigned_to.mid?.user_name
  } : null,
  createdBy: task.createdBy,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
  // Include subtasks if present (for Admin view)
  subtasks: task.subtasks ? task.subtasks.map(transformSubtaskFromBackend) : []
});

const transformSubtaskFromBackend = (subtask) => ({
  _id: subtask._id,
  priority: subtask.priority,
  subtaskNo: subtask.subtask_id,
  subtaskName: subtask.subtask_name,
  description: subtask.description,
  dueDate: subtask.due_date,
  status: subtask.status,
  taskId: subtask.task_id,
  attachments: subtask.attachments || [],
  assignedTo: subtask.assigned_to ? {
    _id: subtask.assigned_to._id,
    name: subtask.assigned_to.name,
    department: subtask.assigned_to.department,
    username: subtask.assigned_to.sid?.user_name
  } : null,
  createdBy: subtask.createdBy,
  createdAt: subtask.createdAt,
  updatedAt: subtask.updatedAt
});

// Tasks API
export const tasksAPI = {
  getAll: async (params) => {
    const response = await api.get('/tasks', { params });
    return {
      ...response,
      data: {
        ...response.data,
        tasks: (response.data.tasks || []).map(transformTaskFromBackend)
      }
    };
  },
  
  getById: async (id) => {
    const response = await api.get(`/tasks/${id}`);
    return {
      ...response,
      data: {
        ...response.data,
        task: response.data.task ? transformTaskFromBackend(response.data.task) : null
      }
    };
  },
  
  getStats: () =>
    api.get('/tasks/stats'),
  
  getManagers: () =>
    api.get('/tasks/managers'),
  
  getStaff: () =>
    api.get('/tasks/staff'),
  
  getSubtasks: async (params) => {
    const response = await api.get('/tasks/subtasks', { params });
    return {
      ...response,
      data: {
        ...response.data,
        subtasks: (response.data.subtasks || []).map(transformSubtaskFromBackend)
      }
    };
  },
  
  getReports: (params) =>
    api.get('/tasks/reports', { params }),
  
  create: (taskData) => {
    // Map frontend field names to backend field names
    const mappedData = {
      task_name: taskData.taskName,
      description: taskData.description,
      due_date: taskData.dueDate,
      assigned_to: taskData.assignedTo,
      priority: taskData.priority || 'Medium'
    };
    return api.post('/tasks', mappedData);
  },
  
  createSubtask: (subtaskData) => {
    const mappedData = {
      subtask_name: subtaskData.subtaskName,
      description: subtaskData.description,
      due_date: subtaskData.dueDate,
      task_id: subtaskData.taskId,
      priority: subtaskData.priority || 'Medium'
    };
    // Only include assigned_to if provided (Admin creates without assignment)
    if (subtaskData.assignedTo) {
      mappedData.assigned_to = subtaskData.assignedTo;
    }
    return api.post('/tasks/subtasks', mappedData);
  },

  // Assign staff to a subtask (Manager only)
  assignSubtaskToStaff: (subtaskId, staffId) => {
    return api.put(`/tasks/subtasks/${subtaskId}/assign`, { assigned_to: staffId });
  },
  
  update: (id, taskData) => {
    const mappedData = {};
    if (taskData.taskName) mappedData.task_name = taskData.taskName;
    if (taskData.description) mappedData.description = taskData.description;
    if (taskData.dueDate) mappedData.due_date = taskData.dueDate;
    if (taskData.assignedTo) mappedData.assigned_to = taskData.assignedTo;
    if (taskData.status) mappedData.status = taskData.status;
    if (taskData.priority) mappedData.priority = taskData.priority;
    return api.put(`/tasks/${id}`, mappedData);
  },
  
  updateSubtask: (id, subtaskData) => {
    const mappedData = {};
    if (subtaskData.subtaskName) mappedData.subtask_name = subtaskData.subtaskName;
    if (subtaskData.description) mappedData.description = subtaskData.description;
    if (subtaskData.dueDate) mappedData.due_date = subtaskData.dueDate;
    if (subtaskData.assignedTo) mappedData.assigned_to = subtaskData.assignedTo;
    if (subtaskData.status) mappedData.status = subtaskData.status;
    if (subtaskData.priority) mappedData.priority = subtaskData.priority;
    return api.put(`/tasks/subtasks/${id}`, mappedData);
  },
  
  delete: (id) =>
    api.delete(`/tasks/${id}`),
  
  deleteSubtask: (id) =>
    api.delete(`/tasks/subtasks/${id}`),
  
  updateStatus: (id, status) =>
    api.put(`/tasks/${id}/status`, { status }),
  
  updateSubtaskStatus: (id, status) =>
    api.put(`/tasks/subtasks/${id}/status`, { status }),
  
  submitReport: (reportData) =>
    api.post('/tasks/reports', reportData),
  
  // Attachment methods
  uploadAttachments: (taskId, files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('attachments', file);
    });
    return api.post(`/tasks/${taskId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  downloadAttachment: (taskId, attachmentId) =>
    api.get(`/tasks/${taskId}/attachments/${attachmentId}`, {
      responseType: 'blob',
    }),
  
  deleteAttachment: (taskId, attachmentId) =>
    api.delete(`/tasks/${taskId}/attachments/${attachmentId}`),
  
  // Subtask attachment methods
  uploadSubtaskAttachments: (subtaskId, files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('attachments', file);
    });
    return api.post(`/tasks/subtasks/${subtaskId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  getSubtaskAttachments: (subtaskId) =>
    api.get(`/tasks/subtasks/${subtaskId}/attachments`),
  
  downloadSubtaskAttachment: (subtaskId, attachmentId) =>
    api.get(`/tasks/subtasks/${subtaskId}/attachments/${attachmentId}`, {
      responseType: 'blob',
    }),
  
  deleteSubtaskAttachment: (subtaskId, attachmentId) =>
    api.delete(`/tasks/subtasks/${subtaskId}/attachments/${attachmentId}`),

  // Comment methods for tasks
  getTaskComments: (taskId) =>
    api.get(`/tasks/${taskId}/comments`),
  
  addTaskComment: (taskId, text, replyTo = null) =>
    api.post(`/tasks/${taskId}/comments`, { text, replyTo }),

  // Comment methods for subtasks
  getSubtaskComments: (subtaskId) =>
    api.get(`/tasks/subtasks/${subtaskId}/comments`),
  
  addSubtaskComment: (subtaskId, text, replyTo = null) =>
    api.post(`/tasks/subtasks/${subtaskId}/comments`, { text, replyTo }),

  // Manager attachment upload (for assigned tasks)
  uploadManagerAttachments: (taskId, files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('attachments', file);
    });
    return api.post(`/tasks/${taskId}/manager-attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Staff attachment upload (for assigned subtasks)
  uploadStaffAttachments: (subtaskId, files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('attachments', file);
    });
    return api.post(`/tasks/subtasks/${subtaskId}/staff-attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Notifications API
export const notificationsAPI = {
  getAll: (params) =>
    api.get('/notifications', { params }),
  
  getUnreadCount: () =>
    api.get('/notifications/unread-count'),
  
  markAsRead: (id) =>
    api.put(`/notifications/${id}/read`),
  
  markAllAsRead: () =>
    api.put('/notifications/mark-all-read'),
  
  delete: (id) =>
    api.delete(`/notifications/${id}`),
  
  clearAll: () =>
    api.delete('/notifications/clear-all'),
};

// Department API
export const departmentsAPI = {
  getAll: () =>
    api.get('/departments'),
  
  create: (deptData) =>
    api.post('/departments', deptData),
  
  update: (id, deptData) =>
    api.put(`/departments/${id}`, deptData),
  
  delete: (id) =>
    api.delete(`/departments/${id}`),
};

export default api;
