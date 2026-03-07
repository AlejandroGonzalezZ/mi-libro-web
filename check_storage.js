
import { supabase } from './lib/supabase.js';

async function checkStorage() {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) throw error;
    console.log("BUCKETS:", JSON.stringify(buckets.map(b => b.name)));
  } catch (e) {
    console.error(e);
  }
}

checkStorage();
