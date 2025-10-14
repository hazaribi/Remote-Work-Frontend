import React, { useState } from 'react';

function InviteModal({ workspaceId, onClose }) {
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateInvite = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://remote-work-backend.onrender.com/api/invite/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ workspaceId })
      });

      const data = await response.json();
      if (response.ok) {
        setInviteLink(data.inviteLink);
      } else {
        alert('Failed to generate invite: ' + data.error);
      }
    } catch (error) {
      alert('Error generating invite');
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Invite to Workspace</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!inviteLink ? (
          <div className="text-center">
            <p className="text-gray-600 mb-6">Generate an invitation link to share with team members</p>
            <button
              onClick={generateInvite}
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Invite Link'}
            </button>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">Share this link with team members:</p>
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="text"
                value={inviteLink}
                readOnly
                className="flex-1 p-3 border border-gray-300 rounded-xl bg-gray-50"
              />
              <button
                onClick={copyToClipboard}
                className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-sm text-gray-500">Link expires in 7 days</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default InviteModal;