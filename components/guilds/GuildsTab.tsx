import React, { useEffect, useState, useCallback } from "react";
import GuildBrowser from "./GuildBrowser";
import GuildPortal from "./GuildPortal";
import { fetchMyGuild } from "../../lib/guildApi";
import type { Guild, GuildRole, PlayerData } from "../../types";

interface GuildsTabProps {
  player: PlayerData;
  isPremium: boolean;
  onUpgradePro: () => void;
  /** Tell App whether we're inside the immersive portal (App hides the main navbar). */
  onPortalChange: (inPortal: boolean) => void;
  /** Back button in portal → return to main app. */
  onExitToApp: () => void;
  /** Sync player gold after vault donations. */
  onGoldChange: (newGold: number) => void;
  onToast?: (
    type: "SUCCESS" | "WARNING" | "ERROR",
    title: string,
    msg?: string
  ) => void;
}

const GuildsTab: React.FC<GuildsTabProps> = ({
  player,
  onPortalChange,
  onExitToApp,
  onGoldChange,
  onToast,
}) => {
  const [guild, setGuild] = useState<Guild | null>(null);
  const [myRole, setMyRole] = useState<GuildRole | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { guild: g, membership } = await fetchMyGuild();
      setGuild(g);
      setMyRole(membership?.role || null);
    } catch {
      setGuild(null);
      setMyRole(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Notify App about portal state (membership present = immersive portal).
  useEffect(() => {
    onPortalChange(!!guild && !loading);
    return () => onPortalChange(false);
  }, [guild, loading, onPortalChange]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto pt-10">
        <div
          className="h-32 rounded-2xl animate-pulse mb-3"
          style={{ background: "rgba(255,255,255,0.04)" }}
        />
        <div
          className="h-28 rounded-2xl animate-pulse"
          style={{ background: "rgba(255,255,255,0.04)" }}
        />
      </div>
    );
  }

  if (guild && myRole) {
    return (
      <GuildPortal
        guild={guild}
        myRole={myRole}
        myUserId={player.userId || ""}
        myName={player.username || player.name || "Hunter"}
        myAvatarUrl={player.avatarUrl || null}
        playerGold={player.gold}
        onGoldChange={onGoldChange}
        onExitPortal={onExitToApp}
        onLeftGuild={() => {
          setGuild(null);
          setMyRole(null);
          onPortalChange(false);
          refresh();
        }}
        onGuildUpdated={(partial) =>
          setGuild((g) => (g ? { ...g, ...partial } : g))
        }
        onToast={onToast}
      />
    );
  }

  return (
    <GuildBrowser
      playerGold={player.gold}
      userId={player.userId || ""}
      onGoldChange={onGoldChange}
      onJoined={refresh}
      onToast={onToast}
    />
  );
};

export default GuildsTab;
