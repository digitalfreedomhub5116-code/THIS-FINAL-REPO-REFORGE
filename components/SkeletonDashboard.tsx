
import React from 'react';

interface SkeletonBaseProps {
  className?: string;
  children?: React.ReactNode;
}

const SkeletonBase: React.FC<SkeletonBaseProps> = ({ className, children }) => (
  <div className={`bg-gray-900/40 border border-gray-800/50 rounded-xl animate-pulse ${className}`}>
    {children}
  </div>
);

const SkeletonDashboard: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
      
      {/* 1. Hunter Command Deck Skeleton */}
      <div className="w-full h-[220px] md:h-[500px] border border-gray-800/50 rounded-2xl overflow-hidden flex flex-row bg-black/40">
          {/* Left Panel */}
          <div className="w-1/2 h-full p-6 flex flex-col gap-4 border-r border-gray-800/50">
              {/* Radar Placeholder */}
              <div className="flex-1 flex items-center justify-center">
                  <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-gray-900/50 animate-pulse border border-gray-800" />
              </div>
              {/* Stats Lines */}
              <div className="hidden md:flex flex-col gap-2 mt-auto">
                  <SkeletonBase className="h-8 w-3/4" />
                  <SkeletonBase className="h-4 w-1/2" />
                  <div className="grid grid-cols-2 gap-2 mt-4">
                      {[1, 2, 3, 4, 5, 6].map(i => (
                          <SkeletonBase key={i} className="h-6 w-full" />
                      ))}
                  </div>
              </div>
          </div>
          {/* Right Panel (Video Placeholder) */}
          <div className="w-1/2 h-full bg-gray-900/20 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
              <div className="absolute top-4 right-4 h-4 w-16 bg-gray-800/50 rounded animate-pulse" />
          </div>
      </div>

      {/* 2. Level Progress Skeleton */}
      <div className="w-full">
          <div className="flex justify-between mb-2">
              <SkeletonBase className="h-8 w-24" />
              <SkeletonBase className="h-8 w-32" />
          </div>
          <SkeletonBase className="h-6 w-full rounded-full" />
      </div>

      {/* 3. Dashboard Widgets (Bento Grid) Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tall Left Card */}
          <SkeletonBase className="md:col-span-1 h-[420px] p-6 flex flex-col gap-4">
              <SkeletonBase className="h-8 w-3/4" />
              <SkeletonBase className="h-8 w-1/2" />
              <div className="flex-1 flex items-center justify-center">
                  <div className="w-32 h-32 bg-gray-900/50 rounded-full" />
              </div>
          </SkeletonBase>

          {/* Right Column Grid */}
          <div className="md:col-span-2 flex flex-col gap-6 h-[420px]">
              {/* Top Row */}
              <div className="flex-1 grid grid-cols-2 gap-6">
                  <SkeletonBase className="h-full p-4 flex flex-col justify-between">
                      <div className="flex justify-between">
                          <SkeletonBase className="h-6 w-20" />
                          <SkeletonBase className="h-8 w-8 rounded-full" />
                      </div>
                      <SkeletonBase className="h-2 w-full mt-4" />
                  </SkeletonBase>
                  <SkeletonBase className="h-full flex items-center justify-center">
                      <div className="w-16 h-16 bg-gray-900/80 rounded-xl" />
                  </SkeletonBase>
              </div>
              
              {/* Bottom Wide Card */}
              <SkeletonBase className="h-[140px] p-6 flex items-center justify-between">
                  <div className="space-y-2">
                      <SkeletonBase className="h-6 w-32" />
                      <SkeletonBase className="h-6 w-48" />
                  </div>
                  <SkeletonBase className="h-10 w-20 rounded-full" />
              </SkeletonBase>
          </div>
      </div>

      {/* 4. Rank Roadmap Skeleton */}
      <SkeletonBase className="w-full h-[200px] p-6 flex flex-col justify-between">
          <div className="flex justify-between">
              <SkeletonBase className="h-8 w-48" />
              <SkeletonBase className="h-12 w-12 rounded-lg" />
          </div>
          <div className="w-full h-4 bg-gray-900/80 rounded-full mt-4" />
      </SkeletonBase>

    </div>
  );
};

export default SkeletonDashboard;
