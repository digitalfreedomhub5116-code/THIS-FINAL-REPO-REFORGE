import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hexagon, Sparkles } from 'lucide-react';
import { OUTFITS, BADGE_TIERS, OUTFIT_STONE_CONFIG, getStoneConfig, getOutfitXpBoost, getUnlockedBadgeCount, getBadgeFillProgress } from '../utils/gameData';
import { Outfit } from '../types';
import HexBadge from './HexBadge';
import CrystalIcon from './CrystalIcon';
import BadgeUnlockAnim from './BadgeUnlockAnim';

interface BadgesSectionProps {
  outfitStones: Record<string, number>;
  unlockedOutfits: string[];
  equippedOutfitId: string;
  outfits?: Outfit[];
}

const BadgesSection: React.FC<BadgesSectionProps> = ({
  outfitStones,
  unlockedOutfits,
  equippedOutfitId,
  outfits: propOutfits,
}) => {
  const outfits = (propOutfits && propOutfits.length > 0) ? propOutfits : OUTFITS;
  const [selectedOutfitId, setSelectedOutfitId] = useState(equippedOutfitId || outfits[0]?.id || 'outfit_starter');
  const [unlockAnim, setUnlockAnim] = useState<{ tierIndex: number; outfitId: string } | null>(null);

  const selectedOutfit = outfits.find(o => o.id === selectedOutfitId) || outfits[0];
  const stones = outfitStones[selectedOutfitId] || 0;
  const stoneConfig = getStoneConfig(selectedOutfitId);
  const totalBoost = getOutfitXpBoost(stones);
  const unlockedCount = getUnlockedBadgeCount(stones);
  const accent = selectedOutfit?.accentColor || stoneConfig.stoneColor;

  const handleOutfitSelect = useCallback((id: string) => {
    setSelectedOutfitId(id);
  }, []);

  return (
    <>
      {/* Unlock animation overlay */}
      <AnimatePresence>
        {unlockAnim && (
          <BadgeUnlockAnim
            tierIndex={unlockAnim.tierIndex}
            outfitId={unlockAnim.outfitId}
            onComplete={() => setUnlockAnim(null)}
          />
        )}
      </AnimatePresence>

      <div className="space-y-5">
        {/* ── SECTION HEADER ── */}
        <div className="flex items-center gap-3">
          <div className="text-[10px] font-mono font-bold tracking-[0.3em] uppercase text-gray-400">BADGES</div>
          <div className="flex-1 h-px bg-system-border" />
        </div>

        {/* ── OUTFIT SELECTOR ── */}
        <div
          className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {outfits.map(outfit => {
            const sc = getStoneConfig(outfit.id);
            const oStones = outfitStones[outfit.id] || 0;
            const oBadges = getUnlockedBadgeCount(oStones);
            const isSelected = outfit.id === selectedOutfitId;
            const oAccent = outfit.accentColor || sc.stoneColor;

            return (
              <motion.button
                key={outfit.id}
                onClick={() => handleOutfitSelect(outfit.id)}
                whileTap={{ scale: 0.93 }}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 rounded-xl py-2.5 px-3 relative overflow-hidden"
                style={{
                  scrollSnapAlign: 'start',
                  minWidth: 72,
                  background: isSelected
                    ? `linear-gradient(135deg, ${oAccent}20, ${oAccent}08)`
                    : 'rgba(10,10,18,0.6)',
                  border: isSelected
                    ? `1.5px solid ${oAccent}60`
                    : '1.5px solid rgba(255,255,255,0.06)',
                  boxShadow: isSelected ? `0 0 16px ${oAccent}25` : 'none',
                }}
              >
                {/* Outfit crystal icon */}
                <CrystalIcon
                  color={sc.stoneColor}
                  glow={sc.stoneGlow}
                  size={22}
                />

                {/* Outfit name abbreviated */}
                <span
                  className="text-[7px] font-black font-mono uppercase tracking-wider leading-none text-center"
                  style={{ color: isSelected ? oAccent : '#6b7280' }}
                >
                  {outfit.tier}
                </span>

                {/* Badge count dots */}
                <div className="flex gap-0.5">
                  {[0, 1, 2, 3].map(i => (
                    <div
                      key={i}
                      className="rounded-full"
                      style={{
                        width: 4,
                        height: 4,
                        background: i < oBadges ? oAccent : 'rgba(255,255,255,0.1)',
                        boxShadow: i < oBadges ? `0 0 4px ${oAccent}60` : 'none',
                      }}
                    />
                  ))}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* ── SELECTED OUTFIT INFO BAR ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedOutfitId}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl p-4 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, rgba(0,0,0,0.7), ${accent}08)`,
              border: `1px solid ${accent}20`,
            }}
          >
            {/* Glow bg */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent}10, transparent 60%)` }}
            />

            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CrystalIcon color={stoneConfig.stoneColor} glow={stoneConfig.stoneGlow} size={28} animate />
                <div>
                  <div className="text-xs font-black text-white uppercase tracking-tight">
                    {selectedOutfit?.name}
                  </div>
                  <div className="text-[9px] font-mono" style={{ color: `${accent}cc` }}>
                    {stoneConfig.stoneName} · {stones} collected
                  </div>
                </div>
              </div>

              {/* Total boost badge */}
              <div
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                style={{
                  background: totalBoost > 0 ? `${accent}15` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${totalBoost > 0 ? accent + '40' : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                <Sparkles size={11} style={{ color: totalBoost > 0 ? accent : '#4b5563' }} />
                <span
                  className="text-[10px] font-black font-mono"
                  style={{ color: totalBoost > 0 ? accent : '#4b5563' }}
                >
                  +{Math.round(totalBoost * 100)}% XP
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ── 2×2 BADGE GRID ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`badges-${selectedOutfitId}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 gap-4 justify-items-center"
          >
            {BADGE_TIERS.map((tier, idx) => {
              const isUnlocked = stones >= tier.stonesRequired;
              const fillPercent = getBadgeFillProgress(stones, idx);
              const prevThreshold = idx > 0 ? BADGE_TIERS[idx - 1].stonesRequired : 0;
              const progressStr = idx === 0
                ? 'FREE'
                : `${Math.min(stones, tier.stonesRequired)}/${tier.stonesRequired}`;

              return (
                <motion.div
                  key={tier.name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                >
                  <HexBadge
                    fillPercent={fillPercent}
                    tierIndex={idx}
                    isUnlocked={isUnlocked}
                    accentColor={accent}
                    name={tier.name}
                    size="large"
                    progressText={`${progressStr} ${idx === 0 ? '' : stoneConfig.stoneName.split(' ')[0] + 's'}`}
                  />

                  {/* XP boost label */}
                  {tier.xpBoost > 0 && (
                    <div className="text-center mt-1">
                      <span
                        className="text-[8px] font-mono font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: isUnlocked ? `${accent}15` : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${isUnlocked ? accent + '30' : 'rgba(255,255,255,0.06)'}`,
                          color: isUnlocked ? accent : '#374151',
                        }}
                      >
                        {tier.label}
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* ── STONE INVENTORY (all outfits) ── */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="text-[10px] font-mono font-bold tracking-[0.3em] uppercase text-gray-400">CRYSTAL INVENTORY</div>
            <div className="flex-1 h-px bg-system-border" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {OUTFIT_STONE_CONFIG.map(sc => {
              const count = outfitStones[sc.outfitId] || 0;
              const outfit = outfits.find(o => o.id === sc.outfitId);

              return (
                <motion.div
                  key={sc.outfitId}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-1.5 rounded-xl p-2.5 relative overflow-hidden"
                  style={{
                    background: `${sc.stoneColor}06`,
                    border: `1px solid ${sc.stoneColor}15`,
                  }}
                >
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: `radial-gradient(ellipse at 50% 0%, ${sc.stoneColor}08, transparent 70%)` }}
                  />
                  <CrystalIcon color={sc.stoneColor} glow={sc.stoneGlow} size={20} />
                  <span
                    className="font-mono font-black text-base leading-none"
                    style={{ color: count > 0 ? sc.stoneColor : '#374151' }}
                  >
                    {count}
                  </span>
                  <span className="text-[7px] font-mono uppercase tracking-wider text-gray-500 text-center leading-tight">
                    {sc.stoneName.replace(' Crystal', '')}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── HOW TO EARN ── */}
        <div
          className="rounded-xl p-3"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase text-gray-500 mb-2">
            HOW TO EARN CRYSTALS
          </div>
          <div className="space-y-1.5">
            {[
              { source: 'Quest Completion', amount: '1-3', icon: '⚔️' },
              { source: 'Workout Completion', amount: '2-5', icon: '💪' },
              { source: 'Dungeon Tower', amount: '3-8', icon: '🏰' },
              { source: 'Daily Login', amount: '5-30', icon: '📅' },
              { source: 'Chest Rewards', amount: '1-3', icon: '🎁' },
            ].map(s => (
              <div key={s.source} className="flex items-center gap-2">
                <span className="text-sm">{s.icon}</span>
                <span className="text-[10px] text-gray-400 font-mono flex-1">{s.source}</span>
                <span className="text-[9px] font-mono font-bold" style={{ color: accent }}>
                  {s.amount} crystals
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default BadgesSection;
