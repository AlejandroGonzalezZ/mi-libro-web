import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
        return NextResponse.json({ error: 'Email receptor requerido' }, { status: 400 });
    }

    try {
        const { data: user, error } = await supabaseAdmin
            .from('usuarios')
            .select('*')
            .eq('correo', email.toLowerCase())
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is not found

        return NextResponse.json({ user: user || null });
    } catch (error) {
        console.error('Error fetching user:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { correo, nombre, raza, rango_soldado, is_admin } = body;

        if (!correo) {
            return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('usuarios')
            .upsert({
                correo: correo.toLowerCase(),
                nombre,
                raza,
                rango_soldado,
                is_admin: is_admin || (correo.toLowerCase() === "alejandro.gonzalez.z@outlook.com")
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ user: data });
    } catch (error) {
        console.error('Error upserting user:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
