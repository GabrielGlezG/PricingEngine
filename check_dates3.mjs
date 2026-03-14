import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://beybdwxmocwaeuizghnf.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJleWJkd3htb2N3YWV1aXpnaG5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNjIzNjMsImV4cCI6MjA2ODYzODM2M30.FDpcvgMWMyMRveFIPE637nGovF5LbrMxfhXzVoXf1iE';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function fetchAll(queryObject) {
  let allData = [];
  let from = 0;
  const step = 1000;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await queryObject.range(from, from + step - 1);
    if (error) throw error;
    if (data && data.length > 0) {
      allData = allData.concat(data);
      from += step;
      if (data.length < step) hasMore = false;
    } else {
      hasMore = false;
    }
  }
  return allData;
}

async function run() {
  let query = supabase.from('price_data').select('date').order('date', { ascending: true });
  query = query.gte('price', 0); // Mutate builder
  const allRows = await fetchAll(query);
  console.log('Total fetched:', allRows.length);
}
run();
