"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  FaArrowLeft, FaSave, FaPlus, FaTrash, FaImage, FaSearch, 
  FaDna, FaUserAstronaut, FaGlobeAmericas, FaRocket, FaBook
} from 'react-icons/fa';
import { saveCodexAction, deleteCodexAction, uploadFileAction } from '../actions';

export default function CodexControl() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    imagen_referencia: '',
    metadata: { tipo: 'personaje', status: 'Active' }
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    checkAdmin();
    fetchCodex();
  }, []);

  async function checkAdmin() {
    const email = localStorage.getItem('galact_citizen_email');
    if (!email) { router.push('/'); return; }
    const { data: user } = await supabase.from('usuarios').select('is_admin').eq('correo', email).single();
    if (!user?.is_admin) router.push('/');
    else setIsAdmin(true);
  }

  async function fetchCodex() {
    const { data } = await supabase.from('personajes').select('*').order('nombre', { ascending: true });
    setItems(data || []);
    setLoading(false);
  }

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setFormData({
      nombre: item.nombre,
      descripcion: item.descripcion || '',
      imagen_referencia: item.imagen_referencia || '',
      metadata: item.metadata || { tipo: 'personaje', status: 'Active' }
    });
  };

  const handleNewItem = () => {
    setSelectedItem({ id: 'new' });
    setFormData({
      nombre: 'NEW_ARCHIVE_ENTRY',
      descripcion: '',
      imagen_referencia: '',
      metadata: { tipo: 'personaje', status: 'Active' }
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'tipo' || name === 'status') {
      setFormData(prev => ({ ...prev, metadata: { ...prev.metadata, [name]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedItem) return;

    try {
      setIsUploading(true);
      const fileName = `codex_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('bucket', 'capitulos');
      uploadFormData.append('fileName', fileName);

      const result = await uploadFileAction(uploadFormData);
      if (!result.success) throw new Error(result.error);

      setFormData(prev => ({ ...prev, imagen_referencia: result.publicUrl }));
      e.target.value = ''; // Reset input
    } catch (err) {
      console.error("Upload error:", err.message);
      alert("UP_LINK_FAILURE: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    const result = await saveCodexAction(formData, selectedItem.id);
    if (result.success) {
      alert("CODEX_ENTRY_SYNCED");
      fetchCodex();
      setSelectedItem(result.data);
    } else {
      alert("CRITICAL_ERROR: " + result.error);
    }
  };

  const handleDelete = async () => {
    if (!confirm("PURGE_DATA: Confirm permanent deletion?")) return;
    const result = await deleteCodexAction(selectedItem.id);
    if (result.success) {
      alert("ENTRY_PURGED");
      setSelectedItem(null);
      fetchCodex();
    } else {
      alert("PURGE_FAILED: " + result.error);
    }
  };

  const filteredItems = items.filter(i => i.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

  if (!isAdmin || loading) return <div className="min-h-screen bg-[#020408] flex items-center justify-center font-mono text-cyan-400 animate-pulse">AUTHORIZING_CODEX_ACCESS...</div>;

  return (
    <main className="min-h-screen bg-[#020408] text-white p-6 flex flex-col gap-6 relative overflow-hidden font-sans">
      <div className="fixed inset-0 z-0 bg-scanlines opacity-[0.03] pointer-events-none" />
      
      <header className="relative z-10 flex justify-between items-center border-b border-cyan-500/20 pb-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/')} className="w-10 h-10 flex items-center justify-center border border-cyan-500/30 rounded-full hover:bg-cyan-500 hover:text-black transition-all">
            <FaArrowLeft />
          </button>
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter">Codex Control</h1>
            <p className="text-[10px] font-mono text-cyan-400/60 uppercase tracking-[0.3em]">Knowledge_Archive // Admin_Root</p>
          </div>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <div className="text-right">
            <div className="text-cyan-400">ARCHIVE_STATE: <span className="text-green-500">OPTIMIZED</span></div>
            <div className="opacity-40 tracking-widest">ENCRYPTION: AES-256-QUANTUM</div>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex-1 grid grid-cols-12 gap-6 overflow-hidden">
        {/* SIDEBAR */}
        <aside className="col-span-3 flex flex-col gap-4 overflow-hidden">
          <div className="hud-panel-enclosed p-4 bg-black/40 flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest">Database_Entries</span>
              <button onClick={handleNewItem} className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 text-[9px] font-mono hover:bg-cyan-500 hover:text-black transition-all">
                <FaPlus /> NEW_ENTRY
              </button>
            </div>
            
            <div className="relative mb-4 group">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/30 text-[10px]" />
              <input 
                type="text" 
                placeholder="QUERY_NAME..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-cyan-950/20 border border-cyan-500/20 p-2 pl-8 text-[10px] font-mono text-cyan-400 outline-none focus:border-cyan-500/50" 
              />
            </div>

            <div className="flex-1 overflow-y-auto hud-scrollbar pr-2 space-y-2">
              {filteredItems.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => handleSelectItem(item)}
                  className={`p-3 border border-cyan-500/10 cursor-pointer transition-all hover:bg-cyan-500/10 ${selectedItem?.id === item.id ? 'bg-cyan-500/20 border-cyan-500/50' : ''}`}
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-tight">{item.nombre}</h3>
                    {item.metadata?.tipo === 'personaje' ? <FaUserAstronaut className="text-[10px] opacity-40" /> : item.metadata?.tipo === 'especie' ? <FaDna className="text-[10px] opacity-40" /> : <FaGlobeAmericas className="text-[10px] opacity-40" />}
                  </div>
                  <span className="text-[8px] font-mono text-cyan-500/30 uppercase tracking-widest">{item.metadata?.tipo || 'UNKNOWN'}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* MAIN PANEL */}
        <section className="col-span-9 flex flex-col gap-6 overflow-y-auto hud-scrollbar pr-2">
          {selectedItem ? (
            <div className="space-y-8 pb-12">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter">Data Entry Editor</h2>
                  <p className="text-[10px] font-mono text-orange-500 uppercase tracking-widest">{selectedItem.id === 'new' ? 'INITIALIZING_NEW_ENTRY' : `Modify_Archive: ${selectedItem.id}`}</p>
                </div>
                <div className="flex gap-4">
                  {selectedItem.id !== 'new' && (
                    <button onClick={handleDelete} className="px-6 py-2 border border-red-500/30 text-red-500/60 text-[10px] font-mono uppercase hover:bg-red-500/10 transition-all flex items-center gap-2">
                      <FaTrash /> Purge_Entry
                    </button>
                  )}
                  <button onClick={() => setSelectedItem(null)} className="px-6 py-2 border border-white/20 text-white/40 text-[10px] font-mono uppercase hover:bg-white/5 transition-all">Discard</button>
                  <button onClick={handleSave} className="px-8 py-2 bg-cyan-500 text-black font-black text-[12px] font-mono uppercase hover:bg-cyan-400 transition-all flex items-center gap-3 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                    Sync to Codex <FaRocket />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-8 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-cyan-400/60 uppercase tracking-widest">Entry Name / Designation</label>
                      <input 
                        type="text" 
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleInputChange}
                        className="w-full bg-cyan-950/20 border border-cyan-500/20 p-4 text-white font-bold text-base focus:border-cyan-500 outline-none" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                        <label className="text-[9px] font-mono text-cyan-400/60 uppercase tracking-widest">Classification</label>
                        <select name="tipo" value={formData.metadata.tipo} onChange={handleInputChange} className="w-full bg-cyan-950/20 border border-cyan-500/20 p-4 text-cyan-400 font-mono text-xs focus:border-cyan-500 outline-none appearance-none cursor-pointer">
                          <option value="personaje">Character</option>
                          <option value="especie">Species</option>
                          <option value="lugar">Location</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono text-cyan-400/60 uppercase tracking-widest">Status</label>
                        <select name="status" value={formData.metadata.status} onChange={handleInputChange} className="w-full bg-cyan-950/20 border border-cyan-500/20 p-4 text-cyan-400 font-mono text-xs focus:border-cyan-500 outline-none appearance-none cursor-pointer">
                          <option value="Active">Active</option>
                          <option value="Unknown">Unknown</option>
                          <option value="Classified">Classified</option>
                          <option value="Archived">Archived</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-cyan-400/60 uppercase tracking-widest">Data Description</label>
                    <textarea 
                      name="descripcion"
                      value={formData.descripcion}
                      onChange={handleInputChange}
                      className="w-full h-80 bg-cyan-950/20 border border-cyan-500/20 p-6 text-cyan-50/80 font-normal leading-relaxed text-base focus:border-cyan-500 outline-none resize-none hud-scrollbar"
                    />
                  </div>
                </div>

                <div className="col-span-4 space-y-6">
                  <div className="hud-panel-enclosed p-4 bg-black/60 border border-cyan-500/20 flex flex-col gap-4">
                    <span className="text-[9px] font-mono text-cyan-400 uppercase font-extrabold tracking-widest">Visual Reference</span>
                    <div 
                      onClick={() => !isUploading && fileInputRef.current.click()}
                      className={`aspect-square bg-cyan-950/20 border border-dashed border-cyan-500/20 flex flex-col items-center justify-center p-4 group transition-all relative overflow-hidden ${isUploading ? 'cursor-wait opacity-50' : 'cursor-pointer hover:bg-cyan-500/5'}`}
                    >
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                      {isUploading ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-[8px] font-mono text-cyan-400 animate-pulse">UPLOADING...</span>
                        </div>
                      ) : formData.imagen_referencia ? (
                        <img src={formData.imagen_referencia} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      ) : (
                        <>
                          <FaImage className="text-cyan-500/20 text-4xl mb-3 group-hover:scale-110 transition-transform" />
                          <span className="text-[9px] font-mono text-cyan-500/30 uppercase tracking-[0.3em]">Upload_Visual_Intel</span>
                        </>
                      )}
                    </div>
                    {formData.imagen_referencia && (
                      <button onClick={() => setFormData(prev => ({ ...prev, imagen_referencia: '' }))} className="text-[9px] font-mono text-red-500/60 hover:text-red-500 text-center uppercase tracking-widest">Detach_Intel</button>
                    )}
                  </div>
                  
                  <div className="hud-panel-enclosed p-6 bg-cyan-950/10 border border-cyan-500/10 font-mono text-[9px] space-y-4">
                    <div className="flex items-center gap-3 text-cyan-400">
                      <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_5px_#22d3ee]" />
                      <span>SECURE_UPLINK_CONNECTED</span>
                    </div>
                    <div className="text-cyan-500/40 uppercase leading-loose border-t border-cyan-500/5 pt-4">
                      &gt; SCANNING_FOR_ANOMALIES...<br />
                      &gt; INTEGRITY_CHECK: PASS<br />
                      &gt; READY_FOR_SYNC
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-cyan-500/20">
              <FaBook className="text-6xl mb-4 opacity-10" />
              <p className="font-mono text-xs uppercase tracking-[0.5em]">Select Archive to Edit Data</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
