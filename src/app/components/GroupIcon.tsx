import React from 'react';

const GroupIcon: React.FC = () => {
  return (
    <div className="w-[50px] h-[50px] rounded-xl bg-yellow-100 flex items-center justify-center overflow-hidden">
      <div className="flex items-center justify-center w-full h-full relative p-1">
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 24 24" width="30" height="30" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-600">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div className="absolute bottom-0 right-1 bg-yellow-500 rounded-full p-1">
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.5 4H20l-4 3 1.5 4-4-3-4 3 1.5-4-4-3h6.5z" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default GroupIcon;
