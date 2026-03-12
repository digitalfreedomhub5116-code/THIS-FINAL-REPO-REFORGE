/**
 * seed-new-exercises.cjs
 * Adds new exercises from the attached document.
 * Skips any exercise whose name already exists in the DB (case-insensitive).
 */

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function ex(name, type, mg, equipment, sets, reps, notes = '') {
  return { name, type, muscle_group: mg, equipment, default_sets: sets, default_reps: reps, notes, display_order: 0, is_active: true, video_url: '' };
}

const FB  = 'FULL BODY';
const RD  = 'REAR DELT';
const GYM = 'GYM';
const BW  = 'BODYWEIGHT';
const HD  = 'HOME_DUMBBELLS';

const C   = (name, mg, eq, notes='') => ex(name, 'COMPOUND',  mg, eq, 4, '8, 8, 6, 6',    notes);
const I   = (name, mg, eq, notes='') => ex(name, 'ISOLATION', mg, eq, 3, '12, 12, 10',    notes);
const ACC = (name, mg, eq, notes='') => ex(name, 'ACCESSORY', mg, eq, 3, '12, 12, 10',    notes);
const CA  = (name, mg, eq, notes='') => ex(name, 'CARDIO',    mg, eq, 3, '30s, 30s, 30s', notes);
const ST  = (name, mg, eq, notes='') => ex(name, 'STRETCH',   mg, eq, 2, '30s, 30s',      notes);

