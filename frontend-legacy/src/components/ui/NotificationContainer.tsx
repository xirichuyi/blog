// Notification Container Component

import React from 'react';
import { useNotification, type Notification } from '../../contexts/NotificationContext';
import './NotificationContainer.css';

const NotificationItem: React.FC<{ notification: Notification }> = ({ notification }) => {
  const { removeNotification } = useNotification();

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'info';
    }
  };

  const handleClose = () => {
    removeNotification(notification.id);
  };

  return (
    <div className={`notification-item notification-${notification.type}`}>
      <div className="notification-content">
        <md-icon class="notification-icon">{getIcon(notification.type)}</md-icon>
        <div className="notification-text">
          <h4 className="notification-title md-typescale-title-medium">
            {notification.title}
          </h4>
          {notification.message && (
            <p className="notification-message md-typescale-body-medium">
              {notification.message}
            </p>
          )}
        </div>
      </div>
      <md-icon-button class="notification-close" onClick={handleClose}>
        <md-icon>close</md-icon>
      </md-icon-button>
    </div>
  );
};

const NotificationContainer: React.FC = () => {
  const { notifications } = useNotification();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </div>
  );
};

export default NotificationContainer;
