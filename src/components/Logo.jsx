import React from 'react';

function Logo({ size = 'md', showText = true, className = '' }) {
  const sizes = {
    sm: { container: 'w-6 h-6', icon: 'w-3 h-3', text: 'text-sm' },
    md: { container: 'w-8 h-8', icon: 'w-4 h-4', text: 'text-lg' },
    lg: { container: 'w-12 h-12', icon: 'w-6 h-6', text: 'text-xl' },
    xl: { container: 'w-16 h-16', icon: 'w-8 h-8', text: 'text-2xl' }
  };

  const currentSize = sizes[size];

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`${currentSize.container} bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 rounded-lg flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300`}>
        <svg className={`${currentSize.icon} text-white`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
      {showText && (
        <div>
          <h1 className={`${currentSize.text} font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent`}>
            RemoteSync
          </h1>
          {size === 'xl' && <p className="text-xs text-gray-500 -mt-1">Collaboration Suite</p>}
        </div>
      )}
    </div>
  );
}

export default Logo;