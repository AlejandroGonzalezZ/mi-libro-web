import { createClient } from '@supabase/supabase-js';
import { libro } from '../lib/libro.js';
import dotenv from 'dotenv';

// Cargar variables de entorno desde .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Usamos la service key para bypass RLS durante la migración

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el archivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrate() {
  console.log('🚀 Iniciando migración de capítulos...');

  for (let i = 0; i < libro.capitulos.length; i++) {
    const cap = libro.capitulos[i];
    const numeroOrden = i + 1;

    console.log(`📦 Procesando: ${cap.titulo}...`);

    // 1. Insertar Capítulo
    const { data: chapterData, error: chapterError } = await supabase
      .from('capitulos')
      .upsert({
        numero_orden: numeroOrden,
        slug: cap.slug,
        titulo: cap.titulo,
        contenido: cap.texto,
        imagen_portada: cap.imagen,
        creado_el: new Date().toISOString()
      }, { onConflict: 'slug' })
      .select()
      .single();

    if (chapterError) {
      console.error(`❌ Error insertando capítulo ${cap.titulo}:`, chapterError.message);
      continue;
    }

    // 2. Insertar Multimedia básica (la imagen principal del capítulo)
    if (cap.imagen) {
      const { error: mediaError } = await supabase
        .from('multimedia')
        .insert({
          capitulo_id: chapterData.id,
          tipo: 'imagen',
          url_archivo: cap.imagen,
          descripcion: `Portada de ${cap.titulo}`
        });

      if (mediaError) {
        console.error(`⚠️ Error insertando multimedia para ${cap.titulo}:`, mediaError.message);
      }
    }
  }

  console.log('✅ Migración completada con éxito.');
}

migrate().catch(err => {
  console.error('💥 Error fatal en la migración:', err);
});
