import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Zap, Ghost, Sword, Coins, CheckCircle } from 'lucide-react';
import { OUTFITS, TIERS } from '../utils/gameData';
import { Outfit } from '../types';

interface ArmoryViewProps {
  gold: number;
  unlockedOutfits: string[];
  equippedOutfitId: string;
  onPurchase?: (outfit: Outfit) => void;
  onEquip: (id: string) => void;
}

// ── Circular stat ring ──────────────────────────────────────────────────────
const StatRing: React.FC<{
  value: number;
  cap: number;
  color: string;
  glowColor: string;
  icon: React.ReactNode;
  label: string;
  animKey: string;
}> = ({ value, cap, color, glowColor, icon, label, animKey }) => {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, value / cap);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-[68px] h-[68px]">
        <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
          <motion.circle
            key={animKey}
            cx="32" cy="32" r={r}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - pct * circ }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 }}
            style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <span className="text-[9px] font-mono text-gray-400 tracking-widest uppercase">{label}</span>
    </div>
  );
};

// ── Outfit selector card ────────────────────────────────────────────────────
const OutfitCard: React.FC<{
  outfit: Outfit;
  isActive: boolean;
  isUnlocked: boolean;
  isEquipped: boolean;
  onClick: () => void;
}> = ({ outfit, isActive, isUnlocked, isEquipped, onClick }) => {
  const tier = TIERS[outfit.tier];
  const accent = outfit.accentColor || '#9ca3af';

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      className="flex-shrink-0 relative rounded-2xl overflow-hidden transition-all"
      style={{
        width: 90,
        height: 110,
        border: isActive
          ? `2px solid ${accent}`
          : '2px solid rgba(255,255,255,0.08)',
        boxShadow: isActive
          ? `0 0 18px ${accent}55, 0 4px 20px rgba(0,0,0,0.6)`
          : '0 4px 16px rgba(0,0,0,0.4)',
        background: 'rgba(8,8,20,0.9)',
      }}
    >
      <img
        src={outfit.image}
        alt={outfit.name}
        className="w-full h-full object-cover"
        style={{ opacity: isUnlocked ? 0.85 : 0.3 }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      {!isUnlocked && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Lock size={16} className="text-gray-500" />
        </div>
      )}

      {isEquipped && (
        <div
          className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ background: accent }}
        >
          <CheckCircle size={10} color="#000" />
        </div>
      )}

      <div className="absolute bottom-0 inset-x-0 p-1.5">
        <div className="text-[8px] font-black text-white leading-tight truncate">{outfit.name}</div>
        <div className={`text-[7px] font-mono ${tier.color}`}>
          {outfit.cost === 0 ? 'FREE' : `${outfit.cost.toLocaleString()}G`}
        </div>
      </div>

      {isActive && (
        <motion.div
          layoutId="activeOutfitBorder"
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ border: `2px solid ${accent}` }}
        />
      )}
    </motion.button>
  );
};

// ── Speed-lines flash on entry ──────────────────────────────────────────────
const EntryFlash: React.FC<{ color: string }> = ({ color }) => (
  <motion.div
    className="absolute inset-0 pointer-events-none z-20"
    initial={{ opacity: 0.6 }}
    animate={{ opacity: 0 }}
    transition={{ duration: 0.45, ease: 'easeOut' }}
    style={{
      background: `radial-gradient(ellipse at 50% 60%, ${color}30 0%, transparent 70%)`,
    }}
  />
);

