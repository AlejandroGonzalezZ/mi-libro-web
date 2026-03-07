import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const loreItems = [
    {
        nombre: "Andy Collins",
        descripcion: "Científica brillante y decidida, líder del proyecto 'Peregrino del Vacío' en la Estación Helios. Su especialidad en fusión nuclear controlada es la clave para la supervivencia de la misión.",
        imagen_referencia: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800",
        metadata: { tipo: "personaje", status: "Active", origin: "Station Helios" }
    },
    {
        nombre: "Estación Helios",
        descripcion: "Ciudad orbital suspendida sobre la Tierra, centro neurálgico de la investigación energética y punto de partida del Peregrino. Es un ecosistema minimalista y ultra-tecnológico.",
        imagen_referencia: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=800",
        metadata: { tipo: "lugar", status: "Operational", sector: "Earth Orbit" }
    },
    {
        nombre: "Citerios",
        descripcion: "Especie alienígena avanzada contactada durante los primeros saltos del Peregrino. Su biología está basada en el silicio y poseen una tecnología de manipulación de gravedad cruda.",
        imagen_referencia: "https://images.unsplash.com/photo-1614728263952-84ea256f9679?auto=format&fit=crop&q=80&w=800",
        metadata: { tipo: "especie", status: "Neutral", threat_level: "Medium" }
    }
];

async function seedCodex() {
    console.log('📚 Cargando archivos en el Códice Interestelar...');

    const { error } = await supabase
        .from('personajes')
        .upsert(loreItems, { onConflict: 'nombre' });

    if (error) {
        console.error('❌ Error cargando el códice:', error.message);
    } else {
        console.log('✅ Códice actualizado con éxito.');
    }
}

seedCodex();
