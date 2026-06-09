import React, { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Users,
  Trophy,
  Sparkles,
  Plus,
  LogIn,
  Clock,
  AlertCircle,
  Coins,
  Check,
} from "lucide-react";
import {
  NEON,
  glassPanel,
  bannerStyle,
  GUILD_CREATE_COST,
  getGuildIconUrl,
} from "./guildTheme";
import {
  fetchGuilds,
  joinGuild,
  cancelJoinRequest,
  fetchCreateInfo,
} from "../../lib/guildApi";
import CreateGuildModal from "./CreateGuildModal";
import type { GuildSummary, Guild } from "../../types";

interface GuildBrowserProps {
  playerGold: number;
  userId?: string;
  onGoldChange: (gold: number) => void;
  onJoined: () => void; // refetch membership → enter portal
  onToast?: (
    type: "SUCCESS" | "WARNING" | "ERROR",
    title: string,
    msg?: string
  ) => void;
}

type Filter = "top" | "recruiting" | "war";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "top", label: "Top Rated" },
  { key: "recruiting", label: "Recruiting" },
  { key: "war", label: "War Regis" },
];

const GuildBrowser: React.FC<GuildBrowserProps> = ({
  playerGold,
  userId,
  onGoldChange,
  onJoined,
  onToast,
}) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("top");
  const [guilds, setGuilds] = useState<GuildSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // ── Create flow pre-flight ──
  const [preflightBusy, setPreflightBusy] = useState(false);
  const [createGold, setCreateGold] = useState(playerGold);
  const [unlockedIcons, setUnlockedIcons] = useState<string[]>([]);
  const [goldModal, setGoldModal] = useState<number | null>(null); // shows current gold when insufficient

  useEffect(() => {
    setCreateGold(playerGold);
  }, [playerGold]);

  const handleOpenCreate = async () => {
    // Check 3: authenticated
    if (!userId) {
      onToast?.("WARNING", "Sign in to create a guild");
      return;
    }
    setPreflightBusy(true);
    try {
      const info = await fetchCreateInfo();
      setCreateGold(info.gold);
      setUnlockedIcons(info.unlockedIcons || []);
      // Check 1: not already in a guild
      if (info.inGuild) {
        onToast?.(
          "WARNING",
          "You're already in a guild",
          "Leave your current guild first."
        );
        onJoined();
        return;
      }
      // Check 2: enough gold
      if (info.gold < info.cost) {
        setGoldModal(info.gold);
        return;
      }
      setShowCreate(true);
    } catch (e: any) {
      onToast?.("ERROR", "Could not start creation", e?.message);
    } finally {
      setPreflightBusy(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await fetchGuilds(search, filter);
      setGuilds(list);
    } catch (e: any) {
      setError(e?.message || "Could not load guilds");
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  // Requested guilds float to the top of the list.
  const sortedGuilds = useMemo(
    () =>
      [...guilds].sort((a, b) => (b.requested ? 1 : 0) - (a.requested ? 1 : 0)),
    [guilds]
  );

  const handleJoin = async (g: GuildSummary) => {
    // Closed guild the user already requested → tapping again withdraws the request.
    if (g.privacy !== "open" && g.requested) {
      setJoiningId(g.id);
      try {
        await cancelJoinRequest(g.id);
        setGuilds((prev) =>
          prev.map((x) => (x.id === g.id ? { ...x, requested: false } : x))
        );
        onToast?.("SUCCESS", "Request withdrawn");
      } catch (e: any) {
        onToast?.("ERROR", "Could not withdraw", e?.message);
      } finally {
        setJoiningId(null);
      }
      return;
    }
    setJoiningId(g.id);
    try {
      const { status } = await joinGuild(g.id);
      if (status === "joined") {
        onToast?.("SUCCESS", "Welcome to the guild!", g.name);
        onJoined();
      } else {
        onToast?.(
          "SUCCESS",
          "Request sent",
          "The guild leaders will review your request."
        );
        setGuilds((prev) =>
          prev.map((x) => (x.id === g.id ? { ...x, requested: true } : x))
        );
      }
    } catch (e: any) {
      onToast?.("ERROR", "Could not join", e?.message);
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-28">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-3xl font-black text-white leading-tight tracking-tight uppercase">
          GUILD
          <br />
          DISCOVERY
        </h1>
        <p className="text-gray-400 text-sm mt-2 max-w-sm">
          Scan the global registry. Align with a faction. Forge your legacy in
          the digital void.
        </p>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-3">
        <div
          className="flex-1 flex items-center gap-2 px-3 rounded-xl"
          style={glassPanel}
        >
          <Search size={16} className="text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guild registry…"
            className="flex-1 bg-transparent py-2.5 text-sm text-white focus:outline-none"
          />
        </div>
        <button
          onClick={handleOpenCreate}
          disabled={preflightBusy}
          className="px-5 rounded-xl text-black text-xs font-black font-mono uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,212,255,0.25)] flex items-center justify-center gap-1.5 flex-shrink-0 disabled:opacity-50"
          style={{ backgroundColor: NEON }}
        >
          <Plus size={14} strokeWidth={3} /> New
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5"
            style={{
              background:
                filter === f.key
                  ? "rgba(0,212,255,0.18)"
                  : "rgba(255,255,255,0.04)",
              border:
                filter === f.key
                  ? `1px solid ${NEON}`
                  : "1px solid rgba(255,255,255,0.08)",
              color: filter === f.key ? NEON : "#94a3b8",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl animate-pulse"
              style={{ background: "rgba(255,255,255,0.04)" }}
            />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button
            onClick={load}
            className="px-5 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "rgba(0,212,255,0.15)", color: NEON }}
          >
            Retry
          </button>
        </div>
      ) : guilds.length === 0 ? (
        <div className="text-center py-12">
          <Users size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm mb-1">No guilds found</p>
          <p className="text-gray-600 text-xs">
            Be the first — forge your own guild.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {sortedGuilds.map((g, idx) => {
              const full = g.memberCount >= g.memberCap;
              return (
                <motion.div
                  key={g.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.03 }}
                  className="rounded-2xl p-4"
                  style={glassPanel}
                >
                  <div className="flex gap-3">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                      style={bannerStyle(g.banner)}
                    >
                      <img
                        src={getGuildIconUrl(g.icon)}
                        alt=""
                        className="w-10 h-10 object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-white font-heading font-bold text-lg truncate">
                          {g.name}
                        </h3>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {g.requested && g.privacy !== "open" && (
                            <span
                              className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded flex items-center gap-1"
                              style={{
                                background: "rgba(0,212,255,0.15)",
                                color: NEON,
                              }}
                            >
                              <Clock size={10} /> Requested
                            </span>
                          )}
                          <span
                            className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded"
                            style={
                              g.privacy === "open"
                                ? {
                                    background: "rgba(16,185,129,0.15)",
                                    color: "#10b981",
                                  }
                                : {
                                    background: "rgba(148,163,184,0.15)",
                                    color: "#94a3b8",
                                  }
                            }
                          >
                            {g.privacy === "open" ? "Open" : "Closed"}
                          </span>
                        </div>
                      </div>
                      {g.motto && (
                        <p className="text-gray-400 text-xs italic truncate">
                          "{g.motto}"
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-[11px] font-mono text-gray-400">
                        <span className="flex items-center gap-1">
                          <Users size={11} /> {g.memberCount}/{g.memberCap}
                        </span>
                        <span className="flex items-center gap-1">
                          <Trophy size={11} /> #{g.rank}
                        </span>
                        <span
                          className="flex items-center gap-1"
                          style={{ color: NEON }}
                        >
                          <Sparkles size={11} /> {formatGlory(g.gloryPoints)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoin(g)}
                    disabled={!!joiningId || (full && !g.requested)}
                    className="w-full mt-3 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                    style={
                      g.requested && g.privacy !== "open"
                        ? {
                            background: "rgba(0,212,255,0.18)",
                            border: `1px solid ${NEON}`,
                            color: NEON,
                          }
                        : {
                            background:
                              g.privacy === "open"
                                ? "rgba(0,212,255,0.15)"
                                : "rgba(255,255,255,0.05)",
                            border: `1px solid ${
                              g.privacy === "open"
                                ? "rgba(0,212,255,0.4)"
                                : "rgba(255,255,255,0.12)"
                            }`,
                            color: g.privacy === "open" ? NEON : "#cbd5e1",
                          }
                    }
                  >
                    {joiningId === g.id ? (
                      g.requested ? (
                        "Withdrawing…"
                      ) : (
                        "Joining…"
                      )
                    ) : g.privacy === "open" ? (
                      full ? (
                        "Guild Full"
                      ) : (
                        <>
                          <LogIn size={14} /> Enter Guild
                        </>
                      )
                    ) : g.requested ? (
                      <>
                        <Check size={14} /> Requested · Tap to withdraw
                      </>
                    ) : full ? (
                      "Guild Full"
                    ) : (
                      <>
                        <Clock size={14} /> Request to Join
                      </>
                    )}
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <CreateGuildModal
            playerGold={createGold}
            unlockedIcons={unlockedIcons}
            userId={userId}
            onGoldChange={(g) => {
              setCreateGold(g);
              onGoldChange(g);
            }}
            onClose={() => setShowCreate(false)}
            onCreated={(_g: Guild, newGold: number) => {
              setShowCreate(false);
              onGoldChange(newGold);
              onJoined();
            }}
            onToast={onToast}
          />
        )}
      </AnimatePresence>

      {/* ── Insufficient gold modal ── */}
      <AnimatePresence>
        {goldModal !== null && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center p-6"
            style={{ background: "rgba(0,0,0,0.8)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setGoldModal(null)}
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
                className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-3"
                style={{ background: "rgba(251,191,36,0.12)" }}
              >
                <Coins size={26} style={{ color: "#fbbf24" }} />
              </div>
              <p className="text-white font-bold mb-1">
                Need {GUILD_CREATE_COST} Gold to Create Guild
              </p>
              <p className="text-gray-400 text-sm mb-5">
                You have {goldModal.toLocaleString()} gold. Earn more by
                completing quests and workouts.
              </p>
              <button
                onClick={() => setGoldModal(null)}
                className="w-full h-10 rounded-full text-sm font-extrabold text-black"
                style={{
                  background: `linear-gradient(135deg, ${NEON}, #6d28d9)`,
                }}
              >
                GOT IT
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function formatGlory(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default GuildBrowser;
