import React, { useRef, useEffect } from 'react';

function CameraTest() {
  const videoRef = useRef(null);

  const testCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      console.log('✅ Camera access granted');
      console.log('📹 Video tracks:', stream.getVideoTracks().length);
      console.log('🎤 Audio tracks:', stream.getAudioTracks().length);
      
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        console.log('📹 Video track settings:', videoTrack.getSettings());
        console.log('📹 Video track enabled:', videoTrack.enabled);
        console.log('📹 Video track muted:', videoTrack.muted);
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          console.log('📺 Video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
        };
      }
    } catch (error) {
      console.error('❌ Camera access denied:', error);
      alert('Camera access denied: ' + error.message);
    }
  };

  useEffect(() => {
    testCamera();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Camera Test</h2>
      <video
        ref={videoRef}
        autoPlay
        muted
        className="w-full max-w-md border-2 border-red-500"
        style={{ backgroundColor: 'green' }}
      />
      <button
        onClick={testCamera}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Test Camera Again
      </button>
    </div>
  );
}

export default CameraTest;