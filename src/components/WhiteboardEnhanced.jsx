import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = 'https://remote-work-backend.onrender.com';

function WhiteboardEnhanced({ workspaceId }) {
  const [socket, setSocket] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState('pen');
  const [shapes, setShapes] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [currentDrawing, setCurrentDrawing] = useState([]);
  const [selectedShape, setSelectedShape] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  useEffect(() => {
    initCanvas();
    initSocket();
    
    const handleKeyPress = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z': e.preventDefault(); break;
        }
      } else {
        switch (e.key.toLowerCase()) {
          case 's': setTool('select'); break;
          case 'p': setTool('pen'); break;
          case 'e': setTool('eraser'); break;
          case 'l': setTool('line'); break;
          case 'r': setTool('rectangle'); break;
          case 'c': setTool('circle'); break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (socket) socket.disconnect();
    };
  }, [workspaceId]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;
  };

  const initSocket = () => {
    const token = localStorage.getItem('token');
    const newSocket = io(SOCKET_URL, { auth: { token } });

    newSocket.on('connect', () => {
      newSocket.emit('join_workspace', workspaceId);
    });

    newSocket.on('whiteboard_draw', (data) => {
      if (data.action === 'shape') {
        setShapes(prev => [...prev, data.data]);
        redrawCanvas();
      } else if (data.action === 'drawing') {
        setDrawings(prev => [...prev, data.data]);
        redrawCanvas();
      }
    });

    newSocket.on('whiteboard_clear', () => {
      setShapes([]);
      setDrawings([]);
      clearCanvas();
    });

    setSocket(newSocket);
  };

  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const findShapeAtPoint = (x, y) => {
    // Check drawings first
    for (let i = drawings.length - 1; i >= 0; i--) {
      const drawing = drawings[i];
      if (drawing.length > 0) {
        for (let j = 0; j < drawing.length - 1; j++) {
          const dist = distanceToLine(x, y, drawing[j].x, drawing[j].y, drawing[j + 1].x, drawing[j + 1].y);
          if (dist <= 10) {
            return { type: 'drawing', index: i };
          }
        }
      }
    }
    
    // Then check shapes
    for (let i = shapes.length - 1; i >= 0; i--) {
      if (isPointInShape(x, y, shapes[i])) {
        return { type: 'shape', index: i };
      }
    }
    return null;
  };

  const isPointInShape = (x, y, shape) => {
    switch (shape.type) {
      case 'rectangle':
        return x >= shape.x && x <= shape.x + shape.width &&
               y >= shape.y && y <= shape.y + shape.height;
      case 'circle':
        const dx = x - shape.centerX;
        const dy = y - shape.centerY;
        return Math.sqrt(dx * dx + dy * dy) <= shape.radius;
      case 'line':
        return distanceToLine(x, y, shape.startX, shape.startY, shape.endX, shape.endY) <= 8;
      default:
        return false;
    }
  };

  const distanceToLine = (px, py, x1, y1, x2, y2) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    if (lenSq === 0) return Math.sqrt(A * A + B * B);
    const param = Math.max(0, Math.min(1, dot / lenSq));
    const xx = x1 + param * C;
    const yy = y1 + param * D;
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const startDrawing = (e) => {
    const pos = getMousePos(e);
    setStartPos(pos);
    
    if (tool === 'select') {
      const found = findShapeAtPoint(pos.x, pos.y);
      if (found) {
        setSelectedShape(found);
        setIsDragging(true);
        if (found.type === 'shape') {
          const shape = shapes[found.index];
          setDragOffset({
            x: pos.x - (shape.x || shape.centerX || shape.startX),
            y: pos.y - (shape.y || shape.centerY || shape.startY)
          });
        } else {
          const drawing = drawings[found.index];
          if (drawing.length > 0) {
            setDragOffset({ x: pos.x - drawing[0].x, y: pos.y - drawing[0].y });
          }
        }
      } else {
        setSelectedShape(null);
      }
      redrawCanvas();
      return;
    }
    
    setIsDrawing(true);
    if (tool === 'pen' || tool === 'eraser') {
      const ctx = ctxRef.current;
      ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = tool === 'eraser' ? brushSize * 2 : brushSize;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      setCurrentDrawing([{ x: pos.x, y: pos.y, tool, color, brushSize }]);
    }
  };

  const draw = (e) => {
    const pos = getMousePos(e);
    
    if (tool === 'select' && isDragging && selectedShape !== null) {
      if (selectedShape.type === 'shape') {
        const newShapes = [...shapes];
        const shape = newShapes[selectedShape.index];
        const newX = pos.x - dragOffset.x;
        const newY = pos.y - dragOffset.y;
        
        switch (shape.type) {
          case 'rectangle':
            shape.x = newX;
            shape.y = newY;
            break;
          case 'circle':
            shape.centerX = newX;
            shape.centerY = newY;
            break;
          case 'line':
            const dx = shape.endX - shape.startX;
            const dy = shape.endY - shape.startY;
            shape.startX = newX;
            shape.startY = newY;
            shape.endX = newX + dx;
            shape.endY = newY + dy;
            break;
        }
        setShapes(newShapes);
      } else if (selectedShape.type === 'drawing') {
        const newDrawings = [...drawings];
        const drawing = newDrawings[selectedShape.index];
        const offsetX = pos.x - dragOffset.x - drawing[0].x;
        const offsetY = pos.y - dragOffset.y - drawing[0].y;
        
        drawing.forEach(point => {
          point.x += offsetX;
          point.y += offsetY;
        });
        setDrawings(newDrawings);
      }
      redrawCanvas();
      return;
    }
    
    if (!isDrawing) return;
    
    const ctx = ctxRef.current;
    if (tool === 'pen' || tool === 'eraser') {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      setCurrentDrawing(prev => [...prev, { x: pos.x, y: pos.y, tool, color, brushSize }]);
    }
  };

  const stopDrawing = (e) => {
    if (tool === 'select') {
      setIsDragging(false);
      return;
    }
    
    if (!isDrawing) return;
    
    const pos = getMousePos(e);
    const ctx = ctxRef.current;
    let newShape = null;
    
    if (tool === 'line') {
      newShape = {
        type: 'line',
        startX: startPos.x,
        startY: startPos.y,
        endX: pos.x,
        endY: pos.y,
        color,
        strokeWidth: brushSize
      };
    } else if (tool === 'rectangle') {
      newShape = {
        type: 'rectangle',
        x: Math.min(startPos.x, pos.x),
        y: Math.min(startPos.y, pos.y),
        width: Math.abs(pos.x - startPos.x),
        height: Math.abs(pos.y - startPos.y),
        color,
        strokeWidth: brushSize
      };
    } else if (tool === 'circle') {
      const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
      newShape = {
        type: 'circle',
        centerX: startPos.x,
        centerY: startPos.y,
        radius,
        color,
        strokeWidth: brushSize
      };
    }
    
    if (newShape) {
      const newShapes = [...shapes, newShape];
      setShapes(newShapes);
      
      if (socket) {
        socket.emit('whiteboard_draw', {
          workspaceId,
          action: 'shape',
          data: newShape
        });
      }
    } else if (currentDrawing.length > 0 && (tool === 'pen' || tool === 'eraser')) {
      const newDrawings = [...drawings, currentDrawing];
      setDrawings(newDrawings);
      
      if (socket) {
        socket.emit('whiteboard_draw', {
          workspaceId,
          action: 'drawing',
          data: currentDrawing
        });
      }
    }
    
    setIsDrawing(false);
    setCurrentDrawing([]);
    ctxRef.current.beginPath();
    redrawCanvas();
  };

  const redrawCanvas = () => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw all saved drawings (pen/eraser strokes)
    drawings.forEach(drawing => {
      if (drawing.length > 0) {
        ctx.beginPath();
        const firstPoint = drawing[0];
        ctx.moveTo(firstPoint.x, firstPoint.y);
        
        if (firstPoint.tool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.lineWidth = firstPoint.brushSize * 2;
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = firstPoint.color;
          ctx.lineWidth = firstPoint.brushSize;
        }
        
        drawing.forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
      }
    });
    
    // Draw all shapes
    shapes.forEach((shape, index) => {
      ctx.globalCompositeOperation = 'source-over';
      const isSelected = selectedShape?.type === 'shape' && selectedShape.index === index;
      ctx.strokeStyle = isSelected ? '#007bff' : shape.color;
      ctx.lineWidth = shape.strokeWidth + (isSelected ? 2 : 0);
      
      switch (shape.type) {
        case 'rectangle':
          ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
          break;
        case 'circle':
          ctx.beginPath();
          ctx.arc(shape.centerX, shape.centerY, shape.radius, 0, 2 * Math.PI);
          ctx.stroke();
          break;
        case 'line':
          ctx.beginPath();
          ctx.moveTo(shape.startX, shape.startY);
          ctx.lineTo(shape.endX, shape.endY);
          ctx.stroke();
          break;
      }
    });
  };

  const clearCanvas = () => {
    const ctx = ctxRef.current;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setShapes([]);
    setDrawings([]);
    setSelectedShape(null);
    if (socket) {
      socket.emit('whiteboard_clear', { workspaceId });
    }
  };

  const deleteSelected = () => {
    if (selectedShape !== null) {
      if (selectedShape.type === 'shape') {
        const newShapes = shapes.filter((_, index) => index !== selectedShape.index);
        setShapes(newShapes);
      } else if (selectedShape.type === 'drawing') {
        const newDrawings = drawings.filter((_, index) => index !== selectedShape.index);
        setDrawings(newDrawings);
      }
      setSelectedShape(null);
      redrawCanvas();
    }
  };

  const presetColors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Enhanced Whiteboard
          </h1>
          <p className="text-gray-600">Draw, select, drag, and create shapes collaboratively</p>
        </div>
        
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 overflow-hidden">
          {/* Enhanced Toolbar */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 p-6">
            <div className="flex flex-wrap items-center gap-6">
              {/* Tools */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-semibold text-slate-700">Tools:</label>
                <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm border">
                  {[
                    { id: 'select', icon: 'M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z', name: 'Select & Drag' },
                    { id: 'pen', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z', name: 'Pen' },
                    { id: 'eraser', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16', name: 'Eraser' },
                    { id: 'line', icon: 'M5 12h14', name: 'Line' },
                    { id: 'rectangle', icon: 'M4 6h16v12H4z', name: 'Rectangle' },
                    { id: 'circle', icon: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z', name: 'Circle' }
                  ].map(toolItem => (
                    <button
                      key={toolItem.id}
                      onClick={() => setTool(toolItem.id)}
                      className={`p-2 rounded-md transition-all duration-200 ${
                        tool === toolItem.id
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                      title={toolItem.name}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={toolItem.icon} />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div className="flex items-center space-x-3">
                <label className="text-sm font-semibold text-slate-700">Colors:</label>
                <div className="flex space-x-1">
                  {presetColors.map(presetColor => (
                    <button
                      key={presetColor}
                      onClick={() => setColor(presetColor)}
                      className={`w-8 h-8 rounded-lg border-2 transition-all duration-200 ${
                        color === presetColor ? 'border-slate-400 scale-110' : 'border-slate-200 hover:scale-105'
                      }`}
                      style={{ backgroundColor: presetColor }}
                    />
                  ))}
                </div>
              </div>
              
              {/* Brush Size */}
              <div className="flex items-center space-x-3">
                <label className="text-sm font-semibold text-slate-700">Size:</label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={brushSize}
                  onChange={(e) => setBrushSize(e.target.value)}
                  className="w-24 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm font-medium text-slate-600 bg-white px-2 py-1 rounded-md border min-w-[40px] text-center">
                  {brushSize}
                </span>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 mt-4">
              {selectedShape !== null && (
                <button
                  onClick={deleteSelected}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete Selected</span>
                </button>
              )}
              
              <button
                onClick={clearCanvas}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Clear All</span>
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div className="p-6">
            <div className="relative bg-white rounded-xl shadow-inner border-2 border-slate-200">
              <canvas
                ref={canvasRef}
                width={1200}
                height={700}
                className={`w-full max-w-full touch-none rounded-xl ${
                  tool === 'select' ? 'cursor-pointer' :
                  tool === 'pen' ? 'cursor-crosshair' :
                  tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'
                }`}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={(e) => { e.preventDefault(); startDrawing(e); }}
                onTouchMove={(e) => { e.preventDefault(); draw(e); }}
                onTouchEnd={(e) => { e.preventDefault(); stopDrawing(e); }}
              />
              
              <div className="absolute top-4 right-4 flex space-x-2">
                <div className="bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border">
                  <span className="text-sm font-medium text-slate-700 capitalize">{tool}</span>
                </div>
                {selectedShape !== null && (
                  <div className="bg-blue-100 px-3 py-2 rounded-lg shadow-lg border border-blue-200">
                    <span className="text-sm font-medium text-blue-700">Shape Selected</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Keyboard Shortcuts */}
        <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Keyboard Shortcuts</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <kbd className="px-2 py-1 bg-slate-100 rounded border">S</kbd>
              <span className="text-slate-600">Select</span>
            </div>
            <div className="flex items-center space-x-2">
              <kbd className="px-2 py-1 bg-slate-100 rounded border">P</kbd>
              <span className="text-slate-600">Pen</span>
            </div>
            <div className="flex items-center space-x-2">
              <kbd className="px-2 py-1 bg-slate-100 rounded border">E</kbd>
              <span className="text-slate-600">Eraser</span>
            </div>
            <div className="flex items-center space-x-2">
              <kbd className="px-2 py-1 bg-slate-100 rounded border">L</kbd>
              <span className="text-slate-600">Line</span>
            </div>
            <div className="flex items-center space-x-2">
              <kbd className="px-2 py-1 bg-slate-100 rounded border">R</kbd>
              <span className="text-slate-600">Rectangle</span>
            </div>
            <div className="flex items-center space-x-2">
              <kbd className="px-2 py-1 bg-slate-100 rounded border">C</kbd>
              <span className="text-slate-600">Circle</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WhiteboardEnhanced;