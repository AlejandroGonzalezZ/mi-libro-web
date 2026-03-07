"use server";

import { supabaseAdmin } from '@/lib/supabase-admin';

export async function saveChapterAction(formData, capId) {
  try {
    const slug = formData.titulo.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    const chapterData = {
      titulo: formData.titulo,
      resumen_ia: formData.resumen_ia,
      contenido: formData.contenido,
      numero_orden: formData.numero_orden,
      slug: slug || `capitulo-${formData.numero_orden}`
    };

    if (capId === 'new' || !capId) {
      const { data, error } = await supabaseAdmin.from('capitulos').insert(chapterData).select().single();
      if (error) throw error;
      return { success: true, data };
    } else {
      const { data, error } = await supabaseAdmin.from('capitulos').update(chapterData).eq('id', capId).select().single();
      if (error) throw error;
      return { success: true, data };
    }
  } catch (error) {
    console.error("Action error (saveChapter):", error.message);
    return { success: false, error: error.message };
  }
}

export async function saveMediaAction(mediaData) {
  try {
    if (mediaData.id) {
      const { data, error } = await supabaseAdmin.from('multimedia').update(mediaData).eq('id', mediaData.id).select().single();
      if (error) throw error;
      return { success: true, data };
    } else {
      const { data, error } = await supabaseAdmin.from('multimedia').insert(mediaData).select().single();
      if (error) throw error;
      return { success: true, data };
    }
  } catch (error) {
    console.error("Action error (saveMedia):", error.message);
    return { success: false, error: error.message };
  }
}

export async function deleteMediaAction(mediaId) {
  try {
    const { error } = await supabaseAdmin.from('multimedia').delete().eq('id', mediaId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Action error (deleteMedia):", error.message);
    return { success: false, error: error.message };
  }
}

export async function saveCodexAction(formData, id) {
  try {
    const codexData = {
      nombre: formData.nombre,
      descripcion: formData.descripcion,
      imagen_referencia: formData.imagen_referencia,
      metadata: formData.metadata
    };

    if (id === 'new' || !id) {
      const { data, error } = await supabaseAdmin.from('personajes').insert(codexData).select().single();
      if (error) throw error;
      return { success: true, data };
    } else {
      const { data, error } = await supabaseAdmin.from('personajes').update(codexData).eq('id', id).select().single();
      if (error) throw error;
      return { success: true, data };
    }
  } catch (error) {
    console.error("Action error (saveCodex):", error.message);
    return { success: false, error: error.message };
  }
}

export async function deleteCodexAction(id) {
  try {
    const { error } = await supabaseAdmin.from('personajes').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Action error (deleteCodex):", error.message);
    return { success: false, error: error.message };
  }
}

export async function uploadFileAction(formData) {
  try {
    const file = formData.get('file');
    const bucket = formData.get('bucket');
    const fileName = formData.get('fileName');

    if (!file || !bucket || !fileName) {
      throw new Error("CRITICAL_UPLOAD_ERROR: Missing required telemetry.");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`Starting upload to Supabase: ${bucket}/${fileName}, Size: ${buffer.length} bytes`);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true
      });

    if (uploadError) {
      console.error("Supabase Storage Upload Error:", uploadError);
      throw uploadError;
    }

    const { data } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(fileName);

    if (!data?.publicUrl) throw new Error("Could not generate public URL.");

    return { success: true, publicUrl: data.publicUrl };
  } catch (error) {
    console.error("Action error (uploadFile):", error.message);
    return { success: false, error: error.message };
  }
}

export async function deleteFileAction(bucket, filePath) {
  try {
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([filePath]);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Action error (deleteFile):", error.message);
    return { success: false, error: error.message };
  }
}
