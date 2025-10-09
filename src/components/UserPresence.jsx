import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const UserPresence = ({ workspaceId, token }) => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const socket = io('http://localhost:8080', {
      auth: { token }
    });

    socket.on('presence_update', (data) => {
      setUsers(prev => {
        const filtered = prev.filter(u => u.userId !== data.userId);
        return [...filtered, data];
      });
    });

    fetch(`/api/presence/workspace/${workspaceId}`)
      .then(res => res.json())
      .then(data => setUsers(data.users));

    return () => socket.disconnect();
  }, [workspaceId, token]);

  return (
    <div className="p-4 border-b">
      <h3 className="text-sm font-medium mb-2">Online Users</h3>
      {users.map(user => (
        <div key={user.userId} className="flex items-center space-x-2 mb-1">
          <div className={`w-2 h-2 rounded-full ${user.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="text-sm">User {user.userId}</span>
        </div>
      ))}
    </div>
  );
};

export default UserPresence;