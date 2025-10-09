import React from 'react';

function Footer() {
  return (
    <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
          <div className="text-sm text-gray-600">
            © 2024 <span className="font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">RemoteSync</span>. 
            All rights reserved.
          </div>
          <div className="text-sm text-gray-500">
            Developed by <span className="font-medium text-gray-700">Binay Kumar</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;