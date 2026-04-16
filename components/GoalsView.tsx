import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Target, Trophy, Sparkles } from 'lucide-react';
import { Goal, PlayerData } from '../types';
import GoalCard from './GoalCard';
import GoalCreationFlow from './GoalCreationFlow';
import GoalDetailView from './GoalDetailView';

interface GoalsViewProps {
  goals: Goal[];
  playerData?: PlayerData;
  onUpdateGoals: (goals: Goal[]) => void;
  onConsumeMana?: (amount: number) => boolean;
  onRefundMana?: (amount: number) => void;
  onDeductGold?: (amount: number) => void;
}

export default function GoalsView({
  goals,
  playerData,
  onUpdateGoals,
  onConsumeMana,
  onRefundMana,
  onDeductGold,
}: GoalsViewProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const activeGoals = goals.filter(g => g.status === 'ACTIVE' || g.status === 'PAUSED');
  const completedGoals = goals.filter(g => g.status === 'COMPLETED');

  const handleGoalCreated = useCallback((newGoal: Goal) => {
    onUpdateGoals([...goals, newGoal]);
    setShowCreate(false);
  }, [goals, onUpdateGoals]);

  const handleUpdateGoal = useCallback((updatedGoal: Goal) => {
    onUpdateGoals(goals.map(g => g.id === updatedGoal.id ? updatedGoal : g));
    setSelectedGoal(updatedGoal);
  }, [goals, onUpdateGoals]);

  const handleDeleteGoal = useCallback((goalId: string) => {
    const updated = goals.map(g => g.id === goalId ? { ...g, status: 'ABANDONED' as const } : g);
    onUpdateGoals(updated);
    setSelectedGoal(null);
    if (onDeductGold) onDeductGold(50);
  }, [goals, onUpdateGoals, onDeductGold]);

  // If a goal detail is selected, show that
  if (selectedGoal) {
    const liveGoal = goals.find(g => g.id === selectedGoal.id) || selectedGoal;
    return (
      <GoalDetailView
        goal={liveGoal}
        playerData={playerData}
        allGoals={goals}
        onBack={() => setSelectedGoal(null)}
        onUpdateGoal={handleUpdateGoal}
        onDeleteGoal={handleDeleteGoal}
      />
    );
  }

  return (
    <div className="min-h-[60vh] pb-4">
      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div className="space-y-3 mb-4">
          {activeGoals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onTap={(g) => setSelectedGoal(g)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {activeGoals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(34,211,238,0.06)' }}>
            <Target className="w-7 h-7 text-cyan-500" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">No Active Goals</h3>
          <p className="text-[10px] text-gray-500 font-mono text-center mb-5 max-w-[240px]">
            Set a long-term goal and AI will create a daily action plan to help you achieve it.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-6 py-3 rounded-xl text-xs font-black text-black uppercase tracking-wider"
            style={{ background: 'linear-gradient(135deg, #22d3ee, #06b6d4)' }}
          >
            Create Shadow Mission
          </button>
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Completed Missions</span>
          </div>
          <div className="space-y-2">
            {completedGoals.map(goal => (
              <GoalCard key={goal.id} goal={goal} onTap={(g) => setSelectedGoal(g)} />
            ))}
          </div>
        </div>
      )}

      {/* FAB — only show if there are existing goals */}
      {activeGoals.length > 0 && activeGoals.length < 3 && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowCreate(true)}
          className="fixed bottom-24 right-5 w-13 h-13 rounded-full flex items-center justify-center z-50 shadow-lg"
          style={{ background: 'linear-gradient(135deg, #22d3ee, #06b6d4)', width: 52, height: 52 }}
        >
          <Plus className="w-5 h-5 text-black" />
        </motion.button>
      )}

      {/* Creation Flow Modal */}
      <AnimatePresence>
        {showCreate && (
          <GoalCreationFlow
            playerData={playerData}
            existingGoals={goals}
            onClose={() => setShowCreate(false)}
            onGoalCreated={handleGoalCreated}
            onConsumeMana={onConsumeMana}
            onRefundMana={onRefundMana}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
