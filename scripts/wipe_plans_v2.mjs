import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('--- DB WIPE START ---');
console.log('URL found:', !!supabaseUrl);
console.log('KEY found:', !!supabaseServiceKey);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('CRITICAL: Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function wipePlans() {
  try {
    console.log('Querying workout_plans table...');
    const { data: plans, error: fetchError } = await supabase
      .from('workout_plans')
      .select('id, name');

    if (fetchError) {
      console.error('Error fetching plans:', fetchError.message);
      return;
    }

    console.log(`Report: Database has ${plans?.length || 0} plans.`);

    if (plans && plans.length > 0) {
      plans.forEach(p => console.log(` - ID ${p.id}: ${p.name}`));
      console.log('Initiating delete...');
      const { error: deleteError } = await supabase
        .from('workout_plans')
        .delete()
        .neq('id', 0);

      if (deleteError) {
        console.error('Delete error:', deleteError.message);
      } else {
        console.log('SUCCESS: All database plans wiped.');
      }
    } else {
      console.log('Database table is already empty.');
    }
  } catch (err) {
    console.error('Unexpected error:', err.message);
  } finally {
    console.log('--- DB WIPE END ---');
  }
}

wipePlans();
