import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function wipePlans() {
  console.log('Fetching existing plans...');
  const { data: plans, error: fetchError } = await supabase
    .from('workout_plans')
    .select('id, name');

  if (fetchError) {
    console.error('Error fetching plans:', fetchError);
    return;
  }

  if (!plans || plans.length === 0) {
    console.log('No plans found in database workout_plans table.');
    return;
  }

  console.log(`Found ${plans.length} plans in database:`);
  plans.forEach(p => console.log(` - ID ${p.id}: ${p.name}`));

  console.log('\nWiping all plans from database...');
  const { error: deleteError } = await supabase
    .from('workout_plans')
    .delete()
    .neq('id', 0); // Delete all

  if (deleteError) {
    console.error('Error deleting plans:', deleteError);
  } else {
    console.log('Successfully wiped all plans from workout_plans table.');
    console.log('The app will now only show the 3 hardcoded DEFAULT_PLANS from lib/defaultPlans.ts (until you create new ones).');
  }
}

wipePlans();
