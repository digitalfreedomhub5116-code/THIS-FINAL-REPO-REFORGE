const { Pool } = require('pg');
const path = require('path');
try { require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') }); } catch {}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const EXERCISES_TO_REMOVE = [
  'Behind the Back Biceps Stretch',
  'Wall Shoulder Stretch',
  'Overhead Triceps and Shoulder Stretch',
  'Bent Over Lateral Raise',
  'Bridge Stretch',
  'Seated Glute Stretch',
  'Standing Glute Stretch',
  'Frog Pumps',
  'Fire Hydrants',
  'Standing Leg Curl',
  'Behind the Head Triceps Stretch',
  'Wall Triceps Stretch',
  'Standing Triceps Stretch',
  'Doorway Biceps Stretch',
  'Seated Biceps Stretch',
  'Overhead Squat',
  'Thoracic Spine Rotations',
  'Scapular Push-Ups',
  'Hip CARs',
  'Banded Hip Openers',
  'Torso Twists',
  'Upward Dog',
  'Sledgehammer Slams',
  'Sandbag Carry',
  'Bear Crawl',
  'Jefferson Curl',
  'Lunge with Rotation',
];

(async () => {
  const client = await pool.connect();
  try {
    // Build parameterized query
    const placeholders = EXERCISES_TO_REMOVE.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `DELETE FROM workout_exercises WHERE name IN (${placeholders})`;

    const res = await client.query(sql, EXERCISES_TO_REMOVE);
    console.log(`✅ Deleted ${res.rowCount} exercises from workout_exercises`);

    // Also check if any are referenced in user_custom_plans JSONB
    const { rows: plans } = await client.query(`SELECT id, user_id, name, days FROM user_custom_plans`);
    let plansUpdated = 0;
    for (const plan of plans) {
      const days = plan.days;
      if (!Array.isArray(days)) continue;
      let modified = false;
      for (const day of days) {
        if (!day.exercises || !Array.isArray(day.exercises)) continue;
        const before = day.exercises.length;
        day.exercises = day.exercises.filter(
          (ex) => !EXERCISES_TO_REMOVE.includes(ex.name)
        );
        if (day.exercises.length < before) modified = true;
      }
      if (modified) {
        await client.query(
          `UPDATE user_custom_plans SET days = $1 WHERE id = $2`,
          [JSON.stringify(days), plan.id]
        );
        plansUpdated++;
      }
    }
    console.log(`✅ Cleaned ${plansUpdated} user custom plans`);
  } finally {
    client.release();
    await pool.end();
  }
})();
