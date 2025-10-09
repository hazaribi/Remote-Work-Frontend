import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const DocumentEditor = ({ documentId, userId, userName }) => {
  const [provider, setProvider] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [connectedUsers, setConnectedUsers] = useState(0);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const wsProvider = new WebsocketProvider(
      'ws://localhost:1234',
      `document-${documentId}`,
      ydoc
    );

    wsProvider.on('status', event => {
      setStatus(event.status);
    });

    wsProvider.awareness.on('change', () => {
      setConnectedUsers(wsProvider.awareness.getStates().size);
    });

    setProvider(wsProvider);

    return () => {
      wsProvider?.destroy();
    };
  }, [documentId]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Collaboration.configure({
        document: provider?.doc,
      }),
      CollaborationCursor.configure({
        provider: provider,
        user: {
          name: userName,
          color: '#' + Math.floor(Math.random()*16777215).toString(16),
        },
      }),
    ],
    content: '<p>Start typing...</p>',
  }, [provider]);

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'disconnected': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {status === 'connected' ? '● Connected' : 
             status === 'connecting' ? '○ Connecting...' : '● Disconnected'}
          </span>
          <span className="text-sm text-gray-600">
            {connectedUsers} user{connectedUsers !== 1 ? 's' : ''} online
          </span>
        </div>
        <span className="text-sm text-gray-500">Document ID: {documentId}</span>
      </div>
      <div className="p-4">
        <EditorContent 
          editor={editor} 
          className="prose max-w-none min-h-96 focus:outline-none" 
        />
      </div>
    </div>
  );
};

export default DocumentEditor;