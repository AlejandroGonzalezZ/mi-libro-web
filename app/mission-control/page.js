"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  FaArrowLeft, FaSave, FaPlus, FaTrash, FaUpload, 
  FaPlay, FaPause, FaExclamationTriangle, FaChartLine,
  FaDatabase, FaImage, FaHeadphones, FaRocket
} from 'react-icons/fa';
import { saveChapterAction, saveMediaAction, deleteMediaAction, getSignedUploadUrlAction, deleteFileAction } from './actions';

export default function MissionControl() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [capitulos, setCapitulos] = useState([]);
  const [selectedCap, setSelectedCap] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    id: null,
    titulo: '',
    resumen_ia: '',
    contenido: '',
    numero_orden: 1,
    slug: ''
  });
  
  const [images, setImages] = useState([null, null, null]);
  const [audio, setAudio] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showIntegrityWarning, setShowIntegrityWarning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const audioRef = useRef(null);
  const fileInputRefs = [useRef(null), useRef(null), useRef(null)];
  const audioInputRef = useRef(null);

  useEffect(() => {
    checkAdmin();
    fetchCapitulos();
  }, []);

  async function checkAdmin() {
    const email = localStorage.getItem('galact_citizen_email');
    if (!email) {
      router.push('/');
      return;
    }

    try {
      const res = await fetch(`/api/usuarios?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      const user = data.user;

      if (!user?.is_admin) {
        router.push('/');
      } else {
        setIsAdmin(true);
      }
    } catch (err) {
      console.error("Admin check failed:", err);
      router.push('/');
    }
  }

  async function fetchCapitulos() {
    const { data } = await supabase
      .from('capitulos')
      .select('*')
      .order('numero_orden', { ascending: true });
    setCapitulos(data || []);
    setLoading(false);
  }

  const handleSelectChapter = async (cap) => {
    setSelectedCap(cap);
    setFormData({
      id: cap.id,
      titulo: cap.titulo,
      resumen_ia: cap.resumen_ia || '',
      contenido: cap.contenido || '',
      numero_orden: cap.numero_orden,
      slug: cap.slug
    });
    
    // Fetch multimedia
    const { data: media } = await supabase
      .from('multimedia')
      .select('*')
      .eq('capitulo_id', cap.id);
    
    const imgs = [null, null, null];
    let aud = null;
    
    media?.forEach(m => {
      if (m.tipo === 'imagen') {
        const idx = m.metadata?.index ?? 0;
        if (idx < 3) imgs[idx] = m;
      } else if (m.tipo === 'audio') {
        aud = m;
      }
    });
    
    setImages(imgs);
    setAudio(aud);
    setAudioUrl(aud?.url_archivo || null);
    setHasUnsavedChanges(false);
    setShowIntegrityWarning(false);
  };

  const handleFileUpload = async (e, type, index = null) => {
    const file = e.target.files[0];
    if (!file || !selectedCap) return;

    try {
      setIsUploading(true);
      
      // 1. Validación de tipo de archivo
      if (type === 'audio' && !file.type.startsWith('audio/')) {
        throw new Error("Formato inválido: El archivo debe ser un audio (MP3, WAV, etc.).");
      }
      if (type === 'image' && !file.type.startsWith('image/')) {
        throw new Error("Formato inválido: El archivo debe ser una imagen (JPG, PNG, WEBP, etc.).");
      }

      // 2. Validación de tamaño (Máximo 6MB)
      const MAX_FILE_SIZE = 6 * 1024 * 1024; // 6MB
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`El archivo es demasiado pesado (${(file.size / (1024 * 1024)).toFixed(2)}MB). El límite máximo es de 6MB para asegurar compatibilidad galáctica.`);
      }

      const bucket = type === 'audio' ? 'audios' : 'capitulos';
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedCap.id || 'new'}_${type}${index !== null ? `_${index}` : ''}_${Date.now()}.${fileExt}`;

      // 3. Intento de subida con detección de estado de red
      if (!navigator.onLine) {
        throw new Error("Sin conexión: No se ha podido establecer contacto con el satélite. Revisa tu internet.");
      }

      // 4. Obtener URL firmada para subida directa (Bypassing Vercel 4.5MB limit)
      const signingResult = await getSignedUploadUrlAction(bucket, fileName);
      if (!signingResult.success) {
        throw new Error(`Fallo en la autorización de subida: ${signingResult.error}`);
      }

      // 5. Subida directa a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .uploadToSignedUrl(fileName, signingResult.token, file);

      if (uploadError) {
        throw new Error(`Error en la transmisión directa: ${uploadError.message}`);
      }

      // 6. Generar URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      if (!publicUrl) throw new Error("No se pudo generar la frecuencia de enlace pública.");

      if (type === 'audio') {
        const audioData = {
          id: audio?.id,
          capitulo_id: selectedCap.id,
          tipo: 'audio',
          url_archivo: publicUrl,
          descripcion: file.name
        };
        
        const result = await saveMediaAction(audioData);
        if (!result.success) throw new Error("Error al vincular el audio en la base de datos: " + result.error);
        
        setAudio(result.data);
        setAudioUrl(publicUrl);
        setShowIntegrityWarning(false);
      } else {
        const imageData = {
          id: images[index]?.id,
          capitulo_id: selectedCap.id,
          tipo: 'imagen',
          url_archivo: publicUrl,
          descripcion: images[index]?.descripcion || `Image ${index + 1}`,
          metadata: { index }
        };

        const result = await saveMediaAction(imageData);
        if (!result.success) throw new Error("Error al vincular la imagen en la base de datos: " + result.error);
        
        const newImgs = [...images];
        newImgs[index] = result.data;
        setImages(newImgs);
      }
    } catch (err) {
      console.error("Critical Upload protocol failure:", err.message);
      alert("⚠️ DATA_STORAGE_ERROR: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      const result = await saveChapterAction(formData, selectedCap.id);
      if (!result.success) throw new Error(result.error);

      await fetchCapitulos();
      setSelectedCap(result.data); // Update with saved data (including ID if new)
      setHasUnsavedChanges(false);
      setShowIntegrityWarning(false);
      alert("TRANSMISSION_SAVED_SUCCESSFULLY");
    } catch (err) {
      console.error("Save error:", err.message);
      alert("CRITICAL_SAVE_ERROR: " + err.message);
    }
  };

  const handleImageDescriptionChange = (index, value) => {
    const newImgs = [...images];
    if (newImgs[index]) {
      newImgs[index] = { ...newImgs[index], descripcion: value };
    } else {
      newImgs[index] = { descripcion: value, metadata: { index } };
    }
    setImages(newImgs);
    setHasUnsavedChanges(true);
  };

  const handleDeleteMedia = async (media) => {
    if (!confirm("Confirm protocols: Permanent deletion of this asset?")) return;

    try {
      const bucket = media.tipo === 'audio' ? 'audios' : 'capitulos';
      const filePath = media.url_archivo.split('/').pop();

      const deleteResult = await deleteFileAction(bucket, filePath);
      if (!deleteResult.success) throw new Error(deleteResult.error);

      const result = await deleteMediaAction(media.id);
      if (!result.success) throw new Error(result.error);

      if (media.tipo === 'audio') {
        setAudio(null);
        setAudioUrl(null);
      } else {
        const newImgs = [...images];
        newImgs[media.metadata?.index] = null;
        setImages(newImgs);
      }
    } catch (err) {
      console.error("Delete error:", err.message);
      alert("Deletion failed: " + err.message);
    }
  };

  const handleNewChapter = () => {
    setSelectedCap({ id: 'new' });
    setFormData({
      id: null,
      titulo: 'NEW_TRANSMISSION',
      resumen_ia: '',
      contenido: '',
      numero_orden: capitulos.length + 1,
      slug: ''
    });
    setImages([null, null, null]);
    setAudio(null);
    setAudioUrl(null);
    setHasUnsavedChanges(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setHasUnsavedChanges(true);
    
    // Detect mismatch if content changed but audio is old
    if (name === 'contenido' && audio) {
      setShowIntegrityWarning(true);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  if (!isAdmin || loading) {
    return (
      <div className="min-h-screen bg-[#020408] flex items-center justify-center">
        <div className="text-cyan-400 font-mono animate-pulse">AUTHORIZING_ACCESS...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#020408] text-white font-sans flex flex-col p-6 gap-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 z-0 bg-scanlines opacity-[0.03] pointer-events-none" />
      <div className="fixed inset-0 z-0 bg-[#020408] bg-cover bg-center opacity-20 pointer-events-none" style={{ backgroundImage: "url('/deep-space-bg.png')" }} />
      
      {/* HUD Header */}
      <header className="relative z-10 flex justify-between items-center border-b border-cyan-500/20 pb-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/')} className="w-10 h-10 flex items-center justify-center border border-cyan-500/30 rounded-full hover:bg-cyan-500 hover:text-black transition-all">
            <FaArrowLeft />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic">Mission Command</h1>
            <p className="text-[10px] font-mono text-cyan-400/60 uppercase tracking-[0.3em]">Sector_Control // Admin_Active</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6 font-mono text-[10px] text-cyan-500/40">
          <div className="flex flex-col items-end">
            <span>DATABASE_LINK: <span className="text-green-500">STABLE</span></span>
            <span>UPLINK_SPEED: 4.2 GB/S</span>
          </div>
          <div className="h-8 w-[1px] bg-cyan-500/20" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-orange-500/40 p-1">
              <img src="/citizen-dna.png" className="w-full h-full object-cover rounded-full" />
            </div>
            <div className="flex flex-col">
              <span className="text-orange-400">COMMANDER_7</span>
              <span className="opacity-60">LEVEL_4_ADMIN</span>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex-1 grid grid-cols-12 gap-6 overflow-hidden">
        {/* SIDEBAR: CHAPTER ARCHIVE */}
        <aside className="col-span-3 flex flex-col gap-4 overflow-hidden">
          <div className="hud-panel-enclosed p-4 bg-black/40 flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">Chapter Archive</span>
              <button 
                onClick={handleNewChapter}
                className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 text-[9px] font-mono hover:bg-cyan-500 hover:text-black transition-all"
              >
                <FaPlus /> NEW_MISSION
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto hud-scrollbar pr-2 space-y-2">
              {capitulos.map(cap => (
                <div 
                  key={cap.id}
                  onClick={() => handleSelectChapter(cap)}
                  className={`p-4 border border-cyan-500/10 cursor-pointer transition-all hover:bg-cyan-500/5 group ${selectedCap?.id === cap.id ? 'bg-cyan-500/20 border-cyan-500/50' : ''}`}
                >
                  <div className="flex justify-between text-[8px] font-mono text-cyan-500/40 mb-1">
                    <span>TRAN_ID_{cap.slug.substring(0,6).toUpperCase()}</span>
                    <span>#{cap.numero_orden.toString().padStart(3, '0')}</span>
                  </div>
                  <h3 className={`text-sm font-bold uppercase tracking-tight group-hover:text-cyan-400 transition-colors ${selectedCap?.id === cap.id ? 'text-cyan-400' : 'text-white/80'}`}>
                    {cap.titulo.split(':')[1]?.trim() || cap.titulo}
                  </h3>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-cyan-500/10 flex justify-between text-[9px] font-mono text-cyan-500/30">
              <span>TOTAL_LOGS: {capitulos.length}</span>
              <span>SYNC_STATE: OK</span>
            </div>
          </div>
        </aside>

        {/* MAIN PANEL: MISSION EDITOR */}
        <section className="col-span-9 flex flex-col gap-6 overflow-y-auto hud-scrollbar pr-2">
          {selectedCap ? (
            <div className="space-y-6 pb-12">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter">Mission Editor</h2>
                  <p className="text-[10px] font-mono text-orange-500 uppercase tracking-widest">Editing_Registry: {selectedCap.id === 'new' ? 'NEW_LOG' : selectedCap.slug}</p>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setSelectedCap(null)} className="px-6 py-2 border border-white/20 text-white/40 text-[10px] font-mono uppercase hover:bg-white/5 transition-all">Discard Draft</button>
                  <button 
                    onClick={handleSave}
                    className="px-8 py-2 bg-cyan-500 text-black font-black text-[12px] font-mono uppercase hover:bg-cyan-400 transition-all flex items-center gap-3"
                  >
                    Transmit to Galaxy <FaRocket />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-6">
                {/* LEFT: Text Data */}
                <div className="col-span-8 space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-cyan-400/60 uppercase">Chapter No.</label>
                      <input 
                        type="number" 
                        name="numero_orden"
                        value={formData.numero_orden}
                        onChange={handleInputChange}
                        className="w-full bg-cyan-950/20 border border-cyan-500/20 p-3 text-cyan-400 font-mono text-sm focus:border-cyan-500 outline-none" 
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[9px] font-mono text-cyan-400/60 uppercase">Mission Title</label>
                      <input 
                        type="text" 
                        name="titulo"
                        value={formData.titulo}
                        onChange={handleInputChange}
                        placeholder="Enter chapter name..."
                        className="w-full bg-cyan-950/20 border border-cyan-500/20 p-3 text-white font-bold text-sm focus:border-cyan-500 outline-none" 
                      />
                    </div>
                  </div>

                  {/* Content Editor */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-end">
                      <label className="text-[9px] font-mono text-cyan-400/60 uppercase tracking-widest">Main Transmission Log (Chapter Content)</label>
                      <span className="text-[8px] font-mono text-cyan-500/30 uppercase">CHARS: {formData.contenido.length} // WORDS: {formData.contenido.split(/\s+/).filter(Boolean).length}</span>
                    </div>
                    <textarea 
                      name="contenido"
                      value={formData.contenido}
                      onChange={handleInputChange}
                      className="w-full h-[400px] bg-cyan-950/20 border border-cyan-500/20 p-6 text-cyan-50/80 font-normal leading-relaxed text-base focus:border-cyan-500 outline-none resize-none hud-scrollbar"
                    />
                  </div>

                  {/* Summary */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-cyan-400/60 uppercase">Mission Briefing (Summary)</label>
                    <textarea 
                      name="resumen_ia"
                      value={formData.resumen_ia}
                      onChange={handleInputChange}
                      placeholder="Summarize the core objectives..."
                      className="w-full h-24 bg-cyan-950/20 border border-cyan-500/20 p-4 text-cyan-100/60 font-mono text-xs focus:border-cyan-500 outline-none resize-none"
                    />
                  </div>
                </div>

                {/* RIGHT: Multimedia Data */}
                <div className="col-span-4 space-y-6">
                  {/* Audio Control */}
                  <div className="hud-panel-enclosed p-4 bg-black/60 border border-cyan-500/20 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-mono text-orange-400 uppercase font-extrabold tracking-widest">Audio Comms (MP3)</span>
                        {audio && (
                          <span className="text-[8px] font-mono text-green-500/80 uppercase animate-pulse">
                            EXISTING_LINK: {audio.descripcion || 'archivo_sin_nombre.mp3'}
                          </span>
                        )}
                      </div>
                      {audio && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteMedia(audio); }}
                          className="text-red-500/60 hover:text-red-500 transition-colors"
                        >
                          <FaTrash className="text-[10px]" />
                        </button>
                      )}
                    </div>

                    <div 
                      onClick={() => !isUploading && audioInputRef.current.click()}
                      className={`w-full h-24 border border-dashed border-cyan-500/20 flex flex-col items-center justify-center gap-2 group transition-all ${isUploading ? 'cursor-wait opacity-50' : 'cursor-pointer hover:bg-cyan-500/5'}`}
                    >
                      <input 
                        type="file" 
                        ref={audioInputRef} 
                        className="hidden" 
                        accept="audio/*"
                        onChange={(e) => handleFileUpload(e, 'audio')} 
                      />
                      {isUploading ? (
                        <div className="flex flex-col items-center gap-3 w-full px-8">
                          <span className="text-[10px] font-mono text-cyan-400 animate-pulse uppercase tracking-widest">Uploading_To_Orbit...</span>
                          <div className="w-full h-1 bg-cyan-900/50 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-400 animate-progress-loading shadow-[0_0_10px_#22d3ee]"></div>
                          </div>
                        </div>
                      ) : audio ? (
                        <div className="flex flex-col items-center gap-2 w-full px-4 text-center">
                           <div className="flex items-center gap-4">
                            <button onClick={togglePlay} className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-black hover:scale-105 transition-transform">
                              {isPlaying ? <FaPause size={10} /> : <FaPlay size={10} />}
                            </button>
                            <span className="text-[10px] font-mono truncate max-w-[150px]">{audio.descripcion || 'Audio_File.mp3'}</span>
                           </div>
                           <div className="flex items-center gap-2">
                              <div className="w-1 h-1 bg-cyan-400 animate-pulse rounded-full"></div>
                              <span className="text-[8px] font-mono text-cyan-400/60 uppercase tracking-tighter">Audio_Link_Stable</span>
                           </div>
                        </div>
                      ) : (
                        <>
                          <FaHeadphones className="text-cyan-500/40 text-lg group-hover:scale-110 transition-transform" />
                          <span className="text-[9px] font-mono text-cyan-500/40 uppercase">Upload Sonic Log</span>
                        </>
                      )}
                    </div>
                    {audioUrl && <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />}
                    
                    {showIntegrityWarning && (
                      <div className="p-3 bg-orange-500/10 border border-orange-500/30 flex gap-3 animate-pulse">
                        <FaExclamationTriangle className="text-orange-500 shrink-0 mt-1" />
                        <p className="text-[8px] font-mono text-orange-400 leading-tight uppercase font-bold">
                          Warning: Log text changed. Audio feed may no longer sync with new data transmission.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Visual Assets */}
                  <div className="hud-panel-enclosed p-4 bg-black/60 border border-cyan-500/20 space-y-4">
                     <div className="flex justify-between items-center">
                      <span className="text-[9px] font-mono text-cyan-400 uppercase font-extrabold tracking-widest">Visual Intel (Max 3)</span>
                    </div>
                    
                    <div className="space-y-4">
                      {images.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <div 
                            onClick={() => !isUploading && fileInputRefs[idx].current.click()}
                            className={`w-full aspect-video border border-cyan-500/20 bg-cyan-950/20 flex flex-col items-center justify-center gap-2 overflow-hidden transition-all ${isUploading ? 'cursor-wait opacity-50' : 'cursor-pointer'}`}
                          >
                            <input 
                              type="file" 
                              ref={fileInputRefs[idx]} 
                              className="hidden" 
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, 'image', idx)} 
                            />
                            {isUploading ? (
                               <div className="flex flex-col items-center gap-2 w-full px-12">
                                  <div className="w-full h-1 bg-cyan-900/50 rounded-full overflow-hidden">
                                    <div className="h-full bg-cyan-400 animate-progress-loading shadow-[0_0_10px_#22d3ee]"></div>
                                  </div>
                               </div>
                            ) : img ? (
                              <>
                                <img src={img.url_archivo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteMedia(img); }}
                                    className="p-2 bg-red-500/20 border border-red-500/50 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all"
                                  >
                                    <FaTrash size={12} />
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <FaImage className="text-cyan-500/20 text-xl group-hover:scale-110 transition-transform" />
                                <span className="text-[8px] font-mono text-cyan-500/20 uppercase tracking-widest">Empty_Visual_Slot_{idx+1}</span>
                                <button className="absolute inset-0 w-full h-full cursor-pointer opacity-0" />
                              </>
                            )}
                          </div>
                          <input 
                            type="text" 
                            placeholder="Visual Intel Description..." 
                            value={img?.descripcion || ''}
                            onChange={(e) => handleImageDescriptionChange(idx, e.target.value)}
                            className="w-full bg-transparent border-b border-cyan-500/10 py-2 text-[9px] font-mono text-cyan-300 placeholder:text-cyan-500/20 outline-none focus:border-cyan-500/40"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-cyan-500/20">
              <FaDatabase className="text-6xl mb-4 opacity-10" />
              <p className="font-mono text-xs uppercase tracking-[0.5em]">Select Chapter to Access Registry</p>
            </div>
          )}
        </section>
      </div>

      {/* FOOTER STATS */}
      <footer className="relative z-10 flex justify-between items-center text-[8px] font-mono text-cyan-500/30 uppercase mt-auto pt-4 border-t border-cyan-500/10">
        <div className="flex gap-10">
          <span>Total Word Count: 142,890</span>
          <span>Index Size: 1.4 GB</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_5px_#22d3ee]"></div>
            <span>System Online: v.2.0.7-Alpha</span>
          </div>
          <span>Latency: 28ms</span>
        </div>
      </footer>
    </main>
  );
}
