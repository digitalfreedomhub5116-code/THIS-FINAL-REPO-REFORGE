import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Trophy,
  Sparkles,
  Crown,
  Shield,
  LogOut,
  Trash2,
  X,
  Check,
  UserPlus,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Pencil,
  Loader2,
} from "lucide-react";
import {
  NEON,
  glassPanel,
  bannerStyle,
  ROLE_LABEL,
  ROLE_COLOR,
  getGuildIconUrl,
} from "./guildTheme";
import GuildAvatar from "./GuildAvatar";
import {
  fetchGuildDetail,
  fetchJoinRequests,
  resolveJoinRequest,
  setMemberRole,
  kickMember,
  leaveGuild,
  disbandGuild,
  updateGuildDetails,
} from "../../lib/guildApi";
import type {
  Guild,
  GuildMember,
  GuildRole,
  GuildJoinRequest,
} from "../../types";

interface GuildInfoProps {
  guildId: string;
  myUserId: string;
  /** Live icon/banner from the portal so vault edits reflect instantly. */
  liveIcon?: string | null;
  liveBanner?: string | null;
  onLeft: () => void;
  onGuildUpdated?: (partial: Partial<Guild>) => void;
  onToast?: (
    type: "SUCCESS" | "WARNING" | "ERROR",
    title: string,
    msg?: string
  ) => void;
}

const RANK_ROLE: Record<GuildRole, number> = { master: 3, vice: 2, member: 1 };

