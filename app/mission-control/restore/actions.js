"use server";

import { supabaseAdmin } from '@/lib/supabase-admin';

export async function restoreDatabaseAction(jsonData) {
  try {
    const log = [];
    
    // 1. Restaurar Capítulos
    if (jsonData.cuerpo_del_libro && Array.isArray(jsonData.cuerpo_del_libro)) {
      for (const cap of jsonData.cuerpo_del_libro) {
        const slug = cap.t.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') || `capitulo-${cap.n}`;
        
        const chapterData = {
          titulo: cap.t,
          resumen_ia: "", // Not explicitly in the old JSON
          contenido: cap.c,
          numero_orden: cap.n,
          slug: slug
        };

        // Buscar si el capítulo ya existe
        const { data: existingCap } = await supabaseAdmin.from('capitulos').select('id').eq('slug', slug).single();
        
        let capId;
        if (existingCap) {
          const { data, error } = await supabaseAdmin.from('capitulos').update(chapterData).eq('id', existingCap.id).select().single();
          if (error) throw error;
          capId = data.id;
          log.push(`Capítulo actualizado: ${cap.t}`);
        } else {
          const { data, error } = await supabaseAdmin.from('capitulos').insert(chapterData).select().single();
          if (error) throw error;
          capId = data.id;
          log.push(`Capítulo insertado: ${cap.t}`);
        }

        // Restaurar imágenes asociadas (Galería)
        if (cap.galeria && Array.isArray(cap.galeria)) {
          for (const url of cap.galeria) {
            if (url) {
              const mediaData = {
                capitulo_id: capId,
                tipo: 'imagen',
                url_archivo: url,
                descripcion: `Restaurado de respaldo - ${cap.t}`
              };
              
              // Buscar si la imagen ya existe para este capítulo
              const { data: existingMedia } = await supabaseAdmin.from('multimedia')
                .select('id').eq('capitulo_id', capId).eq('url_archivo', url).single();
                
              if (!existingMedia) {
                await supabaseAdmin.from('multimedia').insert(mediaData);
                log.push(`  - Imagen vinculada: ${url}`);
              }
            }
          }
        }
      }
    }

    // 2. Restaurar Glosario / Codex
    if (jsonData.glosario) {
      const categorias = [
        { key: 'personajes', tipo: 'personaje' },
        { key: 'especies', tipo: 'especie' },
        { key: 'localizaciones', tipo: 'lugar' },
        { key: 'tecnologia', tipo: 'tecnologia' }
      ];

      for (const cat of categorias) {
        if (jsonData.glosario[cat.key] && Array.isArray(jsonData.glosario[cat.key])) {
          for (const item of jsonData.glosario[cat.key]) {
            const codexData = {
              nombre: item.nombre,
              descripcion: item.descripcion || '',
              imagen_referencia: item.url_imagen || '',
              metadata: { tipo: cat.tipo, status: 'Active' }
            };

            const { data: existingCodex } = await supabaseAdmin.from('personajes').select('id').eq('nombre', item.nombre).single();

            if (existingCodex) {
              await supabaseAdmin.from('personajes').update(codexData).eq('id', existingCodex.id);
              log.push(`Codex actualizado (${cat.tipo}): ${item.nombre}`);
            } else {
              await supabaseAdmin.from('personajes').insert(codexData);
              log.push(`Codex insertado (${cat.tipo}): ${item.nombre}`);
            }
          }
        }
      }
    }

    return { success: true, log };
  } catch (error) {
    console.error("Error en restoreDatabaseAction:", error.message);
    return { success: false, error: error.message };
  }
}

export async function verifyBrokenLinksAction(urls) {
  try {
    const results = [];
    // Hacemos peticiones HEAD para verificar si la URL responde con 200 OK
    // Procesamos en lotes pequeños para no saturar
    for (let i = 0; i < urls.length; i += 5) {
      const batch = urls.slice(i, i + 5);
      const checks = await Promise.all(batch.map(async (url) => {
        try {
          const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
          return { url, ok: res.ok, status: res.status };
        } catch (err) {
          return { url, ok: false, error: err.message };
        }
      }));
      results.push(...checks);
    }
    
    const brokenLinks = results.filter(r => !r.ok);
    return { success: true, total: urls.length, broken: brokenLinks };
  } catch (error) {
    console.error("Error validando links:", error.message);
    return { success: false, error: error.message };
  }
}
