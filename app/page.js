"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { libro } from '../lib/libro'; // Importamos los datos del libro
// import { auth } from '../lib/firebase'; // Importamos la configuración de auth
// import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { FaVolumeUp, FaVolumeMute, FaArrowRight } from 'react-icons/fa'; // Importamos FaArrowRight

export default function Home() {
  // const [user, setUser] = useState(null);

  // Estado para la música de fondo
  const [isMuted, setIsMuted] = useState(true);
  const audioRef = useRef(null);

  // useEffect(() => {
  //   // Listener de Firebase que se ejecuta cuando cambia el estado de autenticación
  //   const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
  //     setUser(currentUser); // Si es null, el usuario no está logueado. Si tiene datos, sí.
  //   });

  //   // Configuración del audio
  //   if (audioRef.current) {
  //     audioRef.current.volume = 0.1;
  //   }

  //   // Limpiamos el listener cuando el componente se desmonta para evitar fugas de memoria
  //   return () => unsubscribe();
  // }, []);

  // const handleLogin = async () => {
  //   const provider = new GoogleAuthProvider();
  //   try {
  //     await signInWithPopup(auth, provider);
  //   } catch (error) {
  //     console.error("Error durante el inicio de sesión:", error);
  //   }
  // };

  // const handleLogout = async () => {
  //   try {
  //     await signOut(auth);
  //   } catch (error) {
  //     console.error("Error durante el cierre de sesión:", error);
  //   }
  // }

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
    <main className="relative min-h-screen p-4 md:p-8 bg-cover bg-center" style={{ backgroundImage: `url('/background.gif')` }}>
      <audio ref={audioRef} src="/ambient-music.mp3" loop muted />

      <div className="absolute bottom-4 left-4 flex items-center gap-4">
        <button onClick={toggleMute} className="text-2xl text-cyan-300 hover:text-white transition-colors">
          {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
        </button>
      </div>

      <div className="flex flex-col items-center justify-center w-full h-full">
        <div className="text-center">
          <h1 className="text-6xl md:text-8xl font-black uppercase text-glow text-glitch mb-4" data-text={libro.titulo}>
            {libro.titulo}
          </h1>
          <p className="text-xl text-cyan-200 mb-12">Una aventura interactiva</p>
        </div>

        <nav className="flex flex-col gap-4 w-full max-w-md">
          <h2 className="text-2xl md:text-3xl font-bold text-glow mb-4">Índice de Capítulos</h2>
          {libro.capitulos.map((cap) => (
            <Link key={cap.slug} href={`/capitulos/${cap.slug}`} className="button-secondary is-icon-right w-inline-block">
              <div>{cap.titulo}</div>
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}