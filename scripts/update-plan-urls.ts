import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const sb = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const UPDATES: Record<string, string> = {
  'Arnold Press': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774519079/workout_exercises/arnold_press.mp4',
  'Preacher Curls': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774519086/workout_exercises/preacher_curl.mp4',
  'Preacher Curl': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774519086/workout_exercises/preacher_curl.mp4',
  'Brisk Walk': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774519096/workout_exercises/brisk_walk.mp4',
  'Brisk Walk / Light Jog': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774519096/workout_exercises/brisk_walk.mp4',
  'Slow Walk': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774519096/workout_exercises/brisk_walk.mp4',
  'Shoulder Stretch': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774519102/workout_exercises/shoulder_stretch.mp4',
};

async function main() {
  const { data: plans } = await sb.from('workout_plans').select('*');
  if (!plans || plans.length === 0) { console.log('No plans found'); return; }

  let total = 0;
  for (const p of plans) {
    if (!Array.isArray(p.days)) continue;
    let changed = false;
    const days = p.days.map((d: any) => {
      if (!Array.isArray(d.exercises)) return d;
      return {
        ...d,
        exercises: d.exercises.map((ex: any) => {
          if (UPDATES[ex.name] && ex.videoUrl !== UPDATES[ex.name]) {
            changed = true; total++;
            return { ...ex, videoUrl: UPDATES[ex.name] };
          }
          return ex;
        }),
      };
    });
    if (changed) {
      const { error } = await sb.from('workout_plans').update({ days }).eq('id', p.id);
      if (error) console.error(`  ❌ ${p.name}: ${error.message}`);
      else console.log(`  ✅ Updated plan: ${p.name}`);
    }
  }
  console.log(`\nTotal exercises updated in plans: ${total}`);
}

main().catch(e => { console.error(e); process.exit(1); });
