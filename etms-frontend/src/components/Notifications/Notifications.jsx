import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Trash2, X, MessageSquare, Paperclip, RefreshCw, CheckCircle } from 'lucide-react';
import { notificationsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { format, formatDistanceToNow } from 'date-fns';
import './Notifications.css';

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchUnreadCount();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationsAPI.getUnreadCount();
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationsAPI.getAll({ limit: 20 });
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationsAPI.delete(id);
      const notification = notifications.find(n => n._id === id);
      if (notification && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleClearAll = async () => {
    try {
      await notificationsAPI.clearAll();
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'comment':
        return <MessageSquare size={16} className="notification-type-icon comment" />;
      case 'attachment':
        return <Paperclip size={16} className="notification-type-icon attachment" />;
      case 'status_update':
        return <RefreshCw size={16} className="notification-type-icon status" />;
      case 'task_completed':
      case 'subtask_completed':
        return <CheckCircle size={16} className="notification-type-icon completed" />;
      case 'task_assigned':
      case 'subtask_assigned':
        return <Bell size={16} className="notification-type-icon assigned" />;
      default:
        return <Bell size={16} className="notification-type-icon" />;
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read first
    if (!notification.isRead) {
      await handleMarkAsRead(notification._id);
    }

    // Determine the navigation path based on user role and notification type
    let path = '';
    const userRole = user?.role?.toLowerCase();

    if (notification.relatedSubTask) {
      // Navigate to subtask view
      if (userRole === 'admin') {
        path = '/admin/tasks';
      } else if (userRole === 'manager') {
        if (notification.type === 'subtask_assigned' || notification.type === 'comment' || notification.type === 'attachment') {
          path = '/manager/assigned';
        } else {
          path = '/manager/mytasks';
        }
      } else if (userRole === 'staff') {
        path = '/staff/mytasks';
      }
    } else if (notification.relatedTask) {
      // Navigate to task view
      if (userRole === 'admin') {
        path = '/admin/tasks';
      } else if (userRole === 'manager') {
        path = '/manager/mytasks';
      }
    }

    if (path) {
      setIsOpen(false);
      // Store the task/subtask ID in sessionStorage for highlighting
      if (notification.relatedTask) {
        sessionStorage.setItem('highlightTaskId', notification.relatedTask);
      }
      if (notification.relatedSubTask) {
        sessionStorage.setItem('highlightSubtaskId', notification.relatedSubTask);
      }
      navigate(path);
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffInHours = (now - notifDate) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return formatDistanceToNow(notifDate, { addSuffix: true });
    } else {
      return format(notifDate, 'MMM d, yyyy h:mm a');
    }
  };

  return (
    <div className="notifications-container" ref={dropdownRef}>
      <button 
        className="notifications-bell"
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="notifications-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <h3>Notifications</h3>
            <div className="notifications-actions">
              {unreadCount > 0 && (
                <button 
                  className="mark-all-read-btn"
                  onClick={handleMarkAllAsRead}
                  title="Mark all as read"
                >
                  <CheckCheck size={16} />
                </button>
              )}
              {notifications.length > 0 && (
                <button 
                  className="clear-all-btn"
                  onClick={handleClearAll}
                  title="Clear all"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button 
                className="close-notifications-btn"
                onClick={() => setIsOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="notifications-list">
            {loading ? (
              <div className="notifications-loading">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="notifications-empty">
                <Bell size={40} className="empty-icon" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification._id} 
                  className={`notification-item ${!notification.isRead ? 'unread' : ''} ${notification.relatedTask || notification.relatedSubTask ? 'clickable' : ''}`}
                  onClick={() => (notification.relatedTask || notification.relatedSubTask) && handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-meta">
                      {notification.taskNo && (
                        <span className="notification-task-no">{notification.taskNo}</span>
                      )}
                      {notification.subtaskNo && (
                        <span className="notification-subtask-no">{notification.subtaskNo}</span>
                      )}
                      <span className="notification-time">
                        {formatTime(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="notification-actions" onClick={(e) => e.stopPropagation()}>
                    {!notification.isRead && (
                      <button 
                        className="mark-read-btn"
                        onClick={() => handleMarkAsRead(notification._id)}
                        title="Mark as read"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button 
                      className="delete-notification-btn"
                      onClick={() => handleDelete(notification._id)}
                      title="Delete"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
