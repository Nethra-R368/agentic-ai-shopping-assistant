import React from 'react';

const ShimmerCard = () => {
  return (
    <div className="bg-slate-900/35 backdrop-blur-md rounded-2xl border border-white/5 p-4 flex flex-col justify-between h-full min-h-[360px] shimmer-sweep select-none">
      <div>
        {/* Shimmer Image Panel */}
        <div className="w-full h-44 bg-slate-950/40 rounded-xl mb-4 relative overflow-hidden border border-white/5">
          <div className="absolute top-2 left-2 w-14 h-4 bg-white/5 rounded-md"></div>
          <div className="absolute top-2 right-2 w-12 h-4 bg-white/5 rounded-md"></div>
        </div>

        {/* Shimmer Meta */}
        <div className="h-5 bg-white/5 rounded-md w-3/4 mb-2"></div>
        <div className="space-y-1.5 mb-4">
          <div className="h-3 bg-white/5 rounded-md w-full"></div>
          <div className="h-3 bg-white/5 rounded-md w-5/6"></div>
        </div>
      </div>

      {/* Shimmer Spec Drawer */}
      <div className="h-8 bg-white/5 rounded-lg w-full mb-4"></div>

      {/* Shimmer Pricing and Actions */}
      <div className="mt-auto border-t border-white/5 pt-4">
        <div className="flex justify-between items-center mb-4">
          <div className="space-y-1">
            <div className="h-2.5 bg-white/5 rounded-md w-8"></div>
            <div className="h-6 bg-white/5 rounded-md w-16"></div>
          </div>
          <div className="space-y-1 flex flex-col items-end">
            <div className="h-2.5 bg-white/5 rounded-md w-10"></div>
            <div className="h-4 bg-white/5 rounded-md w-12"></div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <div className="flex-1 h-9 bg-white/5 rounded-xl"></div>
          <div className="w-10 h-9 bg-white/5 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
};

export default ShimmerCard;
