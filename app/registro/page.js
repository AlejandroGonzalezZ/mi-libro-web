"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FaUser, FaEnvelope, FaGlobe, FaCogs, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

export default function RegistroPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        nombre: '',
        correo: '',
        raza: 'Solar System, Sector 0',
        rango: 'Standard Terminal'
    });
    const [loading, setLoading] = useState(false);
    const [syncProgress, setSyncProgress] = useState(0);
    const [status, setStatus] = useState('IDLE'); // IDLE, SYNCING, SUCCESS, ERROR

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus('SYNCING');
        setSyncProgress(10);

        try {
            // Animación de progreso
            const interval = setInterval(() => {
                setSyncProgress(prev => (prev < 90 ? prev + 5 : prev));
            }, 100);

            // Determinar si es admin
            const isAdmin = formData.correo.toLowerCase() === "alejandro.gonzalez.z@outlook.com";

            const response = await fetch('/api/usuarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    correo: formData.correo.toLowerCase(),
                    nombre: formData.nombre,
                    raza: formData.raza,
                    rango_soldado: formData.rango,
                    is_admin: isAdmin
                })
            });

            const result = await response.json();

            clearInterval(interval);

            if (!response.ok) throw new Error(result.error || 'Sync Error');

            setSyncProgress(100);
            setStatus('SUCCESS');

            // Guardar en localStorage
            localStorage.setItem('galact_citizen_email', formData.correo.toLowerCase());

            // Redirigir después de un momento para mostrar éxito
            setTimeout(() => {
                router.push('/');
            }, 2000);

        } catch (error) {
            console.error('Error en registro:', error.message);
            setStatus('ERROR');
            setLoading(false);
        }
    };

    return (
        <main className="relative min-h-screen w-full bg-[#020408] font-sans flex items-center justify-center p-4 overflow-hidden">
            {/* Background Layer */}
            <div
                className="fixed inset-0 z-0 bg-[#020408] bg-cover bg-center bg-no-repeat opacity-40 transition-opacity duration-1000"
                style={{
                    backgroundImage: "url('/deep-space-bg.png')",
                    backgroundAttachment: 'fixed',
                }}
            />

            {/* Scanline Overlay */}
            <div className="fixed inset-0 pointer-events-none z-10 bg-scanlines opacity-[0.03]" />

            <div className="relative z-20 w-full max-w-5xl">
                {/* Header Section */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-[0.2em] uppercase mb-2 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">
                        GALACTIC CITIZEN ENROLLMENT PROTOCOL V.2.0
                    </h1>
                    <p className="text-cyan-400/60 font-mono tracking-[0.4em] text-xs uppercase">
                        Secure Your Existence in the Cosmic Archive
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    {/* Left Side: Form */}
                    <div className="hud-panel p-8 md:p-12 relative bg-black/60 backdrop-blur-xl">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Callsign / Nombre */}
                            <div className="space-y-2">
                                <label className="flex justify-between text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
                                    <span>PRIMARY IDENTIFIER (CALLSIGN)</span>
                                    <FaUser className="opacity-40" />
                                </label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        name="nombre"
                                        required
                                        placeholder="Enter Callsign..."
                                        value={formData.nombre}
                                        onChange={handleInputChange}
                                        className="w-full bg-cyan-950/20 border border-cyan-500/30 p-4 pl-6 text-white font-mono focus:outline-none focus:border-cyan-400 focus:bg-cyan-900/40 transition-all placeholder:text-cyan-500/30"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-500/40 group-focus-within:text-cyan-400 font-mono text-sm">&gt;_</div>
                                </div>
                            </div>

                            {/* Bio-Data / Correo */}
                            <div className="space-y-2">
                                <label className="flex justify-between text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
                                    <span>BIO-DATA ENCRYPTION (EMAIL)</span>
                                    <FaEnvelope className="opacity-40" />
                                </label>
                                <div className="relative group">
                                    <input
                                        type="email"
                                        name="correo"
                                        required
                                        placeholder="Enter secure email address..."
                                        value={formData.correo}
                                        onChange={handleInputChange}
                                        className="w-full bg-cyan-950/20 border border-cyan-500/30 p-4 pl-6 text-white font-mono focus:outline-none focus:border-cyan-400 focus:bg-cyan-900/40 transition-all placeholder:text-cyan-500/30"
                                    />
                                </div>
                            </div>

                            {/* Sector / Raza */}
                            <div className="space-y-2">
                                <label className="flex justify-between text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
                                    <span>HOMEWORLD SECTOR (RACE)</span>
                                    <FaGlobe className="opacity-40" />
                                </label>
                                <select
                                    name="raza"
                                    value={formData.raza}
                                    onChange={handleInputChange}
                                    className="w-full bg-cyan-950/20 border border-cyan-500/30 p-4 pl-6 text-white font-mono focus:outline-none focus:border-cyan-400 focus:bg-cyan-900/40 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="Krythari Node">Krythari Node</option>
                                    <option value="Nomar Sector">Nomar Sector</option>
                                    <option value="Solar System, Sector 0">Solar System, Sector 0</option>
                                    <option value="Andromeda Reach">Andromeda Reach</option>
                                </select>
                            </div>

                            {/* Interface / Rango */}
                            <div className="space-y-2">
                                <label className="flex justify-between text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
                                    <span>NEURAL INTERFACE TYPE (RANK)</span>
                                    <FaCogs className="opacity-40" />
                                </label>
                                <select
                                    name="rango"
                                    value={formData.rango}
                                    onChange={handleInputChange}
                                    className="w-full bg-cyan-950/20 border border-cyan-500/30 p-4 pl-6 text-white font-mono focus:outline-none focus:border-cyan-400 focus:bg-cyan-900/40 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="Recruit">Recruit / Standard Terminal</option>
                                    <option value="Soldier">Soldier / MetaLink Pro</option>
                                    <option value="Commander">Commander / Oculus R-1</option>
                                    <option value="Protocol Droid">Protocol Droid</option>
                                </select>
                            </div>

                            {/* Terms */}
                            <div className="flex items-start gap-3 p-2">
                                <div className="mt-1">
                                    <div className="w-5 h-5 border border-cyan-500/50 bg-cyan-500/10 flex items-center justify-center">
                                        <FaCheckCircle className="text-cyan-400 text-sm" />
                                    </div>
                                </div>
                                <p className="text-[10px] font-mono text-cyan-500/60 uppercase tracking-tighter leading-tight">
                                    I AGREE TO THE INTERSTELLAR TERMS & NEURAL SYNC AGREEMENT
                                </p>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-5 border-2 border-cyan-400/40 bg-cyan-400/10 text-cyan-400 uppercase font-black font-mono text-sm tracking-[0.4em] transition-all hover:bg-cyan-400 hover:text-black hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] relative overflow-hidden group ${loading ? 'opacity-50 cursor-wait' : ''}`}
                            >
                                <span className="relative z-10">
                                    {status === 'SYNCING' ? 'ESTABLISHING LINK...' : status === 'SUCCESS' ? 'LINK ESTABLISHED' : 'INITIALIZE NEURAL LINK'}
                                </span>
                                <div className="absolute inset-0 bg-cyan-400 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            </button>
                        </form>
                    </div>

                    {/* Right Side: Visual Info */}
                    <div className="hidden md:flex flex-col gap-8 h-full">
                        {/* Bio Sync Panel */}
                        <div className="hud-panel p-6 bg-black/40 border border-cyan-500/20 flex-1 flex flex-col items-center justify-center relative">
                            <div className="absolute top-4 right-4 flex items-center gap-2">
                                <span className="animate-pulse w-2 h-2 bg-red-500 rounded-full" />
                                <span className="text-[9px] font-mono text-red-500 uppercase">Live_Feed: Sector_0</span>
                            </div>

                            <img
                                src="/citizen-dna.png"
                                alt="Bio-Scanner"
                                className="w-full h-auto object-contain drop-shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                            />

                            <div className="w-full mt-8 space-y-4">
                                <div className="flex justify-between text-[10px] font-mono text-cyan-400/60 uppercase">
                                    <span>Biometric Synchronization Status: {syncProgress}%</span>
                                </div>
                                <div className="w-full h-2 bg-cyan-950 border border-cyan-500/20">
                                    <div
                                        className="h-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] transition-all duration-300"
                                        style={{ width: `${syncProgress}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Status Messages */}
                        <div className="hud-panel p-6 bg-cyan-950/10 border border-cyan-500/10 font-mono text-[10px] space-y-2">
                            <div className="flex items-start gap-2 text-cyan-400">
                                <FaCheckCircle className="mt-0.5" />
                                <p>&gt; ENCRYPTION_MODULE: ONLINE</p>
                            </div>
                            <div className="flex items-start gap-2 text-cyan-400/60">
                                <FaCheckCircle className="mt-0.5" />
                                <p>&gt; NEURAL_INTERFACE: CALIBRATING</p>
                            </div>
                            {status === 'ERROR' && (
                                <div className="flex items-start gap-2 text-red-400 bg-red-400/10 p-2 mt-4 animate-pulse">
                                    <FaExclamationTriangle className="mt-0.5" />
                                    <p>&gt; CRITICAL_ERROR: SYNC_FAILED. RETRY_INITIALIZATION.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            <footer className="fixed bottom-6 left-0 w-full z-30 px-10 pointer-events-none">
                <div className="flex flex-col items-center gap-0.5 opacity-30">
                    <span className="text-[7px] font-mono text-cyan-500/40 uppercase tracking-[0.4em]">ENROLLMENT_OFFICER:</span>
                    <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase tracking-widest">ALEJANDRO GONZÁLEZ ZÚÑIGA</span>
                </div>
            </footer>
        </main>
    );
}
