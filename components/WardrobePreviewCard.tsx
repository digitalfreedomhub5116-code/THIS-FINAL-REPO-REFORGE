import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, CheckCircle, Eye } from 'lucide-react';
import { OUTFITS, TIERS } from '../utils/gameData';
import { Outfit } from '../types';
import { AttackIcon, BoostIcon, ExtractIcon, UltimateIcon } from './StatIcons';
import OutfitPurchaseModal from './OutfitPurchaseModal';

interface WardrobePreviewCardProps {
  gold: number;
  unlockedOutfits: string[];
  equippedOutfitId: string;
  outfits?: Outfit[];
  onPurchase?: (outfit: Outfit) => void;
  onEquip: (id: string) => void;
  onOpenWardrobe: () => void;
}

// ── Vertical stat ring (sized to fit 4 in a column) ───────────────────────────
interface StatRingProps {
  value: number;
  max?: number;
  color: string;
  glowColor: string;
  icon: React.ReactNode;
  label: string;
  animKey: string;
}

const StatRing: React.FC<StatRingProps> = ({ value, max = 100, color, glowColor, icon, label, animKey }) => {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value / max));

  return (
    <div className="flex items-center gap-2.5" style={{ width: '100%' }}>
      {/* Ring */}
      <div className="relative flex-shrink-0" style={{ width: 42, height: 42 }}>
        <svg viewBox="0 0 42 42" className="w-full h-full -rotate-90">
          <circle cx="21" cy="21" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" />
          <motion.circle
            key={animKey}
            cx="21" cy="21" r={r}
            fill="none"
            stroke={color}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - pct * circ }}
            transition={{ duration: 1.0, ease: 'easeOut', delay: 0.1 }}
            style={{ filter: `drop-shadow(0 0 4px ${glowColor})` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {icon}
        </div>
      </div>
      {/* Label + value beside the ring */}
      <div className="flex flex-col" style={{ minWidth: 0 }}>
        <span className="text-[8px] font-black tracking-widest uppercase leading-none" style={{ color }}>{label}</span>
        <span className="text-[11px] font-mono text-white font-bold leading-tight mt-0.5">{value}</span>
      </div>
    </div>
  );
};

// ── 9:16 portrait outfit card ─────────────────────────────────────────────────
const CARD_W = 58;
const CARD_H = Math.round(CARD_W * 16 / 9); // 103px

