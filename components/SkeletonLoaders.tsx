import React from 'react';

/* ── Shimmer animation via Tailwind's animate-pulse + gradient overlay ── */
const Shimmer: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`relative overflow-hidden bg-gray-800/50 rounded-lg ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-gray-700/30 to-transparent" />
  </div>
);

/* ══════════════════════════════════════════════════════════════════
   Reusable Primitives
   ══════════════════════════════════════════════════════════════════ */

export const SkeletonLine: React.FC<{ w?: string; h?: string; className?: string }> = ({ w = 'w-full', h = 'h-4', className = '' }) => (
  <Shimmer className={`${w} ${h} ${className}`} />
);

export const SkeletonCircle: React.FC<{ size?: string; className?: string }> = ({ size = 'w-10 h-10', className = '' }) => (
  <Shimmer className={`${size} !rounded-full ${className}`} />
);

export const SkeletonCard: React.FC<{ className?: string; children?: React.ReactNode }> = ({ className = '', children }) => (
  <div className={`bg-gray-900/60 border border-gray-800/40 rounded-xl p-4 ${className}`}>
    {children}
  </div>
);

/* ══════════════════════════════════════════════════════════════════
   Dashboard Section Skeletons
   ══════════════════════════════════════════════════════════════════ */

export const SkeletonStatsChart: React.FC = () => (
  <SkeletonCard className="h-[220px] md:h-[480px] flex flex-row overflow-hidden">
    <div className="w-1/2 p-4 flex flex-col gap-3 border-r border-gray-800/30">
      <div className="flex-1 flex items-center justify-center">
        <SkeletonCircle size="w-28 h-28 md:w-44 md:h-44" />
      </div>
      <div className="hidden md:flex flex-col gap-2">
        <SkeletonLine w="w-3/4" h="h-6" />
        <SkeletonLine w="w-1/2" h="h-4" />
        <div className="grid grid-cols-2 gap-2 mt-2">
          {[1,2,3,4].map(i => <SkeletonLine key={i} h="h-5" />)}
        </div>
      </div>
    </div>
    <div className="w-1/2 bg-gray-900/20 relative">
      <Shimmer className="absolute inset-0 !rounded-none" />
    </div>
  </SkeletonCard>
);

export const SkeletonStatBoxes: React.FC = () => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    {[1,2,3,4].map(i => (
      <SkeletonCard key={i} className="h-24 flex flex-col justify-between">
        <SkeletonLine w="w-16" h="h-3" />
        <SkeletonLine w="w-12" h="h-8" />
        <SkeletonLine w="w-20" h="h-2" />
      </SkeletonCard>
    ))}
  </div>
);

export const SkeletonLevelProgress: React.FC = () => (
  <SkeletonCard className="h-20 flex flex-col justify-between">
    <div className="flex justify-between">
      <SkeletonLine w="w-20" h="h-5" />
      <SkeletonLine w="w-28" h="h-5" />
    </div>
    <Shimmer className="h-4 w-full !rounded-full" />
  </SkeletonCard>
);

export const SkeletonWardrobePreview: React.FC = () => (
  <SkeletonCard className="h-40 flex items-center gap-4">
    <SkeletonCircle size="w-20 h-20" />
    <div className="flex-1 flex flex-col gap-2">
      <SkeletonLine w="w-32" h="h-5" />
      <SkeletonLine w="w-24" h="h-3" />
      <SkeletonLine w="w-20" h="h-8 mt-2" className="!rounded-full" />
    </div>
  </SkeletonCard>
);

export const SkeletonRankProgression: React.FC = () => (
  <SkeletonCard className="h-[160px] flex flex-col justify-between">
    <div className="flex justify-between items-center">
      <SkeletonLine w="w-36" h="h-6" />
      <Shimmer className="w-10 h-10 !rounded-lg" />
    </div>
    <Shimmer className="h-3 w-full !rounded-full mt-3" />
    <div className="flex justify-between mt-2">
      {['E','D','C','B','A','S'].map(r => <SkeletonLine key={r} w="w-6" h="h-3" />)}
    </div>
  </SkeletonCard>
);

export const SkeletonUpcomingQuests: React.FC = () => (
  <SkeletonCard className="flex flex-col gap-3">
    <SkeletonLine w="w-40" h="h-5" />
    {[1,2,3].map(i => (
      <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-800/30 last:border-0">
        <Shimmer className="w-8 h-8 !rounded-lg flex-shrink-0" />
        <div className="flex-1 flex flex-col gap-1">
          <SkeletonLine w="w-3/4" h="h-4" />
          <SkeletonLine w="w-1/2" h="h-3" />
        </div>
        <SkeletonLine w="w-12" h="h-5" className="!rounded-full" />
      </div>
    ))}
  </SkeletonCard>
);

export const SkeletonDashboardWidgets: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <SkeletonCard className="h-36 flex flex-col justify-between">
      <SkeletonLine w="w-28" h="h-5" />
      <SkeletonLine w="w-20" h="h-8" />
      <SkeletonLine w="w-full" h="h-2" className="!rounded-full" />
    </SkeletonCard>
    <SkeletonCard className="h-36 flex flex-col justify-between">
      <SkeletonLine w="w-24" h="h-5" />
      <div className="flex gap-2">
        {[1,2,3].map(i => <Shimmer key={i} className="w-10 h-10 !rounded-full" />)}
      </div>
      <SkeletonLine w="w-32" h="h-3" />
    </SkeletonCard>
  </div>
);

export const SkeletonForgeGuard: React.FC = () => (
  <SkeletonCard className="h-16 flex items-center gap-3">
    <Shimmer className="w-8 h-8 !rounded-lg flex-shrink-0" />
    <div className="flex-1 flex flex-col gap-1">
      <SkeletonLine w="w-28" h="h-4" />
      <SkeletonLine w="w-16" h="h-3" />
    </div>
  </SkeletonCard>
);

/* ══════════════════════════════════════════════════════════════════
   Full-Page Skeletons
   ══════════════════════════════════════════════════════════════════ */

export const SkeletonQuestsPage: React.FC = () => (
  <div className="flex flex-col gap-4 p-2">
    {/* Header area */}
    <div className="flex justify-between items-center">
      <SkeletonLine w="w-32" h="h-7" />
      <Shimmer className="w-10 h-10 !rounded-full" />
    </div>
    {/* Date nav */}
    <div className="flex items-center justify-center gap-4">
      <Shimmer className="w-8 h-8 !rounded-full" />
      <SkeletonLine w="w-36" h="h-5" />
      <Shimmer className="w-8 h-8 !rounded-full" />
    </div>
    {/* Quest cards */}
    {[1,2,3,4].map(i => (
      <SkeletonCard key={i} className="flex items-center gap-3 h-20">
        <Shimmer className="w-2 h-full !rounded-l-xl !rounded-r-none absolute left-0 top-0" />
        <div className="ml-2 flex-1 flex flex-col gap-2">
          <SkeletonLine w="w-3/4" h="h-5" />
          <div className="flex gap-2">
            <SkeletonLine w="w-12" h="h-4" className="!rounded-full" />
            <SkeletonLine w="w-16" h="h-4" className="!rounded-full" />
          </div>
        </div>
        <Shimmer className="w-8 h-8 !rounded-lg flex-shrink-0" />
      </SkeletonCard>
    ))}
  </div>
);

export const SkeletonShopPage: React.FC = () => (
  <div className="flex flex-col gap-4 p-2">
    {/* Header */}
    <div className="flex justify-between items-center">
      <SkeletonLine w="w-24" h="h-7" />
      <SkeletonLine w="w-20" h="h-6" className="!rounded-full" />
    </div>
    {/* Tab bar */}
    <div className="flex gap-2">
      {[1,2,3].map(i => <SkeletonLine key={i} w="w-20" h="h-8" className="!rounded-full" />)}
    </div>
    {/* Item grid */}
    <div className="grid grid-cols-2 gap-3">
      {[1,2,3,4,5,6].map(i => (
        <SkeletonCard key={i} className="h-44 flex flex-col justify-between">
          <div className="flex-1 flex items-center justify-center">
            <Shimmer className="w-16 h-16 !rounded-xl" />
          </div>
          <SkeletonLine w="w-3/4" h="h-4" />
          <SkeletonLine w="w-16" h="h-3" />
          <Shimmer className="h-8 w-full !rounded-lg mt-1" />
        </SkeletonCard>
      ))}
    </div>
  </div>
);

export const SkeletonCastlePage: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-6 min-h-[60vh] p-4">
    {/* Castle tower */}
    <Shimmer className="w-48 h-48 !rounded-2xl" />
    {/* Title */}
    <SkeletonLine w="w-40" h="h-7" />
    <SkeletonLine w="w-56" h="h-4" />
    {/* Stats row */}
    <div className="flex gap-6">
      {[1,2,3].map(i => (
        <div key={i} className="flex flex-col items-center gap-1">
          <Shimmer className="w-10 h-10 !rounded-full" />
          <SkeletonLine w="w-12" h="h-3" />
        </div>
      ))}
    </div>
    {/* Action button */}
    <Shimmer className="w-48 h-12 !rounded-xl" />
  </div>
);

export const SkeletonAlliancePage: React.FC = () => (
  <div className="flex flex-col gap-4 p-2">
    <SkeletonLine w="w-28" h="h-7" />
    <SkeletonCard className="h-32 flex items-center gap-4">
      <SkeletonCircle size="w-16 h-16" />
      <div className="flex-1 flex flex-col gap-2">
        <SkeletonLine w="w-32" h="h-5" />
        <SkeletonLine w="w-48" h="h-3" />
        <SkeletonLine w="w-24" h="h-3" />
      </div>
    </SkeletonCard>
    {/* Members list */}
    {[1,2,3,4,5].map(i => (
      <div key={i} className="flex items-center gap-3 py-2">
        <SkeletonCircle size="w-9 h-9" />
        <div className="flex-1 flex flex-col gap-1">
          <SkeletonLine w="w-24" h="h-4" />
          <SkeletonLine w="w-16" h="h-3" />
        </div>
        <SkeletonLine w="w-12" h="h-4" className="!rounded-full" />
      </div>
    ))}
  </div>
);

export const SkeletonGrowthPage: React.FC = () => (
  <div className="flex flex-col gap-4 p-2">
    <SkeletonLine w="w-24" h="h-7" />
    {/* Photo grid */}
    <div className="grid grid-cols-3 gap-2">
      {[1,2,3].map(i => <Shimmer key={i} className="aspect-square !rounded-xl" />)}
    </div>
    {/* Stats */}
    <SkeletonCard className="flex flex-col gap-3">
      <SkeletonLine w="w-28" h="h-5" />
      {[1,2,3,4].map(i => (
        <div key={i} className="flex justify-between items-center">
          <SkeletonLine w="w-20" h="h-4" />
          <SkeletonLine w="w-32" h="h-3" />
        </div>
      ))}
    </SkeletonCard>
    {/* Activity */}
    <SkeletonCard className="flex flex-col gap-2">
      <SkeletonLine w="w-24" h="h-5" />
      {[1,2,3].map(i => (
        <div key={i} className="flex gap-2 items-center py-1">
          <Shimmer className="w-2 h-2 !rounded-full flex-shrink-0" />
          <SkeletonLine w="w-full" h="h-3" />
        </div>
      ))}
    </SkeletonCard>
  </div>
);

export const SkeletonHealthPage: React.FC = () => (
  <div className="flex flex-col gap-4 p-2">
    <SkeletonLine w="w-20" h="h-7" />
    {/* Tab pills */}
    <div className="flex gap-2">
      {[1,2,3].map(i => <SkeletonLine key={i} w="w-20" h="h-8" className="!rounded-full" />)}
    </div>
    {/* Health cards */}
    <SkeletonCard className="h-40 flex flex-col gap-3">
      <SkeletonLine w="w-32" h="h-5" />
      <div className="grid grid-cols-3 gap-3 flex-1">
        {[1,2,3].map(i => (
          <div key={i} className="flex flex-col items-center justify-center gap-1">
            <SkeletonCircle size="w-12 h-12" />
            <SkeletonLine w="w-10" h="h-3" />
          </div>
        ))}
      </div>
    </SkeletonCard>
    {/* Meal log */}
    <SkeletonCard className="flex flex-col gap-2">
      <SkeletonLine w="w-20" h="h-5" />
      {[1,2,3].map(i => (
        <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-800/30 last:border-0">
          <Shimmer className="w-10 h-10 !rounded-lg flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-1">
            <SkeletonLine w="w-3/4" h="h-4" />
            <SkeletonLine w="w-1/2" h="h-3" />
          </div>
        </div>
      ))}
    </SkeletonCard>
  </div>
);

export const SkeletonRankingPage: React.FC = () => (
  <div className="flex flex-col gap-3 p-2">
    <SkeletonLine w="w-28" h="h-7" />
    {/* Top 3 podium */}
    <div className="flex justify-center items-end gap-4 h-36 mb-4">
      <div className="flex flex-col items-center gap-1">
        <SkeletonCircle size="w-12 h-12" />
        <SkeletonLine w="w-10" h="h-3" />
        <Shimmer className="w-14 h-20 !rounded-t-lg" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <SkeletonCircle size="w-14 h-14" />
        <SkeletonLine w="w-12" h="h-3" />
        <Shimmer className="w-14 h-28 !rounded-t-lg" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <SkeletonCircle size="w-12 h-12" />
        <SkeletonLine w="w-10" h="h-3" />
        <Shimmer className="w-14 h-16 !rounded-t-lg" />
      </div>
    </div>
    {/* Leaderboard rows */}
    {[4,5,6,7,8].map(i => (
      <div key={i} className="flex items-center gap-3 py-2 px-3 bg-gray-900/40 rounded-lg">
        <SkeletonLine w="w-6" h="h-4" />
        <SkeletonCircle size="w-8 h-8" />
        <div className="flex-1 flex flex-col gap-1">
          <SkeletonLine w="w-24" h="h-4" />
          <SkeletonLine w="w-16" h="h-3" />
        </div>
        <SkeletonLine w="w-14" h="h-4" />
      </div>
    ))}
  </div>
);

export const SkeletonProfilePage: React.FC = () => (
  <div className="flex flex-col gap-4 p-2">
    {/* Avatar + name */}
    <div className="flex flex-col items-center gap-3 py-6">
      <SkeletonCircle size="w-24 h-24" />
      <SkeletonLine w="w-32" h="h-6" />
      <SkeletonLine w="w-20" h="h-4" />
    </div>
    {/* Info cards */}
    {[1,2,3].map(i => (
      <SkeletonCard key={i} className="flex justify-between items-center h-14">
        <SkeletonLine w="w-24" h="h-4" />
        <SkeletonLine w="w-20" h="h-4" />
      </SkeletonCard>
    ))}
    {/* Action buttons */}
    <div className="flex flex-col gap-2 mt-4">
      <Shimmer className="h-11 w-full !rounded-xl" />
      <Shimmer className="h-11 w-full !rounded-xl" />
    </div>
  </div>
);

export const SkeletonAdminPage: React.FC = () => (
  <div className="flex flex-col gap-4 p-4 max-w-4xl mx-auto">
    <SkeletonLine w="w-40" h="h-8" />
    {/* Search */}
    <Shimmer className="h-10 w-full !rounded-lg" />
    {/* User rows */}
    {[1,2,3,4,5,6].map(i => (
      <SkeletonCard key={i} className="flex items-center gap-3 h-16">
        <SkeletonCircle size="w-10 h-10" />
        <div className="flex-1 flex flex-col gap-1">
          <SkeletonLine w="w-28" h="h-4" />
          <SkeletonLine w="w-16" h="h-3" />
        </div>
        <div className="flex gap-2">
          <SkeletonLine w="w-14" h="h-4" />
          <SkeletonLine w="w-14" h="h-4" />
        </div>
      </SkeletonCard>
    ))}
  </div>
);

export const SkeletonGenericPage: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 p-6">
    <Shimmer className="w-20 h-20 !rounded-2xl" />
    <SkeletonLine w="w-40" h="h-6" />
    <SkeletonLine w="w-56" h="h-4" />
    <Shimmer className="w-48 h-10 !rounded-xl mt-4" />
  </div>
);

export const SkeletonOnboardingPage: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-6 bg-black">
    <Shimmer className="w-24 h-24 !rounded-2xl" />
    <SkeletonLine w="w-48" h="h-8" />
    <SkeletonLine w="w-64" h="h-4" />
    <SkeletonLine w="w-56" h="h-4" />
    <Shimmer className="w-48 h-12 !rounded-xl mt-6" />
  </div>
);
