import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function Dashboard({ user, onWorkspaceSelect, currentWorkspace }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [joinForm, setJoinForm] = useState({ workspaceId: '' });

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/workspace/my-workspaces`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setWorkspaces(data.workspaces);
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const createWorkspace = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/workspace/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(createForm)
      });
      
      if (response.ok) {
        setCreateForm({ name: '', description: '' });
        loadWorkspaces();
      }
    } catch (error) {
      console.error('Failed to create workspace:', error);
    }
  };

  const joinWorkspace = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/workspace/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(joinForm)
      });
      
      if (response.ok) {
        setJoinForm({ workspaceId: '' });
        loadWorkspaces();
      }
    } catch (error) {
      console.error('Failed to join workspace:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome, {user.full_name}!</h1>
        <p className="mt-2 text-gray-600">Manage your workspaces and collaborate with your team.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Create Workspace */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Create Workspace</h3>
            <form onSubmit={createWorkspace} className="space-y-4">
              <input
                type="text"
                placeholder="Workspace Name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
              <textarea
                placeholder="Description (optional)"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                rows="3"
              />
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Create Workspace
              </button>
            </form>
          </div>
        </div>

        {/* Join Workspace */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Join Workspace</h3>
            <form onSubmit={joinWorkspace} className="space-y-4">
              <input
                type="text"
                placeholder="Workspace ID"
                value={joinForm.workspaceId}
                onChange={(e) => setJoinForm({ workspaceId: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Join Workspace
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* My Workspaces */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">My Workspaces</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Click on a workspace to start collaborating.
          </p>
        </div>
        <ul className="divide-y divide-gray-200">
          {workspaces.length === 0 ? (
            <li className="px-4 py-4 text-center text-gray-500">
              No workspaces yet. Create or join one above!
            </li>
          ) : (
            workspaces.map((workspace) => (
              <li key={workspace.id}>
                <button
                  onClick={() => onWorkspaceSelect(workspace)}
                  className={`w-full text-left px-4 py-4 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 ${
                    currentWorkspace?.id === workspace.id ? 'bg-blue-50 border-l-4 border-blue-400' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center">
                          <span className="text-sm font-medium text-white">
                            {workspace.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{workspace.name}</div>
                        <div className="text-sm text-gray-500">Role: {workspace.role}</div>
                        {workspace.description && (
                          <div className="text-sm text-gray-500">{workspace.description}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">
                      {new Date(workspace.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

export default Dashboard;