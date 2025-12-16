import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  Users, 
  CheckSquare, 
  Clock, 
  TrendingUp,
  Filter,
  BarChart3,
  PieChart,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { tasksAPI, usersAPI } from '../../services/api';
import './Reports.css';

const Reports = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    totalSubtasks: 0,
    completedSubtasks: 0,
    pendingSubtasks: 0,
    inProgressSubtasks: 0
  });
  const [tasks, setTasks] = useState([]);
  const [managers, setManagers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [managerSearch, setManagerSearch] = useState("");

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, tasksRes, managersRes, staffRes] = await Promise.all([
        tasksAPI.getStats(),
        tasksAPI.getAll(),
        usersAPI.getManagers(),
        usersAPI.getStaff()
      ]);

      const statsData = statsRes.data.stats;
      setStats({
        totalTasks: statsData.tasks?.total || 0,
        completedTasks: statsData.tasks?.completed || 0,
        pendingTasks: statsData.tasks?.pending || 0,
        inProgressTasks: statsData.tasks?.inProgress || 0,
        totalSubtasks: statsData.subtasks?.total || 0,
        completedSubtasks: statsData.subtasks?.completed || 0,
        pendingSubtasks: statsData.subtasks?.pending || 0,
        inProgressSubtasks: statsData.subtasks?.inProgress || 0
      });

      setTasks(tasksRes.data.tasks || []);
      setManagers(managersRes.data.managers || []);
      setStaff(staffRes.data.staff || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const calculateCompletionRate = (completed, total) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const getTasksByManager = () => {
    const managerStats = {};
    managers.forEach(manager => {
      managerStats[manager._id] = {
        name: manager.name,
        total: 0,
        completed: 0,
        pending: 0,
        inProgress: 0
      };
    });

    tasks.forEach(task => {
      const managerId = task.assignedTo?._id;
      if (managerId && managerStats[managerId]) {
        managerStats[managerId].total++;
        if (task.status === 'Completed') managerStats[managerId].completed++;
        else if (task.status === 'Pending') managerStats[managerId].pending++;
        else if (task.status === 'In Progress') managerStats[managerId].inProgress++;
      }
    });

    return Object.values(managerStats);
  };

  const filterTasksByDate = (taskList) => {
    return taskList.filter(task => {
      const taskDate = new Date(task.createdAt);
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      end.setHours(23, 59, 59, 999);
      return taskDate >= start && taskDate <= end;
    });
  };

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success(`${filename} exported successfully!`);
  };

  const exportTasksReport = () => {
    const filteredTasks = filterTasksByDate(tasks);
    const exportData = filteredTasks.map(task => ({
      'Task No': task.taskNo,
      'Task Name': task.taskName,
      'Description': task.description?.substring(0, 100) || '',
      'Assigned To': task.assignedTo?.name || 'N/A',
      'Status': task.status,
      'Priority': task.priority || 'Medium',
      'Due Date': new Date(task.dueDate).toLocaleDateString(),
      'Created At': new Date(task.createdAt).toLocaleDateString()
    }));
    exportToCSV(exportData, 'Tasks_Report');
  };

  const exportManagerPerformance = () => {
    const managerData = getTasksByManager();
    const exportData = managerData.map(m => ({
      'Manager Name': m.name,
      'Total Tasks': m.total,
      'Completed': m.completed,
      'In Progress': m.inProgress,
      'Pending': m.pending,
      'Completion Rate': `${calculateCompletionRate(m.completed, m.total)}%`
    }));
    exportToCSV(exportData, 'Manager_Performance_Report');
  };

  const exportSummaryReport = () => {
    const exportData = [{
      'Report Date': new Date().toLocaleDateString(),
      'Date Range': `${dateRange.startDate} to ${dateRange.endDate}`,
      'Total Tasks': stats.totalTasks,
      'Completed Tasks': stats.completedTasks,
      'In Progress Tasks': stats.inProgressTasks,
      'Pending Tasks': stats.pendingTasks,
      'Task Completion Rate': `${calculateCompletionRate(stats.completedTasks, stats.totalTasks)}%`,
      'Total Subtasks': stats.totalSubtasks,
      'Completed Subtasks': stats.completedSubtasks,
      'Subtask Completion Rate': `${calculateCompletionRate(stats.completedSubtasks, stats.totalSubtasks)}%`,
      'Total Managers': managers.length,
      'Total Staff': staff.length
    }];
    exportToCSV(exportData, 'Summary_Report');
  };

  const managerStats = getTasksByManager();
  const filteredManagerStats = managerStats.filter(manager =>
    manager.name.toLowerCase().includes(managerSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="reports">
        <h1 className="page-title">Reports</h1>
        <div className="loading-container">
          <RefreshCw className="spin" size={32} />
          <p>Loading report data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reports">
      <div className="reports-header">
        <h1 className="page-title">Reports & Analytics</h1>
        <button className="refresh-btn" onClick={fetchAllData}>
          <RefreshCw size={18} />
          Refresh Data
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="date-filter-section">
        <div className="date-filter">
          <Filter size={18} />
          <label>From:</label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
          />
          <label>To:</label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
          />
        </div>
      </div>

      {/* Completion Rate Section */}
      <div className="completion-section">
        <div className="completion-card">
          <h3><BarChart3 size={20} /> Task Completion Rate</h3>
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${calculateCompletionRate(stats.completedTasks, stats.totalTasks)}%` }}
              ></div>
            </div>
            <span className="progress-text">
              {calculateCompletionRate(stats.completedTasks, stats.totalTasks)}%
            </span>
          </div>
          <p className="completion-detail">
            {stats.completedTasks} of {stats.totalTasks} tasks completed
          </p>
        </div>

        <div className="completion-card">
          <h3><PieChart size={20} /> Subtask Completion Rate</h3>
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill subtask" 
                style={{ width: `${calculateCompletionRate(stats.completedSubtasks, stats.totalSubtasks)}%` }}
              ></div>
            </div>
            <span className="progress-text">
              {calculateCompletionRate(stats.completedSubtasks, stats.totalSubtasks)}%
            </span>
          </div>
          <p className="completion-detail">
            {stats.completedSubtasks} of {stats.totalSubtasks} subtasks completed
          </p>
        </div>
      </div>

      {/* Manager Performance Section */}
      <div className="performance-section">
        <div className="section-header" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h2><Users size={22} /> Manager Performance    <input
            type="text"
            className="manager-search-bar"
            placeholder="Search manager..."
            value={managerSearch}
            onChange={e => setManagerSearch(e.target.value)}
            style={{ minWidth: 180, maxWidth: 220, padding: '6px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }}
          /></h2>

        </div>
        <div className="table-container">
          <table className="performance-table">
            <thead>
              <tr>
                <th>Manager</th>
                <th>Total Tasks</th>
                <th>Completed</th>
                <th>In Progress</th>
                <th>Pending</th>
                <th>Completion Rate</th>
              </tr>
            </thead>
            <tbody>
              {filteredManagerStats.length > 0 ? (
                filteredManagerStats.map((manager, index) => (
                  <tr key={index}>
                    <td>{manager.name}</td>
                    <td>{manager.total}</td>
                    <td className="completed-cell">{manager.completed}</td>
                    <td className="progress-cell">{manager.inProgress}</td>
                    <td className="pending-cell">{manager.pending}</td>
                    <td>
                      <div className="mini-progress">
                        <div 
                          className="mini-progress-fill"
                          style={{ width: `${calculateCompletionRate(manager.completed, manager.total)}%` }}
                        ></div>
                        <span>{calculateCompletionRate(manager.completed, manager.total)}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="no-data">No manager data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Reports Section */}
      <div className="export-section">
        <div className="section-header">
          <h2><Download size={22} /> Export Reports</h2>
        </div>
        <div className="export-grid">
          <div className="export-card" onClick={exportSummaryReport}>
            <div className="export-icon summary">
              <FileText size={32} />
            </div>
            <div className="export-info">
              <h3>Summary Report</h3>
              <p>Overview of all tasks and performance metrics</p>
            </div>
            <button className="export-btn">
              <Download size={18} />
              Export CSV
            </button>
          </div>

          <div className="export-card" onClick={exportTasksReport}>
            <div className="export-icon tasks">
              <FileSpreadsheet size={32} />
            </div>
            <div className="export-info">
              <h3>Tasks Report</h3>
              <p>Detailed list of all tasks with status and assignments</p>
            </div>
            <button className="export-btn">
              <Download size={18} />
              Export CSV
            </button>
          </div>

          <div className="export-card" onClick={exportManagerPerformance}>
            <div className="export-icon performance">
              <BarChart3 size={32} />
            </div>
            <div className="export-info">
              <h3>Manager Performance</h3>
              <p>Performance metrics for each manager</p>
            </div>
            <button className="export-btn">
              <Download size={18} />
              Export CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
