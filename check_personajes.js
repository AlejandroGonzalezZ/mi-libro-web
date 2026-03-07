
import { supabase } from './lib/supabase.js';

async function checkSchema() {
  try {
    console.log("--- PERSONAJES (CODEX/GLOSARIO) ---");
    const { data: items } = await supabase.from('personajes').select('*').limit(1);
    console.log(JSON.stringify(Object.keys(items[0] || {})));
  } catch (e) {
    console.error(e);
  }
}

checkSchema();
