
import { supabase } from './lib/supabase.js';

async function checkSchema() {
  try {
    console.log("--- CAPITULOS ---");
    const { data: cap } = await supabase.from('capitulos').select('*').limit(1);
    console.log(JSON.stringify(Object.keys(cap[0] || {})));

    console.log("--- MULTIMEDIA ---");
    const { data: multi } = await supabase.from('multimedia').select('*').limit(1);
    console.log(JSON.stringify(Object.keys(multi[0] || {})));

    console.log("--- USUARIOS ---");
    const { data: user } = await supabase.from('usuarios').select('*').limit(1);
    console.log(JSON.stringify(Object.keys(user[0] || {})));
  } catch (e) {
    console.error(e);
  }
}

checkSchema();