const NEW_EXERCISES = [

  // ══════════════════════════════════════════════════════════════════════════
  // REAR DELT — Compound
  // ══════════════════════════════════════════════════════════════════════════
  C('Bent Over Row',              RD, GYM, 'Hinge at hips; pull bar to lower chest; strong rear-delt activation'),
  C('Seated Cable Row',           RD, GYM, 'Cable machine; pull handle to abdomen; squeeze shoulder blades'),
  C('Single Arm Dumbbell Row',    RD, GYM, 'Support on bench; elbow drives back; full range of motion'),
  C('Wide Grip Lat Pulldown',     RD, GYM, 'Wide overhand grip; pull bar to upper chest; rear delts assist'),
  C('Wide Grip Seated Row',       RD, GYM, 'Wide handle attachment; horizontal pull targeting rear delts'),

  // REAR DELT — Isolation
  I('Cable Rear Delt Fly',        RD, GYM, 'Low cable; single or bilateral fly; keep slight elbow bend'),
  I('Bent Over Lateral Raise',    RD, GYM, 'Hinge forward ~45°; raise dumbbells out to sides; control the descent'),
  I('Resistance Band Pull Apart', RD, HD,  'Hold band at chest width; pull apart horizontally; squeeze rear delts'),

  // ══════════════════════════════════════════════════════════════════════════
  // FULL BODY — Compound
  // ══════════════════════════════════════════════════════════════════════════
  C('Barbell Back Squat',         FB, GYM, 'Bar on upper traps; squat to parallel; full-body compound movement'),
  C('Snatch',                     FB, GYM, 'Olympic lift; bar from floor to overhead in one motion; full power'),
  C('Thruster',                   FB, GYM, 'Front squat into overhead press; continuous movement; full-body power'),
  C('Man Maker',                  FB, GYM, 'Dumbbell push-up + row + clean + press; complex full-body movement'),
  C('Kettlebell Clean',           FB, GYM, 'Swing KB from floor to rack position; hip drive; full-body power'),
  C('Kettlebell Snatch',          FB, GYM, 'Swing KB overhead in one motion; full shoulder mobility required'),
  C('Landmine Squat to Press',    FB, GYM, 'Squat holding landmine; press at top of movement; full-body power'),
  C('Wall Ball',                  FB, GYM, 'Squat with medicine ball; throw to target on wall; catch and repeat'),
  C('Overhead Squat',             FB, GYM, 'Bar locked overhead; squat full depth; demands mobility and stability'),
  C('Cossack Squat',              FB, BW,  'Lateral squat; one leg straight; deep hip and groin mobility'),
  C('Inchworm Walk',              FB, BW,  'Walk hands out to plank; walk feet to hands; dynamic full-body'),
  C('Spiderman Crawl',            FB, BW,  'Low crawl bringing knee to same-side elbow; hip and thoracic mobility'),
  C('Duck Walk',                  FB, BW,  'Deep squat; walk forward keeping hips low; hip and ankle mobility'),
  C('Windmill',                   FB, HD,  'KB or DB overhead; hinge laterally; trains shoulder and hip mobility'),
  C('Jefferson Curl',             FB, GYM, 'Slow spinal flexion with load; advanced posterior chain mobility drill'),
  C('Lunge with Rotation',        FB, BW,  'Step into lunge; rotate torso over front leg; hip and spine mobility'),
  C('Lateral Lunge',              FB, BW,  'Step sideways into deep lunge; keep opposite leg straight; hip mobility'),

  // FULL BODY — Cardio
  CA('Bear Crawl',                FB, BW,  'Hands and feet; knees hover off ground; move forward/backward'),
  CA('Crab Walk',                 FB, BW,  'Seated; hands and feet; walk in reverse; glutes and triceps active'),
  CA('Jogging',                   FB, BW,  'Steady moderate-pace running; aerobic base building'),
  CA('Sprint',                    FB, BW,  'Maximum effort short-distance run; anaerobic power output'),
  CA('Elliptical Training',       FB, GYM, 'Low-impact cardio machine; full stride pattern; arms and legs engaged'),
  CA('Swimming',                  FB, BW,  'Full-body aquatic cardio; minimal joint stress; high calorie burn'),
  CA('Skater Jump',               FB, BW,  'Lateral bound from foot to foot; explosive hip abduction; balance'),
  CA('Agility Ladder Drills',     FB, BW,  'Speed and coordination footwork patterns through ladder on ground'),
  CA('Butt Kicks',                FB, BW,  'Jog in place bringing heels up to glutes; quad stretch in motion'),
  CA('Skipping',                  FB, BW,  'Skip with exaggerated arm and knee drive; coordination and cardio'),
  CA('Carioca Drill',             FB, BW,  'Lateral shuffle crossing feet alternately; hip rotation and agility'),
  CA('Bounding',                  FB, BW,  'Exaggerated running strides; explosive single-leg push-off; power'),
  CA('Jump Lunges',               FB, BW,  'Alternating lunge with explosive jump; plyometric lower-body power'),
  CA('Dynamic Side Shuffle',      FB, BW,  'Athletic lateral shuffle; stay low; change direction; sport agility'),

  // FULL BODY — Accessory
  ACC('Sledgehammer Slams',       FB, GYM, 'Strike tire with hammer; rotational power; grip and core strength'),
  ACC('Sandbag Carry',            FB, GYM, 'Carry heavy sandbag for distance; loaded carry; full-body stability'),
  ACC('Sled Push',                FB, GYM, 'Drive weighted sled forward; lower-body push power; functional'),
  ACC('Sled Pull',                FB, GYM, 'Drag weighted sled toward you; hip hinge and posterior chain'),

  // FULL BODY — Stretch / Mobility
  ST('Sun Salutation',            FB, BW,  'Flowing yoga sequence; forward folds, lunges, upward/downward dog'),
  ST('World\'s Greatest Stretch', FB, BW,  'Lunge + thoracic rotation + hamstring stretch in one sequence'),
  ST('Downward Dog',              FB, BW,  'Inverted V position; stretch hamstrings, calves, shoulders and spine'),
  ST('Upward Dog',                FB, BW,  'Prone backbend; chest and hip flexor opener; cobra variation'),
  ST('Standing Forward Bend',     FB, BW,  'Hinge at hips; reach toward floor; hamstring and spinal decompression'),
  ST('Spiderman Stretch',         FB, BW,  'Lunge with hand inside foot; hip flexor and groin mobility'),
  ST('Deep Squat Hold',           FB, BW,  'Hold bottom squat position; ankle, hip and thoracic mobility'),
  ST('Leg Swings',                FB, BW,  'Forward/lateral pendulum swings; hip mobility warm-up drill'),
  ST('Torso Twists',              FB, BW,  'Standing rotation from hips; thoracic spine mobility; warm-up drill'),
  ST('Ankle Mobility Rock',       FB, BW,  'Knee-over-toe rock forward; improve dorsiflexion and ankle range'),
  ST('Knee Circles',              FB, BW,  'Hands on knees; circular motion; warm up knee joint and cartilage'),
  ST('Hip Circles',               FB, BW,  'Standing on one leg; large circular hip rotation; hip joint mobility'),
  ST('Seated Forward Fold',       FB, BW,  'Seated legs straight; fold forward; hamstring and lower back stretch'),
  ST('Lying Spinal Twist',        FB, BW,  'Supine; knee across body; thoracic and lumbar rotation stretch'),
  ST('Kneeling Hip Flexor Stretch', FB, BW, 'Lunge kneeling; drive hip forward; deep hip flexor and psoas stretch'),

  // ══════════════════════════════════════════════════════════════════════════
  // SHOULDERS — Mobility Activation
  // ══════════════════════════════════════════════════════════════════════════
  I('Band Shoulder Dislocates',   'SHOULDERS', HD, 'Wide grip on band; pass overhead and behind back; shoulder mobility'),
  I('Scapular Wall Slides',       'SHOULDERS', BW, 'Back against wall; slide arms up overhead; scapular mobility drill'),
  I('Shoulder CARs',              'SHOULDERS', BW, 'Controlled articular rotations; maximum shoulder joint range drill'),

  // ══════════════════════════════════════════════════════════════════════════
  // BACK — Mobility Activation
  // ══════════════════════════════════════════════════════════════════════════
  I('Thoracic Spine Rotations',   'BACK', BW, 'Seated or all-fours; rotate upper spine; improve thoracic mobility'),
  I('Scapular Push-Ups',          'BACK', BW, 'Plank position; protract and retract shoulder blades; serratus drill'),

  // ══════════════════════════════════════════════════════════════════════════
  // GLUTES — Mobility Activation
  // ══════════════════════════════════════════════════════════════════════════
  I('Hip CARs',                   'GLUTES', BW, 'Standing; large circular hip rotation; hip joint controlled range drill'),
  I('Banded Hip Openers',         'GLUTES', HD, 'Band around knees; squat or standing; activate abductors and glutes'),
  I('Glute Activation Walk',      'GLUTES', HD, 'Band above knees; walk laterally; activates glute med and min'),

];

