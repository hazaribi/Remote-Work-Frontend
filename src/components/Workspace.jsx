import React, { useState } from 'react';
import Chat from './Chat';
import TaskBoard from './TaskBoard';
import DocumentPage from './DocumentPage';
import Whiteboard from './Whiteboard';
import VideoCall from './VideoCall';
import CallButton from './CallButton';
import ProfilePicture from './ProfilePicture';
import UserPresence from './UserPresence';
import NotificationPanel from './NotificationPanel';
import InviteModal from './InviteModal';

const Workspace = ({ workspaceId, token }) => {
  const [activeTab, setActiveTab] = useState('documents');
  const [showChat, setShowChat] = useState(true);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  const userId = JSON.parse(atob(token.split('.')[1])).id;

  const tabs = [
    { id: 'documents', name: 'Documents', icon: '📄' },
    { id: 'tasks', name: 'Tasks', icon: '✅' },
    { id: 'whiteboard', name: 'Whiteboard', icon: '🎨' }
  ];

  const renderMainContent = () => {
    switch (activeTab) {
      case 'documents':
        return <DocumentPage />;
      case 'tasks':
        return <TaskBoard workspaceId={workspaceId} token={token} />;
      case 'whiteboard':
        return <Whiteboard workspaceId={workspaceId} token={token} />;
      default:
        return <DocumentPage />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold text-gray-900">Workspace</h1>
            <nav className="flex space-x-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowInviteModal(true)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              title="Invite Users"
            >
              ➕
            </button>
            <NotificationPanel userId={userId} token={token} />
            <ProfilePicture token={token} />
            <button
              onClick={() => setShowChat(!showChat)}
              className={`p-2 rounded-lg transition-colors ${
                showChat ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Toggle Chat"
            >
              💬
            </button>
            <CallButton 
              workspaceId={workspaceId} 
              token={token}
              onCallStart={() => setShowVideoCall(true)}
              onCallEnd={() => setShowVideoCall(false)}
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Panel */}
        <div className={`flex-1 ${showChat ? 'mr-80' : ''} transition-all duration-300`}>
          {renderMainContent()}
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-80 border-l border-gray-200 bg-white">
            <UserPresence workspaceId={workspaceId} token={token} />
            <Chat workspaceId={workspaceId} token={token} />
          </div>
        )}
      </div>

      {/* Video Call Overlay */}
      {showVideoCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-4 max-w-4xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Video Call</h3>
              <button
                onClick={() => setShowVideoCall(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <VideoCall workspaceId={workspaceId} token={token} />
          </div>
        </div>
      )}
      
      {/* Invite Modal */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        workspaceId={workspaceId}
        inviterName="Current User"
        token={token}
      />
    </div>
  );
};

export default Workspace;