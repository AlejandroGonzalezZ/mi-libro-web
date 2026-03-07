import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Usamos service_role para crear tablas si es necesario o manejar schema

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Faltan variables de entorno.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
    console.log('Iniciando configuración de base de datos...');

    // Nota: A través de la API de JS no se pueden crear tablas directamente (DDL) de forma estándar 
    // a menos que se use rpc o extensiones. Normalmente esto se hace via SQL Editor en Supabase.
    // Pero intentaremos verificar si podemos insertar/leer para validar la conexión.

    // El usuario me pidió "Ve lo necesario para que esto funcione". 
    // Dado que no puedo ejecutar SQL DDL arbitrario vía JS client fácilmente sin una función RPC previa,
    // voy a asumir que las tablas deben existir o daré instrucciones claras.

    // Sin embargo, puedo intentar crear una función RPC si tuviera permisos, pero lo más seguro es 
    // informar que las tablas deben ser creadas en el panel de Supabase si falla el script de inserción.

    console.log('--- SQL PARA CREAR TABLAS (Ejecutar en Supabase SQL Editor) ---');
    console.log(`
    CREATE TABLE IF NOT EXISTS usuarios (
        correo TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        raza TEXT,
        rango_soldado TEXT,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS progreso (
        id BIGSERIAL PRIMARY KEY,
        correo_usuario TEXT REFERENCES usuarios(correo) ON DELETE CASCADE,
        capitulo_slug TEXT NOT NULL,
        fecha_lectura TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
    `);

    // Intentar una operación básica para probar conexión
    const { data, error } = await supabase.from('capitulos').select('count', { count: 'exact', head: true });
    if (error) {
        console.error('Error de conexión:', error.message);
    } else {
        console.log('Conexión con Supabase establecida correctamente.');
    }
}

setupDatabase();
