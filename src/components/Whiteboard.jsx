import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = 'https://remote-work-backend.onrender.com';

function Whiteboard({ workspaceId }) {
  const [socket, setSocket] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState('pen'); // pen, eraser, line, rectangle, circle
  const [lastX, setLastX] = useState(0);
  const [lastY, setLastY] = useState(0);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);
  
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  useEffect(() => {
    initCanvas();
    initSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [workspaceId]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    
    ctxRef.current = ctx;
  };

  const initSocket = () => {
    const token = localStorage.getItem('token');
    const newSocket = io(SOCKET_URL, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      newSocket.emit('join_workspace', workspaceId);
    });

    newSocket.on('whiteboard_draw', (data) => {
      handleRemoteAction(data);
    });

    newSocket.on('whiteboard_clear', () => {
      clearCanvasLocal();
    });

    setSocket(newSocket);
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const { offsetX, offsetY } = getMousePos(e);
    setLastX(offsetX);
    setLastY(offsetY);
    setStartX(offsetX);
    setStartY(offsetY);
    
    if (tool === 'pen' || tool === 'eraser') {
      ctxRef.current.beginPath();
      ctxRef.current.moveTo(offsetX, offsetY);
    }
    
    // Save state for undo
    saveState();
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const { offsetX, offsetY } = getMousePos(e);
    const ctx = ctxRef.current;
    
    if (tool === 'pen') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();
      
      if (socket) {
        socket.emit('whiteboard_draw', {
          workspaceId,
          action: 'draw',
          data: {
            fromX: lastX,
            fromY: lastY,
            toX: offsetX,
            toY: offsetY,
            color,
            width: brushSize,
            tool: 'pen'
          }
        });
      }
    } else if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brushSize * 2;
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();
      
      if (socket) {
        socket.emit('whiteboard_draw', {
          workspaceId,
          action: 'erase',
          data: {
            fromX: lastX,
            fromY: lastY,
            toX: offsetX,
            toY: offsetY,
            width: brushSize * 2
          }
        });
      }
    }
    
    setLastX(offsetX);
    setLastY(offsetY);
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    
    const { offsetX, offsetY } = getMousePos(e);
    const ctx = ctxRef.current;
    
    if (tool === 'line') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();
      
      if (socket) {
        socket.emit('whiteboard_draw', {
          workspaceId,
          action: 'shape',
          data: {
            type: 'line',
            startX, startY,
            endX: offsetX, endY: offsetY,
            color, width: brushSize
          }
        });
      }
    } else if (tool === 'rectangle') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.strokeRect(startX, startY, offsetX - startX, offsetY - startY);
      
      if (socket) {
        socket.emit('whiteboard_draw', {
          workspaceId,
          action: 'shape',
          data: {
            type: 'rectangle',
            startX, startY,
            width: offsetX - startX,
            height: offsetY - startY,
            color, strokeWidth: brushSize
          }
        });
      }
    } else if (tool === 'circle') {
      const radius = Math.sqrt(Math.pow(offsetX - startX, 2) + Math.pow(offsetY - startY, 2));
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.beginPath();
      ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
      ctx.stroke();
      
      if (socket) {
        socket.emit('whiteboard_draw', {
          workspaceId,
          action: 'shape',
          data: {
            type: 'circle',
            centerX: startX, centerY: startY,
            radius, color, strokeWidth: brushSize
          }
        });
      }
    }
    
    setIsDrawing(false);
    ctxRef.current.beginPath();
  };

  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    return {
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top
    };
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    startDrawing(e);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    draw(e);
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    stopDrawing();
  };

  const handleRemoteAction = (data) => {
    const ctx = ctxRef.current;
    
    if (data.action === 'draw') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = data.data.color;
      ctx.lineWidth = data.data.width;
      ctx.beginPath();
      ctx.moveTo(data.data.fromX, data.data.fromY);
      ctx.lineTo(data.data.toX, data.data.toY);
      ctx.stroke();
    } else if (data.action === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = data.data.width;
      ctx.beginPath();
      ctx.moveTo(data.data.fromX, data.data.fromY);
      ctx.lineTo(data.data.toX, data.data.toY);
      ctx.stroke();
    } else if (data.action === 'shape') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = data.data.color;
      ctx.lineWidth = data.data.strokeWidth;
      
      if (data.data.type === 'line') {
        ctx.beginPath();
        ctx.moveTo(data.data.startX, data.data.startY);
        ctx.lineTo(data.data.endX, data.data.endY);
        ctx.stroke();
      } else if (data.data.type === 'rectangle') {
        ctx.strokeRect(data.data.startX, data.data.startY, data.data.width, data.data.height);
      } else if (data.data.type === 'circle') {
        ctx.beginPath();
        ctx.arc(data.data.centerX, data.data.centerY, data.data.radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  };

  const clearCanvas = () => {
    clearCanvasLocal();
    if (socket) {
      socket.emit('whiteboard_clear', { workspaceId });
    }
  };

  const clearCanvasLocal = () => {
    const ctx = ctxRef.current;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const saveState = () => {
    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL();
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(dataURL);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const undo = () => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1);
      const img = new Image();
      img.onload = () => {
        ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctxRef.current.drawImage(img, 0, 0);
      };
      img.src = history[historyStep - 1];
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      setHistoryStep(historyStep + 1);
      const img = new Image();
      img.onload = () => {
        ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctxRef.current.drawImage(img, 0, 0);
      };
      img.src = history[historyStep + 1];
    }
  };

  const exportImage = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const presetColors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Collaborative Whiteboard
          </h1>
          <p className="text-gray-600">Draw, sketch, and brainstorm together in real-time</p>
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
          <div className="flex flex-wrap items-center gap-6 mb-8 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
            <div className="flex items-center space-x-3">
              <label className="text-sm font-semibold text-gray-700">Color:</label>
              <div className="relative">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-12 h-12 rounded-xl border-2 border-gray-300 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <label className="text-sm font-semibold text-gray-700">Brush Size:</label>
              <input
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(e.target.value)}
                className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <span className="text-sm font-medium text-gray-600 bg-white px-3 py-1 rounded-full border">
                {brushSize}px
              </span>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={clearCanvas}
                className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Clear</span>
              </button>
              
              <button
                onClick={exportImage}
                className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Export</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <canvas
              ref={canvasRef}
              width={1000}
              height={600}
              className="border-2 border-gray-300 rounded-2xl cursor-crosshair bg-white shadow-lg w-full max-w-full touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            />
            
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg border border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">Live Collaboration</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-blue-800 text-sm">
                <strong>Tip:</strong> Your drawings are synchronized in real-time with all team members. Use different colors to distinguish your contributions!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Whiteboard;

// Add custom slider styles
const style = document.createElement('style');
style.textContent = `
  .slider::-webkit-slider-thumb {
    appearance: none;
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    cursor: pointer;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
  .slider::-moz-range-thumb {
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    cursor: pointer;
    border: none;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
`;
if (!document.head.querySelector('style[data-component="Whiteboard"]')) {
  style.setAttribute('data-component', 'Whiteboard');
  document.head.appendChild(style);
}