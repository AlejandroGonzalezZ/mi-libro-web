"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowLeft, FaUpload, FaDatabase, FaCheckCircle, FaExclamationTriangle, FaSearch } from 'react-icons/fa';
import { restoreDatabaseAction, verifyBrokenLinksAction } from './actions';

export default function RestoreControl() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fileData, setFileData] = useState(null);
  const [restoreLogs, setRestoreLogs] = useState([]);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResults, setVerificationResults] = useState(null);

  useEffect(() => {
    checkAdmin();
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
        setLoading(false);
      }
    } catch (err) {
      console.error("Admin check failed:", err);
      router.push('/');
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        setFileData(json);
        setRestoreLogs([]);
        setVerificationResults(null);
      } catch (err) {
        alert("CRITICAL: Invalid JSON file.");
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  const getStats = () => {
    if (!fileData) return null;
    let chapters = fileData.cuerpo_del_libro?.length || 0;
    let chars = fileData.glosario?.personajes?.length || 0;
    let species = fileData.glosario?.especies?.length || 0;
    let locations = fileData.glosario?.localizaciones?.length || 0;
    let tech = fileData.glosario?.tecnologia?.length || 0;
    
    // Recolectar URLs para verificación
    let urls = new Set();
    if (fileData.cuerpo_del_libro) {
        fileData.cuerpo_del_libro.forEach(c => {
            if (c.galeria) c.galeria.forEach(u => urls.add(u));
        });
    }
    const categories = ['personajes', 'especies', 'localizaciones', 'tecnologia'];
    categories.forEach(cat => {
        if (fileData.glosario && fileData.glosario[cat]) {
            fileData.glosario[cat].forEach(i => {
                if (i.url_imagen) urls.add(i.url_imagen);
            });
        }
    });

    return { chapters, codexTotal: chars + species + locations + tech, totalUrls: Array.from(urls) };
  };

  const handleRestore = async () => {
    if (!fileData) return;
    if (!confirm("EMERGENCY OVERRIDE: This will modify the live database using the uploaded JSON via Upsert. Proceed?")) return;

    setIsRestoring(true);
    setRestoreLogs(["Iniciando protocolo de restauración..."]);
    
    const result = await restoreDatabaseAction(fileData);
    
    if (result.success) {
      setRestoreLogs(prev => [...prev, ...result.log, "✅ RESTAURACIÓN COMPLETADA CON ÉXITO"]);
    } else {
      setRestoreLogs(prev => [...prev, `❌ ERROR CRÍTICO: ${result.error}`]);
    }
    setIsRestoring(false);
  };

  const handleVerifyLinks = async () => {
    const stats = getStats();
    if (!stats || stats.totalUrls.length === 0) return;

    setIsVerifying(true);
    setVerificationResults(null);
    const result = await verifyBrokenLinksAction(stats.totalUrls);
    
    if (result.success) {
      setVerificationResults(result);
    } else {
      alert("Error verificando enlaces: " + result.error);
    }
    setIsVerifying(false);
  };

  if (!isAdmin || loading) return <div className="min-h-screen bg-[#020408] flex items-center justify-center font-mono text-cyan-400 animate-pulse">AUTHORIZING_RESCUE_ACCESS...</div>;

  const stats = getStats();

  return (
    <main className="min-h-screen bg-[#020408] text-white p-6 flex flex-col gap-6 relative overflow-hidden font-sans">
      <div className="fixed inset-0 z-0 bg-scanlines opacity-[0.03] pointer-events-none" />
      
      <header className="relative z-10 flex justify-between items-center border-b border-red-500/30 pb-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/mission-control')} className="w-10 h-10 flex items-center justify-center border border-red-500/30 text-red-500 rounded-full hover:bg-red-500 hover:text-black transition-all">
            <FaArrowLeft />
          </button>
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter text-red-500">Rescue Protocol</h1>
            <p className="text-[10px] font-mono text-red-400/60 uppercase tracking-[0.3em]">Emergency_Restore_Mode // Root_Override</p>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Panel: Upload & Stats */}
        <section className="space-y-6">
          <div className="hud-panel-enclosed p-6 bg-red-950/10 border border-red-500/20 flex flex-col gap-4">
            <h2 className="text-sm font-mono text-red-400 uppercase tracking-widest flex items-center gap-2">
              <FaDatabase /> 1. Upload Backup Data
            </h2>
            <p className="text-xs text-red-100/60 font-mono">Select a valid .json backup file generated by the system.</p>
            
            <label className="border-2 border-dashed border-red-500/30 p-8 text-center cursor-pointer hover:bg-red-500/5 transition-all flex flex-col items-center justify-center gap-4">
              <FaUpload className="text-3xl text-red-500/50" />
              <span className="font-mono text-xs text-red-400 uppercase tracking-widest">Select JSON Archive</span>
              <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>

          {stats && (
            <div className="hud-panel-enclosed p-6 bg-black/40 border border-cyan-500/20">
              <h2 className="text-sm font-mono text-cyan-400 uppercase tracking-widest mb-4">Payload Analysis</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-cyan-950/20 border border-cyan-500/10">
                  <div className="text-3xl font-black text-cyan-400">{stats.chapters}</div>
                  <div className="text-[10px] font-mono text-cyan-500/60 uppercase tracking-widest">Chapters Detected</div>
                </div>
                <div className="p-4 bg-cyan-950/20 border border-cyan-500/10">
                  <div className="text-3xl font-black text-cyan-400">{stats.codexTotal}</div>
                  <div className="text-[10px] font-mono text-cyan-500/60 uppercase tracking-widest">Codex Entries</div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button 
                  onClick={handleRestore}
                  disabled={isRestoring}
                  className={`w-full py-4 font-black font-mono text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${isRestoring ? 'bg-red-900/50 text-red-500/50 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 text-black shadow-[0_0_20px_rgba(220,38,38,0.4)]'}`}
                >
                  {isRestoring ? 'EXECUTING RESTORE...' : 'EXECUTE EMERGENCY UPSERT'} <FaExclamationTriangle />
                </button>

                <button 
                  onClick={handleVerifyLinks}
                  disabled={isVerifying}
                  className={`w-full py-3 font-bold font-mono text-xs uppercase tracking-widest border transition-all flex items-center justify-center gap-3 ${isVerifying ? 'border-orange-500/30 text-orange-500/50 cursor-wait' : 'border-orange-500/50 text-orange-400 hover:bg-orange-500/10'}`}
                >
                  {isVerifying ? 'VERIFYING UPLINKS...' : `VERIFY ${stats.totalUrls.length} MEDIA LINKS`} <FaSearch />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Right Panel: Logs & Verification Results */}
        <section className="space-y-6 flex flex-col h-full">
          {verificationResults && (
            <div className="hud-panel-enclosed p-4 bg-black/40 border border-orange-500/30">
              <h3 className="text-xs font-mono text-orange-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <FaCheckCircle /> Link Integrity Report
              </h3>
              <p className="text-[10px] font-mono text-orange-100/60 mb-2">Total Scanned: {verificationResults.total}</p>
              
              {verificationResults.broken.length === 0 ? (
                <div className="p-3 bg-green-950/20 border border-green-500/30 text-green-400 text-xs font-mono">
                  All media links are operational.
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto hud-scrollbar pr-2 space-y-2">
                  <div className="text-red-400 text-xs font-mono mb-2">Warning: {verificationResults.broken.length} broken link(s) detected:</div>
                  {verificationResults.broken.map((item, idx) => (
                    <div key={idx} className="p-2 bg-red-950/20 border border-red-500/10 text-[9px] font-mono text-red-300 break-all">
                      [HTTP {item.status || 'ERR'}] {item.url}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="hud-panel-enclosed flex-1 p-4 bg-black/80 border border-cyan-500/10 flex flex-col">
            <h3 className="text-[10px] font-mono text-cyan-500/40 uppercase tracking-widest mb-4 border-b border-cyan-500/10 pb-2">System Terminal</h3>
            <div className="flex-1 overflow-y-auto hud-scrollbar font-mono text-[10px] space-y-1 pr-2">
              {restoreLogs.length === 0 ? (
                <div className="text-cyan-500/20 italic">Awaiting protocol execution...</div>
              ) : (
                restoreLogs.map((log, idx) => (
                  <div key={idx} className={`${log.includes('❌') ? 'text-red-400' : log.includes('✅') ? 'text-green-400 text-xs font-bold mt-4' : 'text-cyan-300/70'}`}>
                    &gt; {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
