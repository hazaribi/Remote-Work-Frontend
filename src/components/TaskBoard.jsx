import React, { useState, useEffect } from 'react';
import Sortable from 'sortablejs';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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
    return <div className="text-center py-8">Loading task board...</div>;
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Task Board</h1>
        <button
          onClick={createList}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          + Add List
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {lists.sort((a, b) => a.position - b.position).map(list => {
          const listTasks = tasks.filter(t => t.list_id === list.id)
            .sort((a, b) => a.position - b.position);

          return (
            <div key={list.id} className="bg-gray-100 rounded-lg p-4 w-72 flex-shrink-0">
              <div className="font-semibold mb-3 flex justify-between items-center">
                <span>{list.title}</span>
                <span className="text-sm text-gray-500">({listTasks.length})</span>
              </div>
              
              <div className="space-y-2 mb-3">
                {listTasks.map(task => (
                  <div key={task.id} className="bg-white p-3 rounded shadow-sm">
                    <div className="font-medium">{task.title}</div>
                    {task.description && (
                      <div className="text-sm text-gray-600 mt-1">{task.description}</div>
                    )}
                    {task.assigned_user && (
                      <div className="text-xs text-blue-600 mt-2">
                        Assigned to: {task.assigned_user.full_name}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => createTask(list.id)}
                className="w-full p-2 text-gray-500 hover:bg-gray-50 rounded border-2 border-dashed border-gray-300"
              >
                + Add task
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TaskBoard;