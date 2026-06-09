import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Info,
  FileText,
  MessageSquare,
  Swords,
  Landmark,
  ArrowLeft,
} from "lucide-react";
import { NEON, glassPanel, getGuildIconUrl } from "./guildTheme";
import { subscribeToGuild } from "../../lib/guildRealtime";
import GuildChat from "./GuildChat";
import GuildInfo from "./GuildInfo";
import GuildGates from "./GuildGates";
import GuildVault from "./GuildVault";
import GuildWar from "./GuildWar";
import type { Guild, GuildRole } from "../../types";

type PortalTab = "info" | "gates" | "chat" | "war" | "vault";

const PORTAL_TABS: {
  key: PortalTab;
  label: string;
  icon: React.ComponentType<any>;
}[] = [
  { key: "info", label: "Info", icon: Info },
  { key: "gates", label: "Gates", icon: FileText },
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
}) => {
  const [tab, setTab] = useState<PortalTab>("chat"); // Chat is default
  const [missionSignal, setMissionSignal] = useState(0);
  const onLeftRef = useRef(onLeftGuild);
  onLeftRef.current = onLeftGuild;

  // Persistent control-event subscription (works on every tab, not just Chat).
  useEffect(() => {
    const unsub = subscribeToGuild(guild.id, {
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
        onToast?.("SUCCESS", "Gate cleared!", p.title);
        setMissionSignal((n) => n + 1);
      },
    });
    return unsub;
  }, [guild.id, myUserId, onToast]);

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
            className="w-full h-full object-cover"
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
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            {tab === "info" && (
              <GuildInfo
                guildId={guild.id}
                myUserId={myUserId}
                liveIcon={guild.icon}
                liveBanner={guild.banner}
                onLeft={onLeftGuild}
                onGuildUpdated={onGuildUpdated}
                onToast={onToast}
              />
            )}
            {tab === "gates" && (
              <GuildGates guildId={guild.id} completionSignal={missionSignal} />
            )}
            {tab === "chat" && (
              <GuildChat
                guildId={guild.id}
                myUserId={myUserId}
                myName={myName}
                myAvatarUrl={myAvatarUrl}
                onKicked={() => {
                  onToast?.("WARNING", "You were removed from the guild");
                  onLeftGuild();
                }}
                onDisbanded={() => {
                  onToast?.("WARNING", "This guild was disbanded");
                  onLeftGuild();
                }}
                onMissionComplete={(p) => {
                  onToast?.("SUCCESS", "Gate cleared!", p.title);
                  setMissionSignal((n) => n + 1);
                }}
              />
            )}
            {tab === "war" && (
              <GuildWar guildId={guild.id} myRole={myRole} onToast={onToast} />
            )}
            {tab === "vault" && (
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
        </AnimatePresence>
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
              onClick={() => setTab(t.key)}
              className="relative flex flex-col items-center justify-center w-14 py-1 gap-1"
            >
              {active && (
                <motion.div
                  layoutId="portal-active"
                  className="absolute -top-2 w-8 h-0.5 rounded-full"
                  style={{ background: NEON, boxShadow: `0 0 8px ${NEON}` }}
                />
              )}
              <Icon size={20} style={{ color: active ? NEON : "#6b7280" }} />
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
