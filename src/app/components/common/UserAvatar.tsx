import React from 'react';

interface UserAvatarProps {
  name: string;
  color?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ name, color = 'bg-blue-500' }) => {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`w-[50px] h-[50px] rounded-full flex items-center justify-center text-white font-bold text-xl ${color}`}>
      {initials}
    </div>
  );
};

export default UserAvatar;
