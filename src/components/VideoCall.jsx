import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import io from 'socket.io-client';

const SOCKET_URL = 'https://remote-work-backend.onrender.com';
// Use public PeerJS server for now
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

function VideoCall({ workspaceId }) {
  const [peer, setPeer] = useState(null);
  const [socket, setSocket] = useState(null);
  const [myPeerId, setMyPeerId] = useState(null);
  const peerIdRef = useRef(null);
  const peerRef = useRef(null);
  const streamAssignedRef = useRef(false);
  const [localStream, setLocalStream] = useState(null);
  const [currentCall, setCurrentCall] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    initSocket();
    initPeer();

    return () => {
      if (peer) peer.destroy();
      if (socket) socket.disconnect();
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [workspaceId]);

  const initPeer = () => {
    const newPeer = new Peer(PEER_CONFIG);

    newPeer.on('open', (id) => {
      console.log('Peer connected with ID:', id);
      setMyPeerId(id);
      peerIdRef.current = id;
    });

    newPeer.on('call', (call) => {
      console.log('Incoming call from:', call.peer);
      handleIncomingCall(call);
    });

    newPeer.on('error', (error) => {
      console.error('Peer error:', error);
    });

    setPeer(newPeer);
    peerRef.current = newPeer;
  };

  const initSocket = () => {
    const token = localStorage.getItem('token');
    const newSocket = io(SOCKET_URL, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      newSocket.emit('join_workspace', workspaceId);
    });

    newSocket.on('incoming_call', (data) => {
      if (peer && data.peerId) {
        makeCall(data.peerId);
      }
    });

    newSocket.on('user_calling', (data) => {
      console.log('🔔 User is calling:', data);
      const currentPeerId = peerIdRef.current;
      console.log('📱 My peer ID:', currentPeerId);
      console.log('👤 My user ID:', JSON.parse(localStorage.getItem('user')).id);
      console.log('🔍 Peer ready?', !!peerRef.current);
      console.log('🆔 Different peer?', data.peerId !== myPeerId);
      console.log('👥 Different user?', data.userId !== JSON.parse(localStorage.getItem('user')).id);
      
      if (peerRef.current && currentPeerId && data.peerId && data.peerId !== currentPeerId && data.userId !== JSON.parse(localStorage.getItem('user')).id) {
        console.log('✅ Making call to peer:', data.peerId);
        makeCall(data.peerId);
      } else {
        console.log('❌ Ignoring call - reason:', {
          peerReady: !!peerRef.current,
          myPeerIdSet: !!currentPeerId,
          hasPeerId: !!data.peerId,
          differentPeer: data.peerId !== currentPeerId,
          differentUser: data.userId !== JSON.parse(localStorage.getItem('user')).id
        });
      }
    });

    setSocket(newSocket);
  };

  const startCall = async () => {
    try {
      // Stop any existing stream first
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      if (socket && peer) {
        console.log('Broadcasting call with peer ID:', peer.id);
        socket.emit('user_calling', {
          workspaceId,
          peerId: peer.id
        });
      }
      
      setIsCallActive(true);
    } catch (error) {
      console.error('Error accessing camera/microphone:', error);
      alert('Error: ' + error.message + '. Please close other tabs using camera or refresh the page.');
    }
  };

  const makeCall = async (remotePeerId) => {
    console.log('Making call to:', remotePeerId);
    
    let streamToUse = localStream;
    
    if (!streamToUse) {
      try {
        streamToUse = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setLocalStream(streamToUse);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = streamToUse;
        }
      } catch (error) {
        console.error('Error accessing camera/microphone:', error);
        return;
      }
    }

    if (!peerRef.current) {
      console.error('Peer not initialized');
      return;
    }

    console.log('Calling peer with stream:', streamToUse);
    
    try {
      const call = peerRef.current.call(remotePeerId, streamToUse);
      
      if (!call) {
        console.error('Failed to create call - peer may be disconnected');
        return;
      }
      
      console.log('✅ Call created successfully:', call);
      setCurrentCall(call);
      
      call.on('stream', (remoteStream) => {
        console.log('🎥 Received remote stream:', remoteStream);
        console.log('📺 Video element exists?', !!remoteVideoRef.current);
        if (remoteVideoRef.current && !streamAssignedRef.current) {
          const videoTracks = remoteStream.getVideoTracks();
          const audioTracks = remoteStream.getAudioTracks();
          
          console.log('🔍 Stream tracks:', remoteStream.getTracks());
          console.log('🎥 Video tracks:', videoTracks);
          console.log('🎤 Audio tracks:', audioTracks);
          
          // Check if video track is enabled
          if (videoTracks.length > 0) {
            console.log('🔍 Video track enabled?', videoTracks[0].enabled);
            console.log('🔍 Video track ready state:', videoTracks[0].readyState);
          }
          
          remoteVideoRef.current.srcObject = remoteStream;
          streamAssignedRef.current = true;
          console.log('📺 Stream assigned to video element');
          
          // Immediate debugging and play attempt
          console.log('📺 Video element properties:', {
            srcObject: !!remoteVideoRef.current.srcObject,
            videoWidth: remoteVideoRef.current.videoWidth,
            videoHeight: remoteVideoRef.current.videoHeight,
            paused: remoteVideoRef.current.paused,
            muted: remoteVideoRef.current.muted
          });
          
          // Set video properties for reliable playback
          remoteVideoRef.current.autoplay = true;
          remoteVideoRef.current.playsInline = true;
          remoteVideoRef.current.controls = false;
          
          // Simple play with mute workaround
          remoteVideoRef.current.muted = true;
          remoteVideoRef.current.play().then(() => {
            console.log('✅ Video playing (muted)');
            setTimeout(() => {
              remoteVideoRef.current.muted = false;
              console.log('🔊 Video unmuted');
            }, 1000);
          }).catch(e => {
            console.log('❌ Play error:', e);
          });
          
          remoteVideoRef.current.addEventListener('loadedmetadata', () => {
            console.log('📺 Metadata loaded:', remoteVideoRef.current.videoWidth, 'x', remoteVideoRef.current.videoHeight);
          });
        } else if (streamAssignedRef.current) {
          console.log('📺 Stream already assigned, ignoring duplicate');
        } else {
          console.log('📺 Video element not available or null');
        }
      });

      call.on('close', () => {
        console.log('Call closed');
        endCall();
      });

      call.on('error', (error) => {
        console.error('Call error:', error);
      });
    } catch (error) {
      console.error('Error making call:', error);
    }
  };

  const handleIncomingCall = async (call) => {
    console.log('📞 Handling incoming call from:', call.peer);
    try {
      let streamToAnswer = localStream;
      
      if (!streamToAnswer) {
        streamToAnswer = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setLocalStream(streamToAnswer);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = streamToAnswer;
        }
      }

      console.log('📞 Answering call with stream:', streamToAnswer);
      call.answer(streamToAnswer);
      setCurrentCall(call);
      setIsCallActive(true);
      
      call.on('stream', (remoteStream) => {
        console.log('🎥 Incoming call - received remote stream:', remoteStream);
        if (remoteVideoRef.current && !streamAssignedRef.current) {
          const videoTracks = remoteStream.getVideoTracks();
          console.log('🔍 Incoming call - Video track enabled?', videoTracks[0]?.enabled);
          console.log('🔍 Incoming call - Video track ready state:', videoTracks[0]?.readyState);
          
          remoteVideoRef.current.srcObject = remoteStream;
          streamAssignedRef.current = true;
          console.log('📺 Incoming call - Stream assigned to video element');
          
          // Immediate debugging and play attempt for incoming call
          console.log('📺 Incoming call - Video element properties:', {
            srcObject: !!remoteVideoRef.current.srcObject,
            videoWidth: remoteVideoRef.current.videoWidth,
            videoHeight: remoteVideoRef.current.videoHeight,
            paused: remoteVideoRef.current.paused,
            muted: remoteVideoRef.current.muted
          });
          
          // Set video properties for reliable playback
          remoteVideoRef.current.autoplay = true;
          remoteVideoRef.current.playsInline = true;
          remoteVideoRef.current.controls = false;
          
          // Simple incoming play with mute workaround
          remoteVideoRef.current.muted = true;
          remoteVideoRef.current.play().then(() => {
            console.log('✅ Incoming video playing (muted)');
            setTimeout(() => {
              remoteVideoRef.current.muted = false;
            }, 1000);
          }).catch(e => {
            console.log('❌ Incoming play error:', e);
          });
          
          remoteVideoRef.current.addEventListener('loadedmetadata', () => {
            console.log('📺 Incoming metadata loaded');
          });
        } else if (streamAssignedRef.current) {
          console.log('📺 Incoming call - Stream already assigned, ignoring');
        }
      });

      call.on('close', () => {
        endCall();
      });
    } catch (error) {
      console.error('Error handling incoming call:', error);
    }
  };

  const endCall = () => {
    if (currentCall) {
      currentCall.close();
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    // Reset stream assignment flag
    streamAssignedRef.current = false;
    
    setCurrentCall(null);
    setIsCallActive(false);
    
    if (socket) {
      socket.emit('end_call', { workspaceId });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Video Conference
          </h1>
          <p className="text-gray-600">Connect face-to-face with your team</p>
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
          <div className="flex flex-wrap gap-4 mb-8 justify-center">
            <button
              onClick={startCall}
              disabled={isCallActive}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:transform-none flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Start Call</span>
            </button>
            
            <button
              onClick={endCall}
              disabled={!isCallActive}
              className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:transform-none flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 3l18 18" />
              </svg>
              <span>End Call</span>
            </button>
            
            <button
              onClick={toggleMute}
              disabled={!isCallActive}
              className={`px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:transform-none flex items-center space-x-2 text-white ${
                isMuted 
                  ? 'bg-gradient-to-r from-red-600 to-red-700' 
                  : 'bg-gradient-to-r from-yellow-600 to-yellow-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMuted ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                )}
              </svg>
              <span>{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>
            
            <button
              onClick={toggleVideo}
              disabled={!isCallActive}
              className={`px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:transform-none flex items-center space-x-2 text-white ${
                isVideoOff 
                  ? 'bg-gradient-to-r from-red-600 to-red-700' 
                  : 'bg-gradient-to-r from-purple-600 to-purple-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isVideoOff ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                )}
              </svg>
              <span>{isVideoOff ? 'Turn On Video' : 'Turn Off Video'}</span>
            </button>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <h3 className="text-lg font-semibold text-gray-900">Your Video</h3>
              </div>
              <div className="relative">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  className="w-full h-80 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg object-cover"
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
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${currentCall ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <h3 className="text-lg font-semibold text-gray-900">Remote Video</h3>
              </div>
              <div className="relative">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-80 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg object-cover"
                  style={{ display: 'block' }}
                />
                {!currentCall && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl">
                    <div className="text-center text-white">
                      <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="text-sm opacity-75">Waiting for participant</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {isCallActive && (
            <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-green-800 font-medium">Call is active</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VideoCall;