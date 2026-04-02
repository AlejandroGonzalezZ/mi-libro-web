"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { FaArrowLeft, FaHeartbeat, FaMicrophone, FaPlay, FaPause, FaStepBackward, FaStepForward } from "react-icons/fa";

export default function CapituloPage() {
    const { slug } = useParams();
    const router = useRouter();
    const [capitulo, setCapitulo] = useState(null);
    const [multimedia, setMultimedia] = useState([]);
    const [audioData, setAudioData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [selectedImg, setSelectedImg] = useState(null);

    const [toggles, setToggles] = useState({
        ambience: true,
        narration: true,
        sfx: true,
        voiceSynth: false
    });

    const scrollRef = useRef(null);
    const audioRef = useRef(null);

    useEffect(() => {
        async function fetchData() {
            const { data: cap, error } = await supabase
                .from("capitulos")
                .select("*")
                .eq("slug", slug)
                .single();

            if (cap) {
                setCapitulo(cap);
                const { data: media } = await supabase
                    .from("multimedia")
                    .select("*")
                    .eq("capitulo_id", cap.id);

                // Filtrar imágenes y ordenarlas por el índice guardado en metadata
                const images = (media || []).filter(m => m.tipo === 'imagen');
                const sortedImages = images.sort((a, b) => (a.metadata?.index || 0) - (b.metadata?.index || 0));
                setMultimedia(sortedImages);

                // Buscar el audio
                const audio = (media || []).find(m => m.tipo === 'audio');
                setAudioData(audio);

                // Registro de progreso si el usuario existe
                const email = localStorage.getItem('galact_citizen_email');
                if (email) {
                    fetch('/api/progreso', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            correo: email,
                            capitulo_slug: slug
                        })
                    }).then(async (res) => {
                        if (!res.ok) {
                            const errorData = await res.json();
                            console.error("Error saving progress:", errorData.error);
                        }
                    }).catch(err => console.error("Error saving progress:", err));
                }
            }
            setLoading(false);
        }
        fetchData();
    }, [slug]);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play().catch(err => {
                    console.error("Audio playback failed:", err);
                });
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (!audioRef.current) return;
        const current = audioRef.current.currentTime;
        const dur = audioRef.current.duration;
        setCurrentTime(current);
        setDuration(dur || 0);

        if (scrollRef.current && toggles.narration && dur > 0) {
            const scrollHeight = scrollRef.current.scrollHeight - scrollRef.current.clientHeight;
            const scrollPos = (current / dur) * scrollHeight;
            scrollRef.current.scrollTo({
                top: scrollPos,
                behavior: "smooth"
            });
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-[#020408] flex items-center justify-center">
            <div className="text-cyan-400 font-mono animate-pulse tracking-widest text-xl">
                ESTABLISHING NEURAL LINK...
            </div>
        </div>
    );

    if (!capitulo) return <div className="min-h-screen bg-[#020408] flex items-center justify-center text-red-500 font-mono">DATA CORRUPTION: CHAPTER NOT FOUND</div>;

    return (
        <div className="min-h-screen bg-[#020408] text-white font-sans overflow-hidden p-6 md:p-12 flex flex-col items-center justify-start relative">
            {/* Background Nebula */}
            <div
                className="fixed inset-0 z-0 bg-[#020408] bg-cover bg-center bg-no-repeat opacity-40 mix-blend-screen"
                style={{ backgroundImage: "url('/deep-space-bg.png')" }}
            />

            {/* Global HUD Frame Decor */}
            <div className="fixed inset-4 border border-cyan-500/20 pointer-events-none z-50 rounded-lg">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-cyan-400" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-cyan-400" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-cyan-400" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-cyan-400" />
            </div>

            <div className="bg-noise fixed inset-0 opacity-10 pointer-events-none z-10" />
            <div className="bg-scanlines fixed inset-0 opacity-5 pointer-events-none z-10" />

            {/* TOP BAR */}
            <header className="w-full max-w-7xl flex justify-between items-center mb-6 z-20 font-mono text-[10px] tracking-[0.2em] uppercase text-cyan-400/80">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.push('/')}
                        className="w-10 h-10 flex items-center justify-center bg-cyan-500/10 border border-cyan-500/30 rounded-full hover:bg-cyan-500 hover:text-black transition-all group"
                        title="Return to Nexus"
                    >
                        <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <span className="hidden md:inline">MISSION_COORDINATES: 12.45.78 / ORION_SECTOR</span>
                </div>
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <span>LIFE-SUPPORT: <span className="text-green-400">STABLE</span> / O2: 98%</span>
                        <div className="flex gap-1 h-3 items-end">
                            {[...Array(6)].map((_, i) => <div key={i} className={`w-1.5 bg-cyan-400 ${i < 5 ? 'h-full' : 'h-1/2 opacity-20'}`} />)}
                        </div>
                    </div>
                </div>
            </header>

            <main className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-12 gap-8 relative z-20 flex-1 overflow-hidden items-start">

                {/* LEFT: MISSION LOG */}
                <div className="md:col-span-8 flex flex-col overflow-hidden h-[420px]">
                    <div className="hud-panel-enclosed p-6 md:p-8 flex flex-col h-full relative bg-black/60 backdrop-blur-md overflow-hidden">
                        <div className="mb-4 shrink-0">
                            <h1 className="text-xl md:text-3xl font-black tracking-tight text-orange-400 uppercase italic">
                                {capitulo.titulo}
                            </h1>
                            <div className="h-0.5 w-16 bg-orange-500 mt-1" />
                        </div>

                        <div
                            ref={scrollRef}
                            className="hud-scrollbar overflow-y-auto pr-6 text-justify leading-relaxed text-cyan-50/80 font-normal text-base flex-1"
                        >
                            {capitulo.contenido?.split('\n').map((para, i) => (
                                <p key={i} className="mb-4 last:mb-0 transition-opacity duration-300 hover:text-white">
                                    {para}
                                </p>
                            ))}
                            {/* Extra space at bottom to allow scrolling last paragraph to the top */}
                            <div className="h-40" />
                        </div>
                    </div>
                </div>

                {/* RIGHT: TACTICAL FEEDS */}
                <div className="md:col-span-4 flex flex-col justify-start items-center h-[420px]">
                    <div className="hexagon-stack !gap-2 flex flex-col">
                        {[0, 1, 2].map((idx) => {
                            const item = multimedia[idx];
                            return (
                                <div key={idx} className="hexagon-item group !flex-row items-center gap-4">
                                    <div
                                        className={`hexagon-wrapper !w-[100px] !h-[115px] transition-all duration-500 ${item ? 'hover:scale-105 cursor-pointer' : 'opacity-20 grayscale'}`}
                                        onClick={() => {
                                            if (item) {
                                                setSelectedImg(item.url_archivo);
                                                setShowModal(true);
                                            }
                                        }}
                                    >
                                        <div className="hexagon-inner bg-cyan-950">
                                            {item ? <img src={item.url_archivo} alt={item.descripcion} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] text-cyan-500/40 font-mono">NO_SIGNAL</div>}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-0.5 max-w-[150px]">
                                        <span className="text-[9px] font-mono text-orange-400 uppercase tracking-widest font-bold">Image_{idx + 1}</span>
                                        <span className="text-[10px] font-mono text-cyan-300/70 uppercase truncate">
                                            {item ? item.descripcion : "Scanning..."}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* BOTTOM: TACTICAL AUDIO */}
                <div className="md:col-span-12 mt-4 relative">
                    <div className="hud-panel-enclosed !p-6 flex flex-col gap-5 bg-black/80 backdrop-blur-xl border border-cyan-500/30">
                        {/* 1. TACTICAL AUDIO TITLE & WAVEFORM (Full Width) */}
                        <div className="flex flex-col gap-2 w-full">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-cyan-400 font-mono text-[10px] tracking-widest uppercase font-bold">Tactical Audio</span>
                                <div className="flex gap-1 h-2 items-end opacity-60">
                                    {[...Array(6)].map((_, i) => <div key={i} className={`w-3 h-0.5 ${i < 4 ? 'bg-cyan-400' : 'bg-cyan-900'}`} />)}
                                </div>
                            </div>
                            <div className="visualizer-container !h-[70px] w-full bg-cyan-950/10 rounded overflow-hidden">
                                {Array.from({ length: 140 }).map((_, i) => {
                                    // Una sola onda unificada usando seno para la forma base
                                    const baseHeight = 30 + Math.sin(i * 0.15) * 25 + Math.sin(i * 0.3) * 10;
                                    return (
                                        <div
                                            key={i}
                                            className={`visualizer-bar !bg-cyan-400/50 shadow-[0_0_8px_rgba(34,211,238,0.3)] ${isPlaying ? 'bar-animating' : ''}`}
                                            style={{
                                                animationDelay: `${i * 0.01}s`,
                                                height: `${baseHeight + (isPlaying ? Math.random() * 30 : 0)}%`,
                                                width: '2px',
                                                margin: '0 1px'
                                            }}
                                        ></div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. CONTROLS LINE: PLAY + BAR + NAVIGATION */}
                        <div className="flex flex-col gap-4 w-full">
                            <div className="flex items-center gap-6">
                                {/* Play Button Left */}
                                <button
                                    onClick={togglePlay}
                                    className="w-10 h-10 shrink-0 flex items-center justify-center bg-transparent border border-cyan-400/40 rounded-full hover:bg-cyan-500/10 hover:border-cyan-400 transition-all text-cyan-400"
                                >
                                    {isPlaying ? <FaPause className="text-xs" /> : <FaPlay className="text-xs ml-0.5" />}
                                </button>

                                <div className="flex-1 flex flex-col gap-2">
                                    <div
                                        className="bg-cyan-950/40 h-1.5 relative overflow-hidden cursor-pointer group"
                                        onClick={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const x = e.clientX - rect.left;
                                            const clickedTime = (x / rect.width) * duration;
                                            if (audioRef.current) audioRef.current.currentTime = clickedTime;
                                        }}
                                    >
                                        <div
                                            className="absolute inset-y-0 left-0 bg-cyan-400 shadow-[0_0_15px_#22d3ee] transition-all duration-100"
                                            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                                        />
                                        <div
                                            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_15px_white] transition-all duration-100 opacity-0 group-hover:opacity-100 z-10"
                                            style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`, marginLeft: '-8px' }}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-cyan-400">
                                    <FaStepBackward
                                        onClick={() => { if (audioRef.current) audioRef.current.currentTime = 0; }}
                                        className="cursor-pointer hover:text-white transition-colors text-sm"
                                        title="Restart"
                                    />
                                    <FaStepForward
                                        onClick={() => { if (audioRef.current) audioRef.current.currentTime = duration - 1; }}
                                        className="cursor-pointer hover:text-white transition-colors text-sm"
                                        title="End"
                                    />
                                    <span className="font-mono text-cyan-400 text-[11px] min-w-[85px] text-right tracking-tighter tabular-nums">
                                        {Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(0).padStart(2, '0')} / {Math.floor(duration / 60)}:{(duration % 60).toFixed(0).padStart(2, '0')}
                                    </span>
                                </div>
                            </div>

                            {/* 3. BOTTOM TOGGLES (Horizontal) */}
                            <div className="flex items-center justify-between mt-1 pt-2 border-t border-cyan-500/10">
                                <div className="flex items-center gap-10">
                                    {Object.keys(toggles).map((key) => (
                                        <div
                                            key={key}
                                            className={`flex items-center gap-3 cursor-pointer transition-all ${toggles[key] ? 'opacity-100 text-cyan-300' : 'opacity-30 text-cyan-700 hover:opacity-50'}`}
                                            onClick={() => setToggles(prev => ({ ...prev, [key]: !prev[key] }))}
                                        >
                                            <span className="uppercase text-[9px] font-mono tracking-[0.2em] font-bold">
                                                {key === 'voiceSynth' ? 'VOICE_SYNTH' : key.toUpperCase()}
                                            </span>
                                            <div className={`w-8 h-3 rounded-full border border-cyan-500/40 p-0.5 relative transition-colors ${toggles[key] ? 'bg-cyan-500/10' : 'bg-transparent'}`}>
                                                <div className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full transition-all duration-300 ${toggles[key] ? 'right-1 bg-cyan-400 shadow-[0_0_10px_#22d3ee]' : 'left-1 bg-cyan-900'}`} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="hidden md:flex gap-1">
                                    {[...Array(3)].map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-cyan-500/20" />)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <audio
                ref={audioRef}
                src={capitulo.audio_url || audioData?.url_archivo || "/audio/placeholder.mp3"}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
            />

            {/* FULLSCREEN IMAGE MODAL */}
            {showModal && (
                <div
                    className="fixed inset-0 z-[100] bg-black/98 flex items-center justify-center p-4 md:p-12 backdrop-blur-3xl animate-in fade-in zoom-in duration-300"
                    onClick={() => setShowModal(false)}
                >
                    <div className="relative max-w-7xl w-full border border-cyan-500/20 rounded-lg overflow-hidden shadow-[0_0_80px_rgba(34,211,238,0.1)]">
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowModal(false); }}
                            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-black/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 hover:bg-cyan-500 hover:text-black transition-all z-[110]"
                        >✕</button>
                        <img src={selectedImg} alt="Tactical Feed Full" className="w-full h-auto max-h-[85vh] object-contain" />
                        <div className="bg-black/80 p-6 border-t border-cyan-500/20">
                            <span className="text-cyan-400 font-mono text-[10px] tracking-widest uppercase">Visual Intelligence Feed // High Resolution</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
