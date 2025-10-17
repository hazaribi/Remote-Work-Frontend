import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const API_BASE = 'https://remote-work-backend.onrender.com/api';
const SOCKET_URL = 'https://remote-work-backend.onrender.com';

function Chat({ workspaceId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadMessages();
    initSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [workspaceId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/chat/${workspaceId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const initSocket = () => {
    const token = localStorage.getItem('token');
    const newSocket = io(SOCKET_URL, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      newSocket.emit('join_workspace', workspaceId);
    });

    newSocket.on('new_message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    setSocket(newSocket);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !socket) return;

    if (selectedFile) {
      await uploadFile();
    } else {
      socket.emit('send_message', {
        workspaceId,
        content: newMessage.trim(),
        messageType: 'text'
      });
      setNewMessage('');
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('workspaceId', workspaceId);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/upload/file`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        socket.emit('send_message', {
          workspaceId,
          content: newMessage.trim() || `Shared a file: ${selectedFile.name}`,
          messageType: 'file',
          fileUrl: data.fileUrl,
          fileName: selectedFile.name
        });
        setNewMessage('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('File upload failed:', error);
      alert('File upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.size <= 10 * 1024 * 1024) { // 10MB limit
      setSelectedFile(file);
    } else {
      alert('File size must be less than 10MB');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageDate = (dateString) => {
    const messageDate = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  const groupMessagesByDate = (messages) => {
    const groups = [];
    let currentGroup = null;
    
    messages.forEach(message => {
      const messageDate = new Date(message.created_at).toDateString();
      
      if (!currentGroup || currentGroup.date !== messageDate) {
        currentGroup = {
          date: messageDate,
          dateLabel: formatMessageDate(message.created_at),
          messages: []
        };
        groups.push(currentGroup);
      }
      
      currentGroup.messages.push(message);
    });
    
    return groups;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Team Chat
          </h1>
          <p className="text-gray-600">Real-time communication with your team</p>
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          <div className="h-96 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-gray-500">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              groupMessagesByDate(messages).map((group, groupIndex) => (
                <div key={groupIndex}>
                  <div className="flex justify-center my-4">
                    <span className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
                      {group.dateLabel}
                    </span>
                  </div>
                  {group.messages.map((message) => {
                    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                    const isOwnMessage = message.sender_id === currentUser.id || message.users?.id === currentUser.id;
                    
                    return (
                      <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
                        <div className={`flex items-start space-x-3 max-w-xs lg:max-w-md ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          <div className="flex-shrink-0">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold ${
                              isOwnMessage 
                                ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                                : 'bg-gradient-to-br from-purple-500 to-purple-600'
                            }`}>
                              {(message.users?.full_name || message.sender?.full_name || 'Unknown')?.charAt(0)}
                            </div>
                          </div>
                          <div className={`flex-1 ${isOwnMessage ? 'text-right' : ''}`}>
                            <div className={`flex items-center space-x-2 mb-1 ${isOwnMessage ? 'justify-end' : ''}`}>
                              <span className="text-sm font-medium text-gray-900">
                                {isOwnMessage ? 'You' : (message.users?.full_name || message.sender?.full_name || 'Unknown User')}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className={`inline-block px-4 py-2 rounded-2xl shadow-sm ${
                              isOwnMessage 
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                                : 'bg-white border border-gray-200 text-gray-900'
                            }`}>
                              {message.messageType === 'file' ? (
                                <div className="flex items-center space-x-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                  </svg>
                                  <a 
                                    href={message.fileUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className={`text-sm underline hover:no-underline ${
                                      isOwnMessage ? 'text-blue-100' : 'text-blue-600'
                                    }`}
                                  >
                                    {message.fileName || 'Download File'}
                                  </a>
                                </div>
                              ) : (
                                <p className="text-sm">{message.content}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="border-t border-gray-200/50 p-6">
            {selectedFile && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="text-sm text-blue-800">{selectedFile.name}</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            <form onSubmit={sendMessage} className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={selectedFile ? "Add a message (optional)..." : "Type your message..."}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-3 border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors flex items-center"
                title="Attach File"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <button
                type="submit"
                disabled={(!newMessage.trim() && !selectedFile) || uploading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:transform-none flex items-center space-x-2"
              >
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
                <span>{uploading ? 'Sending...' : 'Send'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;