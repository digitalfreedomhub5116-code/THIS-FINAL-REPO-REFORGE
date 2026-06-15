import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Users,
  Target,
  MessageSquare,
  Swords,
  Landmark,
} from "lucide-react";
import { NEON, glassPanel, getGuildIconUrl } from "./guildTheme";
import { subscribeToGuild } from "../../lib/guildRealtime";
import GuildChat from "./GuildChat";
import GuildInfo from "./GuildInfo";
import GuildMissions from "./GuildMissions";
import GuildVault from "./GuildVault";
import GuildWar from "./GuildWar";
import type { Guild, GuildRole } from "../../types";
import { triggerHaptic } from "../../utils/soundEngine";

type PortalTab = "members" | "mission" | "chat" | "war" | "vault";

const PORTAL_TABS: {
  key: PortalTab;
  label: string;
  icon: React.ComponentType<any>;
}[] = [
  { key: "members", label: "Members", icon: Users },
  { key: "mission", label: "Mission", icon: Target },
  { key: "chat", label: "Chat", icon: MessageSquare },
  { key: "war", label: "War", icon: Swords },
  { key: "vault", label: "Vault", icon: Landmark },
];

interface GuildPortalProps {
  guild: Guild;
  myRole: GuildRole;
  myUserId: string;
  myName: string;
  myAvatarUrl: string | null;
  playerGold: number;
  onGoldChange: (g: number) => void;
  onExitPortal: () => void; // back button → return to main app
  onLeftGuild: () => void; // left/kicked/disbanded → back to browser
  onGuildUpdated?: (partial: Partial<Guild>) => void; // live icon/banner edits from the vault
  onToast?: (
    type: "SUCCESS" | "WARNING" | "ERROR",
    title: string,
    msg?: string
  ) => void;
  unseenMessagesCount?: number;
  onTabChange?: (tab: string) => void;
  joinRequestsCount?: number;
}

