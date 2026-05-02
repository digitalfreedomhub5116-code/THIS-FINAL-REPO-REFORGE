import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, GraduationCap, Briefcase, Home, Laptop,
  Clock, Sun, Moon, Coffee, ChevronRight, ChevronLeft,
  Utensils, Dumbbell, BookOpen, Check
} from 'lucide-react';
import { ScheduleProfile, ScheduleRole, PreferredWorkoutTime, PreferredStudyTime } from '../types';
import { playSystemSoundEffect } from '../utils/soundEngine';

interface ScheduleSetupFlowProps {
  existingProfile?: ScheduleProfile;
  onComplete: (profile: ScheduleProfile) => void;
  onClose: () => void;
}

type Step = 'ROLE' | 'TIMES' | 'BLOCKS' | 'PREFERENCES' | 'REVIEW';

const ROLES: { id: ScheduleRole; label: string; sub: string; Icon: React.FC<any> }[] = [
  { id: 'STUDENT', label: 'Student', sub: 'School or College', Icon: GraduationCap },
  { id: 'PROFESSIONAL', label: 'Working Pro', sub: 'Office or Remote Job', Icon: Briefcase },
  { id: 'GAP_YEAR', label: 'Gap Year / Home', sub: 'Flexible Schedule', Icon: Home },
  { id: 'FREELANCER', label: 'Freelancer', sub: 'Self-Managed Hours', Icon: Laptop },
];

const WORKOUT_OPTIONS: { id: PreferredWorkoutTime; label: string; icon: string }[] = [
  { id: 'EARLY_MORNING', label: 'Early Morning (5-7 AM)', icon: '🌅' },
  { id: 'MORNING', label: 'Morning (7-10 AM)', icon: '☀️' },
  { id: 'AFTERNOON', label: 'Afternoon (12-3 PM)', icon: '🌤️' },
  { id: 'EVENING', label: 'Evening (5-8 PM)', icon: '🌇' },
  { id: 'LATE_NIGHT', label: 'Late Night (9-11 PM)', icon: '🌙' },
];

const STUDY_OPTIONS: { id: PreferredStudyTime; label: string; icon: string }[] = [
  { id: 'MORNING', label: 'Morning (fresh mind)', icon: '☀️' },
  { id: 'AFTERNOON', label: 'Afternoon (post-lunch)', icon: '🌤️' },
  { id: 'EVENING', label: 'Evening (after work/school)', icon: '🌇' },
  { id: 'NIGHT', label: 'Night Owl (late focus)', icon: '🌙' },
];

