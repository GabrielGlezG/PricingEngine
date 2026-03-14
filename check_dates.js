import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkDates() {
  const { data, error } = await supabase
    .from('price_data')
    .select('date')
    .order('date', { ascending: false })
    .limit(5);
    
  if (error) console.error(error);
  else console.log("Latest dates:", data);

  const { data: ascData } = await supabase
    .from('price_data')
    .select('date')
    .order('date', { ascending: true })
    .limit(5);
  console.log("Oldest dates:", ascData);
  
  const { count } = await supabase
    .from('price_data')
    .select('*', { count: 'exact', head: true });
  console.log("Total records:", count);
}
checkDates();
