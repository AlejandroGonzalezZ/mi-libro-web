"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { FaVolumeUp, FaVolumeMute, FaArrowRight, FaRocket, FaDatabase, FaBook, FaCogs, FaDownload } from 'react-icons/fa';

export default function Home() {
  const [capitulos, setCapitulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [activeSlug, setActiveSlug] = useState(null);
  const [timestamp, setTimestamp] = useState('');
  const [userData, setUserData] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [suggestedChapter, setSuggestedChapter] = useState(null);
  const audioRef = useRef(null);

  const carouselRef = useRef(null);

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const init = async () => {
      const caps = await fetchCapitulos();
      if (caps) checkUser(caps);
    };
    init();
    setTimestamp(new Date().toISOString().split('T')[1].substring(0, 8));

    if (audioRef.current) {
      audioRef.current.volume = 0.1;
    }

    const observerOptions = {
      root: carouselRef.current,
      threshold: 0.6,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSlug(entry.target.getAttribute('data-slug'));
        }
      });
    }, observerOptions);

    const timer = setTimeout(() => {
      if (carouselRef.current) {
        const cards = carouselRef.current.querySelectorAll('.carousel-card');
        cards.forEach(card => observer.observe(card));
      }
    }, 1000);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [loading]);

  async function checkUser(capsList) {
    const email = localStorage.getItem('galact_citizen_email');
    if (email) {
      try {
        const { data: user, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('correo', email)
          .single();

        if (user) {
          setUserData(user);
          
          // Solo mostrar bienvenida si no se ha mostrado en esta sesión
          const welcomeShown = sessionStorage.getItem('welcome_shown');
          if (!welcomeShown) {
            setShowWelcome(true);
            sessionStorage.setItem('welcome_shown', 'true');
          }

          // Buscar último capítulo leído
          const { data: prog } = await supabase
            .from('progreso')
            .select('capitulo_slug')
            .eq('correo_usuario', email)
            .order('fecha_lectura', { ascending: false })
            .limit(1)
            .single();

          if (prog && capsList) {
            const currentCap = capsList.find(c => c.slug === prog.capitulo_slug);
            if (currentCap) {
              // Sugerir el siguiente capítulo (N+1)
              const nextCap = capsList.find(c => c.numero_orden === currentCap.numero_orden + 1);
              setSuggestedChapter(nextCap || currentCap);
            }
          }
        }
      } catch (err) {
        console.error("Error checking user:", err);
      }
    }
  }

  async function fetchCapitulos() {
    try {
      const { data, error } = await supabase
        .from('capitulos')
        .select('titulo, slug, numero_orden')
        .order('numero_orden', { ascending: true });

      if (error) throw error;
      setCapitulos(data || []);
      return data;
    } catch (error) {
      console.error('Error fetching chapters:', error.message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  const exportFullBookData = async () => {
    try {
      setLoading(true);
      // 1. Obtener Capítulos con su contenido
      const { data: capitulosRaw, error: capsError } = await supabase
        .from('capitulos')
        .select('id, numero_orden, titulo, contenido')
        .order('numero_orden', { ascending: true });

      if (capsError) throw capsError;

      // 2. Obtener Glosario (personajes)
      const { data: glosario, error: glosError } = await supabase
        .from('personajes')
        .select('nombre, descripcion, imagen_referencia, metadata');

      if (glosError) throw glosError;

      // 3. Obtener Multimedia para las imágenes de los capítulos
      const { data: multimedia, error: multError } = await supabase
        .from('multimedia')
        .select('capitulo_id, url_archivo, tipo, metadata');

      if (multError) throw multError;

      // 4. Formatear Glosario por tipos
      const glosarioEstructurado = {
        personajes: glosario.filter(g => g.metadata?.tipo === 'personaje').map(g => ({ nombre: g.nombre, descripcion: g.descripcion, url_imagen: g.imagen_referencia })),
        especies: glosario.filter(g => g.metadata?.tipo === 'especie').map(g => ({ nombre: g.nombre, descripcion: g.descripcion, url_imagen: g.imagen_referencia })),
        localizaciones: glosario.filter(g => g.metadata?.tipo === 'lugar').map(g => ({ nombre: g.nombre, descripcion: g.descripcion, url_imagen: g.imagen_referencia }))
      };

      // 5. Construir el JSON final
      const libroCompleto = {
        metadata: {
          titulo: "El Eje del Olvido",
          fecha_exportacion: new Date().toISOString(),
          version: "2.0-LLM-OPTIMIZED"
        },
        glosario: glosarioEstructurado,
        cuerpo_del_libro: capitulosRaw.map(cap => {
          const imagenesCap = multimedia
            ?.filter(m => m.capitulo_id === cap.id && m.tipo === 'imagen')
            .sort((a, b) => (a.metadata?.index || 0) - (b.metadata?.index || 0))
            .map(m => m.url_archivo) || [];

          return {
            n: cap.numero_orden,
            t: cap.titulo,
            c: cap.contenido,
            galeria: imagenesCap.slice(0, 3) // Array de hasta 3 strings
          };
        })
      };

      // 6. Descargar el archivo con encoding UTF-8
      const jsonString = JSON.stringify(libroCompleto, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `el-eje-del-olvido-llm-data-${new Date().getTime()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert("DATA_EXPORT_PROTOCOL_COMPLETE // UTF-8_ENCODING_VERIFIED");
    } catch (err) {
      console.error("Export error:", err);
      alert("EXPORT_SEQUENCE_FAILED: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(audioRef.current.muted);
      if (!audioRef.current.muted) {
        audioRef.current.play().catch(e => console.error("Error al reproducir audio:", e));
      }
    }
  };

  return (
    <main className="relative min-h-screen w-full bg-[#020408] font-sans overflow-x-hidden overflow-y-auto">
      {/* Background Layer with Dark Fallback */}
      <div
        className="fixed inset-0 z-0 bg-[#020408] bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
        style={{
          backgroundImage: "url('/deep-space-bg.png')",
          opacity: 0.8,
          backgroundAttachment: 'fixed',
          backgroundColor: '#020408'
        }}
      />

      {/* Scanline Overlay */}
      <div className="fixed inset-0 pointer-events-none z-10 bg-scanlines opacity-[0.03]" />

      {/* HUD Stats (Fixed Top) */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-4 font-mono text-[10px] items-end px-4 py-2 border-r-2 border-cyan-500/20 bg-black/40 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="text-cyan-400 group-hover:text-white transition-colors">SYNCING_NODE:</span>
          <div className="hud-bar-container">
            {[...Array(10)].map((_, i) => (
              <div key={i} className={`hud-bar-segment ${i < 8 ? 'bg-hud-cyan' : 'bg-white/10'}`} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-orange-400">CORE_VITAL:</span>
          <div className="hud-bar-container">
            {[...Array(10)].map((_, i) => (
              <div key={i} className={`hud-bar-segment ${i < 6 ? 'bg-hud-orange' : 'bg-white/10'}`} />
            ))}
          </div>
        </div>
      </div>

      <audio ref={audioRef} src="/ambient-music.mp3" loop muted />

      {/* Audio Controls (Fixed Bottom) */}
      <div className="fixed bottom-6 left-6 flex items-center gap-6 z-50 bg-black/60 backdrop-blur-xl p-4 border border-cyan-500/20 rounded-sm shadow-[0_0_20px_rgba(34,211,238,0.1)]">
        <button onClick={toggleMute} className="text-xl text-cyan-400 hover:text-white transition-all transform hover:scale-110 active:scale-95">
          {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
        </button>
        <div className="w-[1px] h-4 bg-cyan-500/20" />
        <Link href="/codex" className="flex items-center gap-3 text-[11px] font-mono text-cyan-500/80 hover:text-cyan-300 uppercase tracking-[0.2em] transition-all group">
          <FaBook className="text-sm group-hover:rotate-12" /> [INTERSTELLAR_LOG]
        </Link>
        {userData?.is_admin && (
          <>
            <div className="w-[1px] h-4 bg-orange-500/20" />
            <Link href="/mission-control" className="flex items-center gap-3 text-[11px] font-mono text-orange-500/80 hover:text-orange-300 uppercase tracking-[0.2em] transition-all group">
              <FaCogs className="text-sm group-hover:rotate-90 transition-transform duration-500" /> [MISSION_CONTROL]
            </Link>
            <div className="w-[1px] h-4 bg-cyan-500/20" />
            <Link href="/mission-control/codex" className="flex items-center gap-3 text-[11px] font-mono text-cyan-500/80 hover:text-cyan-300 uppercase tracking-[0.2em] transition-all group">
              <FaBook className="text-sm group-hover:scale-110 transition-transform duration-500" /> [CODEX_CONTROL]
            </Link>
            <div className="w-[1px] h-4 bg-cyan-500/20" />
            <button 
              onClick={exportFullBookData}
              className="flex items-center gap-3 text-[11px] font-mono text-cyan-400 hover:text-white uppercase tracking-[0.2em] transition-all group"
            >
              <FaDownload className="text-sm group-hover:translate-y-1 transition-transform" /> [EXPORT_RAW_DATA]
            </button>
          </>
        )}
      </div>

      <div className="relative z-20 flex flex-col min-h-screen">
        {/* Main Title Area */}
        <header className="p-10 md:p-20 pt-32 shrink-0">
          <div className="inline-block border-l-2 border-cyan-500 pl-6 mb-6">
            <h1 className="text-5xl md:text-8xl font-black title-glitch leading-tight uppercase tracking-tighter">
              EL EJE DEL OLVIDO
            </h1>
            <p className="text-cyan-400/60 font-mono tracking-[0.6em] text-xs uppercase mt-2">NARRATIVE_SYNC_ESTABLISHED</p>
          </div>

          <div className="font-mono text-[10px] text-cyan-500/40 uppercase tracking-widest mt-8 space-y-1">
            <div>&gt; SECTOR_COORD: 229.331 // -58.120</div>
            <div>&gt; SYSTEM_STATUS: OPERATIONAL</div>
            <div>&gt; DRIVER_VER: 2.0.4-BETA</div>
          </div>
        </header>

        {/* Carousel Container */}
        <section className="flex-1 relative flex items-center min-h-[600px]">
          {/* Navigation Controls */}
          <div className="absolute inset-x-0 top-1/2 -ms-4 flex justify-between px-10 z-40 pointer-events-none">
            <button
              onClick={(e) => { e.preventDefault(); scrollCarousel('left'); }}
              className="w-14 h-14 bg-black/40 border-2 border-cyan-500/30 text-cyan-400 flex items-center justify-center hover:bg-cyan-500 hover:text-black hover:border-white transition-all pointer-events-auto rounded-full group"
            >
              <FaRocket className="rotate-[-135deg] text-xl group-hover:scale-125 transition-transform" />
            </button>
            <button
              onClick={(e) => { e.preventDefault(); scrollCarousel('right'); }}
              className="w-14 h-14 bg-black/40 border-2 border-cyan-500/30 text-cyan-400 flex items-center justify-center hover:bg-cyan-500 hover:text-black hover:border-white transition-all pointer-events-auto rounded-full group"
            >
              <FaRocket className="rotate-45 text-xl group-hover:scale-125 transition-transform" />
            </button>
          </div>

          <div className="w-full relative overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-6">
                <div className="w-48 h-[1px] bg-cyan-500/10 overflow-hidden">
                  <div className="h-full bg-cyan-400 animate-[loading_1s_infinite]" />
                </div>
                <span className="text-cyan-500 font-mono text-[10px] tracking-[0.8em] animate-pulse uppercase">Syncing_Nodes...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center w-full">
                <div
                  ref={carouselRef}
                  className="carousel-viewport no-scrollbar flex flex-row overflow-x-auto gap-8 px-[10vw] md:px-[20vw] items-center py-12 w-full"
                >
                  {capitulos.map((cap, index) => (
                    <Link
                      key={cap.slug}
                      href={`/capitulos/${cap.slug}`}
                      data-slug={cap.slug}
                      className="carousel-card flex-shrink-0 w-[55vw] md:w-[255px] aspect-[4/5] md:aspect-[3/4] snap-center group"
                    >
                      <div className={`hud-panel h-full p-6 md:p-8 flex flex-col justify-between transition-all duration-700 ${activeSlug === cap.slug ? 'hud-panel-active' : 'opacity-60'}`}>
                        <div className="hud-corner-tl" />

                        {/* Card Decor */}
                        <div className="absolute top-0 right-0 p-4 font-mono text-[10px] text-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity">
                          NODE_{index.toString().padStart(2, '0')}
                        </div>

                        <div className="space-y-6">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-mono text-cyan-400/40 uppercase tracking-[0.4em] mb-2">CHAPTER_ACCESS_ID</span>
                            <span className="text-xl font-mono text-cyan-500 font-bold border-b border-cyan-500/30 inline-block w-fit">#{cap.numero_orden.toString().padStart(3, '0')}</span>
                          </div>

                          <h3 className="text-xl md:text-3xl font-black text-white group-hover:text-cyan-300 transition-all uppercase tracking-tight leading-[0.9] border-l-4 border-transparent group-hover:border-cyan-400 pl-0 group-hover:pl-4 transition-all duration-500">
                            {cap.titulo.split(':')[1]?.trim() || cap.titulo}
                          </h3>

                          <p className="text-sm md:text-base text-cyan-100/40 leading-relaxed group-hover:text-cyan-100/70 transition-colors line-clamp-4 font-light">
                            La señal se intensifica al acercarse al nodo central. Los registros archivados indican una anomalía crítica en este sector...
                          </p>
                        </div>

                        <div className="pt-8 flex flex-col items-center gap-6">
                          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                          <div className="px-10 py-4 border-2 border-cyan-400/40 text-cyan-400 uppercase font-black font-mono text-[12px] tracking-[0.3em] group-hover:bg-cyan-400 group-hover:text-black transition-all flex items-center gap-4 relative overflow-hidden">
                            <span className="relative z-10">INICIAR_PROTOCOLO</span>
                            <FaRocket className="text-sm relative z-10" />
                            <div className="absolute inset-0 bg-cyan-400 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {!userData && (
                  <div className="mt-8 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <Link
                      href="/registro"
                      className="px-12 py-4 border border-cyan-500 bg-cyan-500/10 text-cyan-400 uppercase font-mono text-xs tracking-[0.5em] hover:bg-cyan-500 hover:text-black transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)] block"
                    >
                      [ ENROLL_GALACTIC_CITIZEN ]
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Footer Area */}
        <footer className="p-10 md:p-12 mt-auto border-t border-cyan-500/10 bg-black/40 backdrop-blur-md flex justify-between items-end font-mono text-[9px] text-cyan-500/30 uppercase tracking-[0.4em]">
          <div className="space-y-2">
            <div className="text-cyan-500/60 uppercase">System_Info:</div>
            <div>OUTER_REG_ID: 21-S1TX-08-Ω</div>
            <div>STATION_LINK: ALPHA_TERMINAL</div>
            <div>TIMESTAMP: {timestamp} UTC</div>
          </div>
          <div className="text-right space-y-2">
            <div>COORD_TELEMETRY: [226.321, -96.120]</div>
            <div>SYNC_STATE: 100% // [LOCAL_NODE]</div>
            <div className="flex items-center gap-2 justify-end">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_#22d3ee]" />
              DATA_LINK: ESTABLISHED
            </div>
          </div>
        </footer>
      </div>

      {/* Aesthetic Overlays */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-10 bg-[radial-gradient(circle_at_center,_transparent_0%,_#050a0f_100%)]" />
      <div className="fixed inset-0 pointer-events-none z-50 mix-blend-overlay opacity-20 bg-noise" />

      {/* Welcome Overlay */}
      {showWelcome && userData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6 animate-in fade-in duration-500">
          <div className="hud-panel p-8 md:p-12 max-w-2xl w-full bg-black/40 border border-cyan-500/30 flex flex-col items-center text-center">
            <div className="mb-8 relative">
              <div className="absolute inset-0 animate-ping bg-cyan-500/20 rounded-full" />
              <div className="relative w-32 h-32 md:w-64 md:h-64 border-2 border-cyan-400 p-2 rounded-lg bg-cyan-900/20 overflow-hidden shadow-[0_0_30px_rgba(34,211,238,0.3)]">
                <img
                  src="/citizen-dna.png"
                  alt="Biometric Scan"
                  className="w-full h-full object-contain drop-shadow-[0_0_15px_#22d3ee]"
                />
              </div>
            </div>

            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-4">
              WELCOME BACK,<br />
              <span className="text-cyan-400">{userData.nombre.split(' ')[0]}</span>
            </h2>

            <p className="text-cyan-400/60 font-mono text-[10px] tracking-[0.4em] mb-12 uppercase border-y border-cyan-500/20 py-2">
              Biometric Access Granted // Identity_Verified
            </p>

            {suggestedChapter ? (
              <Link
                href={`/capitulos/${suggestedChapter.slug}`}
                className="group relative px-12 py-5 bg-orange-500/10 border-2 border-orange-500 text-orange-400 font-black uppercase font-mono tracking-[0.3em] hover:bg-orange-500 hover:text-black transition-all"
              >
                RESUME MISSION
                <div className="text-[9px] block mt-1 opacity-60">NEXT: {suggestedChapter.titulo.split(':')[1]?.trim() || suggestedChapter.titulo}</div>
                <div className="absolute inset-x-0 -bottom-2 h-0.5 bg-orange-500 animate-pulse" />
              </Link>
            ) : (
              <button
                onClick={() => setShowWelcome(false)}
                className="px-12 py-5 bg-cyan-500/10 border-2 border-cyan-500 text-cyan-400 font-black uppercase font-mono tracking-[0.3em] hover:bg-cyan-500 hover:text-black transition-all"
              >
                INITIALIZE_NEXUS
              </button>
            )}

            <button
              onClick={() => setShowWelcome(false)}
              className="mt-8 px-12 py-4 border border-cyan-500/30 text-cyan-500/60 uppercase font-mono text-[10px] tracking-[0.4em] hover:bg-cyan-500/10 hover:text-cyan-400 transition-all"
            >
              [ CLOSE_INTERFACE ]
            </button>

            <button
              onClick={() => setShowWelcome(false)}
              className="mt-8 text-[9px] font-mono text-cyan-500/40 uppercase hover:text-cyan-400 transition-colors"
            >
              [ SKIP_AUTH_SEQUENCE ]
            </button>
          </div>
        </div>
      )}
    </main>
  );
}