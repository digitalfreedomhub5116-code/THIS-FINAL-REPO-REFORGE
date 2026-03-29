// Audit all 3 plans for programming mistakes
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const planSrc = fs.readFileSync(path.join(__dirname, '../lib/defaultPlans.ts'), 'utf-8');

// Parse all plan days
const plans = {
  'GYM PPL': { days: [] },
  'DUMBBELL': { days: [] },
  'BODYWEIGHT': { days: [] },
};

// Split into sections
const gymSection = planSrc.match(/gymPPLDays[\s\S]*?(?=\/\/ ═══.*PLAN 2)/)?.[0] || '';
const dbSection = planSrc.match(/dumbbellDays[\s\S]*?(?=\/\/ ═══.*PLAN 3)/)?.[0] || '';
const bwSection = planSrc.match(/bodyweightDays[\s\S]*?(?=\/\/ Expand)/)?.[0] || '';

function parseDays(section) {
  const days = [];
  const dayBlocks = section.split(/\{\s*\n\s*day:/g).slice(1);
  
  for (const block of dayBlocks) {
    const focusMatch = block.match(/focus:\s*'([^']+)'/);
    const dayMatch = block.match(/'Day (\d+)'/);
    const focus = focusMatch?.[1] || 'unknown';
    const dayNum = dayMatch?.[1] || '?';
    
    // Extract exercises
    const exercises = [];
    const exRegex = /ex\('([^']+)',\s*(\d+),\s*'([^']+)'/g;
    let m;
    while ((m = exRegex.exec(block)) !== null) {
      exercises.push({ name: m[1], sets: parseInt(m[2]), reps: m[3] });
    }
    
    // Also catch warmup/cooldown spread exercises
    const spreadRegex = /\.\.\.WARMUP_(\w+)|\.\.\.COOLDOWN_(\w+)/g;
    
    days.push({ day: dayNum, focus, exercises });
  }
  return days;
}

const gymDays = parseDays(gymSection);
const dbDays = parseDays(dbSection);
const bwDays = parseDays(bwSection);

function auditPlan(planName, days) {
  const issues = [];
  
  for (const day of days) {
    if (day.exercises.length === 0) continue;
    
    // 1. Check for duplicate exercises on the same day
    const nameCount = {};
    for (const ex of day.exercises) {
      nameCount[ex.name] = (nameCount[ex.name] || 0) + 1;
    }
    for (const [name, count] of Object.entries(nameCount)) {
      if (count > 1) {
        issues.push(`⚠️ Day ${day.day} (${day.focus}): "${name}" appears ${count} times`);
      }
    }
    
    // 2. Check for stacked similar exercises (e.g. multiple push-up variants)
    const pushVariants = day.exercises.filter(e => 
      e.name.includes('Push-Up') || e.name.includes('Pushup')
    );
    if (pushVariants.length > 2) {
      const total = pushVariants.reduce((s, e) => s + e.sets * parseInt(e.reps), 0);
      issues.push(`🔴 Day ${day.day} (${day.focus}): ${pushVariants.length} push-up variants! (${pushVariants.map(p => p.name).join(', ')}) ≈ ${total} total reps`);
    }
    
    const curlVariants = day.exercises.filter(e => 
      e.name.toLowerCase().includes('curl') && !e.name.includes('Leg')
    );
    if (curlVariants.length > 2) {
      issues.push(`⚠️ Day ${day.day} (${day.focus}): ${curlVariants.length} curl variants (${curlVariants.map(c => c.name).join(', ')})`);
    }

    const rowVariants = day.exercises.filter(e =>
      e.name.toLowerCase().includes('row') && !e.name.includes('Cable')
    );
    if (rowVariants.length > 2) {
      issues.push(`⚠️ Day ${day.day} (${day.focus}): ${rowVariants.length} row variants (${rowVariants.map(r => r.name).join(', ')})`);
    }
    
    // 3. Check for too many pressing movements on one day
    const pressVariants = day.exercises.filter(e => 
      e.name.includes('Press') || e.name.includes('Bench')
    );
    if (pressVariants.length > 3) {
      issues.push(`⚠️ Day ${day.day} (${day.focus}): ${pressVariants.length} pressing exercises (${pressVariants.map(p => p.name).join(', ')})`);
    }
    
    // 4. Check for too much volume per muscle group
    const chestExercises = day.exercises.filter(e => 
      ['Bench Press', 'Dumbbell Press', 'Floor Press', 'Cable Fly', 'Dumbbell Fly', 'Push-Up', 'Diamond Push-Up'].some(keyword => e.name.includes(keyword))
    );
    if (chestExercises.length > 3) {
      const totalSets = chestExercises.reduce((s, e) => s + e.sets, 0);
      issues.push(`⚠️ Day ${day.day} (${day.focus}): ${chestExercises.length} chest exercises (${totalSets} sets) — ${chestExercises.map(e => e.name).join(', ')}`);
    }
    
    // 5. Check for quad overload (too many squat/lunge variants)
    const quadExercises = day.exercises.filter(e =>
      ['Squat', 'Lunge', 'Leg Press', 'Leg Extension', 'Step Up'].some(kw => e.name.includes(kw))
    );
    if (quadExercises.length > 3) {
      issues.push(`⚠️ Day ${day.day} (${day.focus}): ${quadExercises.length} quad exercises (${quadExercises.map(e => e.name).join(', ')})`);
    }
    
    // 6. Check total exercise count per day (excluding warmup/cooldown which aren't in our parse)
    if (day.exercises.length > 7) {
      issues.push(`⚠️ Day ${day.day} (${day.focus}): ${day.exercises.length} exercises — too many for one session`);
    }
    
    // 7. Check for "reps" that don't make sense (e.g. "10" for Plank)
    for (const ex of day.exercises) {
      if ((ex.name === 'Plank' || ex.name === 'Wall Sit') && !ex.reps.includes('s') && !ex.reps.includes('sec')) {
        issues.push(`🔴 Day ${day.day}: "${ex.name}" has reps="${ex.reps}" — should be a timed hold like "30s"`);
      }
    }
    
    // 8. Check Hip Thrust + Glute Bridge on same day (redundant)
    const gluteExercises = day.exercises.filter(e => 
      ['Hip Thrust', 'Glute Bridge', 'Single Leg Glute Bridge'].includes(e.name)
    );
    if (gluteExercises.length > 2) {
      issues.push(`⚠️ Day ${day.day} (${day.focus}): ${gluteExercises.length} glute isolation exercises — possibly redundant (${gluteExercises.map(e => e.name).join(', ')})`);
    }
  }
  
  // 9. Weekly volume check - count how many times each exercise appears across the week
  const weeklyCount = {};
  for (const day of days) {
    for (const ex of day.exercises) {
      weeklyCount[ex.name] = (weeklyCount[ex.name] || 0) + 1;
    }
  }
  for (const [name, count] of Object.entries(weeklyCount)) {
    if (count > 2 && !['Plank', 'Mountain Climbers', 'Crunches', 'Jumping Jacks'].includes(name)) {
      issues.push(`📊 Weekly: "${name}" appears ${count} times across the week`);
    }
  }
  
  return issues;
}

console.log('=== PLAN 1: GYM PPL ===');
const gymIssues = auditPlan('GYM', gymDays);
if (gymIssues.length === 0) console.log('  ✅ No issues found');
else gymIssues.forEach(i => console.log(`  ${i}`));

console.log('\n=== PLAN 2: DUMBBELL ===');
const dbIssues = auditPlan('DUMBBELL', dbDays);
if (dbIssues.length === 0) console.log('  ✅ No issues found');
else dbIssues.forEach(i => console.log(`  ${i}`));

console.log('\n=== PLAN 3: BODYWEIGHT ===');
const bwIssues = auditPlan('BODYWEIGHT', bwDays);
if (bwIssues.length === 0) console.log('  ✅ No issues found');
else bwIssues.forEach(i => console.log(`  ${i}`));

const totalIssues = gymIssues.length + dbIssues.length + bwIssues.length;
console.log(`\n=== TOTAL: ${totalIssues} issues found ===`);
