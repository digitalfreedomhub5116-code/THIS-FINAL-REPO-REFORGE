import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, ShieldAlert, ShieldCheck, Settings, RefreshCw, AlertCircle, 
  Search, Filter, Sliders, Cpu, Info, ChevronDown, ChevronUp, Lock, 
  LayoutGrid, Camera, Play, Youtube, Facebook, Twitter, Chrome, Gamepad, AppWindow, AlertTriangle,
  Clock, BarChart3, Smartphone
} from 'lucide-react';
import { showSystemToast } from './SystemToast';
import { playSystemSoundEffect } from '../utils/soundEngine';

interface FocusShieldSettingsProps {
  playerData?: any;
  isPremium?: boolean;
  onUpgradePro?: () => void;
}

interface AppLockConfig {
  packageName: string;
  appName: string;
  limitMinutes: number;
  questReps: number;
  bypassMinutes: number;
  enabled: boolean;
}

const DEFAULT_APPS: AppLockConfig[] = [
  { packageName: 'com.instagram.android', appName: 'Instagram', limitMinutes: 30, questReps: 20, bypassMinutes: 60, enabled: false },
  { packageName: 'com.zhiliaoapp.musically', appName: 'TikTok', limitMinutes: 20, questReps: 20, bypassMinutes: 60, enabled: false },
  { packageName: 'com.google.android.youtube', appName: 'YouTube', limitMinutes: 45, questReps: 25, bypassMinutes: 60, enabled: false },
  { packageName: 'com.facebook.katana', appName: 'Facebook', limitMinutes: 30, questReps: 15, bypassMinutes: 45, enabled: false },
  { packageName: 'com.twitter.android', appName: 'Twitter / X', limitMinutes: 30, questReps: 15, bypassMinutes: 45, enabled: false }
];

const getAppIcon = (packageName: string) => {
  const pkg = packageName.toLowerCase();
  if (pkg.includes('instagram') || pkg.includes('snapchat')) return <Camera className="w-4 h-4 text-slate-400" />;
  if (pkg.includes('youtube')) return <Youtube className="w-4 h-4 text-slate-400" />;
  if (pkg.includes('facebook')) return <Facebook className="w-4 h-4 text-slate-400" />;
  if (pkg.includes('twitter') || pkg.includes('x.android')) return <Twitter className="w-4 h-4 text-slate-400" />;
  if (pkg.includes('tiktok') || pkg.includes('musically')) return <Play className="w-4 h-4 text-slate-400" />;
  if (pkg.includes('chrome') || pkg.includes('browser') || pkg.includes('firefox')) return <Chrome className="w-4 h-4 text-slate-400" />;
  if (pkg.includes('game') || pkg.includes('play') || pkg.includes('unity')) return <Gamepad className="w-4 h-4 text-slate-400" />;
  return <AppWindow className="w-4 h-4 text-slate-400" />;
};

const CustomToggleSwitch = ({ active, onChange }: { active: boolean; onChange: () => void }) => {
  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`w-[52px] h-7 rounded-full p-0.5 cursor-pointer transition-all duration-300 flex items-center relative border ${
        active 
          ? 'bg-cyan-950/40 border-cyan-500/50 justify-end shadow-[0_0_10px_rgba(6,182,212,0.15)]' 
          : 'bg-slate-950 border-slate-800 justify-start'
      }`}
    >
      <motion.div 
        layout
        className={`w-[22px] h-[22px] rounded-full flex items-center justify-center transition-all ${
          active ? 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.8)]' : 'bg-slate-700'
        }`}
      >
        {active && <span className="text-white text-[10px] font-black font-sans leading-none">✓</span>}
      </motion.div>
    </div>
  );
};

