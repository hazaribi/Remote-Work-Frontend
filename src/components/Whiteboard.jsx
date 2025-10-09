import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

function Whiteboard({ workspaceId }) {
  const [socket, setSocket] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [lastX, setLastX] = useState(0);
  const [lastY, setLastY] = useState(0);
  
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
      drawRemoteLine(data.line);
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
    
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(offsetX, offsetY);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const { offsetX, offsetY } = getMousePos(e);
    const ctx = ctxRef.current;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
    
    if (socket) {
      socket.emit('whiteboard_draw', {
        workspaceId,
        line: {
          fromX: lastX,
          fromY: lastY,
          toX: offsetX,
          toY: offsetY,
          color,
          width: brushSize
        }
      });
    }
    
    setLastX(offsetX);
    setLastY(offsetY);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      ctxRef.current.beginPath();
    }
  };

  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top
    };
  };

  const drawRemoteLine = (line) => {
    const ctx = ctxRef.current;
    ctx.strokeStyle = line.color;
    ctx.lineWidth = line.width;
    ctx.beginPath();
    ctx.moveTo(line.fromX, line.fromY);
    ctx.lineTo(line.toX, line.toY);
    ctx.stroke();
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

  const exportImage = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Collaborative Whiteboard</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-4 mb-4 p-4 bg-gray-100 rounded-lg">
          <label className="font-semibold">Color:</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-12 h-8 rounded"
          />
          
          <label className="font-semibold">Size:</label>
          <input
            type="range"
            min="1"
            max="20"
            value={brushSize}
            onChange={(e) => setBrushSize(e.target.value)}
            className="w-24"
          />
          <span className="text-sm">{brushSize}</span>
          
          <button
            onClick={clearCanvas}
            className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
          >
            Clear
          </button>
          <button
            onClick={exportImage}
            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
          >
            Export
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          className="border-2 border-gray-300 rounded-lg cursor-crosshair bg-white"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>
    </div>
  );
}

export default Whiteboard;