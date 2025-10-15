import React, { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';
import io from 'socket.io-client';

const SOCKET_URL = 'https://remote-work-backend.onrender.com';
const PEER_CONFIG = {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ]
  }
};

function MultiVideoCall({ workspaceId }) {
  const [peer, setPeer] = useState(null);
  const [socket, setSocket] = useState(null);
  const [myPeerId, setMyPeerId] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [connectionState, setConnectionState] = useState('idle'); // idle, joining, active
  
  const localVideoRef = useRef(null);
  const peerRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnections = useRef(new Map());
  const pendingCalls = useRef(new Set());
  const isCleaningUpRef = useRef(false);

  useEffect(() => {
    initSocket();
    initPeer();
    return () => cleanup();
  }, [workspaceId]);

  const cleanup = useCallback(() => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    peerConnections.current.forEach(call => {
      try {
        call.close();
      } catch (e) {
        console.log('Error closing call:', e);
      }
    });
    peerConnections.current.clear();
    
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    // Clean up remote streams
    remoteStreams.forEach(stream => {
      stream.getTracks().forEach(track => track.stop());
    });
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }, [localStream, remoteStreams]);

  const initPeer = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
    }

    const newPeer = new Peer(PEER_CONFIG);

    newPeer.on('open', (id) => {
      console.log('Multi-peer connected with ID:', id);
      setMyPeerId(id);
      if (socketRef.current && isCallActive) {
        console.log('Auto-emitting peer_joined for existing call:', id);
        socketRef.current.emit('peer_joined', { workspaceId, peerId: id });
      }
    });

    newPeer.on('call', (call) => {
      console.log('Incoming multi-call from:', call.peer);
      if (!pendingCalls.current.has(call.peer)) {
        handleIncomingCall(call);
      } else {
        console.log('Call already pending from:', call.peer);
        call.close();
      }
    });

    newPeer.on('error', (error) => {
      console.error('Multi-peer error:', error);
    });

    setPeer(newPeer);
    peerRef.current = newPeer;
  };

  const initSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const token = localStorage.getItem('token');
    const newSocket = io(SOCKET_URL, { auth: { token } });

    newSocket.on('connect', () => {
      newSocket.emit('join_workspace', workspaceId);
    });

    newSocket.on('peer_joined', (data) => {
      console.log('Multi-peer joined:', data);
      if (data.peerId && data.peerId !== (myPeerId || peerRef.current?.id)) {
        console.log('Attempting to call peer:', data.peerId);
        setTimeout(() => {
          if (!peerConnections.current.has(data.peerId) && !pendingCalls.current.has(data.peerId)) {
            console.log('Making call to new peer:', data.peerId);
            makeCall(data.peerId);
          } else {
            console.log('Already connected/connecting to peer:', data.peerId);
          }
        }, 1000);
      } else {
        console.log('Skipping call - peerId:', data.peerId, 'myPeerId:', myPeerId || peerRef.current?.id);
      }
    });

    newSocket.on('peer_left', (data) => {
      console.log('Multi-peer left:', data.peerId);
      removePeer(data.peerId);
    });

    setSocket(newSocket);
    socketRef.current = newSocket;
  };

  const startCall = async () => {
    if (connectionState !== 'idle') {
      console.log('Already joining/in call');
      return;
    }

    try {
      setConnectionState('joining');
      
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          frameRate: { ideal: 30, min: 15 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      setIsCallActive(true);
      setConnectionState('active');
      
      if (socketRef.current && peerRef.current) {
        console.log('Emitting peer_joined with peerId:', peerRef.current.id);
        socketRef.current.emit('peer_joined', { workspaceId, peerId: peerRef.current.id });
      }
    } catch (error) {
      console.error('Error accessing camera/microphone:', error);
      setConnectionState('idle');
      alert('Error: ' + error.message);
    }
  };

  const makeCall = async (remotePeerId) => {
    if (!peerRef.current) {
      console.log('Cannot make call - no peer instance');
      return;
    }
    
    let streamToUse = localStream;
    
    if (!streamToUse) {
      console.log('No local stream, getting media first');
      try {
        streamToUse = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640, min: 320 },
            height: { ideal: 480, min: 240 },
            frameRate: { ideal: 30, min: 15 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true
          }
        });
        setLocalStream(streamToUse);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = streamToUse;
        }
        setIsCallActive(true);
        setConnectionState('active');
        console.log('✅ Got media stream for call');
      } catch (error) {
        console.error('Error getting media for call:', error);
        return;
      }
    }
    
    if (peerConnections.current.has(remotePeerId)) {
      console.log('Already connected to:', remotePeerId);
      return;
    }
    
    console.log('Making multi-call to:', remotePeerId, 'with stream:', !!streamToUse);
    pendingCalls.current.add(remotePeerId);
    
    try {
      const call = peerRef.current.call(remotePeerId, streamToUse);
      
      if (call) {
        peerConnections.current.set(remotePeerId, call);
        
        call.on('stream', (remoteStream) => {
          console.log('Received multi-stream from:', remotePeerId);
          
          // Use exact same logic as working VideoCall
          const videoTrack = remoteStream.getVideoTracks()[0];
          const audioTrack = remoteStream.getAudioTracks()[0];
          
          if (videoTrack) {
            console.log('Multi-video track - muted:', videoTrack.muted, 'enabled:', videoTrack.enabled, 'readyState:', videoTrack.readyState);
            videoTrack.enabled = true;
          }
          if (audioTrack) {
            audioTrack.enabled = true;
          }
          
          setRemoteStreams(prev => {
            const newMap = new Map(prev);
            const oldStream = newMap.get(remotePeerId);
            if (oldStream) {
              oldStream.getTracks().forEach(track => track.stop());
            }
            newMap.set(remotePeerId, remoteStream);
            return newMap;
          });
          pendingCalls.current.delete(remotePeerId);
        });

        call.on('close', () => {
          console.log('Multi-call closed:', remotePeerId);
          removePeer(remotePeerId);
        });

        call.on('error', (error) => {
          console.error('Multi-call error:', error);
          removePeer(remotePeerId);
        });
      }
    } catch (error) {
      console.error('Error making multi-call:', error);
      pendingCalls.current.delete(remotePeerId);
    }
  };

  const handleIncomingCall = async (call) => {
    if (peerConnections.current.has(call.peer)) {
      console.log('Already connected to:', call.peer);
      call.close();
      return;
    }

    pendingCalls.current.add(call.peer);

    try {
      let streamToAnswer = localStream;
      
      if (!streamToAnswer) {
        streamToAnswer = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640, min: 320 },
            height: { ideal: 480, min: 240 },
            frameRate: { ideal: 30, min: 15 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true
          }
        });
        setLocalStream(streamToAnswer);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = streamToAnswer;
        }
        setIsCallActive(true);
        setConnectionState('active');
      }

      call.answer(streamToAnswer);
      peerConnections.current.set(call.peer, call);
      
      call.on('stream', (remoteStream) => {
        console.log('Incoming multi-stream from:', call.peer);
        
        // Use exact same logic as working VideoCall
        const videoTrack = remoteStream.getVideoTracks()[0];
        const audioTrack = remoteStream.getAudioTracks()[0];
        
        if (videoTrack) {
          console.log('Incoming multi-video track - muted:', videoTrack.muted, 'enabled:', videoTrack.enabled, 'readyState:', videoTrack.readyState);
          console.log('Incoming multi-video track settings:', videoTrack.getSettings());
          videoTrack.enabled = true;
        }
        if (audioTrack) {
          audioTrack.enabled = true;
        }
        
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          const oldStream = newMap.get(call.peer);
          if (oldStream) {
            oldStream.getTracks().forEach(track => track.stop());
          }
          newMap.set(call.peer, remoteStream);
          return newMap;
        });
        pendingCalls.current.delete(call.peer);
      });

      call.on('close', () => {
        console.log('Incoming multi-call closed:', call.peer);
        removePeer(call.peer);
      });

      call.on('error', (error) => {
        console.error('Incoming multi-call error:', error);
        removePeer(call.peer);
      });
    } catch (error) {
      console.error('Error handling incoming multi-call:', error);
      pendingCalls.current.delete(call.peer);
      call.close();
    }
  };

  const removePeer = (peerId) => {
    // Clean up stream
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      const stream = newMap.get(peerId);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      newMap.delete(peerId);
      return newMap;
    });
    
    // Clean up connection
    const connection = peerConnections.current.get(peerId);
    if (connection) {
      try {
        connection.close();
      } catch (e) {
        console.log('Error closing connection:', e);
      }
    }
    peerConnections.current.delete(peerId);
    pendingCalls.current.delete(peerId);
  };

  const endCall = () => {
    if (connectionState === 'idle') return;
    setConnectionState('idle');

    // Close all peer connections
    peerConnections.current.forEach(call => {
      try {
        call.close();
      } catch (e) {
        console.log('Error closing call:', e);
      }
    });
    peerConnections.current.clear();
    pendingCalls.current.clear();
    
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    // Clean up remote streams
    remoteStreams.forEach(stream => {
      stream.getTracks().forEach(track => track.stop());
    });
    setRemoteStreams(new Map());
    
    // Clear video element
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    
    setIsCallActive(false);
    
    if (socketRef.current && myPeerId) {
      socketRef.current.emit('peer_left', { workspaceId, peerId: myPeerId });
    }
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const VideoGrid = () => {
    const totalVideos = remoteStreams.size + (localStream ? 1 : 0);
    
    const getGridLayout = () => {
      switch(totalVideos) {
        case 1: return 'grid-cols-1 max-w-md mx-auto';
        case 2: return 'grid-cols-1 lg:grid-cols-2';
        case 3: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
        case 4: return 'grid-cols-2';
        case 5: return 'grid-cols-2 lg:grid-cols-3';
        case 6: return 'grid-cols-2 lg:grid-cols-3';
        default: return 'grid-cols-3';
      }
    };

    const getVideoHeight = () => {
      switch(totalVideos) {
        case 1: return 'h-80';
        case 2: return 'h-64';
        case 3: case 4: return 'h-48';
        case 5: case 6: return 'h-40';
        default: return 'h-32';
      }
    };

    return (
      <div className={`grid ${getGridLayout()} gap-4`}>
        {localStream && (
          <div className="relative">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              className={`w-full ${getVideoHeight()} bg-gray-900 rounded-xl object-cover`}
            />
            <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
              You
            </div>
          </div>
        )}
        
        {Array.from(remoteStreams.entries()).map(([peerId, stream]) => (
          <RemoteVideo key={peerId} peerId={peerId} stream={stream} />
        ))}
      </div>
    );
  };

  const RemoteVideo = ({ peerId, stream }) => {
    const videoRef = useRef(null);
    const totalVideos = remoteStreams.size + (localStream ? 1 : 0);

    const getVideoHeight = () => {
      switch(totalVideos) {
        case 1: return 'h-80';
        case 2: return 'h-64';
        case 3: case 4: return 'h-48';
        case 5: case 6: return 'h-40';
        default: return 'h-32';
      }
    };

    useEffect(() => {
      if (videoRef.current && stream && !isCleaningUpRef.current) {
        console.log('🎥 Setting up remote video for peer:', peerId);
        
        // Use EXACT same logic as working VideoCall
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        
        if (videoTrack) {
          console.log('🔧 Multi-video track - muted:', videoTrack.muted, 'enabled:', videoTrack.enabled, 'readyState:', videoTrack.readyState);
          videoTrack.enabled = true;
        }
        if (audioTrack) {
          audioTrack.enabled = true;
        }
        
        videoRef.current.srcObject = stream;
        videoRef.current.load();
        
        const playVideo = () => {
          videoRef.current.play().then(() => {
            console.log('✅ Multi-video playing for peer:', peerId);
            
            // Wait for metadata to load like VideoCall
            const checkDimensions = () => {
              if (videoRef.current) {
                const width = videoRef.current.videoWidth;
                const height = videoRef.current.videoHeight;
                console.log('📐 Multi-video dimensions:', width, 'x', height);
                
                if (width > 0 && height > 0) {
                  console.log('✅ Multi-video has valid dimensions');
                } else {
                  console.log('⚠️ Multi-video has no dimensions, retrying...');
                  setTimeout(checkDimensions, 500);
                }
              }
            };
            
            setTimeout(checkDimensions, 100);
          }).catch(e => {
            console.log('❌ Multi-video play failed:', e.message);
            setTimeout(playVideo, 1000);
          });
        };
        
        setTimeout(playVideo, 100);
      }
      
      return () => {
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };
    }, [stream, peerId]);

    return (
      <div className="relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={`w-full ${getVideoHeight()} bg-gray-900 rounded-xl object-cover`}
        />
        <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
          {peerId.substring(0, 8)}...
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Multi-User Video Conference
          </h1>
          <p className="text-gray-600">Connect with up to 6 team members</p>
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
          <div className="flex flex-wrap gap-4 mb-8 justify-center">
            <button
              onClick={startCall}
              disabled={connectionState !== 'idle'}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:transform-none flex items-center space-x-2"
            >
              <span>Join Call</span>
            </button>
            
            <button
              onClick={endCall}
              disabled={connectionState === 'idle'}
              className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:transform-none flex items-center space-x-2"
            >
              <span>Leave Call</span>
            </button>
            
            <button
              onClick={toggleMute}
              disabled={!isCallActive}
              className={`px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:transform-none flex items-center space-x-2 text-white ${
                isMuted ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-gradient-to-r from-yellow-600 to-yellow-700'
              }`}
            >
              <span>{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>
            
            <button
              onClick={toggleVideo}
              disabled={!isCallActive}
              className={`px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:transform-none flex items-center space-x-2 text-white ${
                isVideoOff ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-gradient-to-r from-purple-600 to-purple-700'
              }`}
            >
              <span>{isVideoOff ? 'Turn On Video' : 'Turn Off Video'}</span>
            </button>
          </div>

          <VideoGrid />
          
          {connectionState !== 'idle' && (
            <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${
                    connectionState === 'active' ? 'bg-green-500' : 'bg-yellow-500'
                  }`}></div>
                  <p className="text-green-800 font-medium">
                    {connectionState === 'joining' && 'Joining call...'}
                    {connectionState === 'active' && 'Call is active'}
                  </p>
                </div>
                {connectionState === 'active' && (
                  <p className="text-green-700 text-sm">
                    {remoteStreams.size + 1} participant{remoteStreams.size !== 0 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MultiVideoCall;