const GuildPortal: React.FC<GuildPortalProps> = ({
  guild,
  myRole,
  myUserId,
  myName,
  myAvatarUrl,
  playerGold,
  onGoldChange,
  onExitPortal,
  onLeftGuild,
  onGuildUpdated,
  onToast,
  unseenMessagesCount,
  onTabChange,
  joinRequestsCount,
}) => {
  const [tab, setTab] = useState<PortalTab>("chat"); // Chat is default
  const [missionSignal, setMissionSignal] = useState(0);

  // Keep-Alive lazy Visited Tabs state
  const [visitedTabs, setVisitedTabs] = useState<Record<PortalTab, boolean>>(() => ({
    chat: true, // Default tab is visited by default
  } as Record<PortalTab, boolean>));

  // Presence and Typing States
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Record<string, { name: string; timestamp: number }>>({});

  const sendTypingRef = useRef<(isTyping: boolean) => void>(() => {});
  const sendTyping = useCallback((isTyping: boolean) => {
    sendTypingRef.current(isTyping);
  }, []);

  const onLeftRef = useRef(onLeftGuild);
  onLeftRef.current = onLeftGuild;

  // Track visited tabs
  useEffect(() => {
    setVisitedTabs((prev) => ({ ...prev, [tab]: true }));
    onTabChange?.(tab);
  }, [tab, onTabChange]);

  // Unified realtime subscription (including presence and typing indicators)
  useEffect(() => {
    const { unsubscribe, sendTyping: triggerSendTyping } = subscribeToGuild(
      guild.id,
      {
        onKicked: (uid) => {
          if (uid === myUserId) {
            onToast?.("WARNING", "You were removed from the guild");
            onLeftRef.current();
          }
        },
        onDisbanded: () => {
          onToast?.("WARNING", "This guild was disbanded");
          onLeftRef.current();
        },
        onMissionComplete: (p) => {
          onToast?.("SUCCESS", "Mission completed!", p.title);
          setMissionSignal((n) => n + 1);
        },
        onPresenceSync: (presenceState) => {
          const ids = new Set<string>();
          Object.keys(presenceState).forEach((key) => {
            if (key !== "anonymous") {
              ids.add(key);
            }
          });
          setOnlineUserIds(ids);
        },
        onTyping: ({ userId, name, isTyping }) => {
          setTypingUsers((prev) => {
            const next = { ...prev };
            if (isTyping) {
              next[userId] = { name, timestamp: Date.now() };
            } else {
              delete next[userId];
            }
            return next;
          });
        },
      },
      { userId: myUserId, name: myName }
    );

    sendTypingRef.current = triggerSendTyping;
    return unsubscribe;
  }, [guild.id, myUserId, myName, onToast]);

  // Periodic typing indicators timeout cleanup (every 2 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [userId, info] of Object.entries(next)) {
          if (now - info.timestamp > 4000) {
            delete next[userId];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: "#05060d" }}
    >
      {/* Portal header */}
      <div
        className="flex items-center gap-3 px-4 pt-[calc(12px+env(safe-area-inset-top,0px))] pb-3 border-b border-white/5"
        style={{ background: "rgba(8,8,20,0.9)" }}
      >
        <button
          onClick={onExitPortal}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden"
          style={{ background: "rgba(0,212,255,0.12)" }}
        >
          <img
            src={getGuildIconUrl(guild.icon)}
            alt=""
            className="w-full h-full object-cover rounded-xl"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-heading font-bold truncate leading-tight">
            {guild.name}
          </p>
          <p
            className="text-[10px] font-mono uppercase tracking-wider"
            style={{ color: NEON }}
          >
            {PORTAL_TABS.find((t) => t.key === tab)?.label}
          </p>
        </div>
      </div>

      {/* Screen */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {PORTAL_TABS.map((t) => {
          const isActive = tab === t.key;
          const hasVisited = visitedTabs[t.key];
          if (!hasVisited) return null;

          return (
            <motion.div
              key={t.key}
              initial={false}
              animate={{
                opacity: isActive ? 1 : 0,
                scale: isActive ? 1 : 0.98,
              }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              style={{
                pointerEvents: isActive ? "auto" : "none",
                visibility: isActive ? "visible" : "hidden",
              }}
              className="absolute inset-0"
            >
              {t.key === "members" && (
                <GuildInfo
                  guildId={guild.id}
                  myUserId={myUserId}
                  liveIcon={guild.icon}
                  liveBanner={guild.banner}
                  onLeft={onLeftGuild}
                  onGuildUpdated={onGuildUpdated}
                  onToast={onToast}
                  onlineUserIds={onlineUserIds}
                  typingUsers={typingUsers}
                />
              )}
              {t.key === "mission" && (
                <GuildMissions
                  guildId={guild.id}
                  completionSignal={missionSignal}
                  onToast={onToast}
                />
              )}
              {t.key === "chat" && (
                <GuildChat
                  guildId={guild.id}
                  myUserId={myUserId}
                  myName={myName}
                  myAvatarUrl={myAvatarUrl}
                  myRole={myRole}
                  onKicked={() => {
                    onToast?.("WARNING", "You were removed from the guild");
                    onLeftGuild();
                  }}
                  onDisbanded={() => {
                    onToast?.("WARNING", "This guild was disbanded");
                    onLeftGuild();
                  }}
                  onMissionComplete={(p) => {
                    onToast?.("SUCCESS", "Mission completed!", p.title);
                    setMissionSignal((n) => n + 1);
                  }}
                  onlineUserIds={onlineUserIds}
                  typingUsers={typingUsers}
                  sendTyping={sendTyping}
                />
              )}
              {t.key === "war" && (
                <GuildWar
                  guildId={guild.id}
                  myRole={myRole}
                  onToast={onToast}
                />
              )}
              {t.key === "vault" && (
                <GuildVault
                  guildId={guild.id}
                  myRole={myRole}
                  guildIcon={guild.icon || "shield"}
                  guildBanner={guild.banner || "gradient-cyan"}
                  playerGold={playerGold}
                  onGoldChange={onGoldChange}
                  onGuildUpdated={onGuildUpdated}
                  onToast={onToast}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Portal bottom navbar */}
      <div
        className="flex items-center justify-around px-2 pt-2 pb-[calc(10px+env(safe-area-inset-bottom,0px))] border-t"
        style={{
          ...glassPanel,
          borderTop: "1px solid rgba(0,212,255,0.15)",
          borderRadius: 0,
        }}
      >
        {PORTAL_TABS.map((t) => {
          const active = tab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => {
                triggerHaptic('TAB_SWITCH');
                setTab(t.key);
              }}
              className="relative flex flex-col items-center justify-center w-14 py-1 gap-1"
            >
              {active && (
                <motion.div
                  layoutId="portal-active"
                  className="absolute -top-2 w-8 h-0.5 rounded-full"
                  style={{ background: NEON, boxShadow: `0 0 8px ${NEON}` }}
                />
              )}
              <div className="relative">
                <Icon size={20} style={{ color: active ? NEON : "#6b7280" }} />
                {t.key === "chat" && unseenMessagesCount && unseenMessagesCount > 0 ? (
                  <div
                    className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full flex items-center justify-center font-mono font-bold shadow-[0_0_8px_rgba(239,68,68,0.9)]"
                    style={{
                      minWidth: "14px",
                      height: "14px",
                      fontSize: "8px",
                      padding: "0 2px",
                      borderRadius: "50%",
                    }}
                  >
                    {unseenMessagesCount}
                  </div>
                ) : null}
                {t.key === "members" && joinRequestsCount && joinRequestsCount > 0 ? (
                  <div
                    className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full flex items-center justify-center font-mono font-bold shadow-[0_0_8px_rgba(239,68,68,0.9)]"
                    style={{
                      minWidth: "14px",
                      height: "14px",
                      fontSize: "8px",
                      padding: "0 2px",
                      borderRadius: "50%",
                    }}
                  >
                    {joinRequestsCount}
                  </div>
                ) : null}
              </div>
              <span
                className="text-[9px] font-mono uppercase tracking-wider"
                style={{ color: active ? NEON : "#6b7280" }}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default GuildPortal;
