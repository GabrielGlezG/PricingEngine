import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://beybdwxmocwaeuizghnf.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJleWJkd3htb2N3YWV1aXpnaG5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNjIzNjMsImV4cCI6MjA2ODYzODM2M30.FDpcvgMWMyMRveFIPE637nGovF5LbrMxfhXzVoXf1iE';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function fetchAll(queryFn) {
  let allData = [];
  let from = 0;
  const step = 1000;
  let hasMore = true;
  while (hasMore) {
    // Call the query builder function to get a fresh builder
    const { data, error } = await queryFn().range(from, from + step - 1);
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
  const queryFn = () => supabase.from('price_data').select('date').order('date', { ascending: true });
  const allRows = await fetchAll(queryFn);
  console.log('Total fetched:', allRows.length);
  if(allRows.length > 0) {
    console.log('First:', allRows[0].date);
    console.log('Last:', allRows[allRows.length-1].date);
  }
}
run();
