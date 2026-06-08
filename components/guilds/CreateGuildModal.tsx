import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Lock } from 'lucide-react';
import { NEON, glassPanel, GUILD_ICONS, BANNER_GRADIENTS, bannerStyle } from './guildTheme';
import { createGuild } from '../../lib/guildApi';
import type { Guild } from '../../types';

interface CreateGuildModalProps {
  isPremium: boolean;
  onUpgradePro: () => void;
  onClose: () => void;
  onCreated: (guild: Guild) => void;
}

const CreateGuildModal: React.FC<CreateGuildModalProps> = ({ isPremium, onUpgradePro, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [motto, setMotto] = useState('');
  const [icon, setIcon] = useState(GUILD_ICONS[0]);
  const [banner, setBanner] = useState('gradient-cyan');
  const [privacy, setPrivacy] = useState<'open' | 'invite_only'>('open');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (name.trim().length < 3) {
      setError('Name must be at least 3 characters');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { guild } = await createGuild({ name: name.trim(), tag: tag.trim(), motto: motto.trim(), icon, banner, privacy });
      onCreated(guild);
    } catch (e: any) {
      setError(e?.message || 'Failed to create guild');
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto"
        style={glassPanel}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-bold text-white">Forge a Guild</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        {!isPremium ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-4" style={{ background: 'rgba(251,191,36,0.12)' }}>
              <Lock size={26} className="text-amber-400" />
            </div>
            <p className="text-white font-semibold mb-1">Creating a guild is a Pro feature</p>
            <p className="text-gray-400 text-sm mb-5">Free hunters can join any open guild. Upgrade to lead your own.</p>
            <button
              onClick={onUpgradePro}
              className="px-6 py-3 rounded-xl font-bold text-black"
              style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
            >
              Upgrade to Pro
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Banner preview */}
            <div className="h-20 rounded-2xl flex items-center justify-center relative overflow-hidden" style={bannerStyle(banner)}>
              <span className="text-4xl drop-shadow-lg">{icon}</span>
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400">Guild Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                placeholder="Shadow Monarchs"
                className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex gap-3">
              <div className="w-24">
                <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400">Tag</label>
                <input
                  value={tag}
                  onChange={(e) => setTag(e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="SHDW"
                  className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div className="flex-1">
                <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400">Motto</label>
                <input
                  value={motto}
                  onChange={(e) => setMotto(e.target.value)}
                  maxLength={120}
                  placeholder="Embrace the dark"
                  className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400">Icon</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {GUILD_ICONS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setIcon(g)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-lg transition"
                    style={{ background: icon === g ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.05)', border: icon === g ? `1px solid ${NEON}` : '1px solid transparent' }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400">Banner</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {Object.keys(BANNER_GRADIENTS).map((b) => (
                  <button
                    key={b}
                    onClick={() => setBanner(b)}
                    className="w-12 h-8 rounded-lg transition"
                    style={{ background: BANNER_GRADIENTS[b], outline: banner === b ? `2px solid ${NEON}` : 'none', outlineOffset: 2 }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400">Privacy</label>
              <div className="flex gap-2 mt-1">
                {(['open', 'invite_only'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPrivacy(p)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition"
                    style={{ background: privacy === p ? 'rgba(0,212,255,0.18)' : 'rgba(255,255,255,0.05)', border: privacy === p ? `1px solid ${NEON}` : '1px solid transparent', color: privacy === p ? NEON : '#94a3b8' }}
                  >
                    {p === 'open' ? 'Open' : 'Invite Only'}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              onClick={submit}
              disabled={busy}
              className="w-full py-3 rounded-xl font-bold text-black disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${NEON}, #6d28d9)` }}
            >
              {busy ? 'Forging…' : 'Create Guild'}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default CreateGuildModal;
