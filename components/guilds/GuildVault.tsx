import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Coins,
  Gift,
  ShoppingCart,
  History,
  Lock,
  X,
  AlertCircle,
  Check,
  Image as ImageIcon,
} from "lucide-react";
import {
  NEON,
  glassPanel,
  timeAgo,
  getGuildIconUrl,
  GUILD_ICON_CATALOG,
  GUILD_BANNER_CATALOG,
} from "./guildTheme";
import {
  fetchVault,
  donateToVault,
  equipGuildIcon,
  equipGuildBanner,
} from "../../lib/guildApi";
import type { VaultTransaction, Guild, GuildRole } from "../../types";

interface GuildVaultProps {
  guildId: string;
  myRole: GuildRole;
  guildIcon: string;
  guildBanner: string;
  playerGold: number;
  onGoldChange: (newGold: number) => void;
  onGuildUpdated?: (partial: Partial<Guild>) => void;
  onToast?: (
    type: "SUCCESS" | "WARNING" | "ERROR",
    title: string,
    msg?: string
  ) => void;
}

const RANK_ROLE: Record<GuildRole, number> = { master: 3, vice: 2, member: 1 };

const GuildVault: React.FC<GuildVaultProps> = ({
  guildId,
  myRole,
  guildIcon,
  guildBanner,
  playerGold,
  onGoldChange,
  onGuildUpdated,
  onToast,
}) => {
  const [balance, setBalance] = useState(0);
  const [txns, setTxns] = useState<VaultTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDonate, setShowDonate] = useState(false);
  const [donateAmt, setDonateAmt] = useState("");
  const [busy, setBusy] = useState(false);

  // Appearance state (seeded from the guild, refreshed from the vault payload).
  const [equippedIcon, setEquippedIcon] = useState(guildIcon);
  const [equippedBanner, setEquippedBanner] = useState(guildBanner);
  const [unlockedIcons, setUnlockedIcons] = useState<string[]>([]);
  const [working, setWorking] = useState<string | null>(null);
  const [iconConfirm, setIconConfirm] = useState<string | null>(null);

  const canManage = RANK_ROLE[myRole] >= RANK_ROLE.vice;

  // `cancelledRef` guards against stale responses: if `guildId` changes (or the
  // component re-fetches) while an older request is in flight, the outdated
  // response must not overwrite the current state.
  const cancelledRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const v = await fetchVault(guildId);
      if (cancelledRef.current) return;
      setBalance(v.balance);
      setTxns(v.transactions);
      setEquippedIcon(v.icon);
      setEquippedBanner(v.banner);
      setUnlockedIcons(v.unlockedIcons || []);
      setError("");
    } catch (e: any) {
      if (cancelledRef.current) return;
      setError(e?.message || "Could not load vault");
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [guildId]);

  useEffect(() => {
    cancelledRef.current = false;
    load();
    return () => {
      cancelledRef.current = true;
    };
  }, [load]);

  const ownsIcon = (key: string, free: boolean) =>
    free || unlockedIcons.includes(key);
  const isIconEquipped = (key: string) =>
    getGuildIconUrl(equippedIcon) === getGuildIconUrl(key);

  const applyIcon = async (iconKey: string) => {
    if (!canManage) {
      onToast?.("WARNING", "Only Master & Vice can change the icon");
      return;
    }
    setWorking(iconKey);
    try {
      const r = await equipGuildIcon(guildId, iconKey);
      setEquippedIcon(r.icon);
      setUnlockedIcons(r.unlockedIcons || []);
      setBalance(r.newBalance);
      onGuildUpdated?.({ icon: r.icon });
      onToast?.("SUCCESS", "Guild icon updated");
    } catch (e: any) {
      onToast?.("ERROR", "Could not update icon", e?.message);
    } finally {
      setWorking(null);
      setIconConfirm(null);
    }
  };

  const handleIconTap = (iconKey: string, free: boolean, cost: number) => {
    if (!canManage) {
      onToast?.("WARNING", "Only Master & Vice can change the icon");
      return;
    }
    if (isIconEquipped(iconKey)) return;
    if (ownsIcon(iconKey, free)) {
      applyIcon(iconKey);
      return;
    }
    // Locked premium icon → confirm a vault purchase.
    if (balance < cost) {
      onToast?.(
        "WARNING",
        "Insufficient vault balance",
        `The vault needs ${cost.toLocaleString()} G.`
      );
      return;
    }
    setIconConfirm(iconKey);
  };

  const applyBanner = async (bannerKey: string) => {
    if (!canManage) {
      onToast?.("WARNING", "Only Master & Vice can change the banner");
      return;
    }
    if (equippedBanner === bannerKey) return;
    setWorking(`banner:${bannerKey}`);
    try {
      const r = await equipGuildBanner(guildId, bannerKey);
      setEquippedBanner(r.banner);
      onGuildUpdated?.({ banner: r.banner });
      onToast?.("SUCCESS", "Guild banner updated");
    } catch (e: any) {
      onToast?.("ERROR", "Could not update banner", e?.message);
    } finally {
      setWorking(null);
    }
  };

  const submitDonate = async () => {
    const amt = parseInt(donateAmt);
    if (!amt || amt <= 0) {
      onToast?.("WARNING", "Enter an amount");
      return;
    }
    if (amt > playerGold) {
      onToast?.("WARNING", "Not enough gold");
      return;
    }
    setBusy(true);
    try {
      const { newBalance, playerGold: pg } = await donateToVault(guildId, amt);
      setBalance(newBalance);
      onGoldChange(pg);
      setShowDonate(false);
      setDonateAmt("");
      onToast?.("SUCCESS", `Donated ${amt.toLocaleString()} G`);
      load();
    } catch (e: any) {
      onToast?.("ERROR", "Donation failed", e?.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading)
    return (
      <div className="p-4">
        <div
          className="h-40 rounded-2xl animate-pulse"
          style={{ background: "rgba(255,255,255,0.04)" }}
        />
      </div>
    );
  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={28} className="text-red-400 mx-auto mb-2" />
        <p className="text-gray-400 text-sm mb-3">{error}</p>
        <button
          onClick={load}
          className="px-4 py-2 rounded-xl text-sm"
          style={{ background: "rgba(0,212,255,0.15)", color: NEON }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 overflow-y-auto h-full pb-24">
      {/* Treasury */}
      <div className="rounded-2xl p-5 text-center" style={glassPanel}>
        <div
          className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-3"
          style={{ background: "rgba(251,191,36,0.15)" }}
        >
          <Coins size={26} className="text-amber-400" />
        </div>
        <p className="text-[11px] font-mono uppercase tracking-wider text-gray-500">
          Total Treasury Balance
        </p>
        <p className="text-3xl font-heading font-extrabold text-amber-300 mt-1">
          {balance.toLocaleString()} G
        </p>
        <button
          onClick={() => setShowDonate(true)}
          className="mt-4 px-6 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2"
          style={{
            background: "rgba(0,212,255,0.15)",
            color: NEON,
            border: `1px solid ${NEON}`,
          }}
        >
          <Gift size={15} /> Donate Gold
        </button>
      </div>

      {!canManage && (
        <div
          className="mt-5 mb-3 text-[10px] font-mono px-2 py-1 rounded inline-block"
          style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}
        >
          Master & Vice can edit
        </div>
      )}

      {/* ── Appearance: Guild Icons ── */}
      <div className={canManage ? "mt-5" : ""}>
          <h3 className="text-[11px] font-mono uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
            <ImageIcon size={13} /> Guild Icons
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {GUILD_ICON_CATALOG.map((ic) => {
              const owned = ownsIcon(ic.key, ic.free);
              const equipped = isIconEquipped(ic.key);
              const affordable = owned || balance >= ic.cost;
              return (
                <motion.button
                  key={ic.key}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleIconTap(ic.key, ic.free, ic.cost)}
                  disabled={!!working || !canManage}
                  className="relative aspect-square rounded-2xl overflow-hidden disabled:opacity-60"
                  style={{
                    background: "#1a1a1a",
                    border: equipped
                      ? `2px solid ${NEON}`
                      : !owned && !affordable
                      ? "1px solid rgba(239,68,68,0.4)"
                      : "1px solid rgba(255,255,255,0.1)",
                    boxShadow: equipped ? `0 0 16px ${NEON}66` : "none",
                  }}
                >
                  <img
                    src={getGuildIconUrl(ic.key)}
                    alt={ic.label}
                    className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                  />
                  {ic.free ? (
                    <span
                      className="absolute top-1 right-1 text-[8px] font-bold px-1 py-0.5 rounded"
                      style={{
                        background: "rgba(16,185,129,0.2)",
                        color: "#10b981",
                      }}
                    >
                      FREE
                    </span>
                  ) : owned ? (
                    <span
                      className="absolute top-1 right-1 text-[8px] font-bold px-1 py-0.5 rounded flex items-center gap-0.5"
                      style={{
                        background: "rgba(0,212,255,0.18)",
                        color: NEON,
                      }}
                    >
                      <Check size={8} /> OWNED
                    </span>
                  ) : (
                    <span
                      className="absolute top-1 right-1 text-[8px] font-bold px-1 py-0.5 rounded flex items-center gap-0.5"
                      style={{
                        background: "rgba(251,191,36,0.15)",
                        color: "#fbbf24",
                      }}
                    >
                      <Lock size={7} /> {ic.cost.toLocaleString()}
                    </span>
                  )}
                  {equipped && (
                    <span
                      className="absolute bottom-0 inset-x-0 text-[8px] font-bold text-center py-0.5"
                      style={{ background: NEON, color: "#000" }}
                    >
                      EQUIPPED
                    </span>
                  )}
                  {working === ic.key && (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.5)" }}
                    >
                      <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* ── Appearance: Banners ── */}
          <h3 className="text-[11px] font-mono uppercase tracking-wider text-gray-400 mt-5 mb-2 flex items-center gap-1.5">
            <ImageIcon size={13} /> Guild Banners
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {GUILD_BANNER_CATALOG.map((b) => {
              const equipped = equippedBanner === b.key;
              return (
                <motion.button
                  key={b.key}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => applyBanner(b.key)}
                  disabled={!!working || !canManage}
                  className="relative h-16 rounded-2xl overflow-hidden disabled:opacity-60"
                  style={{
                    background: b.gradient,
                    border: equipped
                      ? `2px solid ${NEON}`
                      : "1px solid rgba(255,255,255,0.1)",
                    boxShadow: equipped ? `0 0 14px ${NEON}55` : "none",
                  }}
                >
                  <span className="absolute bottom-1 left-2 text-[11px] font-bold text-white drop-shadow">
                    {b.label}
                  </span>
                  {equipped && (
                    <span
                      className="absolute top-1 right-1 text-[8px] font-bold px-1 py-0.5 rounded"
                      style={{ background: NEON, color: "#000" }}
                    >
                      EQUIPPED
                    </span>
                  )}
                  {working === `banner:${b.key}` && (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.4)" }}
                    >
                      <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
      </div>

      {/* Activity */}
      <h3 className="text-[11px] font-mono uppercase tracking-wider text-gray-400 mt-5 mb-2 flex items-center gap-1.5">
        <History size={13} /> Recent Activity
      </h3>
      {txns.length === 0 ? (
        <p className="text-gray-600 text-xs text-center py-4">
          No transactions yet.
        </p>
      ) : (
        <div className="space-y-2">
          {txns.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 p-2.5 rounded-xl"
              style={glassPanel}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background:
                    t.kind === "donate"
                      ? "rgba(16,185,129,0.15)"
                      : "rgba(239,68,68,0.12)",
                }}
              >
                {t.kind === "donate" ? (
                  <Gift size={15} className="text-emerald-400" />
                ) : (
                  <ShoppingCart size={15} className="text-red-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">
                  <span className="font-semibold">{t.name}</span>{" "}
                  {t.kind === "donate" ? "donated" : "purchased"}{" "}
                  {t.itemKey ? labelFor(t.itemKey) : ""}
                </p>
                <p className="text-gray-500 text-[11px]">
                  {timeAgo(t.createdAt)}
                </p>
              </div>
              <span
                className="text-sm font-bold"
                style={{ color: t.kind === "donate" ? "#10b981" : "#ef4444" }}
              >
                {t.kind === "donate" ? "+" : "-"}
                {t.amount.toLocaleString()} G
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Icon purchase confirm */}
      <AnimatePresence>
        {iconConfirm && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center p-6"
            style={{ background: "rgba(0,0,0,0.7)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !working && setIconConfirm(null)}
          >
            <motion.div
              className="w-full max-w-xs rounded-3xl p-6 text-center"
              style={glassPanel}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="w-20 h-20 mx-auto rounded-xl overflow-hidden mb-3"
                style={{
                  background: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <img
                  src={getGuildIconUrl(iconConfirm)}
                  alt=""
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
              <p className="text-white font-bold mb-1">
                Unlock this icon for the guild?
              </p>
              <p className="text-gray-400 text-sm mb-1 flex items-center justify-center gap-1">
                <Coins size={14} style={{ color: "#fbbf24" }} />{" "}
                {(
                  GUILD_ICON_CATALOG.find((i) => i.key === iconConfirm)?.cost ||
                  0
                ).toLocaleString()}{" "}
                G from the vault
              </p>
              <p className="text-gray-500 text-[11px] mb-5">
                Vault balance: {balance.toLocaleString()} G
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIconConfirm(null)}
                  disabled={!!working}
                  className="flex-1 h-10 rounded-full text-sm font-bold"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "#cbd5e1",
                  }}
                >
                  CANCEL
                </button>
                <button
                  onClick={() => applyIcon(iconConfirm)}
                  disabled={!!working}
                  className="flex-1 h-10 rounded-full text-sm font-extrabold text-black flex items-center justify-center gap-1.5 disabled:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${NEON}, #6d28d9)`,
                  }}
                >
                  {working ? (
                    <div className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                  ) : (
                    "UNLOCK & EQUIP"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Donate modal */}
      <AnimatePresence>
        {showDonate && (
          <motion.div
            className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDonate(false)}
          >
            <motion.div
              className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5"
              style={glassPanel}
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              exit={{ y: 60 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-lg">
                  Donate to Vault
                </h3>
                <button
                  onClick={() => setShowDonate(false)}
                  className="text-gray-400"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-gray-400 text-xs mb-3">
                Your gold:{" "}
                <span className="text-amber-300 font-bold">
                  {playerGold.toLocaleString()} G
                </span>
              </p>
              <input
                type="number"
                value={donateAmt}
                onChange={(e) => setDonateAmt(e.target.value)}
                placeholder="Amount"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-white text-sm mb-3 focus:outline-none focus:border-cyan-400"
              />
              <div className="flex gap-2 mb-4">
                {[100, 500, 1000].map((q) => (
                  <button
                    key={q}
                    onClick={() => setDonateAmt(String(q))}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      color: "#cbd5e1",
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <button
                onClick={submitDonate}
                disabled={busy}
                className="w-full py-3 rounded-xl font-bold text-black disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  background: `linear-gradient(135deg, ${NEON}, #6d28d9)`,
                }}
              >
                {busy ? (
                  "Donating…"
                ) : (
                  <>
                    <Check size={16} /> Confirm Donation
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function labelFor(key: string): string {
  if (key.startsWith("icon:")) {
    const k = key.slice(5);
    const def = GUILD_ICON_CATALOG.find((i) => i.key === k);
    return `${def?.label || k} icon`;
  }
  const map: Record<string, string> = {
    crest_of_valor: "Crest of Valor",
    fortress_lvl2: "Fortress Lvl 2",
    xp_surge_24h: "XP Surge (24h)",
  };
  return map[key] || key;
}

export default GuildVault;
