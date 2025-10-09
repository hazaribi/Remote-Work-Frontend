import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import TaskBoard from './components/TaskBoard';
import Chat from './components/Chat';
import VideoCall from './components/VideoCall';
import Whiteboard from './components/Whiteboard';

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [currentWorkspace, setCurrentWorkspace] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentView('dashboard');
    setCurrentWorkspace(null);
  };

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Remote Work Suite</h1>
              {currentWorkspace && (
                <span className="ml-4 text-sm text-gray-600">
                  Workspace: {currentWorkspace.name}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentView === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Dashboard
              </button>
              {currentWorkspace && (
                <>
                  <button
                    onClick={() => setCurrentView('tasks')}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      currentView === 'tasks' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Tasks
                  </button>
                  <button
                    onClick={() => setCurrentView('chat')}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      currentView === 'chat' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Chat
                  </button>
                  <button
                    onClick={() => setCurrentView('video')}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      currentView === 'video' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Video
                  </button>
                  <button
                    onClick={() => setCurrentView('whiteboard')}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      currentView === 'whiteboard' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Whiteboard
                  </button>
                </>
              )}
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {currentView === 'dashboard' && (
          <Dashboard 
            user={user} 
            onWorkspaceSelect={setCurrentWorkspace}
            currentWorkspace={currentWorkspace}
          />
        )}
        {currentView === 'tasks' && currentWorkspace && (
          <TaskBoard workspaceId={currentWorkspace.id} />
        )}
        {currentView === 'chat' && currentWorkspace && (
          <Chat workspaceId={currentWorkspace.id} />
        )}
        {currentView === 'video' && currentWorkspace && (
          <VideoCall workspaceId={currentWorkspace.id} />
        )}
        {currentView === 'whiteboard' && currentWorkspace && (
          <Whiteboard workspaceId={currentWorkspace.id} />
        )}
      </main>
    </div>
  );
}

export default App;