import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
        return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    try {
        const { data: prog, error } = await supabaseAdmin
            .from('progreso')
            .select('capitulo_slug, fecha_lectura')
            .eq('correo_usuario', email.toLowerCase())
            .order('fecha_lectura', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        return NextResponse.json({ progress: prog || null });
    } catch (error) {
        console.error('Error fetching progress:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { correo, capitulo_slug } = body;

        if (!correo || !capitulo_slug) {
            return NextResponse.json({ error: 'Email and slug required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('progreso')
            .insert({
                correo_usuario: correo.toLowerCase(),
                capitulo_slug: capitulo_slug,
                fecha_lectura: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error updating progress:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
