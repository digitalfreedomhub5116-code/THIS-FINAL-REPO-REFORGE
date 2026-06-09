import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Check, ArrowLeft, ArrowRight, Coins, AlertTriangle, Loader2 } from 'lucide-react';
import { NEON, glassPanel, GUILD_ICON_CATALOG, GUILD_ICON_BY_KEY, GUILD_CREATE_COST } from './guildTheme';
import { createGuild, checkGuildName, purchaseGuildIcon, type CreateGuildError } from '../../lib/guildApi';
import type { Guild } from '../../types';

interface CreateGuildModalProps {
  playerGold: number;
  unlockedIcons?: string[];
  userId?: string;
  onGoldChange: (gold: number) => void;
  onClose: () => void;
  onCreated: (guild: Guild, newGold: number) => void;
  onToast?: (type: 'SUCCESS' | 'WARNING' | 'ERROR', title: string, msg?: string) => void;
}

type Step = 1 | 2 | 3 | 4 | 'review';
type NameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const INPUT_BG = '#1a1a1a';

const CreateGuildModal: React.FC<CreateGuildModalProps> = ({ playerGold, unlockedIcons = [], onGoldChange, onClose, onCreated, onToast }) => {
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [motto, setMotto] = useState('');
  const [iconKey, setIconKey] = useState('shield');
  const [privacy, setPrivacy] = useState<'open' | 'invite_only'>('open');

  const [nameStatus, setNameStatus] = useState<NameStatus>('idle');
  const [nameError, setNameError] = useState('');

  const [gold, setGold] = useState(playerGold);
  const [unlocked, setUnlocked] = useState<string[]>(unlockedIcons);

  const [purchaseConfirm, setPurchaseConfirm] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const [creating, setCreating] = useState(false);
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => { setGold(playerGold); }, [playerGold]);
  useEffect(() => { setUnlocked(unlockedIcons); }, [unlockedIcons]);

  // ── Debounced real-time name uniqueness check ──
  useEffect(() => {
    const trimmed = name.trim();
    if (trimmed.length === 0) { setNameStatus('idle'); setNameError(''); return; }
    if (trimmed.length < 3) { setNameStatus('invalid'); setNameError('Min 3 characters'); return; }
    if (trimmed.length > 30) { setNameStatus('invalid'); setNameError('Max 30 characters'); return; }
    if (!/^[A-Za-z0-9 _-]+$/.test(trimmed)) { setNameStatus('invalid'); setNameError('Letters, numbers, spaces, - and _ only'); return; }
    setNameStatus('checking'); setNameError('');
    const t = setTimeout(async () => {
      try {
        const r = await checkGuildName(trimmed);
        if (!r.valid) { setNameStatus('invalid'); setNameError(r.error || 'Invalid name'); }
        else if (r.available) { setNameStatus('available'); setNameError(''); }
        else { setNameStatus('taken'); setNameError('Name already taken'); }
      } catch { setNameStatus('idle'); }
    }, 500);
    return () => clearTimeout(t);
  }, [name]);

  const selectedIcon = GUILD_ICON_BY_KEY[iconKey];
  const afterBalance = gold - GUILD_CREATE_COST;

  const ownsIcon = (key: string) => {
    const d = GUILD_ICON_BY_KEY[key];
    return !!d && (d.free || unlocked.includes(key));
  };

  const handleSelectIcon = (key: string) => {
    if (ownsIcon(key)) { setIconKey(key); return; }
    setPurchaseConfirm(key);
  };

  const confirmPurchase = async () => {
    if (!purchaseConfirm) return;
    const def = GUILD_ICON_BY_KEY[purchaseConfirm];
    if (!def) { setPurchaseConfirm(null); return; }
    if (gold < def.cost) {
      onToast?.('WARNING', 'Not enough gold', `You need ${def.cost.toLocaleString()} G for ${def.label}.`);
      setPurchaseConfirm(null);
      return;
    }
    setPurchasing(true);
    try {
      const r = await purchaseGuildIcon(purchaseConfirm);
      const newUnlocked = r.unlockedIcons || [...unlocked, purchaseConfirm];
      setUnlocked(newUnlocked);
      if (typeof r.gold === 'number') { setGold(r.gold); onGoldChange(r.gold); }
      setIconKey(purchaseConfirm);
      onToast?.('SUCCESS', 'Icon unlocked', `${def.label} is now yours.`);
    } catch (e) {
      const err = e as CreateGuildError;
      onToast?.('ERROR', 'Purchase failed', err?.message);
    } finally {
      setPurchasing(false);
      setPurchaseConfirm(null);
    }
  };

  const submit = async () => {
    // Re-check balance right before creating (gold may have changed mid-flow).
    if (gold < GUILD_CREATE_COST) {
      setErrorModal({ title: 'Not enough gold', message: `You need ${GUILD_CREATE_COST} gold to create a guild. You have ${gold.toLocaleString()}.` });
      return;
    }
    setCreating(true);
    try {
      const { guild, player } = await createGuild({ name: name.trim(), motto: motto.trim(), icon: iconKey, privacy });
      onGoldChange(player.gold);
      onToast?.('SUCCESS', 'Guild created!', 'Welcome, Guild Master!');
      onCreated(guild, player.gold);
    } catch (e) {
      const err = e as CreateGuildError;
      setCreating(false);
      switch (err.code) {
        case 'ALREADY_IN_GUILD':
          onToast?.('WARNING', 'Already in a guild', 'Leave your current guild first.');
          onClose();
          break;
        case 'NAME_TAKEN':
          setStep(1); setNameStatus('taken'); setNameError('Name already taken');
          setErrorModal({ title: 'Name taken', message: 'That guild name was just taken. Choose another.' });
          break;
        case 'INSUFFICIENT_GOLD':
          if (typeof err.gold === 'number') { setGold(err.gold); onGoldChange(err.gold); }
          onToast?.('WARNING', 'Not enough gold', 'Earn more gold from quests and workouts.');
          onClose();
          break;
        default:
          setErrorModal({ title: 'Creation Failed', message: err?.message || 'Something went wrong. Please try again.' });
      }
    }
  };

  const goBack = () => {
    if (step === 'review') { setStep(4); return; }
    if (step === 1) { onClose(); return; }
    setStep(((step as number) - 1) as Step);
  };

  const headerTitle = step === 'review' ? 'CONFIRM GUILD CREATION' : 'CREATE YOUR GUILD';
  const headerSub = step === 'review' ? '' : `Step ${step} of 4`;
  const nextDisabledStep1 = nameStatus !== 'available';

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full sm:max-w-md h-full sm:h-auto sm:max-h-[92vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden"
        style={glassPanel}
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* ── Top bar ── */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-heading font-extrabold text-white leading-tight">{headerTitle}</h2>
            {headerSub && <p className="text-xs text-gray-500 mt-0.5 font-mono">{headerSub}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 -mr-1"><X size={22} /></button>
        </div>

        {/* ── Step progress bar ── */}
        {step !== 'review' && (
          <div className="flex gap-1.5 px-5 pb-4 flex-shrink-0">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full transition-all duration-300" style={{ width: (step as number) >= s ? '100%' : '0%', background: NEON }} />
              </div>
            ))}
          </div>
        )}

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {step === 1 && (
            <div className="space-y-3">
              <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400">Guild Name</label>
              <div className="relative">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={30}
                  placeholder="Enter guild name"
                  className="w-full rounded-xl px-4 py-3 pr-10 text-white text-base focus:outline-none transition"
                  style={{ background: INPUT_BG, border: `1px solid ${nameStatus === 'available' ? '#10b981' : nameStatus === 'taken' || nameStatus === 'invalid' ? '#ef4444' : 'rgba(255,255,255,0.12)'}` }}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {nameStatus === 'checking' && <Loader2 size={18} className="text-gray-400 animate-spin" />}
                  {nameStatus === 'available' && <Check size={18} className="text-emerald-400" />}
                  {(nameStatus === 'taken' || nameStatus === 'invalid') && <X size={18} className="text-red-400" />}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: nameStatus === 'taken' || nameStatus === 'invalid' ? '#f87171' : '#6b7280' }}>
                  {nameError || (nameStatus === 'available' ? 'Name available' : '\u00A0')}
                </span>
                <span className="text-xs text-gray-500 font-mono">{name.length}/30</span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400">Guild Motto</label>
              <textarea
                autoFocus
                value={motto}
                onChange={(e) => setMotto(e.target.value.slice(0, 60))}
                maxLength={60}
                rows={3}
                placeholder="Enter guild motto (optional)"
                className="w-full rounded-xl px-4 py-3 text-white text-base focus:outline-none transition resize-none"
                style={{ background: INPUT_BG, border: '1px solid rgba(255,255,255,0.12)' }}
              />
              <div className="flex justify-end">
                <span className="text-xs text-gray-500 font-mono">{motto.length}/60</span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="text-white font-semibold mb-3">Choose Your Guild Icon</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {GUILD_ICON_CATALOG.map((ic) => {
                  const owned = ownsIcon(ic.key);
                  const selected = iconKey === ic.key;
                  const lockedNoGold = !owned && gold < ic.cost;
                  return (
                    <motion.button
                      key={ic.key}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSelectIcon(ic.key)}
                      className="relative aspect-square rounded-2xl flex items-center justify-center"
                      style={{
                        background: INPUT_BG,
                        border: selected ? `2px solid ${NEON}` : lockedNoGold ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.1)',
                        boxShadow: selected ? `0 0 16px ${NEON}66` : 'none',
                      }}
                    >
                      <span className="text-4xl">{ic.emoji}</span>

                      {/* Badge */}
                      {ic.free ? (
                        <span className="absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981' }}>FREE</span>
                      ) : owned ? (
                        <span className="absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5" style={{ background: 'rgba(0,212,255,0.18)', color: NEON }}><Check size={9} /> OWNED</span>
                      ) : (
                        <span className="absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}><Lock size={8} /> {ic.cost.toLocaleString()}G</span>
                      )}

                      {/* Selected check overlay */}
                      {selected && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: NEON }}>
                          <Check size={14} className="text-black" />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-3">Selected: {selectedIcon?.emoji} {selectedIcon?.label}</p>
            </div>
          )}

          {step === 4 && (
            <div>
              <h3 className="text-white font-semibold mb-3">Guild Type</h3>
              <div className="space-y-4">
                {([
                  { key: 'open' as const, emoji: '🔓', title: 'OPEN', sub: 'Anyone can join instantly' },
                  { key: 'invite_only' as const, emoji: '🔒', title: 'INVITE-ONLY', sub: 'Requires Guild Master approval' },
                ]).map((opt) => {
                  const sel = privacy === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setPrivacy(opt.key)}
                      className="w-full text-left rounded-2xl p-4 flex items-center gap-3 transition"
                      style={{ background: INPUT_BG, border: sel ? `2px solid ${NEON}` : '1px solid rgba(255,255,255,0.1)', boxShadow: sel ? `0 0 14px ${NEON}44` : 'none' }}
                    >
                      <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center" style={{ border: `2px solid ${sel ? NEON : '#4b5563'}` }}>
                        {sel && <div className="w-2.5 h-2.5 rounded-full" style={{ background: NEON }} />}
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">{opt.emoji} {opt.title}</p>
                        <p className="text-gray-400 text-xs">{opt.sub}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="flex flex-col items-center text-center pt-2">
              <div className="w-28 h-28 rounded-3xl flex items-center justify-center mb-3" style={{ background: INPUT_BG, boxShadow: `0 0 24px ${NEON}44`, border: `1px solid ${NEON}55` }}>
                <span className="text-6xl">{selectedIcon?.emoji}</span>
              </div>
              <h3 className="text-2xl font-heading font-extrabold text-white">{name.trim()}</h3>
              {motto.trim() && <p className="text-gray-400 italic text-sm mt-1">"{motto.trim()}"</p>}

              <div className="w-full h-px my-4" style={{ background: 'rgba(255,255,255,0.1)' }} />

              <div className="w-full space-y-2 text-sm">
                <Row label="Type" value={privacy === 'open' ? '🔓 OPEN' : '🔒 INVITE-ONLY'} />
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Cost</span>
                  <span className="font-bold text-lg flex items-center gap-1" style={{ color: '#fbbf24' }}><Coins size={15} /> {GUILD_CREATE_COST} Gold</span>
                </div>
                <Row label="Your Balance" value={`${gold.toLocaleString()} G`} muted />
                <Row label="After Creation" value={`${afterBalance.toLocaleString()} G`} muted />
              </div>

              {afterBalance >= 0 && afterBalance < 200 && (
                <p className="text-xs mt-3 flex items-center gap-1.5" style={{ color: '#fb923c' }}>
                  <AlertTriangle size={13} /> Low balance after creation
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Footer buttons ── */}
        <div className="flex gap-3 px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={goBack}
            className="px-5 h-11 rounded-full text-sm font-bold flex items-center gap-1.5"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e1' }}
          >
            {step === 1 ? 'CANCEL' : <><ArrowLeft size={15} /> BACK</>}
          </button>

          {step === 'review' ? (
            <button
              onClick={submit}
              disabled={creating}
              className="flex-1 h-11 rounded-full text-sm font-extrabold text-black flex items-center justify-center gap-1.5 disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${NEON}, #6d28d9)`, boxShadow: `0 0 18px ${NEON}55` }}
            >
              {creating ? <><Loader2 size={16} className="animate-spin" /> Creating…</> : 'CONFIRM & CREATE'}
            </button>
          ) : (
            <button
              onClick={() => step === 4 ? setStep('review') : setStep(((step as number) + 1) as Step)}
              disabled={step === 1 && nextDisabledStep1}
              className="flex-1 h-11 rounded-full text-sm font-extrabold text-black flex items-center justify-center gap-1.5 disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${NEON}, #6d28d9)` }}
            >
              {step === 4 ? <>REVIEW <ArrowRight size={15} /></> : <>NEXT <ArrowRight size={15} /></>}
            </button>
          )}
        </div>
      </motion.div>

      {/* ── Premium icon purchase confirmation ── */}
      <AnimatePresence>
        {purchaseConfirm && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !purchasing && setPurchaseConfirm(null)}
          >
            <motion.div
              className="w-full max-w-xs rounded-3xl p-6 text-center"
              style={glassPanel}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-5xl mb-3">{GUILD_ICON_BY_KEY[purchaseConfirm]?.emoji}</div>
              <p className="text-white font-bold mb-1">Purchase {GUILD_ICON_BY_KEY[purchaseConfirm]?.label} Icon?</p>
              <p className="text-gray-400 text-sm mb-5 flex items-center justify-center gap-1">
                <Coins size={14} style={{ color: '#fbbf24' }} /> {GUILD_ICON_BY_KEY[purchaseConfirm]?.cost.toLocaleString()} gold
              </p>
              <div className="flex gap-3">
                <button onClick={() => setPurchaseConfirm(null)} disabled={purchasing} className="flex-1 h-10 rounded-full text-sm font-bold" style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e1' }}>CANCEL</button>
                <button onClick={confirmPurchase} disabled={purchasing} className="flex-1 h-10 rounded-full text-sm font-extrabold text-black flex items-center justify-center gap-1.5 disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${NEON}, #6d28d9)` }}>
                  {purchasing ? <Loader2 size={15} className="animate-spin" /> : 'BUY'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error modal ── */}
      <AnimatePresence>
        {errorModal && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setErrorModal(null)}
          >
            <motion.div
              className="w-full max-w-xs rounded-3xl p-6 text-center"
              style={glassPanel}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3" style={{ background: 'rgba(239,68,68,0.15)' }}>
                <AlertTriangle size={22} className="text-red-400" />
              </div>
              <p className="text-white font-bold mb-1">{errorModal.title}</p>
              <p className="text-gray-400 text-sm mb-5">{errorModal.message}</p>
              <button onClick={() => setErrorModal(null)} className="w-full h-10 rounded-full text-sm font-extrabold text-black" style={{ background: `linear-gradient(135deg, ${NEON}, #6d28d9)` }}>TRY AGAIN</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const Row: React.FC<{ label: string; value: string; muted?: boolean }> = ({ label, value, muted }) => (
  <div className="flex items-center justify-between">
    <span className="text-gray-400">{label}</span>
    <span className={muted ? 'text-gray-400 font-mono' : 'text-white font-semibold'}>{value}</span>
  </div>
);

export default CreateGuildModal;