const GuildInfo: React.FC<GuildInfoProps> = ({
  guildId,
  myUserId,
  liveIcon,
  liveBanner,
  onLeft,
  onGuildUpdated,
  onToast,
}) => {
  const [guild, setGuild] = useState<Guild | null>(null);
  const [members, setMembers] = useState<GuildMember[]>([]);
  const [myRole, setMyRole] = useState<GuildRole | null>(null);
  const [requests, setRequests] = useState<GuildJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<GuildMember | null>(null);
  const [confirm, setConfirm] = useState<null | "leave" | "disband">(null);
  const [infoTab, setInfoTab] = useState<"members" | "requests">("members");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [savingDesc, setSavingDesc] = useState(false);

  const load = useCallback(async () => {
    try {
      const detail = await fetchGuildDetail(guildId);
      setGuild(detail.guild);
      setMembers(detail.members);
      setMyRole(detail.myRole);
      if (detail.myRole && RANK_ROLE[detail.myRole] >= RANK_ROLE.vice) {
        try {
          setRequests(await fetchJoinRequests(guildId));
        } catch {
          /* ignore */
        }
      }
      setError("");
    } catch (e: any) {
      setError(e?.message || "Could not load guild");
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('guild:requests_updated', { detail: { count: requests.length } }));
  }, [requests]);

  const canManage = myRole && RANK_ROLE[myRole] >= RANK_ROLE.vice;

  // Prefer the live icon/banner pushed from the portal (vault edits) over the fetched copy.
  const displayIcon = liveIcon ?? guild?.icon;
  const displayBanner = liveBanner ?? guild?.banner;

  const openDescEditor = () => {
    setDescDraft(guild?.motto || "");
    setEditingDesc(true);
  };

  const saveDescription = async () => {
    const motto = descDraft.trim().slice(0, 120);
    setSavingDesc(true);
    try {
      const r = await updateGuildDetails(guildId, motto);
      setGuild((g) => (g ? { ...g, motto: r.motto } : g));
      onGuildUpdated?.({ motto: r.motto });
      setEditingDesc(false);
      onToast?.("SUCCESS", "Description updated");
    } catch (e: any) {
      onToast?.("ERROR", "Could not update description", e?.message);
    } finally {
      setSavingDesc(false);
    }
  };

  const handleRequest = async (
    r: GuildJoinRequest,
    action: "approve" | "reject"
  ) => {
    try {
      await resolveJoinRequest(guildId, r.id, action);
      setRequests((prev) => prev.filter((x) => x.id !== r.id));
      if (action === "approve") {
        onToast?.("SUCCESS", `${r.name || "Hunter"} joined`);
        load();
      }
    } catch (e: any) {
      onToast?.("ERROR", "Action failed", e?.message);
    }
  };

  const handleRole = async (m: GuildMember, role: "vice" | "member") => {
    try {
      await setMemberRole(guildId, m.userId, role);
      setSelected(null);
      onToast?.("SUCCESS", `${m.name} is now ${ROLE_LABEL[role]}`);
      load();
    } catch (e: any) {
      onToast?.("ERROR", "Could not update role", e?.message);
    }
  };

  const handleKick = async (m: GuildMember) => {
    try {
      await kickMember(guildId, m.userId);
      setSelected(null);
      setMembers((prev) => prev.filter((x) => x.userId !== m.userId));
      onToast?.("SUCCESS", `${m.name} removed`);
    } catch (e: any) {
      onToast?.("ERROR", "Could not kick", e?.message);
    }
  };

  const handleLeave = async () => {
    try {
      await leaveGuild(guildId);
      onLeft();
    } catch (e: any) {
      onToast?.("ERROR", "Could not leave", e?.message);
    }
  };

  const handleDisband = async () => {
    try {
      await disbandGuild(guildId);
      onLeft();
    } catch (e: any) {
      onToast?.("ERROR", "Could not disband", e?.message);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-16 rounded-2xl animate-pulse"
            style={{ background: "rgba(255,255,255,0.04)" }}
          />
        ))}
      </div>
    );
  }
  if (error || !guild) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={28} className="text-red-400 mx-auto mb-2" />
        <p className="text-gray-400 text-sm mb-3">
          {error || "Guild unavailable"}
        </p>
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
    <div className="overflow-y-auto h-full pb-24 px-3">
      {/* Banner */}
      <div
        className="rounded-2xl p-4 mt-3 relative overflow-hidden"
        style={bannerStyle(displayBanner)}
      >
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.5))",
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-black/40 flex items-center justify-center overflow-hidden flex-shrink-0">
            <img
              src={getGuildIconUrl(displayIcon)}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl font-heading font-extrabold text-white leading-tight truncate">
              {guild.name}
            </h2>
            {guild.motto ? (
              <p className="text-white/80 text-xs italic">"{guild.motto}"</p>
            ) : (
              canManage && (
                <p className="text-white/50 text-xs italic">
                  No description yet
                </p>
              )
            )}
          </div>
        </div>
        {canManage && (
          <button
            onClick={openDescEditor}
            className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.35)" }}
            aria-label="Edit description"
          >
            <Pencil size={14} className="text-white" />
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <Stat
          icon={<Users size={15} />}
          label="Members"
          value={`${members.length}/${guild.memberCap}`}
        />
        <Stat
          icon={<Sparkles size={15} />}
          label="Glory"
          value={guild.gloryPoints.toLocaleString()}
        />
        <Stat
          icon={<Trophy size={15} />}
          label="Vault"
          value={`${guild.vaultBalance.toLocaleString()} G`}
        />
      </div>

      {/* Members / Requests segmented control */}
      <div className="flex gap-2 mt-4 mb-3">
        {[
          { key: "members" as const, label: `Members · ${members.length}` },
          {
            key: "requests" as const,
            label: `Requests${
              canManage && requests.length ? ` · ${requests.length}` : ""
            }`,
          },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setInfoTab(t.key)}
            className="flex-1 py-2 rounded-xl text-xs font-bold"
            style={{
              background:
                infoTab === t.key
                  ? "rgba(0,212,255,0.18)"
                  : "rgba(255,255,255,0.04)",
              border:
                infoTab === t.key
                  ? `1px solid ${NEON}`
                  : "1px solid rgba(255,255,255,0.08)",
              color: infoTab === t.key ? NEON : "#94a3b8",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Members tab */}
      {infoTab === "members" && (
        <div className="space-y-2">
          {members.map((m) => (
            <button
              key={m.userId}
              onClick={() => setSelected(m)}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left"
              style={glassPanel}
            >
              <GuildAvatar
                name={m.name}
                avatarUrl={m.avatarUrl}
                size={36}
                ring={ROLE_COLOR[m.role]}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-white text-sm font-semibold truncate">
                    {m.name}
                  </p>
                  {m.role === "master" && (
                    <Crown size={12} className="text-amber-400" />
                  )}
                  {m.role === "vice" && (
                    <Shield size={12} style={{ color: NEON }} />
                  )}
                </div>
                <p
                  className="text-[11px]"
                  style={{ color: ROLE_COLOR[m.role] }}
                >
                  {ROLE_LABEL[m.role]} · {m.contributionPoints.toLocaleString()}{" "}
                  pts
                </p>
              </div>
              <span className="text-[11px] font-mono text-gray-500">
                Lv.{m.level}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Requests tab */}
      {infoTab === "requests" &&
        (!canManage ? (
          <div className="text-center py-10">
            <UserPlus size={26} className="text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">
              Only the Guild Master & Vice can review join requests.
            </p>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-10">
            <UserPlus size={26} className="text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No pending requests.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 p-2.5 rounded-xl"
                style={glassPanel}
              >
                <GuildAvatar name={r.name} avatarUrl={r.avatarUrl} size={34} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">
                    {r.name || "Hunter"}
                  </p>
                  <p className="text-gray-500 text-[11px]">
                    Lv.{r.level || 1} · {r.rank || "E"}
                  </p>
                </div>
                <button
                  onClick={() => handleRequest(r, "approve")}
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: "rgba(16,185,129,0.2)",
                    color: "#10b981",
                  }}
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => handleRequest(r, "reject")}
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: "rgba(239,68,68,0.15)",
                    color: "#ef4444",
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        ))}

      {/* Footer actions */}
      <div className="mt-5 space-y-2">
        {myRole === "master" ? (
          <button
            onClick={() => setConfirm("disband")}
            className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{
              background: "rgba(239,68,68,0.12)",
              color: "#ef4444",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
          >
            <Trash2 size={15} /> Disband Guild
          </button>
        ) : (
          <button
            onClick={() => setConfirm("leave")}
            className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "#cbd5e1",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <LogOut size={15} /> Leave Guild
          </button>
        )}
      </div>

      {/* Member action sheet */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-end justify-center"
            style={{ background: "rgba(0,0,0,0.7)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              className="w-full sm:max-w-md rounded-t-3xl p-5"
              style={glassPanel}
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              exit={{ y: 60 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <GuildAvatar
                  name={selected.name}
                  avatarUrl={selected.avatarUrl}
                  size={48}
                  ring={ROLE_COLOR[selected.role]}
                />
                <div>
                  <p className="text-white font-bold">{selected.name}</p>
                  <p
                    className="text-[12px]"
                    style={{ color: ROLE_COLOR[selected.role] }}
                  >
                    {ROLE_LABEL[selected.role]} · Lv.{selected.level}{" "}
                    {selected.rank}
                  </p>
                  <p className="text-gray-500 text-[11px]">
                    {selected.contributionPoints.toLocaleString()} contribution
                    pts
                  </p>
                </div>
              </div>

              {/* Master controls */}
              {myRole === "master" && selected.userId !== myUserId && (
                <div className="space-y-2">
                  {selected.role === "member" ? (
                    <ActionBtn
                      icon={<ChevronUp size={15} />}
                      label="Promote to Vice Master"
                      onClick={() => handleRole(selected, "vice")}
                    />
                  ) : selected.role === "vice" ? (
                    <ActionBtn
                      icon={<ChevronDown size={15} />}
                      label="Demote to Member"
                      onClick={() => handleRole(selected, "member")}
                    />
                  ) : null}
                  <ActionBtn
                    danger
                    icon={<Trash2 size={15} />}
                    label="Kick from Guild"
                    onClick={() => handleKick(selected)}
                  />
                </div>
              )}
              {/* Vice controls — can kick members only */}
              {myRole === "vice" &&
                selected.role === "member" &&
                selected.userId !== myUserId && (
                  <ActionBtn
                    danger
                    icon={<Trash2 size={15} />}
                    label="Kick from Guild"
                    onClick={() => handleKick(selected)}
                  />
                )}
              {(selected.userId === myUserId || myRole === "member") && (
                <p className="text-center text-gray-500 text-xs py-2">
                  No actions available.
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm modals */}
      <AnimatePresence>
        {confirm && (
          <motion.div
            className="fixed inset-0 z-[85] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirm(null)}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl p-5"
              style={glassPanel}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-white font-bold text-lg mb-1">
                {confirm === "disband" ? "Disband guild?" : "Leave guild?"}
              </h3>
              <p className="text-gray-400 text-sm mb-5">
                {confirm === "disband"
                  ? "This permanently deletes the guild, its chat, vault and history. This cannot be undone."
                  : "You can rejoin later if it stays open."}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirm(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "#cbd5e1",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirm === "disband" ? handleDisband : handleLeave}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: "#ef4444" }}
                >
                  {confirm === "disband" ? "Disband" : "Leave"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit description modal */}
      <AnimatePresence>
        {editingDesc && (
          <motion.div
            className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !savingDesc && setEditingDesc(false)}
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
                  Guild Description
                </h3>
                <button
                  onClick={() => setEditingDesc(false)}
                  className="text-gray-400"
                >
                  <X size={20} />
                </button>
              </div>
              <textarea
                autoFocus
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value.slice(0, 120))}
                maxLength={120}
                rows={3}
                placeholder="Describe your guild's vision…"
                className="w-full rounded-xl px-4 py-3 text-white text-sm focus:outline-none resize-none"
                style={{
                  background: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              />
              <div className="flex justify-end mb-4">
                <span className="text-xs text-gray-500 font-mono">
                  {descDraft.length}/120
                </span>
              </div>
              <button
                onClick={saveDescription}
                disabled={savingDesc}
                className="w-full py-3 rounded-xl font-bold text-black disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  background: `linear-gradient(135deg, ${NEON}, #6d28d9)`,
                }}
              >
                {savingDesc ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Check size={16} /> Save Description
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

const Stat: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <div className="rounded-xl p-3 text-center" style={glassPanel}>
    <div
      className="flex items-center justify-center mb-1"
      style={{ color: NEON }}
    >
      {icon}
    </div>
    <p className="text-white font-bold text-sm">{value}</p>
    <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
      {label}
    </p>
  </div>
);

const ActionBtn: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}> = ({ icon, label, onClick, danger }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition"
    style={{
      background: danger ? "rgba(239,68,68,0.12)" : "rgba(0,212,255,0.1)",
      color: danger ? "#ef4444" : NEON,
    }}
  >
    {icon} {label}
  </button>
);

export default GuildInfo;