// Generate time options in 15-min increments
function timeOptions(startHour = 0, endHour = 24): string[] {
  const opts: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    for (const m of [0, 15, 30, 45]) {
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return opts;
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function TimeSelect({ value, onChange, label, icon }: {
  value: string; onChange: (v: string) => void; label: string; icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">
        {icon}
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl p-3 text-white text-sm focus:outline-none font-mono appearance-none cursor-pointer"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {timeOptions().map(t => (
          <option key={t} value={t} style={{ background: '#111', color: '#fff' }}>
            {formatTime(t)}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function ScheduleSetupFlow({ existingProfile, onComplete, onClose }: ScheduleSetupFlowProps) {
  const [step, setStep] = useState<Step>(existingProfile ? 'REVIEW' : 'ROLE');

  // Form state
  const [role, setRole] = useState<ScheduleRole>(existingProfile?.role || 'STUDENT');
  const [wakeUpTime, setWakeUpTime] = useState(existingProfile?.wakeUpTime || '06:30');
  const [bedtime, setBedtime] = useState(existingProfile?.bedtime || '23:00');
  const [morningRoutineMin, setMorningRoutineMin] = useState(existingProfile?.morningRoutineMin || 30);
  const [dinnerTime, setDinnerTime] = useState(existingProfile?.dinnerTime || '20:30');

  // Student blocks
  const [schoolStart, setSchoolStart] = useState(existingProfile?.schoolStart || '08:00');
  const [schoolEnd, setSchoolEnd] = useState(existingProfile?.schoolEnd || '14:30');
  const [coachingEnabled, setCoachingEnabled] = useState(existingProfile?.coachingEnabled || false);
  const [coachingStart, setCoachingStart] = useState(existingProfile?.coachingStart || '16:00');
  const [coachingEnd, setCoachingEnd] = useState(existingProfile?.coachingEnd || '18:00');

  // Professional blocks
  const [workStart, setWorkStart] = useState(existingProfile?.workStart || '09:00');
  const [workEnd, setWorkEnd] = useState(existingProfile?.workEnd || '18:00');
  const [commuteMinutes, setCommuteMinutes] = useState(existingProfile?.commuteMinutes || 30);
  const [lunchBreakMinutes, setLunchBreakMinutes] = useState(existingProfile?.lunchBreakMinutes || 60);

  // Preferences
  const [preferredWorkoutTime, setPreferredWorkoutTime] = useState<PreferredWorkoutTime>(existingProfile?.preferredWorkoutTime || 'MORNING');
  const [preferredStudyTime, setPreferredStudyTime] = useState<PreferredStudyTime>(existingProfile?.preferredStudyTime || 'EVENING');
  const [windDownMinutes, setWindDownMinutes] = useState(existingProfile?.windDownMinutes || 30);
  const [napEnabled, setNapEnabled] = useState(existingProfile?.napEnabled || false);
  const [napDuration, setNapDuration] = useState(existingProfile?.napDuration || 30);
  const [fixedCommitments, setFixedCommitments] = useState(existingProfile?.fixedCommitments || '');
  const [weekendDifferent, setWeekendDifferent] = useState(existingProfile?.weekendDifferent ?? true);
  const [weekendWakeUp, setWeekendWakeUp] = useState(existingProfile?.weekendWakeUp || '08:00');
  const [weekendBedtime, setWeekendBedtime] = useState(existingProfile?.weekendBedtime || '23:30');

  const steps: Step[] = ['ROLE', 'TIMES', 'BLOCKS', 'PREFERENCES', 'REVIEW'];
  const stepIdx = steps.indexOf(step);

  const nextStep = useCallback(() => {
    const next = steps[stepIdx + 1];
    if (next) {
      // Skip BLOCKS for gap year/freelancer if no fixed hours
      if (next === 'BLOCKS' && (role === 'GAP_YEAR' || role === 'FREELANCER')) {
        setStep('PREFERENCES');
      } else {
        setStep(next);
      }
      playSystemSoundEffect('SYSTEM');
    }
  }, [stepIdx, role]);

  const prevStep = useCallback(() => {
    const prev = steps[stepIdx - 1];
    if (prev) {
      if (step === 'PREFERENCES' && (role === 'GAP_YEAR' || role === 'FREELANCER')) {
        setStep('TIMES');
      } else {
        setStep(prev);
      }
    }
  }, [stepIdx, step, role]);

  const handleComplete = useCallback(() => {
    const now = Date.now();
    const profile: ScheduleProfile = {
      role,
      wakeUpTime,
      bedtime,
      morningRoutineMin,
      schoolStart: role === 'STUDENT' ? schoolStart : undefined,
      schoolEnd: role === 'STUDENT' ? schoolEnd : undefined,
      coachingEnabled: role === 'STUDENT' ? coachingEnabled : undefined,
      coachingStart: role === 'STUDENT' && coachingEnabled ? coachingStart : undefined,
      coachingEnd: role === 'STUDENT' && coachingEnabled ? coachingEnd : undefined,
      workStart: role === 'PROFESSIONAL' ? workStart : undefined,
      workEnd: role === 'PROFESSIONAL' ? workEnd : undefined,
      commuteMinutes: role === 'PROFESSIONAL' ? commuteMinutes : undefined,
      lunchBreakMinutes: role === 'PROFESSIONAL' ? lunchBreakMinutes : undefined,
      preferredWorkoutTime,
      preferredStudyTime,
      dinnerTime,
      windDownMinutes,
      napEnabled,
      napDuration: napEnabled ? napDuration : undefined,
      fixedCommitments,
      weekendDifferent,
      weekendWakeUp: weekendDifferent ? weekendWakeUp : undefined,
      weekendBedtime: weekendDifferent ? weekendBedtime : undefined,
      createdAt: existingProfile?.createdAt || now,
      updatedAt: now,
    };
    playSystemSoundEffect('LEVEL_UP');
    onComplete(profile);
  }, [
    role, wakeUpTime, bedtime, morningRoutineMin, schoolStart, schoolEnd,
    coachingEnabled, coachingStart, coachingEnd, workStart, workEnd,
    commuteMinutes, lunchBreakMinutes, preferredWorkoutTime, preferredStudyTime,
    dinnerTime, windDownMinutes, napEnabled, napDuration, fixedCommitments,
    weekendDifferent, weekendWakeUp, weekendBedtime, existingProfile, onComplete,
  ]);

  const stepProgress = Math.round(((stepIdx + 1) / steps.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)' }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="w-full max-w-md max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
        style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 80 }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 px-5 pt-5 pb-3" style={{ background: '#0a0a0f' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                {step === 'ROLE' && 'Your Lifestyle'}
                {step === 'TIMES' && 'Daily Rhythm'}
                {step === 'BLOCKS' && (role === 'STUDENT' ? 'School Schedule' : 'Work Schedule')}
                {step === 'PREFERENCES' && 'Preferences'}
                {step === 'REVIEW' && 'Review Schedule'}
              </h2>
              <p className="text-[10px] text-gray-600 font-mono mt-0.5">
                {step === 'ROLE' && 'Tell us your current role'}
                {step === 'TIMES' && 'When does your day start & end?'}
                {step === 'BLOCKS' && 'Your unavailable hours'}
                {step === 'PREFERENCES' && 'When do you train & study?'}
                {step === 'REVIEW' && 'Confirm your daily protocol'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #00d4ff, #00d4ff)' }}
              animate={{ width: `${stepProgress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        <div className="px-5 pb-6">
          <AnimatePresence mode="wait">
            {/* ── ROLE STEP ── */}
            {step === 'ROLE' && (
              <motion.div key="role" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {ROLES.map(r => {
                    const active = role === r.id;
                    return (
                      <button
                        key={r.id}
                        onClick={() => { setRole(r.id); playSystemSoundEffect('SYSTEM'); }}
                        className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all"
                        style={{
                          background: active ? 'rgba(34,211,238,0.08)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${active ? 'rgba(34,211,238,0.3)' : 'rgba(255,255,255,0.06)'}`,
                        }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{
                            background: active ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.04)',
                          }}
                        >
                          <r.Icon className={`w-5 h-5 ${active ? 'text-[#00d4ff]' : 'text-gray-500'}`} />
                        </div>
                        <div className="text-center">
                          <div className={`text-xs font-bold ${active ? 'text-white' : 'text-gray-400'}`}>{r.label}</div>
                          <div className="text-[9px] text-gray-600 font-mono mt-0.5">{r.sub}</div>
                        </div>
                        {active && (
                          <div className="w-5 h-5 rounded-full bg-[#00d4ff] flex items-center justify-center">
                            <Check className="w-3 h-3 text-black" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={nextStep}
                  className="w-full py-3.5 rounded-xl text-xs font-black text-black uppercase tracking-widest"
                  style={{ background: 'linear-gradient(135deg, #00d4ff, #00d4ff)' }}
                >
                  Continue
                </button>
              </motion.div>
            )}

            {/* ── TIMES STEP ── */}
            {step === 'TIMES' && (
              <motion.div key="times" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="space-y-4 mb-5">
                  <TimeSelect
                    value={wakeUpTime}
                    onChange={setWakeUpTime}
                    label="Wake-up Time"
                    icon={<Sun className="w-3 h-3 text-amber-400" />}
                  />

                  <TimeSelect
                    value={bedtime}
                    onChange={setBedtime}
                    label="Bedtime"
                    icon={<Moon className="w-3 h-3 text-indigo-400" />}
                  />

                  <div>
                    <label className="flex items-center gap-2 text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">
                      <Coffee className="w-3 h-3 text-orange-400" />
                      Morning Routine (mins)
                    </label>
                    <input
                      type="number"
                      value={morningRoutineMin}
                      onChange={e => setMorningRoutineMin(Math.max(0, Math.min(120, Number(e.target.value))))}
                      className="w-full rounded-xl p-3 text-white text-sm focus:outline-none font-mono"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                  </div>

                  <TimeSelect
                    value={dinnerTime}
                    onChange={setDinnerTime}
                    label="Dinner Time"
                    icon={<Utensils className="w-3 h-3 text-green-400" />}
                  />

                  {/* Weekend toggle */}
                  <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-gray-400 uppercase">Different Weekend Schedule?</span>
                      <button
                        onClick={() => setWeekendDifferent(!weekendDifferent)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${weekendDifferent ? 'bg-[#00d4ff]' : 'bg-gray-700'}`}
                      >
                        <motion.div
                          className="w-4 h-4 rounded-full bg-white absolute top-0.5"
                          animate={{ left: weekendDifferent ? 22 : 2 }}
                          transition={{ duration: 0.2 }}
                        />
                      </button>
                    </div>
                    {weekendDifferent && (
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <TimeSelect value={weekendWakeUp} onChange={setWeekendWakeUp} label="Weekend Wake" />
                        <TimeSelect value={weekendBedtime} onChange={setWeekendBedtime} label="Weekend Sleep" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={prevStep} className="px-4 py-3 rounded-xl text-xs font-bold text-gray-400" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={nextStep}
                    className="flex-1 py-3.5 rounded-xl text-xs font-black text-black uppercase tracking-widest"
                    style={{ background: 'linear-gradient(135deg, #00d4ff, #00d4ff)' }}
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── BLOCKS STEP (Student/Professional) ── */}
            {step === 'BLOCKS' && (
              <motion.div key="blocks" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="space-y-4 mb-5">
                  {role === 'STUDENT' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <TimeSelect value={schoolStart} onChange={setSchoolStart} label="School/College Starts" />
                        <TimeSelect value={schoolEnd} onChange={setSchoolEnd} label="School/College Ends" />
                      </div>

                      {/* Coaching toggle */}
                      <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono text-gray-400 uppercase">Tuition / Coaching?</span>
                          <button
                            onClick={() => setCoachingEnabled(!coachingEnabled)}
                            className={`w-10 h-5 rounded-full transition-colors relative ${coachingEnabled ? 'bg-[#00d4ff]' : 'bg-gray-700'}`}
                          >
                            <motion.div
                              className="w-4 h-4 rounded-full bg-white absolute top-0.5"
                              animate={{ left: coachingEnabled ? 22 : 2 }}
                              transition={{ duration: 0.2 }}
                            />
                          </button>
                        </div>
                        {coachingEnabled && (
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <TimeSelect value={coachingStart} onChange={setCoachingStart} label="Coaching Starts" />
                            <TimeSelect value={coachingEnd} onChange={setCoachingEnd} label="Coaching Ends" />
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {role === 'PROFESSIONAL' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <TimeSelect value={workStart} onChange={setWorkStart} label="Work Starts" />
                        <TimeSelect value={workEnd} onChange={setWorkEnd} label="Work Ends" />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 block">
                          Commute (one way, mins)
                        </label>
                        <input
                          type="number"
                          value={commuteMinutes}
                          onChange={e => setCommuteMinutes(Math.max(0, Math.min(180, Number(e.target.value))))}
                          className="w-full rounded-xl p-3 text-white text-sm focus:outline-none font-mono"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 block">
                          Lunch Break (mins)
                        </label>
                        <input
                          type="number"
                          value={lunchBreakMinutes}
                          onChange={e => setLunchBreakMinutes(Math.max(0, Math.min(120, Number(e.target.value))))}
                          className="w-full rounded-xl p-3 text-white text-sm focus:outline-none font-mono"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={prevStep} className="px-4 py-3 rounded-xl text-xs font-bold text-gray-400" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={nextStep}
                    className="flex-1 py-3.5 rounded-xl text-xs font-black text-black uppercase tracking-widest"
                    style={{ background: 'linear-gradient(135deg, #00d4ff, #00d4ff)' }}
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── PREFERENCES STEP ── */}
            {step === 'PREFERENCES' && (
              <motion.div key="prefs" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="space-y-5 mb-5">
                  {/* Workout time */}
                  <div>
                    <label className="flex items-center gap-2 text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2">
                      <Dumbbell className="w-3 h-3 text-red-400" /> Preferred Workout Time
                    </label>
                    <div className="space-y-1.5">
                      {WORKOUT_OPTIONS.map(w => (
                        <button
                          key={w.id}
                          onClick={() => setPreferredWorkoutTime(w.id)}
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left"
                          style={{
                            background: preferredWorkoutTime === w.id ? 'rgba(34,211,238,0.06)' : 'rgba(255,255,255,0.015)',
                            border: `1px solid ${preferredWorkoutTime === w.id ? 'rgba(34,211,238,0.2)' : 'rgba(255,255,255,0.04)'}`,
                          }}
                        >
                          <span className="text-sm">{w.icon}</span>
                          <span className={`text-xs font-mono ${preferredWorkoutTime === w.id ? 'text-[#33dfff]' : 'text-gray-400'}`}>{w.label}</span>
                          {preferredWorkoutTime === w.id && <Check className="w-3.5 h-3.5 text-[#00d4ff] ml-auto" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Study time */}
                  <div>
                    <label className="flex items-center gap-2 text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2">
                      <BookOpen className="w-3 h-3 text-blue-400" /> Peak Focus / Study Time
                    </label>
                    <div className="space-y-1.5">
                      {STUDY_OPTIONS.map(s => (
                        <button
                          key={s.id}
                          onClick={() => setPreferredStudyTime(s.id)}
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left"
                          style={{
                            background: preferredStudyTime === s.id ? 'rgba(96,165,250,0.06)' : 'rgba(255,255,255,0.015)',
                            border: `1px solid ${preferredStudyTime === s.id ? 'rgba(96,165,250,0.2)' : 'rgba(255,255,255,0.04)'}`,
                          }}
                        >
                          <span className="text-sm">{s.icon}</span>
                          <span className={`text-xs font-mono ${preferredStudyTime === s.id ? 'text-blue-300' : 'text-gray-400'}`}>{s.label}</span>
                          {preferredStudyTime === s.id && <Check className="w-3.5 h-3.5 text-blue-400 ml-auto" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Wind-down */}
                  <div>
                    <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 block">
                      Wind-Down Before Sleep (mins)
                    </label>
                    <input
                      type="number"
                      value={windDownMinutes}
                      onChange={e => setWindDownMinutes(Math.max(0, Math.min(120, Number(e.target.value))))}
                      className="w-full rounded-xl p-3 text-white text-sm focus:outline-none font-mono"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                  </div>

                  {/* Nap */}
                  <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-gray-400 uppercase">Do you nap?</span>
                      <button
                        onClick={() => setNapEnabled(!napEnabled)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${napEnabled ? 'bg-[#00d4ff]' : 'bg-gray-700'}`}
                      >
                        <motion.div
                          className="w-4 h-4 rounded-full bg-white absolute top-0.5"
                          animate={{ left: napEnabled ? 22 : 2 }}
                          transition={{ duration: 0.2 }}
                        />
                      </button>
                    </div>
                    {napEnabled && (
                      <div className="mt-3">
                        <label className="text-[9px] font-mono text-gray-600 mb-1 block">Nap Duration (mins)</label>
                        <input
                          type="number"
                          value={napDuration}
                          onChange={e => setNapDuration(Math.max(10, Math.min(120, Number(e.target.value))))}
                          className="w-full rounded-xl p-2.5 text-white text-sm focus:outline-none font-mono"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Fixed commitments */}
                  <div>
                    <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 block">
                      Other Fixed Commitments (optional)
                    </label>
                    <input
                      type="text"
                      value={fixedCommitments}
                      onChange={e => setFixedCommitments(e.target.value)}
                      placeholder='e.g. "Music class 5-6 PM on Tues/Thu"'
                      className="w-full rounded-xl p-3 text-white text-sm focus:outline-none font-mono placeholder:text-gray-700"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={prevStep} className="px-4 py-3 rounded-xl text-xs font-bold text-gray-400" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={nextStep}
                    className="flex-1 py-3.5 rounded-xl text-xs font-black text-black uppercase tracking-widest"
                    style={{ background: 'linear-gradient(135deg, #00d4ff, #00d4ff)' }}
                  >
                    Review Schedule
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── REVIEW STEP ── */}
            {step === 'REVIEW' && (
              <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="space-y-3 mb-5">
                  {/* Role */}
                  <div className="rounded-xl p-3" style={{ background: 'rgba(34,211,238,0.04)', border: '1px solid rgba(34,211,238,0.1)' }}>
                    <div className="text-[9px] font-mono text-[#00d4ff] uppercase mb-1">Role</div>
                    <div className="text-sm font-bold text-white">{ROLES.find(r => r.id === role)?.label}</div>
                  </div>

                  {/* Day structure */}
                  <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="text-[9px] font-mono text-gray-500 uppercase mb-2">Day Structure</div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-gray-400">🌅 Wake Up</span>
                        <span className="text-white font-bold">{formatTime(wakeUpTime)}</span>
                      </div>
                      {role === 'STUDENT' && (
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-gray-400">🏫 School</span>
                          <span className="text-white font-bold">{formatTime(schoolStart)} – {formatTime(schoolEnd)}</span>
                        </div>
                      )}
                      {role === 'STUDENT' && coachingEnabled && (
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-gray-400">📐 Coaching</span>
                          <span className="text-white font-bold">{formatTime(coachingStart)} – {formatTime(coachingEnd)}</span>
                        </div>
                      )}
                      {role === 'PROFESSIONAL' && (
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-gray-400">💼 Work</span>
                          <span className="text-white font-bold">{formatTime(workStart)} – {formatTime(workEnd)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-gray-400">🍽️ Dinner</span>
                        <span className="text-white font-bold">{formatTime(dinnerTime)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-gray-400">😴 Bedtime</span>
                        <span className="text-white font-bold">{formatTime(bedtime)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Preferences */}
                  <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="text-[9px] font-mono text-gray-500 uppercase mb-2">Preferences</div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-gray-400">💪 Workout</span>
                        <span className="text-white font-bold">{WORKOUT_OPTIONS.find(w => w.id === preferredWorkoutTime)?.label.split(' (')[0]}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-gray-400">📚 Focus Time</span>
                        <span className="text-white font-bold">{STUDY_OPTIONS.find(s => s.id === preferredStudyTime)?.label.split(' (')[0]}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-gray-400">🌙 Wind-Down</span>
                        <span className="text-white font-bold">{windDownMinutes} min before sleep</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[9px] text-gray-600 font-mono text-center">
                    You can edit this anytime from your Profile.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button onClick={prevStep} className="px-4 py-3 rounded-xl text-xs font-bold text-gray-400" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleComplete}
                    className="flex-1 py-4 rounded-xl text-xs font-black text-black uppercase tracking-widest"
                    style={{ background: 'linear-gradient(135deg, #00d4ff, #00d4ff)' }}
                  >
                    Activate Schedule Protocol
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
