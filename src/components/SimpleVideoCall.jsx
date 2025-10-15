import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import io from 'socket.io-client';

const SOCKET_URL = 'https://remote-work-backend.onrender.com';

function SimpleVideoCall({ workspaceId }) {
  const [peer, setPeer] = useState(null);
  const [myPeerId, setMyPeerId] = useState(null);
  const [remotePeerId, setRemotePeerId] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [call, setCall] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    initPeer();
    initSocket();
    return () => cleanup();
  }, []);

  const initPeer = () => {
    // Use default PeerJS with better config
    const newPeer = new Peer({
      host: 'peerjs-server.herokuapp.com',
      port: 443,
      path: '/peerjs',
      secure: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ],
        sdpSemantics: 'unified-plan'
      }
    });

    newPeer.on('open', (id) => {
      console.log('My peer ID:', id);
      setMyPeerId(id);
    });

    newPeer.on('call', (incomingCall) => {
      console.log('Receiving call...');
      navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { exact: 640 }, 
          height: { exact: 480 },
          frameRate: { exact: 30 }
        }, 
        audio: true 
      })
        .then((stream) => {
          setLocalStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
          
          incomingCall.answer(stream);
          setCall(incomingCall);
          
          incomingCall.on('stream', (remoteStream) => {
            console.log('Got remote stream:', remoteStream);
            const videoTrack = remoteStream.getVideoTracks()[0];
            if (videoTrack) {
              console.log('Video track settings:', videoTrack.getSettings());
              console.log('Video track muted:', videoTrack.muted);
              console.log('Video track enabled:', videoTrack.enabled);
            }
            
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
              setIsConnected(true);
              
              remoteVideoRef.current.onloadedmetadata = () => {
                console.log('Metadata loaded, dimensions:', 
                  remoteVideoRef.current.videoWidth, 'x', remoteVideoRef.current.videoHeight);
                remoteVideoRef.current.play().catch(console.error);
              };
            }
          });
        })
        .catch(console.error);
    });

    setPeer(newPeer);
  };

  const initSocket = () => {
    const token = localStorage.getItem('token');
    const socket = io(SOCKET_URL, { auth: { token } });
    
    socket.on('connect', () => {
      socket.emit('join_workspace', workspaceId);
    });
    
    socketRef.current = socket;
  };

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { exact: 640 }, 
          height: { exact: 480 },
          frameRate: { exact: 30 },
          facingMode: 'user'
        }, 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      console.log('Local stream ready, tracks:', stream.getTracks());
    } catch (error) {
      console.error('Error getting media:', error);
    }
  };

  const callPeer = () => {
    if (!peer || !localStream || !remotePeerId) {
      alert('Please start your video first and enter remote peer ID');
      return;
    }

    console.log('Calling peer:', remotePeerId);
    const outgoingCall = peer.call(remotePeerId, localStream);
    setCall(outgoingCall);

    outgoingCall.on('stream', (remoteStream) => {
      console.log('Got remote stream from outgoing call:', remoteStream);
      const videoTrack = remoteStream.getVideoTracks()[0];
      if (videoTrack) {
        console.log('Video track settings:', videoTrack.getSettings());
        console.log('Video track muted:', videoTrack.muted);
        console.log('Video track enabled:', videoTrack.enabled);
      }
      
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        setIsConnected(true);
        
        remoteVideoRef.current.onloadedmetadata = () => {
          console.log('Metadata loaded, dimensions:', 
            remoteVideoRef.current.videoWidth, 'x', remoteVideoRef.current.videoHeight);
          remoteVideoRef.current.play().catch(console.error);
        };
      }
    });
  };

  const cleanup = () => {
    if (call) call.close();
    if (peer) peer.destroy();
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (socketRef.current) socketRef.current.disconnect();
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Simple Video Call Test</h1>
      
      <div className="mb-4 space-y-2">
        <div>My Peer ID: <strong>{myPeerId}</strong></div>
        <input
          type="text"
          placeholder="Enter remote peer ID"
          value={remotePeerId}
          onChange={(e) => setRemotePeerId(e.target.value)}
          className="border p-2 rounded w-full"
        />
        <div className="space-x-2">
          <button onClick={startCall} className="bg-green-500 text-white px-4 py-2 rounded">
            Start My Video
          </button>
          <button onClick={callPeer} className="bg-blue-500 text-white px-4 py-2 rounded">
            Call Peer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-bold mb-2">My Video</h3>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            className="w-full h-64 bg-gray-800 border-2 border-green-500"
          />
        </div>
        
        <div>
          <h3 className="font-bold mb-2">Remote Video {isConnected ? '(Connected)' : '(Waiting)'}</h3>
          <video
            ref={remoteVideoRef}
            autoPlay
            className="w-full h-64 bg-gray-800 border-2 border-red-500"
            onLoadedMetadata={(e) => {
              console.log('Remote video metadata loaded:', e.target.videoWidth, 'x', e.target.videoHeight);
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default SimpleVideoCall;