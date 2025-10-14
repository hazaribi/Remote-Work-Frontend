import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function JoinWorkspace() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [workspaceInfo, setWorkspaceInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWorkspaceInfo();
  }, [code]);

  const fetchWorkspaceInfo = async () => {
    try {
      const response = await fetch(`https://remote-work-backend.onrender.com/api/invite/info/${code}`);
      const data = await response.json();
      
      if (response.ok) {
        setWorkspaceInfo(data);
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to load workspace info');
    }
    setLoading(false);
  };

  const joinWorkspace = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      // Store invite code before redirecting to login
      localStorage.setItem('pendingInvite', code);
      navigate('/');
      return;
    }

    setJoining(true);
    try {
      const response = await fetch(`https://remote-work-backend.onrender.com/api/invite/join/${code}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        // Clear pending invite and redirect
        localStorage.removeItem('pendingInvite');
        alert('Successfully joined workspace!');
        navigate('/');
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to join workspace');
    }
    setJoining(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workspace info...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invite</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 max-w-md w-full mx-4 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Join Workspace</h2>
        <h3 className="text-xl font-semibold text-blue-600 mb-2">{workspaceInfo?.workspace?.name}</h3>
        <p className="text-gray-600 mb-6">{workspaceInfo?.workspace?.description}</p>
        
        <button
          onClick={joinWorkspace}
          disabled={joining}
          className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:transform-none mb-4"
        >
          {joining ? 'Joining...' : 'Join Workspace'}
        </button>
        
        <button
          onClick={() => navigate('/')}
          className="w-full text-gray-600 hover:text-gray-800 font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default JoinWorkspace;