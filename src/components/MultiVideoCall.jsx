import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import io from 'socket.io-client';

const SOCKET_URL = 'https://remote-work-backend.onrender.com';
const PEER_CONFIG = {
  host: '0.peerjs.com',
  port: 443,
  path: '/',
  secure: true,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  }
};

function MultiVideoCall({ workspaceId }) {
  const [peer, setPeer] = useState(null);
  const [socket, setSocket] = useState(null);
  const [myPeerId, setMyPeerId] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [participants, setParticipants] = useState([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});
  const peerConnections = useRef(new Map());

  useEffect(() => {
    initSocket();
    initPeer();
    return () => cleanup();
  }, [workspaceId]);

  const cleanup = () => {
    if (peer) peer.destroy();
    if (socket) socket.disconnect();
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    peerConnections.current.forEach(call => call.close());
  };

  const initPeer = () => {
    const newPeer = new Peer(PEER_CONFIG);

    newPeer.on('open', (id) => {
      console.log('Peer connected with ID:', id);
      setMyPeerId(id);
      if (socket) {
        socket.emit('peer_joined', { workspaceId, peerId: id });
      }
    });

    newPeer.on('call', (call) => {
      console.log('Incoming call from:', call.peer);
      handleIncomingCall(call);
    });

    setPeer(newPeer);
  };

  const initSocket = () => {
    const token = localStorage.getItem('token');
    const newSocket = io(SOCKET_URL, { auth: { token } });

    newSocket.on('connect', () => {
      newSocket.emit('join_workspace', workspaceId);
    });

    newSocket.on('peer_joined', (data) => {
      console.log('Peer joined:', data);
      if (data.peerId !== myPeerId && localStream) {
        makeCall(data.peerId);
      }
    });

    newSocket.on('participants_list', (data) => {
      setParticipants(data.participants || []);
    });

    newSocket.on('peer_left', (data) => {
      console.log('Peer left:', data.peerId);
      removePeer(data.peerId);
    });

    setSocket(newSocket);
  };

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      setIsCallActive(true);
      
      if (socket && myPeerId) {
        socket.emit('peer_joined', { workspaceId, peerId: myPeerId });
      }
    } catch (error) {
      console.error('Error accessing camera/microphone:', error);
      alert('Error: ' + error.message);
    }
  };

  const makeCall = async (remotePeerId) => {
    if (!peer || !localStream) return;
    
    console.log('Making call to:', remotePeerId);
    const call = peer.call(remotePeerId, localStream);
    
    if (call) {
      peerConnections.current.set(remotePeerId, call);
      
      call.on('stream', (remoteStream) => {
        console.log('Received stream from:', remotePeerId);
        setRemoteStreams(prev => new Map(prev.set(remotePeerId, remoteStream)));
      });

      call.on('close', () => {
        removePeer(remotePeerId);
      });
    }
  };

  const handleIncomingCall = async (call) => {
    if (!localStream) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    }

    call.answer(localStream);
    peerConnections.current.set(call.peer, call);
    setIsCallActive(true);
    
    call.on('stream', (remoteStream) => {
      console.log('Incoming stream from:', call.peer);
      setRemoteStreams(prev => new Map(prev.set(call.peer, remoteStream)));
    });

    call.on('close', () => {
      removePeer(call.peer);
    });
  };

  const removePeer = (peerId) => {
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(peerId);
      return newMap;
    });
    peerConnections.current.delete(peerId);
  };

  const endCall = () => {
    peerConnections.current.forEach(call => call.close());
    peerConnections.current.clear();
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    setRemoteStreams(new Map());
    setIsCallActive(false);
    
    if (socket) {
      socket.emit('peer_left', { workspaceId, peerId: myPeerId });
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
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play().then(() => {
          setTimeout(() => {
            videoRef.current.muted = false;
          }, 1000);
        }).catch(console.error);
      }
    }, [stream]);

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
              disabled={isCallActive}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:transform-none flex items-center space-x-2"
            >
              <span>Join Call</span>
            </button>
            
            <button
              onClick={endCall}
              disabled={!isCallActive}
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
          
          {isCallActive && (
            <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-green-800 font-medium">Call is active</p>
                </div>
                <p className="text-green-700 text-sm">
                  {remoteStreams.size + 1} participant{remoteStreams.size !== 0 ? 's' : ''}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MultiVideoCall;