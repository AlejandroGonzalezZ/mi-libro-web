"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { FaChevronLeft, FaBook, FaSearch, FaUserAstronaut, FaDna, FaGlobeAmericas } from 'react-icons/fa';

export default function CodexPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('todos');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchCodex();
    }, []);

    async function fetchCodex() {
        try {
            const { data, error } = await supabase
                .from('personajes')
                .select('*')
                .order('nombre', { ascending: true });

            if (error) throw error;
            setItems(data || []);
        } catch (error) {
            console.error('Error fetching codex:', error.message);
        } finally {
            setLoading(false);
        }
    }

    const filteredItems = items.filter(item => {
        const matchesSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTab = activeTab === 'todos' || item.metadata?.tipo === activeTab;
        return matchesSearch && matchesTab;
    });

    return (
        <main className="min-h-screen bg-[#050a0f] text-cyan-50 font-sans selection:bg-cyan-500/30">
            {/* HUD Overlay */}
            <div className="fixed inset-0 pointer-events-none z-50 border-[20px] border-transparent opacity-30">
                <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-cyan-500/30" />
                <div className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 border-cyan-500/30" />
            </div>

            <header className="fixed top-0 left-0 w-full z-40 bg-black/60 backdrop-blur-md border-b border-cyan-500/10 px-6 py-4 flex justify-between items-center text-glow-cyan">
                <div className="flex items-center gap-4">
                    <Link href="/" className="text-cyan-500 hover:text-white transition-colors flex items-center gap-2 font-mono text-xs tracking-tighter uppercase">
                        <FaChevronLeft /> Back_to_Hub
                    </Link>
                    <div className="h-4 w-[1px] bg-cyan-500/20" />
                    <h1 className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
                        <FaBook className="text-sm opacity-70" /> Interstellar_Codex
                    </h1>
                </div>
                <div className="text-[10px] font-mono text-cyan-500/40 uppercase hidden md:block">
                    Database_Access: Authorized // Level_Clearance: 04
                </div>
            </header>

            <div className="max-w-7xl mx-auto pt-28 pb-32 px-6">
                {/* Search & Tabs HUD */}
                <div className="mb-12 grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
                    <div className="lg:col-span-4 relative">
                        <label className="text-[9px] font-mono text-cyan-500/60 uppercase mb-2 block tracking-widest">Query_Database</label>
                        <div className="relative group">
                            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/40 group-focus-within:text-cyan-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="SEARCH_BY_NAME_OR_DATA..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-cyan-950/20 border border-cyan-500/20 focus:border-cyan-400 focus:ring-0 p-3 pl-12 text-sm font-mono tracking-widest transition-all outline-none"
                            />
                        </div>
                    </div>

                    <div className="lg:col-span-8 flex gap-2 flex-wrap">
                        <button
                            onClick={() => setActiveTab('todos')}
                            className={`px-4 py-2 text-[10px] font-mono uppercase tracking-widest border transition-all ${activeTab === 'todos' ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-transparent text-cyan-500 border-cyan-500/20 hover:border-cyan-500/50'}`}
                        >
                            All_Entries
                        </button>
                        <button
                            onClick={() => setActiveTab('personaje')}
                            className={`px-4 py-2 text-[10px] font-mono uppercase tracking-widest border transition-all ${activeTab === 'personaje' ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-transparent text-cyan-500 border-cyan-500/20 hover:border-cyan-500/50'}`}
                        >
                            <FaUserAstronaut className="inline mr-2" /> Characters
                        </button>
                        <button
                            onClick={() => setActiveTab('especie')}
                            className={`px-4 py-2 text-[10px] font-mono uppercase tracking-widest border transition-all ${activeTab === 'especie' ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-transparent text-cyan-500 border-cyan-500/20 hover:border-cyan-500/50'}`}
                        >
                            <FaDna className="inline mr-2" /> Species
                        </button>
                        <button
                            onClick={() => setActiveTab('lugar')}
                            className={`px-4 py-2 text-[10px] font-mono uppercase tracking-widest border transition-all ${activeTab === 'lugar' ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-transparent text-cyan-500 border-cyan-500/20 hover:border-cyan-500/50'}`}
                        >
                            <FaGlobeAmericas className="inline mr-2" /> Locations
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-40 gap-6">
                        <div className="w-16 h-1 bg-cyan-500/20 overflow-hidden relative">
                            <div className="absolute inset-0 bg-cyan-400 animate-[loading_2s_infinite]" />
                        </div>
                        <span className="text-cyan-500 font-mono text-[10px] tracking-[0.4em] uppercase animate-pulse">Syncing_Codex_Archives...</span>
                    </div>
                ) : filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredItems.map(item => (
                            <div key={item.id} className="hud-panel group p-6 hover:bg-cyan-500/5 transition-all duration-500">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <span className="text-[9px] font-mono text-cyan-500/40 uppercase block mb-1">Entry_ID_{item.id.substring(0, 8)}</span>
                                        <h3 className="text-2xl font-black uppercase tracking-tight text-glow-cyan group-hover:text-white transition-colors">{item.nombre}</h3>
                                    </div>
                                    <div className="p-2 border border-cyan-500/20 rounded-sm">
                                        {item.metadata?.tipo === 'personaje' ? <FaUserAstronaut className="text-cyan-400" /> : <FaDna className="text-cyan-400" />}
                                    </div>
                                </div>

                                {item.imagen_referencia && (
                                    <div className="aspect-[16/9] bg-cyan-950/40 border border-cyan-500/10 mb-6 overflow-hidden relative group-hover:border-cyan-500/30 transition-all">
                                        <img
                                            src={item.imagen_referencia}
                                            alt={item.nombre}
                                            className="w-full h-full object-cover grayscale brightness-75 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-700"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#050a0f] via-transparent to-transparent opacity-60" />
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <p className="text-sm text-cyan-50/60 leading-relaxed line-clamp-4 group-hover:text-cyan-50/90 transition-colors">
                                        {item.descripcion}
                                    </p>

                                    <div className="pt-4 border-t border-cyan-500/10 flex justify-between items-center text-[8px] font-mono text-cyan-500/40 uppercase tracking-widest">
                                        <span>STATUS: {item.metadata?.status || 'Active'}</span>
                                        <span>LEVEL: BEYOND_THRESHOLD</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-40 border border-dashed border-cyan-500/20 bg-cyan-500/5">
                        <FaBiohazard className="text-4xl text-cyan-500/20 mx-auto mb-4" />
                        <p className="font-mono text-cyan-500/40 uppercase tracking-[0.2em] text-sm">No_Archives_Match_Your_Query</p>
                    </div>
                )}
            </div>

            <style jsx global>{`
        @keyframes loading {
          0% { left: -100%; width: 100%; }
          50% { left: 0; width: 30%; }
          100% { left: 100%; width: 100%; }
        }
      `}</style>
        </main>
    );
}