export default function FocusShieldSettings({ playerData, isPremium = false, onUpgradePro }: FocusShieldSettingsProps) {
  const [isSupported, setIsSupported] = useState(true);
  const [permissions, setPermissions] = useState({ usageGranted: false, overlayGranted: false });
  const [isShieldEnabled, setIsShieldEnabled] = useState(false);
  const [lockedApps, setLockedApps] = useState<AppLockConfig[]>(DEFAULT_APPS);
  const [selectedAppPackage, setSelectedAppPackage] = useState<string | null>(null);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEnabledOnly, setFilterEnabledOnly] = useState(false);
  const [loadingApps, setLoadingApps] = useState(false);

  // Screen Time Usage Stats
  const [usageStats, setUsageStats] = useState<{ packageName: string; appName: string; usageMinutes: number }[]>([]);
  const [usagePermitted, setUsagePermitted] = useState(false);
  const [loadingUsage, setLoadingUsage] = useState(false);

  // Premium lock dialog
  const [showProModal, setShowProModal] = useState(false);

  // Check support and load initial permissions & configurations
  useEffect(() => {
    const isAndroid = (window as any).Capacitor?.getPlatform() === 'android';
    if (!isAndroid) {
      setIsSupported(false);
      return;
    }

    loadSettingsAndApps();
    checkPermissions();
    fetchUsageStats();

    // Check permissions periodically on window focus
    const handleFocus = () => {
      checkPermissions();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Force system off if premium runs out
  useEffect(() => {
    if (!isPremium && isShieldEnabled) {
      setIsShieldEnabled(false);
      localStorage.setItem('reforge_focus_shield_enabled', 'false');
      const stopService = async () => {
        try {
          const plugin = (window as any).Capacitor?.Plugins?.TrackingPlugin;
          if (plugin) {
            await plugin.stopFocusShield();
          }
        } catch {}
      };
      stopService();
    }
  }, [isPremium, isShieldEnabled]);

  const loadSettingsAndApps = async () => {
    setLoadingApps(true);
    try {
      const enabled = localStorage.getItem('reforge_focus_shield_enabled') === 'true' && isPremium;
      setIsShieldEnabled(enabled);

      let savedApps: AppLockConfig[] = DEFAULT_APPS;
      const savedAppsStr = localStorage.getItem('reforge_focus_shield_apps');
      if (savedAppsStr) {
        try {
          savedApps = JSON.parse(savedAppsStr);
        } catch { /* fallback default */ }
      }

      // Fetch installed apps if on Android
      const plugin = (window as any).Capacitor?.Plugins?.TrackingPlugin;
      if (plugin?.getInstalledApps) {
        const res = await plugin.getInstalledApps();
        if (res?.apps && Array.isArray(res.apps)) {
          // Merge installed launcher apps with our saved configurations
          const merged = res.apps.map((app: any) => {
            const savedApp = savedApps.find(s => s.packageName === app.packageName);
            return {
              packageName: app.packageName,
              appName: app.appName,
              limitMinutes: savedApp ? savedApp.limitMinutes : 30,
              questReps: savedApp ? savedApp.questReps : 20,
              bypassMinutes: savedApp ? savedApp.bypassMinutes : 60,
              enabled: savedApp ? savedApp.enabled : false
            };
          });
          setLockedApps(merged);
          setLoadingApps(false);
          fetchUsageStats();
          return;
        }
      }

      // Fallback if plugin is not supported or web simulator
      setLockedApps(savedApps);
    } catch (e) {
      console.error('Failed to load local shield settings and apps', e);
    }
    setLoadingApps(false);
  };

  const checkPermissions = async () => {
    try {
      const plugin = (window as any).Capacitor?.Plugins?.TrackingPlugin;
      if (!plugin) return;

      const res = await plugin.checkFocusShieldPermissions();
      setPermissions({ usageGranted: res.usageGranted, overlayGranted: res.overlayGranted });

      // If permissions are active and shield is marked enabled, ensure native service is running
      const enabled = localStorage.getItem('reforge_focus_shield_enabled') === 'true' && isPremium;
      if (res.usageGranted && res.overlayGranted) {
        if (enabled) {
          await plugin.startFocusShield();
        }

        // Auto-deploy loop: if user returning from granting settings
        const deploying = localStorage.getItem('reforge_focus_shield_deploying') === 'true';
        if (deploying && isPremium) {
          localStorage.removeItem('reforge_focus_shield_deploying');
          const startRes = await plugin.startFocusShield();
          if (startRes.started) {
            setIsShieldEnabled(true);
            localStorage.setItem('reforge_focus_shield_enabled', 'true');
            // Auto sync active config
            await syncNativeConfig(lockedApps);
            showSystemToast({
              type: 'QUEST_FORGED',
              title: 'Focus Shield Deployed',
              subtitle: 'Digital quarantine system is active.',
              durationMs: 4000
            });
          }
        }
      } else {
        // Auto overlay request: if usage was just granted inside deploying loop
        const deploying = localStorage.getItem('reforge_focus_shield_deploying') === 'true';
        if (deploying && res.usageGranted && !res.overlayGranted) {
          await plugin.requestOverlayPermission();
        }
      }
    } catch (e) {
      console.error('Permission check failed', e);
    }
  };

  const fetchUsageStats = async () => {
    setLoadingUsage(true);
    try {
      const plugin = (window as any).Capacitor?.Plugins?.TrackingPlugin;
      if (!plugin?.getAppUsageStats) {
        setLoadingUsage(false);
        return;
      }
      const res = await plugin.getAppUsageStats();
      setUsagePermitted(res.permitted ?? false);
      if (res.permitted && res.apps) {
        // Sort by usage descending
        const sorted = [...res.apps].sort((a: any, b: any) => b.usageMinutes - a.usageMinutes);
        setUsageStats(sorted);
      }
    } catch (e) {
      console.error('Failed to fetch usage stats', e);
    }
    setLoadingUsage(false);
  };

  const grantUsagePermission = async () => {
    try {
      playSystemSoundEffect('SELECT');
      const plugin = (window as any).Capacitor?.Plugins?.TrackingPlugin;
      if (plugin) {
        await plugin.requestUsagePermission();
      }
    } catch (e) {
      console.error('Failed to request usage permission', e);
    }
  };

  const grantOverlayPermission = async () => {
    try {
      playSystemSoundEffect('SELECT');
      const plugin = (window as any).Capacitor?.Plugins?.TrackingPlugin;
      if (plugin) {
        await plugin.requestOverlayPermission();
      }
    } catch (e) {
      console.error('Failed to request overlay permission', e);
    }
  };

  const toggleShieldMaster = async () => {
    const nextState = !isShieldEnabled;
    playSystemSoundEffect('TAB_SWITCH');

    const plugin = (window as any).Capacitor?.Plugins?.TrackingPlugin;
    if (!plugin) return;

    if (nextState) {
      // Check permissions
      const res = await plugin.checkFocusShieldPermissions();
      if (!res.usageGranted || !res.overlayGranted) {
        // Start permission loop
        localStorage.setItem('reforge_focus_shield_deploying', 'true');
        showSystemToast({
          type: 'INFO',
          title: 'Permission Sequence Started',
          subtitle: 'Please grant the required Android permissions.',
          durationMs: 4000
        });
        
        if (!res.usageGranted) {
          await plugin.requestUsagePermission();
        } else {
          await plugin.requestOverlayPermission();
        }
        return;
      }

      // If permissions are already granted, deploy immediately
      const startRes = await plugin.startFocusShield();
      if (startRes.started) {
        setIsShieldEnabled(true);
        localStorage.setItem('reforge_focus_shield_enabled', 'true');
        await syncNativeConfig(lockedApps);
        showSystemToast({
          type: 'QUEST_FORGED',
          title: 'Focus Shield Deployed',
          subtitle: 'Digital quarantine system is active.',
          durationMs: 4000
        });
      }
    } else {
      // Shutdown Focus Shield
      await plugin.stopFocusShield();
      setIsShieldEnabled(false);
      localStorage.setItem('reforge_focus_shield_enabled', 'false');
      showSystemToast({
        type: 'INFO',
        title: 'Focus Shield Offline',
        subtitle: 'Active locks have been suspended.',
        durationMs: 4000
      });
    }
  };

  const handleMasterToggleClick = () => {
    if (!isPremium) {
      playSystemSoundEffect('DEBUFF_CAST');
      showSystemToast({
        type: 'WARNING',
        title: 'Pro Feature Required',
        subtitle: 'The Focus Shield is a Reforge Pro feature.',
        durationMs: 5000
      });
      onUpgradePro?.();
      return;
    }
    toggleShieldMaster();
  };

  const updateAppLockState = async (packageName: string, enabled: boolean) => {
    if (!isShieldEnabled) {
      playSystemSoundEffect('DEBUFF_CAST');
      showSystemToast({
        type: 'WARNING',
        title: 'Master Switch Offline',
        subtitle: 'Enable the Master System Switch first.',
        durationMs: 3000
      });
      return;
    }
    playSystemSoundEffect('SELECT');
    const updated = lockedApps.map(app => app.packageName === packageName ? { ...app, enabled } : app);
    setLockedApps(updated);
    localStorage.setItem('reforge_focus_shield_apps', JSON.stringify(updated));
    await syncNativeConfig(updated);
  };

  const updateAppParams = async (packageName: string, limitMinutes: number, questReps: number) => {
    const updated = lockedApps.map(app => 
      app.packageName === packageName ? { ...app, limitMinutes, questReps } : app
    );
    setLockedApps(updated);
    localStorage.setItem('reforge_focus_shield_apps', JSON.stringify(updated));
    await syncNativeConfig(updated);
  };

  const syncNativeConfig = async (configs: AppLockConfig[]) => {
    try {
      const plugin = (window as any).Capacitor?.Plugins?.TrackingPlugin;
      if (!plugin) return;

      // Extract active package name -> limit mapping
      const mapping: Record<string, number> = {};
      configs.forEach(app => {
        if (app.enabled) {
          mapping[app.packageName] = app.limitMinutes;
        }
      });

      await plugin.updateFocusShieldConfig({ lockedApps: mapping });
    } catch (e) {
      console.error('Failed to sync configs with native side', e);
    }
  };

  const activeAppsCount = lockedApps.filter(app => app.enabled).length;

  // Filter and sort apps (active apps float to the top)
  const filteredApps = lockedApps
    .filter(app => {
      const matchesSearch = app.appName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            app.packageName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterEnabledOnly ? app.enabled : true;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (a.enabled && !b.enabled) return -1;
      if (!a.enabled && b.enabled) return 1;
      return a.appName.localeCompare(b.appName);
    });

  if (!isSupported) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-950/40 border border-rose-500/20 rounded-2xl max-w-md mx-auto text-center relative overflow-hidden shadow-neon-red animate-fade-in">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.05),transparent)] pointer-events-none" />
        
        <ShieldAlert className="w-12 h-12 text-rose-500 mb-4 animate-pulse" />
        <h3 className="text-sm font-extrabold text-white font-heading uppercase tracking-widest mb-2">
          Gate Refused: iOS Restriction
        </h3>
        <p className="text-xs text-slate-400 font-sans leading-relaxed max-w-[280px]">
          Due to Apple sandboxing constraints, Focus Shield telemetry is unavailable. This module is exclusive to Android OS.
        </p>
        <div className="mt-6 border-t border-slate-900 pt-4 w-full flex items-center justify-center gap-1.5 text-[9px] font-mono text-slate-650">
          <span>INTERFACE ACCESS ERROR</span>
          <span>•</span>
          <span>CODE: PLATFORM_MUTATION_LIMIT</span>
        </div>
      </div>
    );
  }

  const totalUsageMinutes = usageStats.reduce((sum, a) => sum + a.usageMinutes, 0);
  const totalHours = Math.floor(totalUsageMinutes / 60);
  const totalMins = totalUsageMinutes % 60;
  const topUsageApps = usageStats.slice(0, 3);
  const maxUsage = topUsageApps.length > 0 ? topUsageApps[0].usageMinutes : 1;

  return (
    <div className="space-y-6 max-w-md mx-auto pb-8 animate-fade-in px-4">
      {/* Visual Header matching the screenshot */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-6 px-1">
        <LayoutGrid className="w-5 h-5 text-slate-400 cursor-pointer active:scale-90 transition-transform" />
        <span className="text-sm font-heading font-black text-white tracking-[0.05em] uppercase">
          SYSTEM INTERFACE
        </span>
        <Settings className="w-5 h-5 text-slate-400 cursor-pointer active:scale-90 transition-transform" />
      </div>

      {/* ═══ App Screen Time Usage Dashboard ═══ */}
      <div className="bg-[#0B0D13]/90 border border-[#171B26] rounded-2xl relative overflow-hidden">
        {/* Dashboard header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-950/50 border border-violet-500/30 flex items-center justify-center">
              <Clock className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Today's Screen Time</span>
              <span className="text-lg font-heading font-black text-white">
                {loadingUsage ? (
                  <span className="text-xs text-slate-500 animate-pulse">Scanning...</span>
                ) : (
                  <>{totalHours}<span className="text-xs text-slate-500 font-mono">h</span> {totalMins}<span className="text-xs text-slate-500 font-mono">m</span></>
                )}
              </span>
            </div>
          </div>
          <button 
            onClick={fetchUsageStats}
            className="p-2 rounded-lg bg-[#121620] border border-[#1e2535] text-slate-500 hover:text-violet-400 transition-colors active:scale-90"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingUsage ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Top apps usage bars */}
        {!loadingUsage && usagePermitted && topUsageApps.length > 0 && (
          <div className="px-5 pb-5 space-y-2.5">
            {topUsageApps.map((app, idx) => {
              const pct = Math.max(5, Math.round((app.usageMinutes / maxUsage) * 100));
              const barColors = [
                'from-violet-500 to-purple-600',
                'from-cyan-500 to-blue-600', 
                'from-emerald-500 to-teal-600'
              ];
              return (
                <div key={app.packageName} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded flex items-center justify-center bg-slate-900 border border-slate-800">
                        {getAppIcon(app.packageName)}
                      </div>
                      <span className="text-[10px] font-bold text-slate-300 truncate max-w-[140px]">{app.appName}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {app.usageMinutes >= 60 
                        ? `${Math.floor(app.usageMinutes / 60)}h ${app.usageMinutes % 60}m`
                        : `${app.usageMinutes}m`
                      }
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.15, ease: 'easeOut' }}
                      className={`h-full rounded-full bg-gradient-to-r ${barColors[idx] || barColors[0]}`}
                    />
                  </div>
                </div>
              );
            })}
            {usageStats.length > 3 && (
              <div className="text-center pt-1">
                <span className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">
                  +{usageStats.length - 3} more apps tracked
                </span>
              </div>
            )}
          </div>
        )}

        {/* Permission not granted state */}
        {!loadingUsage && !usagePermitted && (
          <div className="px-5 pb-5">
            <div className="flex items-center gap-2 text-[9px] font-mono text-amber-500/80 bg-amber-950/20 border border-amber-500/10 rounded-lg p-3">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Grant Usage Access permission (Gate 1) to view screen time data.</span>
            </div>
          </div>
        )}
      </div>

      {/* Switch Card (Master System Switch) */}
      <div className="flex flex-col items-center justify-center p-6 bg-[#0B0D13]/90 border border-[#171B26] rounded-2xl relative overflow-hidden">
        <span className="text-xs font-heading font-black text-white uppercase tracking-widest text-center">
          MASTER SYSTEM SWITCH
        </span>
        <span className="text-[9px] font-mono mt-1 text-center font-bold flex items-center gap-1.5 justify-center uppercase">
          {isShieldEnabled ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-pulse" />
              <span className="text-[#00d4ff] tracking-wide">DEPLOYED & RUNNING</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
              <span className="text-slate-500 tracking-wide">SYSTEM OFFLINE</span>
            </>
          )}
        </span>
        
        <div className="mt-6">
          <CustomToggleSwitch active={isShieldEnabled} onChange={handleMasterToggleClick} />
        </div>
      </div>

      {/* SYSTEM GATES */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1 text-slate-500 font-mono text-[10px] tracking-wider uppercase">
          <Cpu className="w-4 h-4" /> System Gates
        </div>
        
        <div className="space-y-2.5">
          {/* Gate 1: Usage Access */}
          <div className={`bg-[#0B0D13]/70 border border-[#171B26] rounded-xl flex items-center justify-between p-4 relative overflow-hidden ${
            permissions.usageGranted ? 'border-l-4 border-l-[#00d4ff]' : 'border-l-4 border-l-rose-500/80'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`${permissions.usageGranted ? 'text-[#00d4ff]' : 'text-rose-500'}`}>
                <RefreshCw className={`w-5 h-5 ${permissions.usageGranted ? 'animate-spin-slow' : ''}`} />
              </div>
              <span className="text-xs font-bold text-white font-mono tracking-wide">
                Gate 1: Usage Access
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {permissions.usageGranted ? (
                <span className="text-[9px] font-mono text-[#00d4ff] font-bold bg-[#00d4ff]/10 border border-[#00d4ff]/30 px-2.5 py-1 rounded">
                  GRANTED
                </span>
              ) : (
                <>
                  <span className="text-[9px] font-mono text-rose-400 font-bold bg-rose-950/20 border border-rose-500/30 px-2.5 py-1 rounded">
                    DENIED
                  </span>
                  <button
                    onClick={grantUsagePermission}
                    className="bg-[#121620] border border-[#1e2535] text-slate-350 font-mono text-[9px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all hover:bg-slate-800 hover:text-white"
                  >
                    CONFIGURE
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Gate 2: Draw Over Apps */}
          <div className={`bg-[#0B0D13]/70 border border-[#171B26] rounded-xl flex items-center justify-between p-4 relative overflow-hidden ${
            permissions.overlayGranted ? 'border-l-4 border-l-[#00d4ff]' : 'border-l-4 border-l-rose-500/80'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`${permissions.overlayGranted ? 'text-[#00d4ff]' : 'text-rose-500'}`}>
                <Cpu className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-white font-mono tracking-wide">
                Gate 2: Draw Over Apps
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {permissions.overlayGranted ? (
                <span className="text-[9px] font-mono text-[#00d4ff] font-bold bg-[#00d4ff]/10 border border-[#00d4ff]/30 px-2.5 py-1 rounded">
                  GRANTED
                </span>
              ) : (
                <>
                  <span className="text-[9px] font-mono text-rose-400 font-bold bg-rose-950/20 border border-rose-500/30 px-2.5 py-1 rounded">
                    DENIED
                  </span>
                  <button
                    onClick={grantOverlayPermission}
                    className="bg-[#121620] border border-[#1e2535] text-slate-350 font-mono text-[9px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all hover:bg-slate-800 hover:text-white"
                  >
                    CONFIGURE
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Targeted Containment List */}
      <div className="space-y-3">
        {/* Holographic Search & Filter Bar */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search targets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#05070B] border border-[#171B26] focus:border-[#00d4ff]/40 focus:ring-1 focus:ring-[#00d4ff]/20 rounded-xl pl-11 pr-4 py-3 text-xs font-mono text-white placeholder-slate-650 focus:outline-none transition-all"
            />
          </div>

          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[10px] uppercase font-bold">
              <Lock className="w-3.5 h-3.5" />
              <span>LOCKED: <span className="text-[#00d4ff]">{activeAppsCount}</span> / <span className="text-[#00d4ff]">{lockedApps.length}</span> APPS</span>
            </div>
            
            <button
              onClick={() => { playSystemSoundEffect('SELECT'); setFilterEnabledOnly(!filterEnabledOnly); }}
              className={`p-1.5 border rounded-lg flex items-center justify-center transition-all ${
                filterEnabledOnly 
                  ? 'bg-cyan-950/40 border-cyan-500/50 text-[#00d4ff] shadow-[0_0_8px_rgba(6,182,212,0.15)]' 
                  : 'bg-[#0B0D13] border-[#171B26] text-slate-550 hover:text-slate-350'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dynamic App List */}
        <div className="bg-[#05070B]/40 border border-[#171B26] rounded-2xl p-2 relative overflow-hidden">
          {loadingApps ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="relative flex items-center justify-center">
                <div className="w-8 h-8 border border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
                <Cpu className="w-3 h-3 text-[#00d4ff] absolute animate-pulse" />
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest animate-pulse">
                Scanning target directory...
              </span>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShieldAlert className="w-8 h-8 text-slate-700 mb-3" />
              <h4 className="text-xs font-bold text-slate-400 font-mono uppercase">No Entities Found</h4>
              <p className="text-[9px] text-slate-650 font-mono mt-1 max-w-[240px]">
                {searchQuery 
                  ? 'The scanner search string matches no active launcher package.' 
                  : 'No queryable user application processes detected.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <AnimatePresence initial={false}>
                {filteredApps.map((app) => {
                  const isSelected = selectedAppPackage === app.packageName;
                  const isAppEffectiveEnabled = isShieldEnabled && app.enabled;

                  return (
                    <motion.div 
                      key={app.packageName}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className={`border rounded-xl transition-all duration-300 ${
                        isAppEffectiveEnabled 
                          ? isSelected 
                            ? 'bg-[#0B0D13] border-[#00d4ff] shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                            : 'bg-[#0B0D13]/85 border-[#171B26]'
                          : 'bg-[#0B0D13]/30 border-[#171B26]/30 opacity-40 hover:opacity-60'
                      }`}
                    >
                      {/* Header Row */}
                      <div className="flex items-center justify-between px-4 py-3.5 gap-3">
                        <div 
                          onClick={() => {
                            if (!isShieldEnabled) {
                              playSystemSoundEffect('DEBUFF_CAST');
                              showSystemToast({
                                type: 'WARNING',
                                title: 'Master Switch Offline',
                                subtitle: 'Enable the Master System Switch first.',
                                durationMs: 3000
                              });
                              return;
                            }
                            if (app.enabled) {
                              setSelectedAppPackage(isSelected ? null : app.packageName);
                            }
                          }}
                          className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer select-none"
                        >
                          {/* Stylized App Icon matching mockup */}
                          <div className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center border transition-colors ${
                            isAppEffectiveEnabled 
                              ? 'bg-[#151D2A] border-[#00d4ff]/30 text-[#00d4ff] shadow-[0_0_10px_rgba(6,182,212,0.05)]' 
                              : 'bg-slate-950 border-slate-900 text-slate-700'
                          }`}>
                            {getAppIcon(app.packageName)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-white tracking-wide block truncate">
                              {app.appName}
                            </span>
                          </div>
                        </div>

                        {/* Custom switch on the right */}
                        <div className="flex items-center gap-3">
                          <CustomToggleSwitch 
                            active={isAppEffectiveEnabled} 
                            onChange={() => updateAppLockState(app.packageName, !app.enabled)} 
                          />
                          {isAppEffectiveEnabled && (
                            <button
                              onClick={() => setSelectedAppPackage(isSelected ? null : app.packageName)}
                              className="text-slate-400 p-1 hover:text-white"
                            >
                              {isSelected ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Calibration sliding panel */}
                      {isSelected && isAppEffectiveEnabled && (
                        <div className="px-4 pb-5 pt-3 border-t border-slate-900/60 space-y-4">
                          <div className="text-[9px] font-mono text-[#00d4ff] uppercase tracking-widest flex items-center gap-1.5">
                            <Sliders className="w-3 h-3 text-[#00d4ff]" /> Lock Calibration
                          </div>

                          {/* Time limit slider */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[9px] font-mono">
                              <span className="text-slate-450 uppercase">Daily Time Limit</span>
                              <span className="text-[#00d4ff] font-bold text-xs">
                                {app.limitMinutes} <span className="text-[9px] font-normal text-slate-500">m</span>
                              </span>
                            </div>
                            <input 
                              type="range"
                              min="10"
                              max="128"
                              step="1"
                              value={app.limitMinutes}
                              onChange={(e) => updateAppParams(app.packageName, parseInt(e.target.value), app.questReps)}
                              className="focus-range-input"
                            />
                            <div className="flex justify-between text-[7px] text-slate-600 font-mono px-0.5">
                              <span>10m</span>
                              <span>128m</span>
                            </div>
                          </div>

                          {/* Quest rep slider */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[9px] font-mono">
                              <span className="text-slate-450 uppercase">Quest Repetitions</span>
                              <span className="text-[#00d4ff] font-bold text-xs">
                                {app.questReps} <span className="text-[9px] font-normal text-slate-500">reps</span>
                              </span>
                            </div>
                            <input 
                              type="range"
                              min="10"
                              max="50"
                              step="1"
                              value={app.questReps}
                              onChange={(e) => updateAppParams(app.packageName, app.limitMinutes, parseInt(e.target.value))}
                              className="focus-range-input"
                            />
                            <div className="flex justify-between text-[7px] text-slate-600 font-mono px-0.5">
                              <span>10</span>
                              <span>50</span>
                            </div>
                          </div>

                          {/* Strict Mode Alert Warning */}
                          <div className="bg-[#1F0E11] p-3 rounded-lg border border-red-500/20 text-[9px] text-[#F87171] font-sans leading-relaxed flex gap-2.5">
                            <AlertTriangle className="w-4 h-4 text-[#F87171] shrink-0 mt-0.5" />
                            <span>
                              <span className="font-bold">Strict Mode Active:</span> Dungeon verification required via front camera upon limit reach.
                            </span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
      
      {/* Scrollbar & Range Custom Styles */}
      <style>{`
        .custom-focus-app-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-focus-app-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.2);
          border-radius: 4px;
        }
        .custom-focus-app-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,212,255,0.15);
          border-radius: 4px;
        }
        .custom-focus-app-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0,212,255,0.4);
        }

        /* Range Slider Overrides */
        .focus-range-input {
          -webkit-appearance: none;
          width: 100%;
          height: 3px;
          background: #111520;
          border: 1px solid #1c2333;
          border-radius: 9999px;
          outline: none;
        }

        .focus-range-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #00d4ff;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(0,212,255,0.8);
          border: 1px solid #000;
          transition: transform 0.1s ease;
        }

        .focus-range-input::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
      `}</style>

      {/* Pro Paywall Modal */}
      <AnimatePresence>
        {showProModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-fade-in">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm bg-[#0A0B10] border border-cyan-500/30 rounded-2xl p-6 relative overflow-hidden shadow-neon-blue"
            >
              {/* Neon corner lines */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />
              
              <div className="flex flex-col items-center text-center">
                <div className="p-3 bg-cyan-950/30 border border-cyan-500/20 rounded-2xl mb-4 animate-pulse">
                  <Lock className="w-8 h-8 text-cyan-400" />
                </div>
                
                <span className="text-[10px] font-black font-mono uppercase tracking-[0.25em] text-cyan-400">
                  PRO Clearance Required
                </span>
                <h2 className="text-lg font-heading font-extrabold text-white uppercase tracking-wider mt-2">
                  Focus Containment Core
                </h2>
                <div className="h-px w-16 bg-cyan-500/20 my-3" />
                
                <p className="text-xs text-slate-400 leading-relaxed font-sans mb-6">
                  Activating the Focus Shield quarantine system requires S-Rank access. Upgrade to Pro to configure limits, track background usages, and unlock camera-verified dungeons.
                </p>
                
                <div className="flex flex-col w-full gap-2.5">
                  <button
                    onClick={() => {
                      playSystemSoundEffect('SELECT');
                      setShowProModal(false);
                      onUpgradePro?.();
                    }}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-black text-xs font-black font-mono uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:brightness-110 active:scale-[0.98]"
                  >
                    Upgrade to S-Rank (Pro)
                  </button>
                  
                  <button
                    onClick={() => {
                      playSystemSoundEffect('SELECT');
                      setShowProModal(false);
                    }}
                    className="w-full py-2.5 bg-slate-900 border border-slate-800 text-slate-500 text-[10px] font-bold font-mono uppercase tracking-wider rounded-xl transition-all hover:text-slate-350"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
