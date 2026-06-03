import React from 'react';

const Loader = () => {
  return (
    <div className="flex space-x-1.5 items-center px-3 py-2 bg-slate-950/40 border border-white/5 rounded-xl max-w-[80px] justify-center shadow-inner">
      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
    </div>
  );
};

export default Loader;
