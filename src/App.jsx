import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import TaskBoard from './components/TaskBoard';
import Chat from './components/Chat';
import VideoCall from './components/VideoCall';
import MultiVideoCall from './components/MultiVideoCall';
import Whiteboard from './components/Whiteboard';
import Footer from './components/Footer';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col">
      <nav className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                RemoteSync
              </h1>
              {currentWorkspace && (
                <div className="hidden sm:flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-xl border border-blue-200">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-blue-800">
                    {currentWorkspace.name}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
                  currentView === 'dashboard' 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg' 
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
                <span className="hidden sm:inline">Dashboard</span>
              </button>
              {currentWorkspace && (
                <>
                  <button
                    onClick={() => setCurrentView('tasks')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
                      currentView === 'tasks' 
                        ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg' 
                        : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="hidden sm:inline">Tasks</span>
                  </button>
                  <button
                    onClick={() => setCurrentView('chat')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
                      currentView === 'chat' 
                        ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg' 
                        : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="hidden sm:inline">Chat</span>
                  </button>
                  <button
                    onClick={() => setCurrentView('video')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
                      currentView === 'video' 
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg' 
                        : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="hidden sm:inline">1-on-1</span>
                  </button>
                  <button
                    onClick={() => setCurrentView('multivideo')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
                      currentView === 'multivideo' 
                        ? 'bg-gradient-to-r from-pink-600 to-pink-700 text-white shadow-lg' 
                        : 'text-gray-600 hover:text-pink-600 hover:bg-pink-50'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="hidden sm:inline">Group</span>
                  </button>
                  <button
                    onClick={() => setCurrentView('whiteboard')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
                      currentView === 'whiteboard' 
                        ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-lg' 
                        : 'text-gray-600 hover:text-yellow-600 hover:bg-yellow-50'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span className="hidden sm:inline">Whiteboard</span>
                  </button>
                </>
              )}
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-xl text-sm font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1">
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
        {currentView === 'multivideo' && currentWorkspace && (
          <MultiVideoCall workspaceId={currentWorkspace.id} />
        )}
        {currentView === 'whiteboard' && currentWorkspace && (
          <Whiteboard workspaceId={currentWorkspace.id} />
        )}
      </main>
      <Footer />
    </div>
  );
}

export default App;