async function main() {
  try {
    const existingRes = await pool.query('SELECT LOWER(name) AS lname FROM workout_exercises');
    const existingNames = new Set(existingRes.rows.map(r => r.lname));

    // Deduplicate within the new list itself (same name, different sections)
    const seenInNewList = new Set();
    const toInsert = NEW_EXERCISES.filter(e => {
      const key = e.name.toLowerCase();
      if (existingNames.has(key)) { console.log(`  SKIP (exists):  ${e.name}`); return false; }
      if (seenInNewList.has(key)) { console.log(`  SKIP (dup):     ${e.name}`); return false; }
      seenInNewList.add(key);
      return true;
    });

    console.log(`\nExisting exercises: ${existingNames.size}`);
    console.log(`Candidate new exercises: ${NEW_EXERCISES.length}`);
    console.log(`Will insert: ${toInsert.length}\n`);

    let inserted = 0;
    let failed = 0;
    for (const e of toInsert) {
      try {
        await pool.query(
          `INSERT INTO workout_exercises
             (name, type, muscle_group, equipment, default_sets, default_reps, notes, display_order, is_active, video_url)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [e.name, e.type, e.muscle_group, e.equipment, e.default_sets, e.default_reps, e.notes, e.display_order, e.is_active, e.video_url]
        );
        console.log(`  INSERT OK:      ${e.name}  [${e.muscle_group} / ${e.type}]`);
        inserted++;
      } catch (err) {
        console.error(`  INSERT FAIL:    ${e.name} — ${err.message}`);
        failed++;
      }
    }

    const finalRes = await pool.query('SELECT COUNT(*) FROM workout_exercises');
    console.log(`\n✓ Done — inserted ${inserted}, failed ${failed}, skipped ${NEW_EXERCISES.length - toInsert.length}`);
    console.log(`  Total exercises in DB: ${finalRes.rows[0].count}`);
  } finally {
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
