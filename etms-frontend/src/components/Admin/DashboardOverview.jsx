import React, { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle2, Clock, Users, FileText, UserPlus, Edit, Trash2, ListChecks, UserCog } from 'lucide-react';
import { tasksAPI, usersAPI, activitiesAPI } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import './DashboardOverview.css';

const DashboardOverview = () => {
  const [stats, setStats] = useState([
    { title: 'Total Tasks', value: '0', icon: ClipboardList, color: '#3b82f6', bgColor: '#dbeafe' },
    { title: 'Completed', value: '0', icon: CheckCircle2, color: '#10b981', bgColor: '#d1fae5' },
    { title: 'Pending', value: '0', icon: Clock, color: '#f59e0b', bgColor: '#fef3c7' },
    { title: 'In Progress', value: '0', icon: ListChecks, color: '#8b5cf6', bgColor: '#ede9fe' },
    { title: 'Total Managers', value: '0', icon: UserCog, color: '#6366f1', bgColor: '#e0e7ff' },
    { title: 'Total Staff', value: '0', icon: Users, color: '#ec4899', bgColor: '#fce7f3' },
  ]);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchActivities();
  }, []);

  const fetchStats = async () => {
    try {
      const [taskStatsRes, usersRes] = await Promise.all([
        tasksAPI.getStats(),
        usersAPI.getAll()
      ]);

      const taskStats = taskStatsRes.data.stats;
      const users = usersRes.data.users || [];
      
      // Count managers and staff separately
      const managerCount = users.filter(user => user.role === 'Manager').length;
      const staffCount = users.filter(user => user.role === 'Staff').length;

      setStats([
        { title: 'Total Tasks', value: taskStats.total.toString(), icon: ClipboardList, color: '#3b82f6', bgColor: '#dbeafe' },
        { title: 'Completed', value: taskStats.completed.toString(), icon: CheckCircle2, color: '#10b981', bgColor: '#d1fae5' },
        { title: 'Pending', value: taskStats.pending.toString(), icon: Clock, color: '#f59e0b', bgColor: '#fef3c7' },
        { title: 'In Progress', value: taskStats.inProgress.toString(), icon: ListChecks, color: '#8b5cf6', bgColor: '#ede9fe' },
        { title: 'Total Managers', value: managerCount.toString(), icon: UserCog, color: '#6366f1', bgColor: '#e0e7ff' },
        { title: 'Total Staff', value: staffCount.toString(), icon: Users, color: '#ec4899', bgColor: '#fce7f3' },
      ]);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

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
        return <CheckCircle2 size={16} />;
      case 'task_updated':
      case 'subtask_updated':
        return <Edit size={16} />;
      case 'task_deleted':
      case 'subtask_deleted':
        return <Trash2 size={16} />;
      case 'user_created':
        return <UserPlus size={16} />;
      case 'report_submitted':
        return <FileText size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  const getActivityColor = (type) => {
    if (type.includes('created')) return '#10b981';
    if (type.includes('completed')) return '#3b82f6';
    if (type.includes('updated')) return '#f59e0b';
    if (type.includes('deleted')) return '#ef4444';
    return '#6b7280';
  };

  return (
    <div className="dashboard-overview">
      <h1 className="page-title">Dashboard Overview</h1>
      
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card" style={{ borderLeftColor: stat.color }}>
            <div className="stat-icon" style={{ backgroundColor: stat.bgColor, color: stat.color }}>
              <stat.icon size={28} />
            </div>
            <div className="stat-info">
              <h3>{stat.title}</h3>
              <p className="stat-value">{stat.value}</p>
            </div>
          </div>
        ))}
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

export default DashboardOverview;
