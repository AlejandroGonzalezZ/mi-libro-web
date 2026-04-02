
import { supabaseAdmin } from './lib/supabase-admin.js';

async function setupBuckets() {
  const buckets = ['capitulos', 'audios'];

  for (const bucket of buckets) {
    console.log(`Checking bucket: ${bucket}`);
    const { data: list } = await supabaseAdmin.storage.listBuckets();
    const exists = list?.find(b => b.name === bucket);

    if (!exists) {
      console.log(`Creating bucket: ${bucket}`);
      const { error } = await supabaseAdmin.storage.createBucket(bucket, {
        public: true,
        allowedMimeTypes: bucket === 'audios' ? ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'] : ['image/png', 'image/jpeg', 'image/webp'],
        fileSizeLimit: 52428800 // 50MB
      });
      if (error) console.error(`Error creating ${bucket}:`, error.message);
      else console.log(`Bucket ${bucket} created.`);
    } else {
      console.log(`Bucket ${bucket} already exists.`);
    }
  }
}

setupBuckets();
