import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Lock, Check, BookOpen, Target, Trophy, Zap } from 'lucide-react';
import { SkillProgress } from '../types';
import { SKILL_CATEGORIES, SKILLS_DATABASE, Skill, SkillLevel, SkillLesson, SkillCategoryKey } from '../lib/skillsDatabase';

interface SkillsViewProps {
  skillProgress: SkillProgress[];
  onUpdateProgress: (progress: SkillProgress[]) => void;
}

// ── SKILLS GRID (Category → Skills list) ──
const SkillsView: React.FC<SkillsViewProps> = ({ skillProgress, onUpdateProgress }) => {
  const [selectedCategory, setSelectedCategory] = useState<SkillCategoryKey | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [activeLesson, setActiveLesson] = useState<{ skill: Skill; level: SkillLevel; lesson: SkillLesson } | null>(null);

  const getProgress = (skillId: string): SkillProgress | undefined => {
    return skillProgress.find(p => p.skillId === skillId);
  };

  const isLessonComplete = (lessonId: string, skillId: string): boolean => {
    const p = getProgress(skillId);
    return p ? p.completedLessons.includes(lessonId) : false;
  };

  const getSkillCompletionPercent = (skill: Skill): number => {
    const p = getProgress(skill.id);
    if (!p) return 0;
    const totalLessons = skill.levels.reduce((acc, lv) => acc + lv.lessons.length, 0);
    if (totalLessons === 0) return 0;
    return Math.round((p.completedLessons.length / totalLessons) * 100);
  };

  const getCurrentLevel = (skill: Skill): number => {
    const p = getProgress(skill.id);
    if (!p) return 1;
    for (let i = 0; i < skill.levels.length; i++) {
      const allDone = skill.levels[i].lessons.every(l => p.completedLessons.includes(l.id));
      if (!allDone) return skill.levels[i].level;
    }
    return skill.levels[skill.levels.length - 1].level;
  };

  const isLevelUnlocked = (skill: Skill, levelIndex: number): boolean => {
    if (levelIndex === 0) return true;
    const p = getProgress(skill.id);
    if (!p) return false;
    const prevLevel = skill.levels[levelIndex - 1];
    return prevLevel.lessons.every(l => p.completedLessons.includes(l.id));
  };

  const completeLesson = (skillId: string, lessonId: string) => {
    const existing = skillProgress.find(p => p.skillId === skillId);
    let updated: SkillProgress[];
    if (existing) {
      if (existing.completedLessons.includes(lessonId)) return;
      updated = skillProgress.map(p =>
        p.skillId === skillId
          ? { ...p, completedLessons: [...p.completedLessons, lessonId], lastPracticedAt: Date.now() }
          : p
      );
    } else {
      updated = [...skillProgress, {
        skillId,
        completedLessons: [lessonId],
        currentLevel: 1,
        startedAt: Date.now(),
        lastPracticedAt: Date.now(),
      }];
    }
    onUpdateProgress(updated);
  };

  const categorySkills = useMemo(() => {
    if (!selectedCategory) return [];
    return SKILLS_DATABASE.filter(s => s.category === selectedCategory);
  }, [selectedCategory]);

  // ── LESSON VIEW ──
  if (activeLesson) {
    const { skill, level, lesson } = activeLesson;
    const done = isLessonComplete(lesson.id, skill.id);
    const lessonIdx = level.lessons.findIndex(l => l.id === lesson.id);
    const nextLesson = level.lessons[lessonIdx + 1];
    // Check if there's a next level
    const levelIdx = skill.levels.findIndex(lv => lv.level === level.level);
    const nextLevel = skill.levels[levelIdx + 1];

    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-4">
        {/* Back button */}
        <button onClick={() => setActiveLesson(null)} className="flex items-center gap-2 text-gray-400 hover:text-white text-xs font-mono transition-colors">
          <ChevronLeft size={14} /> Back to {skill.name}
        </button>

        {/* Lesson header */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: skill.color }}>
              Level {level.level} — {level.title}
            </span>
            {done && <Check size={12} className="text-green-500" />}
          </div>
          <h3 className="text-lg font-bold text-white font-mono">{lesson.title}</h3>
        </div>

        {/* Lesson content */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono uppercase tracking-widest">
            <BookOpen size={12} /> Lesson Content
          </div>
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{lesson.content}</p>
        </div>

        {/* Practice task */}
        <div className="bg-gray-900/40 border rounded-xl p-5 space-y-3" style={{ borderColor: `${skill.color}30` }}>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest" style={{ color: skill.color }}>
            <Target size={12} /> Practice Task
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{lesson.practiceTask}</p>
        </div>

        {/* Complete button */}
        <div className="flex gap-3">
          {!done ? (
            <button
              onClick={() => completeLesson(skill.id, lesson.id)}
              className="flex-1 py-3 rounded-lg font-mono text-sm font-bold tracking-wider flex items-center justify-center gap-2 transition-all hover:brightness-110"
              style={{ backgroundColor: skill.color, color: '#000' }}
            >
              <Check size={16} /> MARK COMPLETE
            </button>
          ) : (
            <div className="flex-1 py-3 rounded-lg font-mono text-sm font-bold tracking-wider flex items-center justify-center gap-2 bg-green-900/30 border border-green-800 text-green-400">
              <Check size={16} /> COMPLETED
            </div>
          )}
          {nextLesson && (
            <button
              onClick={() => setActiveLesson({ skill, level, lesson: nextLesson })}
              className="px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-mono text-sm flex items-center gap-2 transition-colors"
            >
              Next <ChevronRight size={14} />
            </button>
          )}
          {!nextLesson && nextLevel && isLevelUnlocked(skill, levelIdx + 1) && (
            <button
              onClick={() => setActiveLesson({ skill, level: nextLevel, lesson: nextLevel.lessons[0] })}
              className="px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-mono text-sm flex items-center gap-2 transition-colors"
            >
              Next Level <ChevronRight size={14} />
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // ── SKILL DETAIL VIEW ──
  if (selectedSkill) {
    const skill = selectedSkill;
    const pct = getSkillCompletionPercent(skill);
    const curLevel = getCurrentLevel(skill);

    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-4">
        <button onClick={() => setSelectedSkill(null)} className="flex items-center gap-2 text-gray-400 hover:text-white text-xs font-mono transition-colors">
          <ChevronLeft size={14} /> Back to {SKILL_CATEGORIES.find(c => c.key === skill.category)?.label}
        </button>

        {/* Skill header */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{skill.icon}</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white font-mono">{skill.name}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{skill.description}</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold font-mono" style={{ color: skill.color }}>{pct}%</div>
              <div className="text-[9px] text-gray-500 font-mono">MASTERY</div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5 }}
              className="h-full rounded-full"
              style={{ backgroundColor: skill.color }}
            />
          </div>
        </div>

        {/* Level roadmap */}
        <div className="space-y-3">
          {skill.levels.map((level, idx) => {
            const unlocked = isLevelUnlocked(skill, idx);
            const completedCount = level.lessons.filter(l => isLessonComplete(l.id, skill.id)).length;
            const allDone = completedCount === level.lessons.length;
            const isActive = level.level === curLevel;

            return (
              <div
                key={level.level}
                className={`border rounded-xl overflow-hidden transition-all ${
                  unlocked
                    ? isActive ? 'border-gray-700 bg-gray-900/60' : 'border-gray-800 bg-gray-900/30'
                    : 'border-gray-800/50 bg-gray-900/20 opacity-60'
                }`}
              >
                {/* Level header */}
                <div className="px-4 py-3 flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-mono shrink-0 ${
                      allDone ? 'bg-green-900/40 text-green-400 border border-green-800'
                        : isActive ? 'border text-white' : 'bg-gray-800/50 text-gray-500 border border-gray-700'
                    }`}
                    style={isActive && !allDone ? { borderColor: `${skill.color}60`, color: skill.color, backgroundColor: `${skill.color}15` } : {}}
                  >
                    {allDone ? <Check size={14} /> : unlocked ? level.level : <Lock size={12} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white font-mono truncate">{level.title}</div>
                    <div className="text-[10px] text-gray-500">{level.description}</div>
                  </div>
                  <div className="text-[10px] font-mono text-gray-500 shrink-0">
                    {completedCount}/{level.lessons.length}
                  </div>
                </div>

                {/* Lessons list (shown for unlocked levels) */}
                {unlocked && (
                  <div className="border-t border-gray-800/50 divide-y divide-gray-800/30">
                    {level.lessons.map((lesson) => {
                      const lDone = isLessonComplete(lesson.id, skill.id);
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => setActiveLesson({ skill, level, lesson })}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800/40 transition-colors text-left"
                        >
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                            lDone ? 'bg-green-500/20 text-green-400' : 'border border-gray-700 text-gray-600'
                          }`}>
                            {lDone ? <Check size={10} /> : <BookOpen size={10} />}
                          </div>
                          <span className={`text-xs font-mono flex-1 truncate ${lDone ? 'text-gray-400' : 'text-white'}`}>
                            {lesson.title}
                          </span>
                          <ChevronRight size={12} className="text-gray-600 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    );
  }

  // ── SKILLS LIST (filtered by category) ──
  if (selectedCategory) {
    const cat = SKILL_CATEGORIES.find(c => c.key === selectedCategory)!;
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-4">
        <button onClick={() => setSelectedCategory(null)} className="flex items-center gap-2 text-gray-400 hover:text-white text-xs font-mono transition-colors">
          <ChevronLeft size={14} /> All Categories
        </button>

        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{cat.emoji}</span>
          <div>
            <h3 className="text-base font-bold text-white font-mono">{cat.label}</h3>
            <p className="text-[10px] text-gray-500">{cat.description}</p>
          </div>
        </div>

        <div className="space-y-2">
          {categorySkills.map(skill => {
            const pct = getSkillCompletionPercent(skill);
            const progress = getProgress(skill.id);
            const totalLessons = skill.levels.reduce((a, l) => a + l.lessons.length, 0);

            return (
              <motion.button
                key={skill.id}
                onClick={() => setSelectedSkill(skill)}
                className="w-full bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex items-center gap-4 hover:border-gray-700 transition-all text-left group"
                whileTap={{ scale: 0.98 }}
              >
                <div className="text-2xl shrink-0">{skill.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white font-mono group-hover:text-system-neon transition-colors truncate">{skill.name}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5 truncate">{skill.description}</div>
                  {/* Mini progress bar */}
                  <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: skill.color }} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold font-mono" style={{ color: pct > 0 ? skill.color : '#6b7280' }}>{pct}%</div>
                  <div className="text-[9px] text-gray-600 font-mono">
                    {progress ? `${progress.completedLessons.length}/${totalLessons}` : `${totalLessons} lessons`}
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-400 shrink-0" />
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    );
  }

  // ── CATEGORY GRID (default view) ──
  const totalSkills = SKILLS_DATABASE.length;
  const totalLessons = SKILLS_DATABASE.reduce((a, s) => a + s.levels.reduce((b, l) => b + l.lessons.length, 0), 0);
  const completedLessons = skillProgress.reduce((a, p) => a + p.completedLessons.length, 0);
  const startedSkills = skillProgress.length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
      {/* Stats banner */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 text-center">
          <Zap size={16} className="mx-auto mb-1 text-system-neon" />
          <div className="text-lg font-bold text-white font-mono">{startedSkills}</div>
          <div className="text-[8px] text-gray-500 font-mono uppercase">Skills Started</div>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 text-center">
          <BookOpen size={16} className="mx-auto mb-1 text-[#7EB8D4]" />
          <div className="text-lg font-bold text-white font-mono">{completedLessons}</div>
          <div className="text-[8px] text-gray-500 font-mono uppercase">Lessons Done</div>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 text-center">
          <Trophy size={16} className="mx-auto mb-1 text-yellow-500" />
          <div className="text-lg font-bold text-white font-mono">{totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0}%</div>
          <div className="text-[8px] text-gray-500 font-mono uppercase">Total Mastery</div>
        </div>
      </div>

      {/* Category cards */}
      <div className="space-y-2">
        {SKILL_CATEGORIES.map(cat => {
          const catSkills = SKILLS_DATABASE.filter(s => s.category === cat.key);
          const catLessons = catSkills.reduce((a, s) => a + s.levels.reduce((b, l) => b + l.lessons.length, 0), 0);
          const catCompleted = catSkills.reduce((a, s) => {
            const p = getProgress(s.id);
            return a + (p ? p.completedLessons.length : 0);
          }, 0);
          const catPct = catLessons > 0 ? Math.round((catCompleted / catLessons) * 100) : 0;

          return (
            <motion.button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className="w-full bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex items-center gap-4 hover:border-gray-700 transition-all text-left group"
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                style={{ backgroundColor: `${cat.color}15`, border: `1px solid ${cat.color}30` }}>
                {cat.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white font-mono group-hover:text-system-neon transition-colors">{cat.label}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{catSkills.length} skills · {catLessons} lessons</div>
                <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${catPct}%`, backgroundColor: cat.color }} />
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-bold font-mono" style={{ color: catPct > 0 ? cat.color : '#6b7280' }}>{catPct}%</div>
              </div>
              <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-400 shrink-0" />
            </motion.button>
          );
        })}
      </div>

      <div className="text-center text-[9px] text-gray-600 font-mono pt-2">
        {totalSkills} SKILLS · {totalLessons} LESSONS · UNLOCK BY COMPLETING LEVELS
      </div>
    </motion.div>
  );
};

export default SkillsView;
