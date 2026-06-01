import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, ShieldCheck, Settings, RefreshCw, AlertCircle, Search, Filter } from 'lucide-react';
import { showSystemToast } from './SystemToast';
import { playSystemSoundEffect } from '../utils/soundEngine';

interface FocusShieldSettingsProps {
  playerData?: any;
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

export default function FocusShieldSettings({ playerData }: FocusShieldSettingsProps) {
  const [isSupported, setIsSupported] = useState(true);
  const [permissions, setPermissions] = useState({ usageGranted: false, overlayGranted: false });
  const [isShieldEnabled, setIsShieldEnabled] = useState(false);
  const [lockedApps, setLockedApps] = useState<AppLockConfig[]>(DEFAULT_APPS);
  const [selectedAppPackage, setSelectedAppPackage] = useState<string | null>(null);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEnabledOnly, setFilterEnabledOnly] = useState(false);
  const [loadingApps, setLoadingApps] = useState(false);

  // Check support and load initial permissions & configurations
  useEffect(() => {
    const isAndroid = (window as any).Capacitor?.getPlatform() === 'android';
    if (!isAndroid) {
      setIsSupported(false);
      return;
    }

    loadSettingsAndApps();
    checkPermissions();

    // Check permissions periodically on window focus
    const handleFocus = () => {
      checkPermissions();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const loadSettingsAndApps = async () => {
    setLoadingApps(true);
    try {
      const enabled = localStorage.getItem('reforge_focus_shield_enabled') === 'true';
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
      const enabled = localStorage.getItem('reforge_focus_shield_enabled') === 'true';
      if (res.usageGranted && res.overlayGranted) {
        if (enabled) {
          await plugin.startFocusShield();
        }

        // Auto-deploy loop: if user returning from granting settings
        const deploying = localStorage.getItem('reforge_focus_shield_deploying') === 'true';
        if (deploying) {
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

  const updateAppLockState = async (packageName: string, enabled: boolean) => {
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

  const hasAllPermissions = permissions.usageGranted && permissions.overlayGranted;
  const activeAppsCount = lockedApps.filter(app => app.enabled).length;

  // Filter apps
  const filteredApps = lockedApps.filter(app => {
    const matchesSearch = app.appName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          app.packageName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterEnabledOnly ? app.enabled : true;
    return matchesSearch && matchesFilter;
  });

  if (!isSupported) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-950/40 border border-gray-900 rounded-2xl max-w-md mx-auto text-center">
        <ShieldAlert className="w-12 h-12 text-red-500/80 mb-4" />
        <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-2">Android Exclusive Feature</h3>
        <p className="text-xs text-gray-500 font-mono leading-relaxed">
          Due to operating system sandboxing security restrictions, Focus Shield is exclusively available on Android devices. iOS restricts background app activity monitoring.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-md mx-auto pb-8">
      {/* Active Service Status */}
      <div className="bg-gray-950/60 border border-gray-800/80 rounded-2xl p-5 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              isShieldEnabled 
                ? 'bg-system-neon/10 border-system-neon/40 text-system-neon shadow-[0_0_15px_rgba(0,212,255,0.1)]' 
                : 'bg-gray-900 border-gray-800 text-gray-500'
            }`}>
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white font-mono tracking-wider uppercase">Focus Shield System</h3>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                {isShieldEnabled ? 'SHIELD DEPLOYED • MONITORING ACTIVE' : 'SYSTEM STANDBY'}
              </p>
            </div>
          </div>
          
          <button
            onClick={toggleShieldMaster}
            className={`px-4 py-2 rounded-xl text-[10px] font-bold font-mono tracking-wider transition-all duration-300 border uppercase ${
              isShieldEnabled
                ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400'
                : 'bg-system-neon/10 hover:bg-system-neon/20 border-system-neon/30 text-system-neon shadow-[0_0_15px_rgba(0,212,255,0.15)]'
            }`}
          >
            {isShieldEnabled ? 'Shutdown' : 'Deploy'}
          </button>
        </div>
      </div>

      {/* Permissions Workspace */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Settings className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Required Native Access</span>
          <button 
            onClick={checkPermissions}
            className="ml-auto text-[9px] font-mono text-system-neon flex items-center gap-1 hover:underline animate-pulse"
          >
            <RefreshCw className="w-2.5 h-2.5" /> Check Status
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Usage Access Permission */}
          <div className="bg-gray-950/40 border border-gray-900 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold font-mono text-gray-400 uppercase">Usage Access</span>
                {permissions.usageGranted ? (
                  <ShieldCheck className="w-4 h-4 text-green-400 animate-bounce" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                )}
              </div>
              <p className="text-[10px] text-gray-500 mt-2 font-sans leading-normal">
                Allows measurement of screen time limits of distracting apps.
              </p>
            </div>
            {!permissions.usageGranted && (
              <button
                onClick={grantUsagePermission}
                className="mt-4 w-full py-1.5 bg-system-neon/10 hover:bg-system-neon/20 border border-system-neon/30 rounded-lg text-[9px] font-bold font-mono text-system-neon uppercase tracking-wider transition-colors"
              >
                Configure
              </button>
            )}
          </div>

          {/* Overlay Permission */}
          <div className="bg-gray-950/40 border border-gray-900 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold font-mono text-gray-400 uppercase">Draw Over Apps</span>
                {permissions.overlayGranted ? (
                  <ShieldCheck className="w-4 h-4 text-green-400 animate-bounce" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                )}
              </div>
              <p className="text-[10px] text-gray-500 mt-2 font-sans leading-normal">
                Enables un-dismissible quest lock overlay when limit is hit.
              </p>
            </div>
            {!permissions.overlayGranted && (
              <button
                onClick={grantOverlayPermission}
                className="mt-4 w-full py-1.5 bg-system-neon/10 hover:bg-system-neon/20 border border-system-neon/30 rounded-lg text-[9px] font-bold font-mono text-system-neon uppercase tracking-wider transition-colors"
              >
                Configure
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Target Focus Apps Workspace */}
      <div className="space-y-3">
        {/* Workspace Title & Search Controls */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Monitored Distractions</span>
            </div>
            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest bg-gray-900/40 px-2 py-0.5 rounded border border-gray-800/40">
              Active: {activeAppsCount}
            </span>
          </div>

          {/* Holographic Search & Filter Bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="w-3.5 h-3.5 text-gray-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Search package or application..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-950/60 border border-gray-900 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-system-neon/50 focus:ring-1 focus:ring-system-neon/20 transition-all"
              />
            </div>

            {/* Filter Toggle Pills */}
            <button
              onClick={() => { playSystemSoundEffect('SELECT'); setFilterEnabledOnly(!filterEnabledOnly); }}
              className={`p-2 border rounded-xl flex items-center justify-center transition-all ${
                filterEnabledOnly 
                  ? 'bg-system-neon/10 border-system-neon/40 text-system-neon' 
                  : 'bg-gray-950/40 border-gray-900 text-gray-600 hover:text-gray-400'
              }`}
              title="Show active monitors only"
            >
              <Filter className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dynamic App List */}
        <div className="bg-gray-950/20 border border-gray-900 rounded-2xl p-2 relative">
          {loadingApps ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-7 h-7 border-2 border-system-neon border-t-transparent rounded-full animate-spin" />
              <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Querying launchable systems...</span>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShieldAlert className="w-8 h-8 text-gray-700 mb-2" />
              <h4 className="text-xs font-bold text-gray-500 font-mono uppercase">No apps found</h4>
              <p className="text-[9px] text-gray-600 font-mono mt-0.5 max-w-[200px]">
                {searchQuery ? 'Adjust your search string.' : 'No launchable user apps detected on device.'}
              </p>
            </div>
          ) : (
            <div className="max-h-[380px] overflow-y-auto pr-1 space-y-2 custom-focus-app-scrollbar">
              {filteredApps.map((app) => {
                const isSelected = selectedAppPackage === app.packageName;

                return (
                  <div 
                    key={app.packageName}
                    className={`border rounded-xl transition-all duration-300 ${
                      app.enabled 
                        ? isSelected 
                          ? 'bg-gray-950 border-system-neon/40 shadow-[0_0_15px_rgba(0,212,255,0.05)]' 
                          : 'bg-gray-950/60 border-gray-800'
                        : 'bg-gray-950/10 border-gray-900/60 opacity-60'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between px-4 py-3">
                      <div 
                        onClick={() => app.enabled && setSelectedAppPackage(isSelected ? null : app.packageName)}
                        className="flex-1 cursor-pointer"
                      >
                        <span className="text-xs font-bold text-white font-mono tracking-wide">{app.appName}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[8px] text-gray-500 font-mono max-w-[180px] truncate block" title={app.packageName}>
                            {app.packageName}
                          </span>
                          {app.enabled && (
                            <>
                              <span className="text-[8px] text-gray-600 font-mono">•</span>
                              <span className="text-[9px] text-system-neon font-mono font-bold">{app.limitMinutes}m limit</span>
                              <span className="text-[8px] text-gray-600 font-mono">•</span>
                              <span className="text-[9px] text-purple-400 font-mono font-bold">{app.questReps} rep</span>
                            </>
                          )}
                        </div>
                      </div>

                      <input 
                        type="checkbox"
                        checked={app.enabled}
                        onChange={(e) => updateAppLockState(app.packageName, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-800 bg-gray-950 text-system-neon focus:ring-system-neon transition-all"
                      />
                    </div>

                    {/* Configuration Slider Panel */}
                    {isSelected && app.enabled && (
                      <div className="px-4 pb-4 pt-1.5 border-t border-gray-900 space-y-4">
                        {/* Time limit slider */}
                        <div>
                          <div className="flex justify-between text-[9px] font-mono text-gray-500 mb-1.5">
                            <span>DAILY SCREEN TIME LIMIT</span>
                            <span className="text-white font-bold">{app.limitMinutes} MINUTES</span>
                          </div>
                          <input 
                            type="range"
                            min="10"
                            max="120"
                            step="5"
                            value={app.limitMinutes}
                            onChange={(e) => updateAppParams(app.packageName, parseInt(e.target.value), app.questReps)}
                            className="w-full h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-system-neon"
                          />
                        </div>

                        {/* Quest rep slider */}
                        <div>
                          <div className="flex justify-between text-[9px] font-mono text-gray-500 mb-1.5">
                            <span>UNLOCK QUEST TARGET</span>
                            <span className="text-white font-bold">{app.questReps} PUSHUPS</span>
                          </div>
                          <input 
                            type="range"
                            min="10"
                            max="40"
                            step="5"
                            value={app.questReps}
                            onChange={(e) => updateAppParams(app.packageName, app.limitMinutes, parseInt(e.target.value))}
                            className="w-full h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-system-neon"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Scrollbar style overlay */}
      <style>{`
        .custom-focus-app-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-focus-app-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.02);
          border-radius: 4px;
        }
        .custom-focus-app-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.08);
          border-radius: 4px;
        }
        .custom-focus-app-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0,212,255,0.3);
        }
      `}</style>
    </div>
  );
}
