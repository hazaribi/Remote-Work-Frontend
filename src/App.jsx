import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import TaskBoard from './components/TaskBoard';
import Chat from './components/Chat';
import VideoCall from './components/VideoCall';
import MultiVideoCall from './components/MultiVideoCall';
import Whiteboard from './components/Whiteboard';
import Footer from './components/Footer';
import InviteModal from './components/InviteModal';


function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

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
    
    // Check for pending invite after login
    const pendingInvite = localStorage.getItem('pendingInvite');
    if (pendingInvite) {
      // Redirect to join page with the stored invite code
      window.location.href = `/join/${pendingInvite}`;
    }
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

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [videoDropdownOpen, setVideoDropdownOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex">
      {/* Left Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white/95 backdrop-blur-sm shadow-xl border-r border-white/20 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-20 px-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              RemoteSync
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Workspace Info */}
          {currentWorkspace && (
            <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="text-sm font-medium text-blue-900">{currentWorkspace.name}</p>
                  <p className="text-xs text-blue-600">Active Workspace</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                currentView === 'dashboard'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              </svg>
              <span className="font-medium">Dashboard</span>
            </button>

            {currentWorkspace && (
              <>
                <button
                  onClick={() => setCurrentView('tasks')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                    currentView === 'tasks'
                      ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-green-50 hover:text-green-600'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="font-medium">Tasks</span>
                </button>

                <button
                  onClick={() => setCurrentView('chat')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                    currentView === 'chat'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-purple-50 hover:text-purple-600'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="font-medium">Chat</span>
                </button>

                {/* Video Calls Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setVideoDropdownOpen(!videoDropdownOpen)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                      currentView === 'video' || currentView === 'multivideo'
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg'
                        : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium">Video Calls</span>
                    </div>
                    <svg className={`w-4 h-4 transition-transform duration-200 ${videoDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {videoDropdownOpen && (
                    <div className="mt-2 ml-4 space-y-1">
                      <button
                        onClick={() => { setCurrentView('video'); setVideoDropdownOpen(false); }}
                        className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-left transition-all duration-200 ${
                          currentView === 'video'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>1-on-1 Call</span>
                      </button>
                      <button
                        onClick={() => { setCurrentView('multivideo'); setVideoDropdownOpen(false); }}
                        className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-left transition-all duration-200 ${
                          currentView === 'multivideo'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>Group Call</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setCurrentView('whiteboard')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                    currentView === 'whiteboard'
                      ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-yellow-50 hover:text-yellow-600'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span className="font-medium">Whiteboard</span>
                </button>

                <button
                  onClick={() => setShowInviteModal(true)}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 text-gray-700 hover:bg-green-50 hover:text-green-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="font-medium">Invite Members</span>
                </button>
              </>
            )}
          </nav>

          {/* User & Logout */}
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="flex items-center space-x-3 px-4 py-2 rounded-xl bg-gray-50">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">{user.name?.charAt(0) || 'U'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full mt-3 flex items-center space-x-3 px-4 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white hover:shadow-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-0">
        {/* Top bar for mobile */}
        <div className="lg:hidden bg-white/80 backdrop-blur-sm shadow-sm border-b border-white/20 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              RemoteSync
            </h1>
            <div className="w-10"></div>
          </div>
        </div>

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

        
          {showInviteModal && currentWorkspace && (
            <InviteModal 
              workspaceId={currentWorkspace.id} 
              onClose={() => setShowInviteModal(false)} 
            />
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default App;