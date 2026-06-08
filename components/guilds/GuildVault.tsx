import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Gift, ShoppingCart, History, Lock, X, AlertCircle, Check } from 'lucide-react';
import { NEON, glassPanel, timeAgo } from './guildTheme';
import { fetchVault, donateToVault, purchaseVaultItem } from '../../lib/guildApi';
import type { VaultTransaction } from '../../types';

interface GuildVaultProps {
  guildId: string;
  playerGold: number;
  onGoldChange: (newGold: number) => void;
  onToast?: (type: 'SUCCESS' | 'WARNING' | 'ERROR', title: string, msg?: string) => void;
}

interface ShopItem { key: string; label: string; desc: string; price: number; icon: string; category: 'cosmetic' | 'buff'; }

const SHOP: ShopItem[] = [
  { key: 'crest_of_valor', label: 'Crest of Valor', desc: 'Unlocks the S-Rank guild emblem.', price: 6000, icon: '🛡️', category: 'cosmetic' },
  { key: 'fortress_lvl2', label: 'Fortress Lvl 2', desc: '+50% defense for all members in guild wars.', price: 10000, icon: '🏰', category: 'buff' },
  { key: 'xp_surge_24h', label: 'XP Surge (24h)', desc: '+50% XP gained for all guildmates.', price: 2500, icon: '⚡', category: 'buff' },
];