const OutfitCard: React.FC<{
  outfit: Outfit;
  isActive: boolean;
  isUnlocked: boolean;
  isEquipped: boolean;
  onClick: () => void;
}> = ({ outfit, isActive, isUnlocked, isEquipped, onClick }) => {
  const accent = outfit.accentColor || '#9ca3af';
  const [imgError, setImgError] = useState(false);
  const hasImage = !!outfit.image && !imgError;

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.93 }}
      className="flex-shrink-0 relative rounded-xl overflow-hidden"
      style={{
        width: CARD_W,
        height: CARD_H,
        border: isActive ? `2px solid ${accent}` : '2px solid rgba(255,255,255,0.08)',
        boxShadow: isActive ? `0 0 18px ${accent}66` : 'none',
        background: `radial-gradient(ellipse at 50% 30%, ${accent}14 0%, rgba(6,6,18,0.96) 70%)`,
        scrollSnapAlign: 'start',
        transition: 'box-shadow 0.2s ease',
      }}
    >
      {/* Character image — shown when image_url is set */}
      {hasImage && (
        <img
          src={outfit.image}
          alt={outfit.name}
          className="absolute inset-0 w-full h-full"
          style={{
            objectFit: 'cover',
            objectPosition: 'top center',
            opacity: isUnlocked ? 0.9 : 0.25,
          }}
          onError={() => setImgError(true)}
        />
      )}

      {/* Fallback: tier letter when no image */}
      {!hasImage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-black"
            style={{
              fontSize: 28,
              color: accent,
              textShadow: `0 0 20px ${accent}80`,
              letterSpacing: '-0.02em',
            }}
          >
            {outfit.tier}
          </span>
        </div>
      )}

      {/* Bottom gradient */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ height: '55%', background: 'linear-gradient(to top, rgba(4,4,14,0.95) 0%, transparent 100%)' }}
      />

      {/* Lock overlay */}
      {!isUnlocked && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          >
            <Lock size={11} className="text-gray-300" />
          </div>
        </div>
      )}

      {/* Equipped badge */}
      {isEquipped && (
        <div
          className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
        >
          <CheckCircle size={9} color="#000" />
        </div>
      )}

      {/* Active ring */}
      {isActive && (
        <motion.div
          layoutId="wpActiveBorder"
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ border: `2px solid ${accent}` }}
        />
      )}

      {/* Name + cost */}
      <div className="absolute bottom-0 inset-x-0 px-1.5 pb-1.5">
        <div className="text-[6px] font-black text-white truncate leading-tight">{outfit.name}</div>
        <div className="text-[5.5px] font-mono" style={{ color: accent + 'cc' }}>
          {outfit.cost === 0 ? 'FREE' : `${outfit.cost.toLocaleString()}G`}
        </div>
      </div>
    </motion.button>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const WardrobePreviewCard: React.FC<WardrobePreviewCardProps> = ({
  gold,
  unlockedOutfits = [],
  equippedOutfitId,
  outfits: propOutfits,
  onPurchase,
  onEquip,
  onOpenWardrobe: _onOpenWardrobe,
}) => {
  const outfits = (propOutfits && propOutfits.length > 0) ? propOutfits : OUTFITS;

  const [activeIndex, setActiveIndex] = useState(() => {
    const idx = outfits.findIndex(o => o.id === equippedOutfitId);
    return idx >= 0 ? idx : 0;
  });

  const selectorRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLVideoElement>(null);
  const loopRef = useRef<HTMLVideoElement>(null);
  const [videoPhase, setVideoPhase] = useState<'intro' | 'loop' | 'image'>('image');

  const outfit = outfits[Math.min(activeIndex, outfits.length - 1)];
  const isUnlocked = unlockedOutfits.includes(outfit.id);
  const isEquipped = equippedOutfitId === outfit.id;
  const accent = outfit.accentColor || '#9ca3af';

  const attackVal = Math.min(100, outfit.baseStats.attack);
  const boostVal = Math.min(100, outfit.baseStats.boost);
  const extractVal = Math.min(100, outfit.baseStats.extraction);
  const ultimateVal = Math.min(100, outfit.baseStats.ultimate);

  const hasVideo = !!(outfit.introVideoUrl || outfit.loopVideoUrl);

  const startLoop = useCallback(() => {
    const loop = loopRef.current;
    if (!loop) return;
    if (outfit.loopVideoUrl) {
      loop.src = outfit.loopVideoUrl;
      loop.load();
      loop.loop = true;
      setVideoPhase('loop');
      loop.play().catch(() => setVideoPhase('image'));
    } else {
      setVideoPhase('image');
    }
  }, [outfit]);

  const startVideoSequence = useCallback(() => {
    if (!hasVideo) { setVideoPhase('image'); return; }
    const intro = introRef.current;
    const loop = loopRef.current;
    if (!intro || !loop) return;
    loop.pause();
    loop.currentTime = 0;
    if (outfit.introVideoUrl) {
      intro.src = outfit.introVideoUrl;
      intro.load();
      setVideoPhase('intro');
      intro.play().catch(() => startLoop());
    } else if (outfit.loopVideoUrl) {
      startLoop();
    }
  }, [outfit, hasVideo, startLoop]);

  useEffect(() => { startVideoSequence(); }, [activeIndex]);

  useEffect(() => {
    const intro = introRef.current;
    if (!intro) return;
    const ended = () => startLoop();
    const error = () => startLoop();
    intro.addEventListener('ended', ended);
    intro.addEventListener('error', error);
    return () => {
      intro.removeEventListener('ended', ended);
      intro.removeEventListener('error', error);
    };
  }, [startLoop]);

  const selectOutfit = (idx: number) => {
    if (idx === activeIndex) return;
    setActiveIndex(idx);
    setTimeout(() => {
      const btn = selectorRef.current?.children[idx] as HTMLElement;
      btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, 50);
  };

  useEffect(() => {
    const btn = selectorRef.current?.children[activeIndex] as HTMLElement;
    btn?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, []);

  const [showModal, setShowModal] = useState(false);

  const statAnimKey = `${outfit.id}-stats`;

  const handleCTA = () => {
    if (isEquipped) return;
    if (isUnlocked) { onEquip(outfit.id); return; }
    setShowModal(true);
  };

  // Total left-panel height for 4 rings: 4 × 42px + 3 × 14px gap = 210px → center in 360px
  return (
    <>
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background: '#0A0A0F',
        border: `1.5px solid ${accent}22`,
        boxShadow: `0 0 48px ${accent}14, 0 8px 32px rgba(0,0,0,0.85)`,
        transition: 'border-color 0.5s ease, box-shadow 0.5s ease',
      }}
    >
      {/* ── HEADER ── */}
      <div className="px-4 pt-3 pb-2">
        <div className="text-[7.5px] font-mono tracking-[0.3em] uppercase" style={{ color: accent + 'aa' }}>// System Store</div>
        <h2 className="text-[14px] font-black uppercase tracking-tight text-white leading-none mt-0.5">
          Monarch's Wardrobe
        </h2>
      </div>

      {/* ── MAIN 40/60 SPLIT — no visible divider ── */}
      <div className="flex" style={{ height: 360 }}>

        {/* LEFT 40% — 4 stat rings in a vertical column */}
        <div
          className="flex flex-col justify-center gap-3.5 py-4 px-3"
          style={{ width: '40%' }}
        >
          <StatRing
            animKey={`${statAnimKey}-atk`}
            value={attackVal}
            color="#935251"
            glowColor="#93525170"
            icon={<AttackIcon size={15} color="#935251" />}
            label="ATTACK"
          />
          <StatRing
            animKey={`${statAnimKey}-bst`}
            value={boostVal}
            color="#7F61A4"
            glowColor="#7F61A470"
            icon={<BoostIcon size={15} color="#7F61A4" />}
            label="BOOST"
          />
          <StatRing
            animKey={`${statAnimKey}-ext`}
            value={extractVal}
            color="#595F9C"
            glowColor="#595F9C70"
            icon={<ExtractIcon size={15} color="#595F9C" />}
            label="EXTRACT"
          />
          <StatRing
            animKey={`${statAnimKey}-ult`}
            value={ultimateVal}
            color="#9F8232"
            glowColor="#9F823270"
            icon={<UltimateIcon size={15} color="#9F8232" />}
            label="ULTIMATE"
          />

          {/* Outfit name + tier below rings, inside left panel */}
          <div className="mt-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={`info-${outfit.id}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.18 }}
              >
                <div
                  className="text-[7px] font-black tracking-[0.15em] px-1.5 py-0.5 rounded-full uppercase inline-block mb-1"
                  style={{ background: `${accent}1a`, border: `1px solid ${accent}40`, color: accent }}
                >
                  TIER {outfit.tier}
                </div>
                <div className="text-[9px] font-black uppercase tracking-tight text-white leading-tight">
                  {outfit.name}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* RIGHT 60% — video / image, no visible left border */}
        <div
          className="relative overflow-hidden"
          style={{ width: '60%', height: 360 }}
        >
          {/* Ambient fallback */}
          <AnimatePresence>
            {(!hasVideo || videoPhase === 'image') && (
              <motion.div
                key="fallback-img"
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(ellipse at 50% 55%, ${accent}30 0%, transparent 65%), #0A0A0F`,
                  }}
                />
                {outfit.image && (
                  <img
                    src={outfit.image}
                    alt={outfit.name}
                    className="absolute inset-0 w-full h-full"
                    style={{
                      objectFit: 'cover',
                      objectPosition: 'top center',
                      opacity: isUnlocked ? 0.92 : 0.28,
                      filter: isUnlocked ? 'saturate(1.1)' : 'grayscale(0.85) brightness(0.35)',
                    }}
                  />
                )}
                {isUnlocked && [0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 rounded-full pointer-events-none"
                    style={{ background: accent, left: `${15 + i * 28}%`, bottom: `${24 + (i % 2) * 18}%`, boxShadow: `0 0 7px ${accent}` }}
                    animate={{ y: [-4, -20, -4], opacity: [0.7, 0.1, 0.7] }}
                    transition={{ duration: 2.5 + i * 0.6, repeat: Infinity, delay: i * 0.5 }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Intro video */}
          <video
            ref={introRef}
            muted
            playsInline
            poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
            className="absolute inset-0 w-full h-full bg-transparent"
            style={{ objectFit: 'cover', objectPosition: 'center top', display: videoPhase === 'intro' ? 'block' : 'none' }}
          />

          {/* Loop video */}
          <video
            ref={loopRef}
            muted
            playsInline
            loop
            poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
            className="absolute inset-0 w-full h-full bg-transparent"
            style={{ objectFit: 'cover', objectPosition: 'center top', display: videoPhase === 'loop' ? 'block' : 'none' }}
          />

          {/* LEFT fade */}
          <div
            className="absolute inset-y-0 left-0 pointer-events-none"
            style={{
              width: 64,
              background: 'linear-gradient(to right, #0A0A0F 0%, rgba(10,10,15,0.75) 45%, transparent 100%)',
            }}
          />

          {/* RIGHT fade */}
          <div
            className="absolute inset-y-0 right-0 pointer-events-none"
            style={{
              width: 48,
              background: 'linear-gradient(to left, #0A0A0F 0%, rgba(10,10,15,0.75) 45%, transparent 100%)',
            }}
          />

          {/* TOP fade */}
          <div
            className="absolute inset-x-0 top-0 pointer-events-none"
            style={{
              height: '22%',
              background: 'linear-gradient(to bottom, rgba(10,10,15,0.95) 0%, rgba(10,10,15,0.4) 55%, transparent 100%)',
            }}
          />

          {/* BOTTOM fade */}
          <div
            className="absolute inset-x-0 bottom-0 pointer-events-none"
            style={{
              height: '42%',
              background: 'linear-gradient(to top, #0A0A0F 0%, rgba(10,10,15,0.5) 50%, transparent 100%)',
            }}
          />

          {/* Corner vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 35%, rgba(10,10,15,0.45) 80%, rgba(10,10,15,0.75) 100%)',
            }}
          />
        </div>
      </div>

      {/* ── OUTFIT SELECTOR RAIL ── */}
      <div className="px-4 mt-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[7px] font-mono tracking-[0.25em] uppercase" style={{ color: 'rgba(255,255,255,0.28)' }}>Select Gear</span>
          <span className="text-[7px] font-mono text-gray-600">{activeIndex + 1} / {outfits.length}</span>
        </div>
        <div
          ref={selectorRef}
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {outfits.map((o, i) => (
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

      {/* ── CTA BUTTON ── */}
      <div className="px-4 py-3">
        <AnimatePresence mode="wait">
          <motion.button
            key={`cta-${outfit.id}-${isEquipped}-${isUnlocked}`}
            onClick={handleCTA}
            disabled={isEquipped}
            whileTap={!isEquipped ? { scale: 0.97 } : undefined}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="w-full py-3 rounded-2xl font-black uppercase tracking-widest text-[12px] flex items-center justify-center gap-2"
            style={
              isEquipped
                ? { background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.09)', color: '#6b7280', cursor: 'default' }
                : isUnlocked
                ? { background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, boxShadow: `0 4px 20px ${accent}50`, color: '#000' }
                : { background: 'linear-gradient(135deg, #facc15cc, #eab308)', boxShadow: '0 4px 18px rgba(234,179,8,0.32)', color: '#000' }
            }
          >
            {isEquipped ? (
              <><CheckCircle size={13} /> EQUIPPED</>
            ) : isUnlocked ? (
              <><CheckCircle size={13} /> EQUIP GEAR</>
            ) : (
              <><Eye size={13} /> VIEW</>
            )}
          </motion.button>
        </AnimatePresence>
      </div>
    </div>

    {/* ── Purchase modal ── */}
    {showModal && (
      <OutfitPurchaseModal
        outfit={outfit}
        gold={gold}
        isUnlocked={isUnlocked}
        onPurchase={(o) => { onPurchase?.(o); }}
        onEquip={onEquip}
        onClose={() => setShowModal(false)}
      />
    )}
    </>
  );
};

export default WardrobePreviewCard;
