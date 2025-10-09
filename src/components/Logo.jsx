import React from 'react';

function Logo({ size = 'md', showText = true, className = '' }) {
  const sizes = {
    sm: { container: 'w-8 h-8', icon: 'w-5 h-5', text: 'text-lg' },
    md: { container: 'w-12 h-12', icon: 'w-7 h-7', text: 'text-2xl' },
    lg: { container: 'w-16 h-16', icon: 'w-10 h-10', text: 'text-3xl' },
    xl: { container: 'w-24 h-24', icon: 'w-14 h-14', text: 'text-4xl' }
  };

  const currentSize = sizes[size];

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className={`${currentSize.container} bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300`}>
        <svg className={`${currentSize.icon} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      {showText && (
        <div>
          <h1 className={`${currentSize.text} font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent`}>
            RemoteSync
          </h1>
          <p className="text-xs text-gray-500 -mt-1">Collaboration Suite</p>
        </div>
      )}
    </div>
  );
}

export default Logo;