// ── Main Armory View ─────────────────────────────────────────────────────────
const ArmoryView: React.FC<ArmoryViewProps> = ({
  gold,
  unlockedOutfits = [],
  equippedOutfitId,
  onPurchase,
  onEquip,
}) => {
  const [activeIndex, setActiveIndex] = useState(() => {
    const idx = OUTFITS.findIndex(o => o.id === equippedOutfitId);
    return idx >= 0 ? idx : 0;
  });
  const [direction, setDirection] = useState(1);
  const [flashKey, setFlashKey] = useState(0);
  const selectorRef = useRef<HTMLDivElement>(null);

  const outfit = OUTFITS[activeIndex];
  const isUnlocked = unlockedOutfits.includes(outfit.id);
  const isEquipped = equippedOutfitId === outfit.id;
  const canAfford = gold >= outfit.cost;
  const accent = outfit.accentColor || '#9ca3af';
  const tierInfo = TIERS[outfit.tier];

  const selectOutfit = (newIndex: number) => {
    if (newIndex === activeIndex) return;
    setDirection(newIndex > activeIndex ? 1 : -1);
    setActiveIndex(newIndex);
    setFlashKey(k => k + 1);
    // scroll the selector rail
    setTimeout(() => {
      const btn = selectorRef.current?.children[newIndex] as HTMLElement;
      btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, 50);
  };

  // Scroll active card into view on mount
  useEffect(() => {
    const btn = selectorRef.current?.children[activeIndex] as HTMLElement;
    btn?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, []);

  const statAnimKey = `${outfit.id}`;

  // Character showcase animation variants
  const variants = {
    enter: (dir: number) => ({
      x: dir * 80,
      y: 24,
      opacity: 0,
      scale: 0.92,
    }),
    center: {
      x: 0,
      y: 0,
      opacity: 1,
      scale: 1,
      transition: { type: 'spring' as const, stiffness: 260, damping: 26 },
    },
    exit: (dir: number) => ({
      x: -dir * 50,
      y: -16,
      opacity: 0,
      scale: 1.04,
      transition: { duration: 0.18, ease: 'easeIn' as const },
    }),
  };

  const ctaLabel = () => {
    if (isEquipped) return 'EQUIPPED';
    if (isUnlocked) return 'EQUIP GEAR';
    if (!canAfford) return `NEED ${(outfit.cost - gold).toLocaleString()} MORE GOLD`;
    return `UNLOCK — ${outfit.cost.toLocaleString()} G`;
  };

  const handleCTA = () => {
    if (isEquipped) return;
    if (isUnlocked) { onEquip(outfit.id); return; }
    if (canAfford && onPurchase) onPurchase(outfit);
  };

  return (
    <div className="min-h-screen text-white flex flex-col bg-transparent pb-32 overflow-x-hidden">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <div className="text-[9px] font-mono text-gray-500 tracking-[0.3em] uppercase">// System Store</div>
          <h1 className="text-lg font-black uppercase tracking-tight text-white leading-none">
            Monarch's Wardrobe
          </h1>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
          style={{ background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)' }}
        >
          <Coins size={13} className="text-yellow-400" />
          <span className="text-yellow-400 font-black font-mono text-sm">{gold.toLocaleString()}</span>
        </div>
      </div>

      {/* ── CHARACTER SHOWCASE ── */}
      <div
        className="relative mx-4 rounded-3xl overflow-hidden"
        style={{
          height: '46vh',
          border: `1.5px solid ${accent}33`,
          boxShadow: `0 0 40px ${accent}18, 0 8px 32px rgba(0,0,0,0.6)`,
        }}
      >
        {/* Ambient background glow */}
        <motion.div
          key={`bg-${outfit.id}`}
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{
            background: `radial-gradient(ellipse at 50% 80%, ${accent}22 0%, transparent 65%), linear-gradient(180deg, #050510 0%, #080818 100%)`,
          }}
        />

        {/* Entry flash */}
        <AnimatePresence>
          <EntryFlash key={`flash-${flashKey}`} color={accent} />
        </AnimatePresence>

        {/* Character image */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={outfit.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0"
          >
            <img
              src={outfit.image}
              alt={outfit.name}
              className="w-full h-full object-cover"
              style={{
                opacity: isUnlocked ? 0.9 : 0.4,
                filter: isUnlocked
                  ? `brightness(1.05) saturate(1.1)`
                  : 'grayscale(0.8) brightness(0.5)',
              }}
            />

            {/* Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />

            {/* Locked overlay */}
            {!isUnlocked && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.6)', border: `2px solid ${accent}60` }}
                >
                  <Lock size={24} style={{ color: accent }} />
                </motion.div>
                <div className="text-[10px] font-mono text-gray-400 tracking-widest uppercase">
                  {outfit.cost.toLocaleString()} GOLD TO UNLOCK
                </div>
              </div>
            )}

            {/* Mana particle dots */}
            {isUnlocked && [0, 1, 2, 3, 4].map(i => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full pointer-events-none"
                style={{
                  background: accent,
                  left: `${20 + i * 15}%`,
                  bottom: `${15 + (i % 3) * 12}%`,
                  boxShadow: `0 0 6px ${accent}`,
                }}
                animate={{ y: [-4, -18, -4], opacity: [0.7, 0.2, 0.7] }}
                transition={{ duration: 2 + i * 0.4, repeat: Infinity, delay: i * 0.3 }}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Bottom info overlay */}
        <div className="absolute bottom-0 inset-x-0 px-5 py-4 z-10">
          <div className="flex items-end justify-between">
            <div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`name-${outfit.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                >
                  <h2 className="text-xl font-black uppercase tracking-tight text-white drop-shadow-lg leading-none">
                    {outfit.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full uppercase"
                      style={{
                        background: `${accent}25`,
                        border: `1px solid ${accent}60`,
                        color: accent,
                      }}
                    >
                      TIER {outfit.tier}
                    </span>
                    {isEquipped && (
                      <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full uppercase bg-white/10 border border-white/20 text-white">
                        EQUIPPED
                      </span>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Buff tags */}
            {outfit.buffs && outfit.buffs.length > 0 && (
              <div className="flex flex-col items-end gap-1">
                {outfit.buffs.map((buff, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 + 0.2 }}
                    className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{
                      background: `${buff.color}20`,
                      border: `1px solid ${buff.color}50`,
                      color: buff.color,
                    }}
                  >
                    ⚡ {buff.label}
                  </motion.span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── STAT RINGS ── */}
      <div
        className="mx-4 mt-4 rounded-2xl px-5 py-4"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(6,6,18,0.88) 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-1.5 mb-4">
          <Zap size={12} className="text-system-neon" />
          <span className="text-[9px] font-mono text-gray-400 tracking-[0.25em] uppercase">Combat Stats</span>
          <span className={`ml-auto text-[9px] font-mono ${tierInfo.color}`}>
            CAP {TIERS[outfit.tier].statCap.toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <StatRing
            animKey={`${statAnimKey}-atk`}
            value={outfit.baseStats.attack}
            cap={TIERS[outfit.tier].statCap}
            color="#f87171"
            glowColor="#f8717180"
            icon={<Sword size={16} className="text-red-400" />}
            label="Attack"
          />
          <StatRing
            animKey={`${statAnimKey}-bst`}
            value={outfit.baseStats.boost}
            cap={TIERS[outfit.tier].statCap}
            color="#4ade80"
            glowColor="#4ade8080"
            icon={<Coins size={16} className="text-green-400" />}
            label="Boost"
          />
          <StatRing
            animKey={`${statAnimKey}-ext`}
            value={outfit.baseStats.extraction}
            cap={TIERS[outfit.tier].statCap}
            color="#c084fc"
            glowColor="#c084fc80"
            icon={<Ghost size={16} className="text-purple-400" />}
            label="Extract"
          />
          <StatRing
            animKey={`${statAnimKey}-ult`}
            value={outfit.baseStats.ultimate}
            cap={TIERS[outfit.tier].statCap}
            color="#60a5fa"
            glowColor="#60a5fa80"
            icon={<Zap size={16} className="text-blue-400" />}
            label="Ultimate"
          />
        </div>

        {/* Flavor description */}
        <p className="text-[10px] text-gray-500 font-mono mt-4 text-center leading-relaxed">
          {outfit.description}
        </p>
      </div>

      {/* ── OUTFIT SELECTOR RAIL ── */}
      <div className="mt-5 px-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[9px] font-mono text-gray-500 tracking-[0.25em] uppercase">Select Outfit</span>
          <span className="text-[9px] font-mono text-gray-600">
            {activeIndex + 1} / {OUTFITS.length}
          </span>
        </div>

        <div
          ref={selectorRef}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {OUTFITS.map((o, i) => (
            <OutfitCard
              key={o.id}
              outfit={o}
              isActive={i === activeIndex}
              isUnlocked={unlockedOutfits.includes(o.id)}
              isEquipped={o.id === equippedOutfitId}
              onClick={() => selectOutfit(i)}
            />
          ))}
        </div>
      </div>

      {/* ── STICKY CTA ── */}
      <div className="fixed bottom-[72px] inset-x-0 px-4 z-30 pointer-events-none">
        <motion.div
          key={`cta-${outfit.id}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-auto"
        >
          <button
            onClick={handleCTA}
            disabled={isEquipped || (!isUnlocked && !canAfford)}
            className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={
              isEquipped
                ? {
                    background: 'rgba(255,255,255,0.06)',
                    border: '1.5px solid rgba(255,255,255,0.12)',
                    color: '#6b7280',
                    cursor: 'default',
                  }
                : isUnlocked
                ? {
                    background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                    boxShadow: `0 4px 24px ${accent}55`,
                    color: '#000',
                  }
                : canAfford
                ? {
                    background: 'linear-gradient(135deg, #facc15, #eab308)',
                    boxShadow: '0 4px 24px rgba(234,179,8,0.4)',
                    color: '#000',
                  }
                : {
                    background: 'rgba(255,255,255,0.04)',
                    border: '1.5px solid rgba(255,255,255,0.08)',
                    color: '#4b5563',
                    cursor: 'not-allowed',
                  }
            }
          >
            {isEquipped ? (
              <><CheckCircle size={16} /> EQUIPPED</>
            ) : isUnlocked ? (
              <><CheckCircle size={16} /> EQUIP GEAR</>
            ) : canAfford ? (
              <><Coins size={16} /> {ctaLabel()}</>
            ) : (
              <><Lock size={16} /> {ctaLabel()}</>
            )}
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default ArmoryView;
