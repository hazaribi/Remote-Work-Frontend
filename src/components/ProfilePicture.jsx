import React, { useState } from 'react';

const ProfilePicture = ({ token }) => {
  const [uploading, setUploading] = useState(false);
  const [profilePic, setProfilePic] = useState(null);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/upload/profile-picture', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      setProfilePic(data.url);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center space-x-3">
      <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden">
        {profilePic ? (
          <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">👤</div>
        )}
      </div>
      <label className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
        {uploading ? 'Uploading...' : 'Change Photo'}
        <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
      </label>
    </div>
  );
};

export default ProfilePicture;