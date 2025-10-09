import React, { useState, useEffect } from 'react';
import DocumentEditor from './DocumentEditor';

const DocumentPage = () => {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [user] = useState({
    id: 'user-' + Math.random().toString(36).substr(2, 9),
    name: 'User ' + Math.floor(Math.random() * 1000)
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/documents', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
        if (data.length > 0 && !selectedDoc) {
          setSelectedDoc(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDocument = async () => {
    if (!newDocTitle.trim()) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: newDocTitle,
          workspace_id: 'default-workspace'
        })
      });
      
      if (response.ok) {
        const newDoc = await response.json();
        setDocuments([newDoc, ...documents]);
        setSelectedDoc(newDoc);
        setNewDocTitle('');
      }
    } catch (error) {
      console.error('Error creating document:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Documents</h2>
          
          {/* Create new document */}
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Document title"
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createDocument()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={createDocument}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Create
            </button>
          </div>
        </div>

        {/* Document list */}
        <div className="flex-1 overflow-y-auto">
          {documents.length === 0 ? (
            <div className="p-4 text-gray-500 text-center">
              No documents yet. Create your first document above.
            </div>
          ) : (
            <div className="p-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
                    selectedDoc?.id === doc.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <h3 className="font-medium text-gray-900 truncate">{doc.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User info */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user.name.charAt(0)}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">{user.name}</div>
              <div className="text-xs text-gray-500">ID: {user.id}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main editor area */}
      <div className="flex-1 flex flex-col">
        {selectedDoc ? (
          <>
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <h1 className="text-xl font-semibold text-gray-900">{selectedDoc.title}</h1>
              <p className="text-sm text-gray-500 mt-1">
                Created {new Date(selectedDoc.created_at).toLocaleDateString()} • 
                Last updated {new Date(selectedDoc.updated_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex-1 p-6">
              <DocumentEditor
                documentId={selectedDoc.id}
                userId={user.id}
                userName={user.name}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-400 text-6xl mb-4">📄</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No document selected</h3>
              <p className="text-gray-500">Choose a document from the sidebar or create a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentPage;