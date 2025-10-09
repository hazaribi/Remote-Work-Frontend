import React, { useState, useEffect } from 'react';
import Sortable from 'sortablejs';

const API_BASE = 'https://remote-work-backend.onrender.com/api';

function TaskBoard({ workspaceId }) {
  const [lists, setLists] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTaskBoard();
  }, [workspaceId]);

  const loadTaskBoard = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/tasks/${workspaceId}/board`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLists(data.lists);
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error('Error loading task board:', error);
    } finally {
      setLoading(false);
    }
  };

  const createList = async () => {
    const title = prompt('List title:');
    if (!title) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/tasks/${workspaceId}/lists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, position: lists.length })
      });

      if (response.ok) {
        loadTaskBoard();
      }
    } catch (error) {
      console.error('Error creating list:', error);
    }
  };

  const createTask = async (listId) => {
    const title = prompt('Task title:');
    if (!title) return;

    const description = prompt('Task description (optional):') || '';

    try {
      const token = localStorage.getItem('token');
      const listTasks = tasks.filter(t => t.list_id === listId);
      const response = await fetch(`${API_BASE}/tasks/${workspaceId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          title, 
          description, 
          listId, 
          position: listTasks.length 
        })
      });

      if (response.ok) {
        loadTaskBoard();
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading task board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Task Board
            </h1>
            <p className="text-gray-600">Organize and track your team's progress</p>
          </div>
          <button
            onClick={createList}
            className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add List</span>
          </button>
        </div>

        <div className="flex gap-6 overflow-x-auto pb-6">
          {lists.sort((a, b) => a.position - b.position).map(list => {
            const listTasks = tasks.filter(t => t.list_id === list.id)
              .sort((a, b) => a.position - b.position);

            return (
              <div key={list.id} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 w-80 flex-shrink-0 shadow-lg border border-white/20">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">{list.title}</h3>
                  <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                    {listTasks.length}
                  </span>
                </div>
                
                <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                  {listTasks.map(task => (
                    <div key={task.id} className="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100">
                      <div className="font-semibold text-gray-900 mb-2">{task.title}</div>
                      {task.description && (
                        <div className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</div>
                      )}
                      {task.assigned_user && (
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {task.assigned_user.full_name.charAt(0)}
                          </div>
                          <span className="text-xs text-gray-600">
                            {task.assigned_user.full_name}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => createTask(list.id)}
                  className="w-full p-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-300 transition-all duration-300 flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Add task</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default TaskBoard;

// Add CSS for line clamping
const style = document.createElement('style');
style.textContent = `
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;
if (!document.head.querySelector('style[data-component="TaskBoard"]')) {
  style.setAttribute('data-component', 'TaskBoard');
  document.head.appendChild(style);
}