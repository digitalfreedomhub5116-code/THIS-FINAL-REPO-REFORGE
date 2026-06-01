import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { safeLevelUp } from '../lib/levelSystem.js';

// Setup __dirname for ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
dotenv.config({ path: join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_KEY in environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const targetEmail = 'jk0066432@gmail.com';
  console.log(`🔎 Searching for user with email: "${targetEmail}"...`);

  // Fetch the player record
  const { data: player, error: fetchErr } = await supabase
    .from('players')
    .select('*')
    .eq('email', targetEmail)
    .maybeSingle();

  if (fetchErr) {
    console.error('❌ Database error occurred while fetching player:', fetchErr);
    process.exit(1);
  }

  if (!player) {
    console.log(`⚠️ User not found by email matching "${targetEmail}". Searching case-insensitively...`);
    // Case-insensitive fallback
    const { data: playersCI, error: fetchErrCI } = await supabase
      .from('players')
      .select('*');
    
    if (fetchErrCI) {
      console.error('❌ Database error occurred during fallback search:', fetchErrCI);
      process.exit(1);
    }
    
    const matchedCI = playersCI.find(p => p.email && p.email.toLowerCase() === targetEmail.toLowerCase());
    if (!matchedCI) {
      console.error(`❌ Error: User with email "${targetEmail}" was not found in the database.`);
      console.log('List of available user emails in the DB:');
      playersCI.forEach(p => console.log(`  - ${p.email} (Username: ${p.username})`));
      process.exit(1);
    }
    
    // Use the case-insensitive match
    processPlayer(matchedCI);
  } else {
    processPlayer(player);
  }
}

async function processPlayer(player: any) {
  const email = player.email;
  const username = player.username;
  const oldLevel = player.level ?? 1;
  const oldCurrentXp = player.current_xp ?? 0;
  const oldRequiredXp = player.required_xp ?? 100;
  const oldTotalXp = player.total_xp ?? 0;
  const oldDailyXp = player.daily_xp ?? 0;
  const oldWeeklyXp = player.weekly_xp ?? 0;
  const oldRank = player.rank ?? 'E';
  
  console.log(`\nFound User Details:`);
  console.log(`  - Username: ${username}`);
  console.log(`  - Email:    ${email}`);
  console.log(`  - Level:    ${oldLevel}`);
  console.log(`  - XP:       ${oldCurrentXp} / ${oldRequiredXp} (Total XP: ${oldTotalXp})`);
  console.log(`  - Rank:     ${oldRank}`);

  const addedXp = 3000;
  console.log(`\n⚡ Adding ${addedXp} XP to user...`);

  // Accumulate XP values
  let currentXpAccum = oldCurrentXp + addedXp;
  let totalXpAccum = oldTotalXp + addedXp;
  let dailyXpAccum = oldDailyXp + addedXp;
  let weeklyXpAccum = oldWeeklyXp + addedXp;

  // Run the safe level-up computation engine
  const levelUpResult = safeLevelUp(currentXpAccum, oldRequiredXp, oldLevel);
  const newLevel = levelUpResult.level;
  const newCurrentXp = levelUpResult.currentXp;
  const newRequiredXp = levelUpResult.requiredXp;
  const newRank = levelUpResult.rank;
  const leveledUp = levelUpResult.leveledUp;

  console.log(`\nLevel Up Computation Results:`);
  console.log(`  - Leveled Up?     ${leveledUp ? '🎉 YES' : 'NO'}`);
  console.log(`  - New Level:      ${newLevel}`);
  console.log(`  - New XP Progress: ${newCurrentXp} / ${newRequiredXp} (Total XP: ${totalXpAccum})`);
  console.log(`  - New Rank:       ${newRank}`);

  // Prepare raw_data merge (client state cache)
  const dbRawData = player.raw_data || {};
  const currentLogs = Array.isArray(dbRawData.logs) ? dbRawData.logs : [];
  
  // Create system admin grant log
  const systemLog = {
    id: `xp_grant_${Date.now()}`,
    type: 'SYSTEM',
    message: `SYSTEM: Received ${addedXp} XP (Admin Grant)`,
    timestamp: Date.now(),
    xp: addedXp
  };
  
  const newLogs = [systemLog, ...currentLogs];
  
  if (leveledUp) {
    const levelUpLog = {
      id: `levelup_${Date.now()}`,
      type: 'LEVEL_UP',
      message: `LEVEL UP! REACHED LEVEL ${newLevel}`,
      timestamp: Date.now(),
      xp: 0
    };
    newLogs.unshift(levelUpLog);
  }

  const updatedRawData = {
    ...dbRawData,
    level: newLevel,
    currentXp: newCurrentXp,
    requiredXp: newRequiredXp,
    totalXp: totalXpAccum,
    dailyXp: dailyXpAccum,
    weeklyXp: weeklyXpAccum,
    rank: newRank,
    logs: newLogs
  };

  // Build the DB update object
  const updateData: Record<string, any> = {
    level: newLevel,
    current_xp: newCurrentXp,
    required_xp: newRequiredXp,
    total_xp: totalXpAccum,
    daily_xp: dailyXpAccum,
    weekly_xp: weeklyXpAccum,
    rank: newRank,
    raw_data: updatedRawData,
    updated_at: new Date().toISOString()
  };

  console.log(`\n💾 Persisting updates to database table 'players'...`);

  const { error: updateErr } = await supabase
    .from('players')
    .update(updateData)
    .eq('supabase_id', player.supabase_id);

  if (updateErr) {
    console.error('❌ Error updating database player record:', updateErr);
    process.exit(1);
  }

  console.log('🚀 SUCCESS! Database updated cleanly.');
  console.log('\nFinal Comparison:');
  console.log(`  Level: ${oldLevel} ➡️ ${newLevel}`);
  console.log(`  XP:    ${oldCurrentXp}/${oldRequiredXp} ➡️ ${newCurrentXp}/${newRequiredXp}`);
  console.log(`  Rank:  ${oldRank} ➡️ ${newRank}`);
  console.log(`  Logs:  Appended ${leveledUp ? '2' : '1'} new transaction log entry.`);
}

run().catch(console.error);
