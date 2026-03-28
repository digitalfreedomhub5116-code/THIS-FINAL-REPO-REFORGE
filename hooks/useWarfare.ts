import { useState, useEffect, useCallback } from 'react';

const ARMY_KEY = 'shadow_warfare_army_';
const DEBUFF_KEY = 'shadow_warfare_debuffs_';
const SHIELD_KEY = 'shadow_warfare_shield_';

export interface Debuff {
  id: string; // The ID of the bot/player who is debuffed
  expiresAt: number;
}

export function useWarfare(userId: string) {
  const [armySize, setArmySize] = useState<number>(0);
  const [shieldExpiresAt, setShieldExpiresAt] = useState<number>(0);
  const [debuffs, setDebuffs] = useState<Debuff[]>([]);

  // Load state
  useEffect(() => {
    if (!userId) return;

    try {
      const savedArmy = localStorage.getItem(ARMY_KEY + userId);
      if (savedArmy) setArmySize(parseInt(savedArmy, 10));

      const savedShield = localStorage.getItem(SHIELD_KEY + userId);
      if (savedShield) setShieldExpiresAt(parseInt(savedShield, 10));

      const savedDebuffs = localStorage.getItem(DEBUFF_KEY + userId);
      if (savedDebuffs) {
        const parsed: Debuff[] = JSON.parse(savedDebuffs);
        // Clean up expired debuffs
        const active = parsed.filter(d => d.expiresAt > Date.now());
        setDebuffs(active);
        if (active.length !== parsed.length) {
          localStorage.setItem(DEBUFF_KEY + userId, JSON.stringify(active));
        }
      }
    } catch (e) {
      console.warn('Warfare loading error', e);
    }
  }, [userId]);

  // Actions
  const addShadow = useCallback(() => {
    setArmySize(prev => {
      const next = prev + 1;
      localStorage.setItem(ARMY_KEY + userId, next.toString());
      return next;
    });
  }, [userId]);

  const activateShield = useCallback(() => {
    // 24 hour shield
    const expires = Date.now() + 24 * 60 * 60 * 1000;
    setShieldExpiresAt(expires);
    localStorage.setItem(SHIELD_KEY + userId, expires.toString());
  }, [userId]);

  const castDebuff = useCallback((targetId: string) => {
    setDebuffs(prev => {
      // 12 hour debuff
      const expires = Date.now() + 12 * 60 * 60 * 1000;
      const next = [...prev.filter(d => d.id !== targetId && d.expiresAt > Date.now()), { id: targetId, expiresAt: expires }];
      localStorage.setItem(DEBUFF_KEY + userId, JSON.stringify(next));
      return next;
    });
  }, [userId]);

  const clearMyDebuffs = useCallback(() => {
    // We only track the debuffs WE cast on others in current architecture (since it's a simulated meta-game).
    // If we were tracking debuffs cast ON us, we'd clear them here.
    // For local sim, using a potion just activates Fortify (shield).
    activateShield();
  }, [activateShield]);

  const isShielded = shieldExpiresAt > Date.now();
  const activeDebuffs = debuffs.filter(d => d.expiresAt > Date.now());

  return {
    armySize,
    addShadow,
    isShielded,
    shieldExpiresAt,
    activateShield,
    castDebuff,
    activeDebuffs,
    clearMyDebuffs
  };
}
