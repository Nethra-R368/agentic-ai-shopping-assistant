import React from 'react';

const Loader = () => {
  return (
    <div className="flex space-x-2 items-center p-4 bg-gray-100 rounded-2xl max-w-[100px] shadow-sm">
      <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"></div>
    </div>
  );
};

export default Loader;
