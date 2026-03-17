import { CoreStats, HealthProfile } from "../types";
import { API_BASE } from '../lib/apiConfig';

export interface QuestAnalysis {
  rank: 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
  xp: number;
  reasoning: string;
  isSpam: boolean;
  category: keyof CoreStats;
  estimatedDuration: number;
  suggestedTime?: string;
}

export interface VerificationResult {
  verdict: 'APPROVED' | 'REJECTED';
  confidence: number;
  analysis: string;
}

export const analyzeQuest = async (
  title: string,
  userProfile: HealthProfile | undefined,
  userStats: CoreStats,
  context?: any
): Promise<QuestAnalysis> => {
  const res = await fetch(`${API_BASE}/api/forge-guard/analyze-quest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ title, userStats, healthProfile: userProfile, context })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'ForgeGuard analysis failed');
  }
  return res.json();
};

export const verifyProof = async (
  imageBase64: string,
  reason: string,
  context?: string
): Promise<VerificationResult> => {
  const res = await fetch(`${API_BASE}/api/forge-guard/verify-proof`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ imageBase64, reason, context })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'Proof verification failed');
  }
  return res.json();
};
