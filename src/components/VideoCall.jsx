import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
const PEER_HOST = process.env.REACT_APP_PEER_HOST || 'localhost';
const PEER_PORT = process.env.REACT_APP_PEER_PORT || 9001;

function VideoCall({ workspaceId }) {
  const [peer, setPeer] = useState(null);
  const [socket, setSocket] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [currentCall, setCurrentCall] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    initPeer();
    initSocket();

    return () => {
      if (peer) peer.destroy();
      if (socket) socket.disconnect();
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [workspaceId]);

  const initPeer = () => {
    const newPeer = new Peer({
      host: PEER_HOST,
      port: PEER_PORT,
      path: '/peerjs'
    });

    newPeer.on('open', (id) => {
      console.log('Peer connected with ID:', id);
    });

    newPeer.on('call', (call) => {
      handleIncomingCall(call);
    });

    setPeer(newPeer);
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
      
      if (socket && peer) {
        socket.emit('call_user', {
          workspaceId,
          peerId: peer.id,
          callType: 'video'
        });
      }
      
      setIsCallActive(true);
    } catch (error) {
      console.error('Error accessing camera/microphone:', error);
      alert('Error accessing camera/microphone: ' + error.message);
    }
  };

  const makeCall = async (remotePeerId) => {
    if (!localStream) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera/microphone:', error);
        return;
      }
    }

    const call = peer.call(remotePeerId, localStream);
    setCurrentCall(call);
    
    call.on('stream', (remoteStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });

    call.on('close', () => {
      endCall();
    });
  };

  const handleIncomingCall = async (call) => {
    try {
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
      setCurrentCall(call);
      setIsCallActive(true);
      
      call.on('stream', (remoteStream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
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
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Video Call</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-2 mb-6">
          <button
            onClick={startCall}
            disabled={isCallActive}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Start Call
          </button>
          <button
            onClick={endCall}
            disabled={!isCallActive}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            End Call
          </button>
          <button
            onClick={toggleMute}
            disabled={!isCallActive}
            className={`px-4 py-2 rounded-lg text-white disabled:opacity-50 ${
              isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'
            }`}
          >
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
          <button
            onClick={toggleVideo}
            disabled={!isCallActive}
            className={`px-4 py-2 rounded-lg text-white disabled:opacity-50 ${
              isVideoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {isVideoOff ? 'Turn On Video' : 'Turn Off Video'}
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Local Video</h3>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              className="w-full h-64 bg-black rounded-lg"
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Remote Video</h3>
            <video
              ref={remoteVideoRef}
              autoPlay
              className="w-full h-64 bg-black rounded-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoCall;