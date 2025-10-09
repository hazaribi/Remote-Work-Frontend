import React, { useState, useEffect } from 'react';

const NotificationPanel = ({ userId, token }) => {
  const [notifications, setNotifications] = useState([]);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    fetch(`/api/notifications/user/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setNotifications(data.notifications));
  }, [userId, token]);

  const markAsRead = async (id) => {
    await fetch(`/api/notifications/${id}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    });
    setNotifications(prev => prev.map(n => n.id === id ? {...n, read: true} : n));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 relative"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
      
      {showPanel && (
        <div className="absolute right-0 top-12 w-80 bg-white border rounded-lg shadow-lg z-50">
          <div className="p-3 border-b">
            <h3 className="font-medium">Notifications</h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''}`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="text-sm">{notification.message}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(notification.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;