const GuildVault: React.FC<GuildVaultProps> = ({ guildId, playerGold, onGoldChange, onToast }) => {
  const [balance, setBalance] = useState(0);
  const [canPurchase, setCanPurchase] = useState(false);
  const [txns, setTxns] = useState<VaultTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'cosmetic' | 'buff'>('cosmetic');
  const [showDonate, setShowDonate] = useState(false);
  const [donateAmt, setDonateAmt] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const v = await fetchVault(guildId);
      setBalance(v.balance);
      setCanPurchase(v.canPurchase);
      setTxns(v.transactions);
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Could not load vault');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => { load(); }, [load]);

  const submitDonate = async () => {
    const amt = parseInt(donateAmt);
    if (!amt || amt <= 0) { onToast?.('WARNING', 'Enter an amount'); return; }
    if (amt > playerGold) { onToast?.('WARNING', 'Not enough gold'); return; }
    setBusy(true);
    try {
      const { newBalance, playerGold: pg } = await donateToVault(guildId, amt);
      setBalance(newBalance);
      onGoldChange(pg);
      setShowDonate(false);
      setDonateAmt('');
      onToast?.('SUCCESS', `Donated ${amt.toLocaleString()} G`);
      load();
    } catch (e: any) {
      onToast?.('ERROR', 'Donation failed', e?.message);
    } finally {
      setBusy(false);
    }
  };

  const buy = async (item: ShopItem) => {
    if (!canPurchase) { onToast?.('WARNING', 'Only Master & Vice can purchase'); return; }
    if (balance < item.price) { onToast?.('WARNING', 'Insufficient vault balance'); return; }
    setBusy(true);
    try {
      const { newBalance } = await purchaseVaultItem(guildId, item.key);
      setBalance(newBalance);
      onToast?.('SUCCESS', `Purchased ${item.label}`);
      load();
    } catch (e: any) {
      onToast?.('ERROR', 'Purchase failed', e?.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="p-4"><div className="h-40 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} /></div>;
  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={28} className="text-red-400 mx-auto mb-2" />
        <p className="text-gray-400 text-sm mb-3">{error}</p>
        <button onClick={load} className="px-4 py-2 rounded-xl text-sm" style={{ background: 'rgba(0,212,255,0.15)', color: NEON }}>Retry</button>
      </div>
    );
  }

  return (
    <div className="p-4 overflow-y-auto h-full pb-24">
      {/* Treasury */}
      <div className="rounded-2xl p-5 text-center" style={glassPanel}>
        <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-3" style={{ background: 'rgba(251,191,36,0.15)' }}>
          <Coins size={26} className="text-amber-400" />
        </div>
        <p className="text-[11px] font-mono uppercase tracking-wider text-gray-500">Total Treasury Balance</p>
        <p className="text-3xl font-heading font-extrabold text-amber-300 mt-1">{balance.toLocaleString()} G</p>
        <button
          onClick={() => setShowDonate(true)}
          className="mt-4 px-6 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2"
          style={{ background: 'rgba(0,212,255,0.15)', color: NEON, border: `1px solid ${NEON}` }}
        >
          <Gift size={15} /> Donate Gold
        </button>
      </div>

      {/* Shop */}
      <div className="flex items-center justify-between mt-5 mb-2">
        <h3 className="text-[11px] font-mono uppercase tracking-wider text-gray-400 flex items-center gap-1.5"><ShoppingCart size={13} /> Vault Shop</h3>
        {!canPurchase && <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>Master & Vice Only</span>}
      </div>

      <div className="flex gap-2 mb-3">
        {(['cosmetic', 'buff'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: tab === t ? 'rgba(0,212,255,0.18)' : 'rgba(255,255,255,0.04)', color: tab === t ? NEON : '#94a3b8', border: tab === t ? `1px solid ${NEON}` : '1px solid transparent' }}>
            {t === 'cosmetic' ? 'Cosmetics' : 'Guild Buffs'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {SHOP.filter((s) => s.category === tab).map((item) => {
          const affordable = balance >= item.price;
          return (
            <div key={item.key} className="rounded-2xl p-3 flex flex-col" style={glassPanel}>
              <div className="text-3xl mb-2">{item.icon}</div>
              <p className="text-white text-sm font-bold">{item.label}</p>
              <p className="text-gray-400 text-[11px] flex-1 mt-0.5">{item.desc}</p>
              <button
                onClick={() => buy(item)}
                disabled={busy || !canPurchase || !affordable}
                className="mt-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40"
                style={{ background: affordable ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)', color: affordable ? '#fbbf24' : '#64748b' }}
              >
                {!canPurchase ? <Lock size={12} /> : <Coins size={12} />} {item.price.toLocaleString()}
              </button>
            </div>
          );
        })}
      </div>

      {/* Activity */}
      <h3 className="text-[11px] font-mono uppercase tracking-wider text-gray-400 mt-5 mb-2 flex items-center gap-1.5"><History size={13} /> Recent Activity</h3>
      {txns.length === 0 ? (
        <p className="text-gray-600 text-xs text-center py-4">No transactions yet.</p>
      ) : (
        <div className="space-y-2">
          {txns.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl" style={glassPanel}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: t.kind === 'donate' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)' }}>
                {t.kind === 'donate' ? <Gift size={15} className="text-emerald-400" /> : <ShoppingCart size={15} className="text-red-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate"><span className="font-semibold">{t.name}</span> {t.kind === 'donate' ? 'donated' : 'purchased'} {t.itemKey ? labelFor(t.itemKey) : ''}</p>
                <p className="text-gray-500 text-[11px]">{timeAgo(t.createdAt)}</p>
              </div>
              <span className="text-sm font-bold" style={{ color: t.kind === 'donate' ? '#10b981' : '#ef4444' }}>
                {t.kind === 'donate' ? '+' : '-'}{t.amount.toLocaleString()} G
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Donate modal */}
      <AnimatePresence>
        {showDonate && (
          <motion.div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(0,0,0,0.7)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDonate(false)}>
            <motion.div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5" style={glassPanel} initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-lg">Donate to Vault</h3>
                <button onClick={() => setShowDonate(false)} className="text-gray-400"><X size={20} /></button>
              </div>
              <p className="text-gray-400 text-xs mb-3">Your gold: <span className="text-amber-300 font-bold">{playerGold.toLocaleString()} G</span></p>
              <input
                type="number"
                value={donateAmt}
                onChange={(e) => setDonateAmt(e.target.value)}
                placeholder="Amount"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-white text-sm mb-3 focus:outline-none focus:border-cyan-400"
              />
              <div className="flex gap-2 mb-4">
                {[100, 500, 1000].map((q) => (
                  <button key={q} onClick={() => setDonateAmt(String(q))} className="flex-1 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.05)', color: '#cbd5e1' }}>{q}</button>
                ))}
              </div>
              <button onClick={submitDonate} disabled={busy} className="w-full py-3 rounded-xl font-bold text-black disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: `linear-gradient(135deg, ${NEON}, #6d28d9)` }}>
                {busy ? 'Donating…' : <><Check size={16} /> Confirm Donation</>}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function labelFor(key: string): string {
  const map: Record<string, string> = { crest_of_valor: 'Crest of Valor', fortress_lvl2: 'Fortress Lvl 2', xp_surge_24h: 'XP Surge (24h)' };
  return map[key] || key;
}

export default GuildVault;
