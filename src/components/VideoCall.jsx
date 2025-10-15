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

function VideoCall({ workspaceId }) {
  const [peer, setPeer] = useState(null);
  const [socket, setSocket] = useState(null);
  const [myPeerId, setMyPeerId] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [currentCall, setCurrentCall] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callState, setCallState] = useState('idle'); // idle, calling, connected, ending
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const socketRef = useRef(null);
  const currentCallRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const isCleaningUpRef = useRef(false);

  useEffect(() => {
    initSocket();
    initPeer();

    return () => {
      cleanup();
    };
  }, [workspaceId]);

  const cleanup = useCallback(() => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    if (currentCallRef.current) {
      currentCallRef.current.close();
    }
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  }, [localStream]);

  const initPeer = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
    }

    const newPeer = new Peer(PEER_CONFIG);

    newPeer.on('open', (id) => {
      console.log('Peer connected with ID:', id);
      setMyPeerId(id);
    });

    newPeer.on('call', (call) => {
      console.log('Incoming call from:', call.peer);
      if (callState === 'idle' || callState === 'calling') {
        handleIncomingCall(call);
      } else {
        console.log('Rejecting call - already in call');
        call.close();
      }
    });

    newPeer.on('error', (error) => {
      console.error('Peer error:', error);
      setCallState('idle');
    });

    setPeer(newPeer);
    peerRef.current = newPeer;
  };

  const initSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const token = localStorage.getItem('token');
    const newSocket = io(SOCKET_URL, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      newSocket.emit('join_workspace', workspaceId);
    });

    newSocket.on('user_calling', (data) => {
      console.log('🔔 User is calling:', data);
      
      if (callState !== 'idle') {
        console.log('❌ Ignoring call - already in call state:', callState);
        return;
      }
      
      if (peerRef.current && data.peerId && data.peerId !== myPeerId) {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (data.userId !== currentUser.id) {
          console.log('✅ Making call to peer:', data.peerId);
          makeCall(data.peerId);
        }
      }
    });

    newSocket.on('call_ended', (data) => {
      console.log('Call ended by remote user');
      endCall();
    });

    setSocket(newSocket);
    socketRef.current = newSocket;
  };

  const startCall = async () => {
    if (callState !== 'idle') {
      console.log('Call already in progress');
      return;
    }

    try {
      setCallState('calling');
      
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
      
      if (socketRef.current && peerRef.current) {
        console.log('Broadcasting call with peer ID:', peerRef.current.id);
        socketRef.current.emit('user_calling', {
          workspaceId,
          peerId: peerRef.current.id
        });
      }
      
      setIsCallActive(true);
    } catch (error) {
      console.error('Error accessing camera/microphone:', error);
      setCallState('idle');
      alert('Error: ' + error.message);
    }
  };

  const makeCall = async (remotePeerId) => {
    if (callState !== 'calling' && callState !== 'idle') {
      console.log('Cannot make call in current state:', callState);
      return;
    }

    if (currentCallRef.current) {
      console.log('Call already exists, ignoring');
      return;
    }

    console.log('Making call to:', remotePeerId);
    setCallState('calling');
    
    let streamToUse = localStream;
    
    if (!streamToUse) {
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
      } catch (error) {
        console.error('Error accessing camera/microphone:', error);
        setCallState('idle');
        return;
      }
    }

    if (!peerRef.current) {
      console.error('Peer not initialized');
      setCallState('idle');
      return;
    }

    try {
      const call = peerRef.current.call(remotePeerId, streamToUse);
      
      if (!call) {
        console.error('Failed to create call');
        setCallState('idle');
        return;
      }
      
      console.log('✅ Call created successfully');
      setCurrentCall(call);
      currentCallRef.current = call;
      
      call.on('stream', (remoteStream) => {
        console.log('🎥 Outgoing call - received remote stream');
        handleRemoteStream(remoteStream);
        setCallState('connected');
      });

      call.on('close', () => {
        console.log('Call closed by remote user');
        endCall();
      });

      call.on('error', (error) => {
        console.error('Call error:', error);
        setCallState('idle');
      });
    } catch (error) {
      console.error('Error making call:', error);
      setCallState('idle');
    }
  };

  const handleIncomingCall = async (call) => {
    console.log('📞 Handling incoming call from:', call.peer);
    
    if (currentCallRef.current && callState === 'connected') {
      console.log('🚫 Already connected, rejecting incoming call');
      call.close();
      return;
    }
    
    // If we have an outgoing call that hasn't connected, replace it
    if (currentCallRef.current && callState === 'calling') {
      console.log('🔄 Replacing outgoing call with incoming call');
      currentCallRef.current.close();
      currentCallRef.current = null;
    }
    
    try {
      setCallState('calling');
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
      }

      console.log('📞 Answering call');
      call.answer(streamToAnswer);
      setCurrentCall(call);
      currentCallRef.current = call;
      setIsCallActive(true);
      
      call.on('stream', (remoteStream) => {
        console.log('🎥 Incoming call - received remote stream');
        handleRemoteStream(remoteStream);
        setCallState('connected');
      });

      call.on('close', () => {
        console.log('Incoming call closed by remote user');
        endCall();
      });

      call.on('error', (error) => {
        console.error('Incoming call error:', error);
        setCallState('idle');
      });
    } catch (error) {
      console.error('Error handling incoming call:', error);
      setCallState('idle');
    }
  };

  const handleRemoteStream = (remoteStream) => {
    console.log('🎥 Handling remote stream with tracks:', remoteStream.getTracks().length);
    
    const videoTrack = remoteStream.getVideoTracks()[0];
    const audioTrack = remoteStream.getAudioTracks()[0];
    
    if (videoTrack) {
      console.log('🔧 Video track - muted:', videoTrack.muted, 'enabled:', videoTrack.enabled, 'readyState:', videoTrack.readyState);
      console.log('🔧 Video track settings:', videoTrack.getSettings());
      
      // Force enable the track
      videoTrack.enabled = true;
    }
    
    if (audioTrack) {
      console.log('🔧 Audio track - muted:', audioTrack.muted, 'enabled:', audioTrack.enabled);
      audioTrack.enabled = true;
    }
    
    remoteStreamRef.current = remoteStream;
    setHasRemoteStream(true);
    
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.load();
      
      const playVideo = () => {
        remoteVideoRef.current.play().then(() => {
          console.log('✅ Remote video playing');
          
          // Wait for metadata to load
          const checkDimensions = () => {
            if (remoteVideoRef.current) {
              const width = remoteVideoRef.current.videoWidth;
              const height = remoteVideoRef.current.videoHeight;
              console.log('📐 Video dimensions:', width, 'x', height);
              
              if (width > 0 && height > 0) {
                console.log('✅ Video has valid dimensions');
                setHasRemoteStream(true);
              } else {
                console.log('⚠️ Video has no dimensions, retrying...');
                setTimeout(checkDimensions, 500);
              }
            }
          };
          
          setTimeout(checkDimensions, 100);
        }).catch(e => {
          console.log('❌ Play failed:', e.message);
          setTimeout(playVideo, 1000);
        });
      };
      
      setTimeout(playVideo, 100);
    }
  };

  const endCall = () => {
    if (callState === 'ending') return;
    
    setCallState('idle');
    setIsCallActive(false);
    setCurrentCall(null);
    setHasRemoteStream(false);

    if (currentCallRef.current) {
      currentCallRef.current.close();
      currentCallRef.current = null;
    }
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => track.stop());
      remoteStreamRef.current = null;
    }
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    if (socketRef.current) {
      socketRef.current.emit('end_call', { workspaceId });
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

  const toggleScreenShare = async () => {
    if (!currentCallRef.current) return;

    try {
      if (isScreenSharing) {
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
        
        if (currentCallRef.current && currentCallRef.current.peerConnection) {
          const videoTrack = stream.getVideoTracks()[0];
          const sender = currentCallRef.current.peerConnection.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          if (sender) {
            await sender.replaceTrack(videoTrack);
          }
        }
        
        setIsScreenSharing(false);
      } else {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        const audioTrack = localStream?.getAudioTracks()[0];
        if (audioTrack) {
          screenStream.addTrack(audioTrack);
        }
        
        setLocalStream(screenStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        if (currentCallRef.current && currentCallRef.current.peerConnection) {
          const videoTrack = screenStream.getVideoTracks()[0];
          const sender = currentCallRef.current.peerConnection.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          if (sender) {
            await sender.replaceTrack(videoTrack);
          }
        }
        
        setIsScreenSharing(true);
        
        screenStream.getVideoTracks()[0].onended = () => {
          if (!isCleaningUpRef.current) {
            toggleScreenShare();
          }
        };
      }
    } catch (error) {
      console.error('Screen sharing error:', error);
      alert('Screen sharing failed: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-1 sm:p-6">
      <div className="w-full max-w-6xl mx-auto px-1 sm:px-0">
        <div className="mb-2 sm:mb-8 text-center">
          <h1 className="text-xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-1 sm:mb-2">
            Video Conference v2
          </h1>
          <p className="text-gray-600 text-xs sm:text-base">Connect face-to-face with your team</p>
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm rounded-lg sm:rounded-2xl shadow-xl border border-white/20 p-2 sm:p-8">
          <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1 sm:gap-4 mb-4 sm:mb-8 sm:justify-center">
            <button
              onClick={startCall}
              disabled={callState !== 'idle'}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white px-2 sm:px-6 py-1.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:transform-none flex flex-col sm:flex-row items-center justify-center space-y-0 sm:space-y-0 sm:space-x-2 text-xs sm:text-base"
            >
              <svg className="w-3 h-3 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-xs sm:text-base">Start</span>
            </button>
            
            <button
              onClick={endCall}
              disabled={callState === 'idle'}
              className="bg-gradient-to-r from-red-600 to-red-700 text-white px-2 sm:px-6 py-1.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:transform-none flex flex-col sm:flex-row items-center justify-center space-y-0 sm:space-y-0 sm:space-x-2 text-xs sm:text-base"
            >
              <svg className="w-3 h-3 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 3l18 18" />
              </svg>
              <span className="text-xs sm:text-base">End</span>
            </button>
            
            <button
              onClick={toggleMute}
              disabled={!isCallActive}
              className={`px-2 sm:px-6 py-1.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:transform-none flex flex-col sm:flex-row items-center justify-center space-y-0 sm:space-y-0 sm:space-x-2 text-white text-xs sm:text-base ${
                isMuted 
                  ? 'bg-gradient-to-r from-red-600 to-red-700' 
                  : 'bg-gradient-to-r from-yellow-600 to-yellow-700'
              }`}
            >
              <svg className="w-3 h-3 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMuted ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                )}
              </svg>
              <span className="text-xs sm:text-base">{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>
            
            <button
              onClick={toggleVideo}
              disabled={!isCallActive}
              className={`px-2 sm:px-6 py-1.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:transform-none flex flex-col sm:flex-row items-center justify-center space-y-0 sm:space-y-0 sm:space-x-2 text-white text-xs sm:text-base ${
                isVideoOff 
                  ? 'bg-gradient-to-r from-red-600 to-red-700' 
                  : 'bg-gradient-to-r from-purple-600 to-purple-700'
              }`}
            >
              <svg className="w-3 h-3 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isVideoOff ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                )}
              </svg>
              <span className="text-xs sm:text-base">Video</span>
            </button>
            
            <button
              onClick={toggleScreenShare}
              disabled={!isCallActive}
              className={`px-2 sm:px-6 py-1.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:transform-none flex flex-col sm:flex-row items-center justify-center space-y-0 sm:space-y-0 sm:space-x-2 text-white text-xs sm:text-base ${
                isScreenSharing 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700' 
                  : 'bg-gradient-to-r from-gray-600 to-gray-700'
              }`}
            >
              <svg className="w-3 h-3 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-xs sm:text-base">Share</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-8">
            <div className="space-y-1 sm:space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse"></div>
                <h3 className="text-sm sm:text-lg font-semibold text-gray-900">Your Video</h3>
              </div>
              <div className="relative">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  className="w-full h-40 sm:h-80 bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg sm:rounded-2xl shadow-lg object-cover"
                />
                {!localStream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl">
                    <div className="text-center text-white">
                      <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm opacity-75">Camera not active</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-1 sm:space-y-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${currentCall ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <h3 className="text-sm sm:text-lg font-semibold text-gray-900">Remote Video</h3>
              </div>
              <div className="relative">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-40 sm:h-80 bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg sm:rounded-2xl shadow-lg object-cover"
                  onLoadedMetadata={(e) => {
                    console.log('📺 Metadata loaded:', e.target.videoWidth, 'x', e.target.videoHeight);
                  }}
                  onPlay={() => console.log('▶️ Video playing')}
                  onTimeUpdate={() => {
                    if (!remoteVideoRef.current?.hasLoggedTimeUpdate) {
                      console.log('📐 Video dimensions:', remoteVideoRef.current.videoWidth, 'x', remoteVideoRef.current.videoHeight);
                      
                      if (remoteVideoRef.current.videoWidth > 0 && remoteVideoRef.current.videoHeight > 0) {
                        console.log('✅ Video has valid dimensions');
                        setHasRemoteStream(true);
                      }
                      
                      remoteVideoRef.current.hasLoggedTimeUpdate = true;
                    }
                  }}
                />
                {!hasRemoteStream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg sm:rounded-2xl">
                    <div className="text-center text-white">
                      {callState === 'idle' && (
                        <>
                          <svg className="w-8 h-8 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <p className="text-xs sm:text-sm opacity-75">Waiting for participant</p>
                        </>
                      )}
                      {callState === 'connected' && (
                        <>
                          <svg className="w-8 h-8 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                          </svg>
                          <p className="text-xs sm:text-sm opacity-75">Remote video disabled</p>
                        </>
                      )}
                      {callState === 'calling' && (
                        <>
                          <div className="w-8 h-8 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-4 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <p className="text-xs sm:text-sm opacity-75">Connecting...</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {callState !== 'idle' && (
            <div className="mt-4 sm:mt-8 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  callState === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-pulse'
                }`}></div>
                <p className="text-green-800 font-medium text-sm sm:text-base">
                  {callState === 'calling' && 'Connecting...'}
                  {callState === 'connected' && 'Call is active'}
                  {callState === 'ending' && 'Ending call...'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VideoCall;