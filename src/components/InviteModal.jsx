import React, { useState } from 'react';

const InviteModal = ({ isOpen, onClose, workspaceId, inviterName, token }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const sendInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await fetch('/api/notifications/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email, workspaceId, inviterName })
      });
      
      setEmail('');
      onClose();
    } catch (error) {
      console.error('Failed to send invite:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-lg font-medium mb-4">Invite to Workspace</h2>
        <form onSubmit={sendInvite}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email address"
            className="w-full p-2 border rounded mb-4"
            required
          />
          <div className="flex space-x-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Invite'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteModal;