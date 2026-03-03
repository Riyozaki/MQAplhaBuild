import React from 'react';
import { motion } from 'framer-motion';

const SkeletonDashboard = () => (
  <div className="animate-pulse space-y-6 p-6 max-w-7xl mx-auto w-full">
    {/* Hero Card Skeleton */}
    <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-slate-700/50 shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-700/50 rounded w-1/3 shimmer" />
          <div className="h-3 bg-slate-700/50 rounded w-1/2 shimmer" />
        </div>
      </div>
      {/* XP Bar skeleton */}
      <div className="h-3 bg-slate-700/50 rounded-full mt-4 overflow-hidden relative">
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
        />
      </div>
    </div>
    
    {/* Stats Grid Skeleton */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
            <div key={i} className="glass-panel p-4 rounded-xl h-24 shimmer bg-slate-800/30" />
        ))}
    </div>
    
    {/* Three columns skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1,2,3].map(i => (
        <div key={i} className="glass-panel p-5 rounded-2xl h-[400px] relative overflow-hidden">
          <div className="h-6 bg-slate-700/50 rounded w-1/2 mb-6 shimmer" />
          <div className="space-y-4">
            {[1,2,3].map(j => (
                <div key={j} className="h-20 bg-slate-700/30 rounded-xl shimmer" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default SkeletonDashboard;
