import React, { useState } from 'react';
import VideoCall from './VideoCall';

const CallButton = ({ workspaceId, token, onCallStart, onCallEnd }) => {
  const handleStartCall = () => {
    onCallStart?.();
  };

  return (
    <button
      onClick={handleStartCall}
      className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
      <span>Video Call</span>
    </button>
  );
};

export default CallButton;