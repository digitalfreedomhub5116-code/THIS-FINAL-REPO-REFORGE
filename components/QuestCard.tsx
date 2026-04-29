import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Dumbbell, Brain, Shield, Users, Zap, Trash2, ZapOff, Lock, Coins, Flame, Eye, MapPin, Activity, Play, Square, Target, ExternalLink, BookOpen, Youtube, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Quest, CoreStats, Rank } from '../types';
import { SystemCoin } from './icons/SystemCoin';


interface QuestCardProps {
  quest: Quest;
  onComplete: (id: string, asMini?: boolean) => void;
  onFail: (id: string) => void;
  onReset: (id: string) => void;
  onDelete: (id: string) => void;
  isLocked?: boolean;
  lockMessage?: string;
  onReschedule?: () => void;
  onStartTracking?: (id: string, requirements?: { steps?: number; distanceKm?: number; activeMinutes?: number }) => void;
  onStopTracking?: (id: string) => void;
}

const RANK_BAR: Record<Rank, string> = {
  UNRANKED: '#4a4a5a',
  S: '#a855f7',
  A: '#eab308',
  B: '#3b82f6',
  C: '#22c55e',
  D: '#f97316',
  E: '#6b7280',
};

const RANK_LABEL: Record<Rank, string> = {
  UNRANKED: 'rgba(74,74,90,0.08)',
  S: 'rgba(168,85,247,0.15)',
  A: 'rgba(234,179,8,0.12)',
  B: 'rgba(59,130,246,0.12)',
  C: 'rgba(34,197,94,0.12)',
  D: 'rgba(249,115,22,0.12)',
  E: 'rgba(107,114,128,0.1)',
};

const CAT_ICON: Record<keyof CoreStats, React.ReactNode> = {
  strength:     <Dumbbell size={10} />,
  intelligence: <Brain size={10} />,
  discipline:   <Shield size={10} />,
  social:       <Users size={10} />,
  focus:        <Eye size={10} />,
  willpower:    <Flame size={10} />,
};

const CAT_COLOR: Record<keyof CoreStats, string> = {
  strength:     '#f97066',
  intelligence: '#7EB8D4',
  discipline:   '#9ACDE3',
  social:       '#fbbf24',
  focus:        '#34d399',
  willpower:    '#fb923c',
};

const SensorBar: React.FC<{
  icon: React.ReactNode;
  label: string;
  current: number;
  target: number;
  unit?: string;
  decimals?: number;
  color: string;
}> = ({ icon, label, current, target, unit = '', decimals = 0, color }) => {
  const pct = Math.min(100, (current / target) * 100);
  const done = current >= target;
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: done ? '#4ade80' : color }}>{icon}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: done ? '#22c55e' : color, boxShadow: done ? '0 0 6px rgba(34,197,94,0.5)' : `0 0 4px ${color}60` }}
        />
      </div>
      <span className="text-[8px] font-mono font-bold shrink-0" style={{ color: done ? '#4ade80' : '#9ca3af' }}>
        {decimals > 0 ? current.toFixed(decimals) : current}/{target}{unit ? ` ${unit}` : ''}
      </span>
    </div>
  );
};

