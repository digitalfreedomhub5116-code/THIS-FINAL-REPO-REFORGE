import React from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { PlayerData, Outfit, HistoryEntry } from '../types';
import ForgeGuardWidget from './ForgeGuardWidget';

interface PlayerStatusCardProps {
  player: PlayerData;
  equippedOutfit?: Outfit | null;
  mentorMessages: { id: string; text: string }[];
  onDismissMentorMessage: (id: string) => void;
  history: HistoryEntry[];
  onOpenDuskChat: () => void;
}

const PlayerStatusCard: React.FC<PlayerStatusCardProps> = ({
  player,
}) => {
  const mana = player.mp ?? 100;
  const maxMana = player.maxMp ?? 100;
  const pct = maxMana > 0 ? (mana / maxMana) * 100 : 0;
  const manaColor = pct > 75 ? '#7EB8D4' : pct > 50 ? '#eab308' : pct > 10 ? '#f97316' : '#ef4444';
  const manaGlow = pct > 75 ? 'rgba(126,184,212,0.3)' : pct > 50 ? 'rgba(234,179,8,0.25)' : pct > 10 ? 'rgba(249,115,22,0.25)' : 'rgba(239,68,68,0.4)';

  return (
    <div
      className="w-full rounded-2xl overflow-hidden border border-white/[0.06] bg-[#0A0A0F]"
      style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}
    >
      {/* --- SYSTEM MANA BAR --- */}
      <div className="w-full px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center w-5 h-5 rounded"
              style={{ background: `${manaColor}15`, border: `1px solid ${manaColor}30` }}
            >
              <Zap size={10} style={{ color: manaColor }} />
            </div>
            <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">SYSTEM MANA</span>
          </div>
          <span className="text-[11px] font-black font-mono" style={{ color: manaColor }}>
            {Math.floor(mana)} / {maxMana}
          </span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{
              background: manaColor,
              boxShadow: `0 0 8px ${manaGlow}`,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        {pct <= 10 && pct > 0 && (
          <motion.span
            className="text-[7px] font-mono font-bold mt-1 block text-center"
            style={{ color: '#ef4444' }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            MANA CRITICALLY LOW
          </motion.span>
        )}
        {pct <= 0 && (
          <span className="text-[7px] font-mono font-bold mt-1 block text-center text-red-500">
            MANA DEPLETED — AI FEATURES LOCKED
          </span>
        )}
      </div>

      {/* --- FORGEGUARD INTEGRITY --- */}
      <div className="w-full py-2.5 px-4 border-t border-white/[0.04]">
        <ForgeGuardWidget
          cheatStrikes={player.cheatStrikes ?? 0}
          totalStrikesEver={player.totalStrikesEver}
        />
      </div>
    </div>
  );
};

export default PlayerStatusCard;
