import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Download, X, AlertTriangle, Cpu } from "lucide-react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { AppUpdate, AppUpdateAvailability } from "@capawesome/capacitor-app-update";
import { NEON, glassPanel } from "./guilds/guildTheme";

interface VersionConfig {
  latest_version: string;
  min_version: string;
  play_store_url: string;
}

export const UpdateChecker: React.FC = () => {
  const [status, setStatus] = useState<"checking" | "idle" | "force_update" | "suggest_update">("checking");
  const [config, setConfig] = useState<VersionConfig | null>(null);
  const [localVersion, setLocalVersion] = useState("5.0.2");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkVersion();
  }, []);

  const parseVersion = (v: string): number[] => {
    return v.split(".").map((x) => parseInt(x) || 0);
  };

  const isLessThan = (v1: string, v2: string): boolean => {
    const p1 = parseVersion(v1);
    const p2 = parseVersion(v2);
    for (let i = 0; i < 3; i++) {
      if (p1[i] < p2[i]) return true;
      if (p1[i] > p2[i]) return false;
    }
    return false;
  };

  const checkVersion = async () => {
    try {
      // 1. Get running app version (with fallback for web/dev)
      let currentVersion = "5.0.2";
      try {
        const info = await App.getInfo();
        if (info && info.version) {
          currentVersion = info.version;
          setLocalVersion(info.version);
        }
      } catch (e) {
        console.warn("[UpdateChecker] Capacitor App info unavailable, using fallback version", e);
      }

      // 2. Fetch the current remote configuration
      const res = await fetch("/api/global-config/app_version");
      if (!res.ok) throw new Error("Failed to load version config");
      const remoteConfig: VersionConfig = await res.json();
      
      // If config is empty or missing, skip the check
      if (!remoteConfig.latest_version || !remoteConfig.min_version) {
        setStatus("idle");
        return;
      }
      setConfig(remoteConfig);

      // 3. Native Play Store Update API progressive enhancement (Android only)
      if (Capacitor.getPlatform() === "android") {
        try {
          const updateInfo = await AppUpdate.getAppUpdateInfo();
          if (updateInfo.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE) {
            // If the version is below min_version, trigger native Immediate Update
            if (isLessThan(currentVersion, remoteConfig.min_version) && updateInfo.immediateUpdateAllowed) {
              await AppUpdate.performImmediateUpdate();
              return;
            }
            // Otherwise, we can trigger native Flexible Update in the background
            if (updateInfo.flexibleUpdateAllowed) {
              await AppUpdate.startFlexibleUpdate();
            }
          }
        } catch (nativeErr) {
          console.warn("[UpdateChecker] Google Play Core API check failed, falling back to server-side", nativeErr);
        }
      }

      // 4. Server-Side Version Handshake check (Android/iOS/Web fallback)
      if (isLessThan(currentVersion, remoteConfig.min_version)) {
        setStatus("force_update");
      } else if (isLessThan(currentVersion, remoteConfig.latest_version)) {
        // Check if user has already dismissed this update prompt today
        const today = new Date().toISOString().slice(0, 10);
        const lastDismissed = localStorage.getItem("reforge_update_dismissed");
        if (lastDismissed !== today) {
          setStatus("suggest_update");
        } else {
          setStatus("idle");
        }
      } else {
        setStatus("idle");
      }
    } catch (err) {
      console.warn("[UpdateChecker] Update check error:", err);
      setStatus("idle"); // Fallback to let the user use the app on network/API failure
    }
  };

  const handleUpdate = () => {
    if (!config?.play_store_url) return;
    setLoading(true);
    window.open(config.play_store_url, "_system");
    setTimeout(() => setLoading(false), 2000);
  };

  const handleDismiss = () => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem("reforge_update_dismissed", today);
    setStatus("idle");
  };

  if (status === "checking" || status === "idle") return null;

  return (
    <AnimatePresence>
      {/* ── MANDATORY / FORCED UPDATE MODAL ── */}
      {status === "force_update" && (
        <motion.div
          className="fixed inset-0 z-[999] flex items-center justify-center p-6"
          style={{ background: "rgba(3,3,10,0.95)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Neon Grid Backdrop */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px] opacity-60 pointer-events-none" />
          
          <motion.div
            className="w-full max-w-sm rounded-3xl p-6 text-center border relative overflow-hidden"
            style={{
              ...glassPanel,
              border: `1px solid ${NEON}`,
              boxShadow: `0 0 30px rgba(0,212,255,0.15), inset 0 1px 0 rgba(255,255,255,0.1)`,
            }}
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", damping: 20 }}
          >
            {/* Animated Glow Spot */}
            <div className="absolute -top-20 -left-20 w-44 h-44 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

            <div
              className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 relative"
              style={{
                background: "rgba(0,212,255,0.08)",
                border: `1px solid ${NEON}`,
                boxShadow: `0 0 15px ${NEON}44`,
              }}
            >
              <Cpu className="text-cyan-400 animate-pulse" size={28} />
            </div>

            <h2 className="text-white font-heading font-black text-lg tracking-wider uppercase mb-2">
              System Calibration Required
            </h2>
            <p className="text-gray-400 text-xs leading-relaxed mb-6">
              The System has detected a mismatch between your device build (v{localVersion}) and the server gateways. 
              Please download the latest protocol version to re-establish synchronicity.
            </p>

            <button
              onClick={handleUpdate}
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-heading font-black text-xs uppercase tracking-wider text-black flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${NEON}, #6d28d9)`,
                boxShadow: `0 0 18px ${NEON}55`,
              }}
            >
              {loading ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <Download size={15} />
              )}
              Initialize Sync Update
            </button>
            <p className="text-[10px] font-mono text-gray-600 mt-3">
              Version Gate (v{config?.min_version} Required)
            </p>
          </motion.div>
        </motion.div>
      )}

      {/* ── OPTIONAL / DISMISSIBLE UPDATE NOTIFICATION CARD ── */}
      {status === "suggest_update" && (
        <motion.div
          className="fixed bottom-6 inset-x-6 z-[990] flex justify-center pointer-events-none"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ type: "spring", damping: 20 }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-4 border pointer-events-auto relative overflow-hidden"
            style={{
              ...glassPanel,
              border: "1px solid rgba(0,212,255,0.25)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
              background: "linear-gradient(180deg, rgba(8,8,24,0.95) 0%, rgba(3,3,10,0.98) 100%)",
            }}
          >
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-gray-500 hover:text-white p-1 transition"
              aria-label="Dismiss update"
            >
              <X size={15} />
            </button>

            <div className="flex gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: "rgba(0,212,255,0.06)",
                  border: "1px solid rgba(0,212,255,0.2)",
                }}
              >
                <Cpu className="text-cyan-400" size={18} />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <h4 className="text-white font-heading font-extrabold text-sm uppercase tracking-wider">
                  New Gate Unlocked
                </h4>
                <p className="text-gray-400 text-xs mt-0.5 leading-snug">
                  An optimization patch (v{config?.latest_version}) is available. Level up your performance today!
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-4 pt-3 border-t border-white/5">
              <button
                onClick={handleDismiss}
                className="flex-1 py-2 rounded-lg text-[10px] font-bold tracking-wider text-gray-400 uppercase transition"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                Later
              </button>
              <button
                onClick={handleUpdate}
                disabled={loading}
                className="flex-1 py-2 rounded-lg text-[10px] font-heading font-black tracking-wider text-black uppercase transition flex items-center justify-center gap-1"
                style={{
                  background: NEON,
                  boxShadow: `0 0 10px ${NEON}44`,
                }}
              >
                {loading ? (
                  <RefreshCw size={11} className="animate-spin" />
                ) : (
                  <Download size={11} />
                )}
                Update Patch
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