const QuestCard: React.FC<QuestCardProps> = ({ quest, onComplete, onFail, onDelete, isLocked, lockMessage, onReschedule, onStartTracking, onStopTracking }) => {
  const [isMiniView, setIsMiniView] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const [titleExpanded, setTitleExpanded] = useState(false);
  const completingRef = useRef(false);

  const isExpired = quest.expiresAt ? Date.now() > quest.expiresAt : false;
  const isFailed  = quest.failed || (isExpired && !quest.isCompleted);
  const isCompleted = quest.isCompleted;
  const isActive  = !isCompleted && !isFailed;
  const isMiniActive = isMiniView && isActive;

  const rankColor  = RANK_BAR[quest.rank];
  const rankBg     = RANK_LABEL[quest.rank];
  // catColor/catIcon now read directly from maps in JSX for combined pillars
  const displayXp  = isMiniActive ? Math.floor(quest.xpReward * 0.1) : quest.xpReward;

  const handleComplete = async () => {
    if (completingRef.current) return; // Debounce rapid taps
    completingRef.current = true;
    // Auto-stop sensor tracking before completing — MUST await so final
    // sensor data is written to state before completeQuest reads it
    if (quest.sensorTracking && onStopTracking) await onStopTracking(quest.id);
    onComplete(quest.id, isMiniActive);
    setTimeout(() => { completingRef.current = false; }, 1500);
  };

  const handleFail = () => {
    // Auto-stop sensor tracking before failing
    if (quest.sensorTracking && onStopTracking) onStopTracking(quest.id);
    onFail(quest.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isFailed ? 0.55 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25 }}
      id={`quest-card-${quest.id}`}
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(6,6,16,0.90) 12%, rgba(3,3,10,0.95) 100%)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        borderTop: isCompleted
          ? '1px solid rgba(34,197,94,0.22)'
          : isFailed
          ? '1px solid rgba(239,68,68,0.18)'
          : isMiniActive
          ? '1px solid rgba(126,184,212,0.22)'
          : '1px solid rgba(255,255,255,0.10)',
        borderLeft: 'none',
        borderRight: '1px solid rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 20px rgba(0,0,0,0.40)',
      }}
    >
      {/* State tint wash */}
      {(isCompleted || isFailed || isMiniActive) && (
        <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{
          background: isCompleted
            ? 'linear-gradient(135deg, rgba(34,197,94,0.04) 0%, transparent 60%)'
            : isFailed
            ? 'linear-gradient(135deg, rgba(239,68,68,0.04) 0%, transparent 60%)'
            : 'linear-gradient(135deg, rgba(126,184,212,0.05) 0%, transparent 60%)',
        }} />
      )}
      {/* Locked overlay — time-locked or tutorial locked */}
      {isLocked && (
        <div className="absolute inset-0 z-20 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}>
          <div className="flex flex-col items-center gap-2">
            <Lock size={20} className="text-gray-500" />
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest text-center px-4">{lockMessage || 'Available After Tutorial'}</span>
            {onReschedule && (
              <button
                onClick={(e) => { e.stopPropagation(); onReschedule(); }}
                className="mt-1 px-3 py-1.5 rounded-lg text-[9px] font-bold text-[#7EB8D4] uppercase tracking-wider transition-all active:scale-95"
                style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)' }}
              >
                ↻ Reschedule
              </button>
            )}
          </div>
        </div>
      )}
      {/* Left rank accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{
          background: isCompleted ? '#22c55e' : isFailed ? '#ef4444'
            : (isActive && quest.hasPact && quest.pactStatus === 'active') ? '#fbbf24' : rankColor,
          boxShadow: isCompleted
            ? '0 0 8px rgba(34,197,94,0.4)'
            : isFailed
            ? '0 0 8px rgba(239,68,68,0.3)'
            : (isActive && quest.hasPact && quest.pactStatus === 'active')
            ? '0 0 10px rgba(251,191,36,0.4)'
            : `0 0 8px ${rankColor}60`,
        }}
      />

      <div className="pl-5 pr-4 pt-3 pb-2.5">

        {/* Top row: rank + title + XP */}
        <div className="flex items-start gap-3">
          {/* Rank badge */}
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-heading font-extrabold flex-shrink-0 mt-0.5"
            style={{ background: rankBg, color: rankColor, border: `1px solid ${rankColor}40` }}
          >
            {quest.rank}
          </div>

          {/* Title block */}
          <div className="flex-1 min-w-0">
            {(() => {
              const titleText = isMiniActive ? (quest.miniQuest || 'Activation: Just Start.') : quest.title;
              const isLongTitle = titleText.length > 55;
              return (
                <div>
                  <h3
                    className={`font-heading font-bold text-sm leading-snug ${!titleExpanded && isLongTitle ? 'line-clamp-2' : ''}`}
                    style={{ color: isCompleted || isFailed ? '#6b7280' : '#f1f5f9', textDecoration: isCompleted || isFailed ? 'line-through' : 'none' }}
                  >
                    {titleText}
                  </h3>
                  {isLongTitle && !titleExpanded && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setTitleExpanded(true); }}
                      className="text-[9px] font-mono text-gray-600 hover:text-gray-400 transition-colors mt-0.5"
                    >
                      ...more
                    </button>
                  )}
                  {isLongTitle && titleExpanded && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setTitleExpanded(false); }}
                      className="text-[9px] font-mono text-gray-600 hover:text-gray-400 transition-colors mt-0.5"
                    >
                      show less
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Meta row: category pillars + daily badge */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {(quest.categories || (quest.category ? [quest.category] : [])).map((cat) => (
                <span key={cat} className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wide" style={{ color: CAT_COLOR[cat] }}>
                  {CAT_ICON[cat]}
                  {cat}
                </span>
              ))}
              {quest.isDaily && (
                <span
                  className="text-[8px] font-black font-mono tracking-widest px-1.5 py-0.5 rounded"
                  style={{ color: '#7EB8D4', background: 'rgba(126,184,212,0.08)', border: '1px solid rgba(126,184,212,0.2)' }}
                >
                  DAILY
                </span>
              )}
              {quest.goalId && (
                <span
                  className="flex items-center gap-0.5 text-[8px] font-black font-mono tracking-widest px-1.5 py-0.5 rounded"
                  style={{ color: '#9ACDE3', background: 'rgba(192,132,252,0.08)', border: '1px solid rgba(192,132,252,0.2)' }}
                >
                  <Target size={8} /> GOAL
                </span>
              )}
              {isMiniActive && (
                <span className="text-[8px] font-mono text-[#7EB8D4]/60">↯ ACTIVATION MODE</span>
              )}
            </div>

            {/* Pact badge */}
            {quest.hasPact && quest.pactAmount && quest.pactAmount > 0 && (
              <div className="flex items-center gap-1.5 mt-1">
                {quest.pactStatus === 'active' && (
                  <span
                    className="flex items-center gap-1 text-[8px] font-black font-mono tracking-widest px-1.5 py-0.5 rounded"
                    style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}
                  >
                    <Coins size={10} /> {quest.pactAmount}G PLEDGED
                  </span>
                )}
                {quest.pactStatus === 'honored' && (
                  <span
                    className="flex items-center gap-1 text-[8px] font-black font-mono tracking-widest px-1.5 py-0.5 rounded"
                    style={{ color: '#4ade80', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
                  >
                    <Check size={8} /> {quest.pactAmount}G RETURNED · 1.25x XP
                  </span>
                )}
                {quest.pactStatus === 'burned' && (
                  <span
                    className="flex items-center gap-1 text-[8px] font-black font-mono tracking-widest px-1.5 py-0.5 rounded"
                    style={{ color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    <Flame size={8} /> {quest.pactAmount}G BURNED
                  </span>
                )}
              </div>
            )}

            {/* Goal title link */}
            {quest.goalTitle && (
              <p className="text-[10px] text-[#7EB8D4]/60 font-mono mt-1 truncate">
                Mission: {quest.goalTitle}
              </p>
            )}

            {/* Description */}
            {!isMiniActive && quest.description && !quest.goalId && (
              <p className="text-gray-600 text-[11px] mt-1.5 leading-relaxed line-clamp-1">
                {quest.description}
              </p>
            )}

            {/* Goal quest steps & resources toggle */}
            {quest.goalId && isActive && (quest.goalQuestSteps?.length || quest.goalQuestResources?.length) ? (
              <div className="mt-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowResources(!showResources); }}
                  className="flex items-center gap-1 text-[10px] font-mono text-[#7EB8D4] hover:text-[#9ACDE3] transition-colors"
                >
                  {showResources ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {showResources ? 'Hide details' : 'View steps & resources'}
                </button>
                {showResources && (
                  <div className="mt-2 space-y-2">
                    {/* Step by step */}
                    {quest.goalQuestSteps && quest.goalQuestSteps.length > 0 && (
                      <div className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <p className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">Steps</p>
                        {quest.goalQuestSteps.map((step, i) => (
                          <p key={i} className="text-[11px] text-gray-400 font-mono leading-relaxed">{step}</p>
                        ))}
                      </div>
                    )}
                    {/* Resources */}
                    {quest.goalQuestResources && quest.goalQuestResources.length > 0 && (
                      <div className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <p className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">Resources</p>
                        {quest.goalQuestResources.map((r, i) => (
                          <div key={i} className="flex items-start gap-2 mb-2 last:mb-0">
                            <div className="mt-0.5 flex-shrink-0">
                              {r.type === 'youtube' && <Youtube size={12} className="text-red-400" />}
                              {r.type === 'article' && <ExternalLink size={12} className="text-blue-400" />}
                              {r.type === 'book' && <BookOpen size={12} className="text-amber-400" />}
                              {r.type === 'search_query' && <Search size={12} className="text-green-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] text-gray-300 font-medium truncate">{r.title}</p>
                              {r.channel && <p className="text-[9px] text-gray-500 font-mono">Channel: {r.channel}</p>}
                              {r.bookInfo && <p className="text-[9px] text-amber-400/70 font-mono">{r.bookInfo}</p>}
                              {r.url && (
                                <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#7EB8D4] font-mono underline break-all" onClick={e => e.stopPropagation()}>
                                  {r.url.length > 60 ? r.url.slice(0, 60) + '...' : r.url}
                                </a>
                              )}
                              {!r.url && r.searchQuery && (
                                <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(r.searchQuery)}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#7EB8D4]/70 font-mono underline" onClick={e => e.stopPropagation()}>
                                  Search: {r.searchQuery}
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}

            {/* Trigger hint */}
            {isActive && quest.trigger && !isMiniActive && (
              <p className="text-gray-700 text-[10px] mt-1 font-mono">
                IF: {quest.trigger}
              </p>
            )}

            {/* Sensor tracking progress */}
            {isActive && quest.sensorRequirements && (
              <div className="mt-2 space-y-1.5">
                {quest.sensorRequirements.steps && (
                  <SensorBar
                    icon={<Activity size={9} />}
                    label="Steps"
                    current={quest.sensorData?.stepsRecorded || 0}
                    target={quest.sensorRequirements.steps}
                    color="#9ACDE3"
                  />
                )}
                {quest.sensorRequirements.distanceKm && (
                  <SensorBar
                    icon={<MapPin size={9} />}
                    label="Distance"
                    current={quest.sensorData?.distanceRecorded || 0}
                    target={quest.sensorRequirements.distanceKm}
                    unit="km"
                    decimals={2}
                    color="#34d399"
                  />
                )}
                {quest.sensorRequirements.activeMinutes && (
                  <SensorBar
                    icon={<Zap size={9} />}
                    label="Active"
                    current={quest.sensorData?.activeMinutesRecorded || 0}
                    target={quest.sensorRequirements.activeMinutes}
                    unit="min"
                    color="#fbbf24"
                  />
                )}
              </div>
            )}
          </div>

          {/* XP + Gold pills */}
          <div className="flex flex-col items-end flex-shrink-0 gap-1">
            <div
              className="flex items-center gap-0.5 font-heading font-extrabold text-sm"
              style={{ color: isCompleted ? '#22c55e' : isFailed ? '#6b7280' : '#7EB8D4' }}
            >
              <Zap size={10} />
              {displayXp}
            </div>
            {quest.hasPact && quest.pactAmount && quest.pactStatus === 'active' && (
              <div className="flex items-center gap-0.5 font-bold font-mono text-[10px]" style={{ color: '#fbbf24' }}>
                <div className="flex items-center justify-center -mx-2 -my-2" style={{ width: 35, flexShrink: 0 }}><SystemCoin size={35} /></div>
                {quest.pactAmount}
              </div>
            )}
            <span className="text-[8px] text-gray-700 font-mono">{quest.hasPact && quest.pactStatus === 'active' ? 'XP · Gold' : 'XP'}</span>
          </div>
        </div>

        {/* ── ACTIVE: compact inline actions ── */}
        {isActive && !isLocked && (
          <div className="flex items-center gap-1.5 mt-2">
            {/* Sensor tracking */}
            {quest.sensorRequirements && onStartTracking && (
              quest.sensorTracking ? (
                <div className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[9px] font-bold font-mono uppercase"
                  style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}>
                  <Activity size={9} /> Tracking
                </div>
              ) : (
                <button onClick={() => onStartTracking(quest.id, quest.sensorRequirements)}
                  className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[9px] font-bold font-mono uppercase active:scale-95"
                  style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}>
                  <Play size={9} fill="currentColor" /> Track
                </button>
              )
            )}
            {/* Mini toggle */}
            {quest.miniQuest && !isMiniActive && (
              <button onClick={() => setIsMiniView(true)} title="Activation Mode"
                className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-95"
                style={{ background: 'rgba(126,184,212,0.05)', border: '1px solid rgba(126,184,212,0.15)', color: 'rgba(126,184,212,0.5)' }}>
                <Zap size={11} />
              </button>
            )}
            {isMiniActive && (
              <button onClick={() => setIsMiniView(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-95"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#6b7280' }}>
                <ZapOff size={11} />
              </button>
            )}
            <div className="flex-1" />
            {/* Fail — small icon-only */}
            <button onClick={handleFail}
              className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-95 transition-colors"
              style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', color: 'rgba(239,68,68,0.35)' }}>
              <X size={12} strokeWidth={2.5} />
            </button>
            {/* Complete — compact */}
            <button onClick={handleComplete}
              className="flex items-center gap-1.5 h-7 px-3.5 rounded-lg text-[10px] font-black font-mono uppercase tracking-wide active:scale-95"
              style={{
                background: isMiniActive ? 'rgba(126,184,212,0.1)' : 'rgba(34,197,94,0.1)',
                border: isMiniActive ? '1px solid rgba(126,184,212,0.3)' : '1px solid rgba(34,197,94,0.3)',
                color: isMiniActive ? '#7EB8D4' : '#4ade80',
              }}>
              <Check size={11} strokeWidth={3} />
              {isMiniActive ? `+${Math.floor(quest.xpReward * 0.1)}` : 'Complete'}
            </button>
          </div>
        )}

        {/* ── COMPLETED — compact 1-line ── */}
        {isCompleted && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <Check size={10} strokeWidth={3} className="text-green-500/50" />
            <span className="text-[9px] font-mono text-green-500/40 tracking-wide uppercase">
              {quest.completedAsMini ? 'Activation done' : 'Done'}
            </span>
          </div>
        )}
        {/* ── FAILED — compact 1-line ── */}
        {isFailed && !isCompleted && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <X size={10} strokeWidth={3} className="text-red-500/40" />
            <span className="text-[9px] font-mono text-red-500/40 tracking-wide uppercase">{isExpired ? 'Expired' : 'Failed'}</span>
            <button onClick={() => onDelete(quest.id)} className="ml-auto text-[8px] font-mono text-gray-700 hover:text-red-400 transition-colors">
              <Trash2 size={9} />
            </button>
          </div>
        )}

      </div>
    </motion.div>
  );
};

export default QuestCard;
