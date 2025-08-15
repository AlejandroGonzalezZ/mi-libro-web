"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { libro } from '../../../lib/libro';
import { FaPlay, FaPause, FaHome } from 'react-icons/fa';

export default function CapituloPage() {
    const router = useRouter();
    const params = useParams();
    const capitulo = libro.capitulos.find(c => c.slug === params.slug);

    const [isReading, setIsReading] = useState(false);
    const [voices, setVoices] = useState([]); // Nuevo estado para las voces
    const utteranceRef = useRef(null);

    useEffect(() => {
        // Limpiar la síntesis de voz si el usuario navega fuera de la página
        return () => {
            speechSynthesis.cancel();
        };
    }, []);

    useEffect(() => {
        // Función para cargar las voces
        const loadVoices = () => {
            const availableVoices = speechSynthesis.getVoices();
            setVoices(availableVoices);
            console.log("Voces cargadas:", availableVoices);
        };

        // Cargar voces inmediatamente si ya están disponibles
        if (speechSynthesis.getVoices().length > 0) {
            loadVoices();
        } else {
            // Si no, esperar al evento voiceschanged
            speechSynthesis.onvoiceschanged = loadVoices;
        }

        // Limpiar el evento al desmontar el componente
        return () => {
            speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    if (!capitulo) {
        return <div className="flex items-center justify-center min-h-screen">Capítulo no encontrado.</div>;
    }

    const handlePlayPause = () => {
        console.log("Botón de lectura presionado.");

        if (!('speechSynthesis' in window)) {
            alert("Lo siento, tu navegador no soporta la síntesis de voz.");
            console.error("SpeechSynthesis no soportado en este navegador.");
            return;
        }

        if (speechSynthesis.speaking) {
            if (isReading) {
                speechSynthesis.pause();
                setIsReading(false);
                console.log("Síntesis de voz pausada.");
            } else {
                speechSynthesis.resume();
                setIsReading(true);
                console.log("Síntesis de voz reanudada.");
            }
        } else {
            // Usar las voces del estado
            const spanishVoice = voices.find(voice => voice.lang === 'es-ES' || voice.lang.startsWith('es-'));

            if (!spanishVoice) {
                alert("No se encontró una voz en español en tu sistema. Por favor, asegúrate de tener una voz en español instalada en la configuración de tu sistema operativo/navegador.");
                console.error("No se encontró voz en español.", voices);
                return;
            }

            const utterance = new SpeechSynthesisUtterance(capitulo.texto);
            utterance.lang = spanishVoice.lang; // Usar el idioma de la voz encontrada
            utterance.voice = spanishVoice; // Asignar la voz encontrada
            utterance.rate = 0.9;

            utterance.onend = () => {
                setIsReading(false);
                console.log("Síntesis de voz terminada.");
            };
            utterance.onerror = (event) => {
                if (event.error === 'interrupted') {
                    console.log("Síntesis de voz interrumpida por navegación.");
                } else {
                    console.error("Error en la síntesis de voz:", event.error);
                    alert("Ocurrió un error al intentar leer el texto. Por favor, revisa la consola para más detalles.");
                }
                setIsReading(false);
            };

            utteranceRef.current = utterance;
            speechSynthesis.speak(utterance);
            setIsReading(true);
            console.log("Iniciando síntesis de voz.");
        }
    };

    return (
        <main className="min-h-screen p-4 md:p-8 bg-cover bg-center" style={{ backgroundImage: `url('/background.gif')` }}>
            <div className="max-w-4xl mx-auto bg-black bg-opacity-70 p-6 rounded-lg shadow-lg">
                <div className="absolute top-4 right-4 flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-2 text-cyan-300 hover:text-white transition-colors text-xl">
                        <FaHome />
                        <span className="hidden md:inline">Volver al Menú</span>
                    </Link>
                    <button onClick={handlePlayPause} className="text-4xl text-cyan-400 hover:text-white transition-colors">
                        {isReading ? <FaPause /> : <FaPlay />}
                    </button>
                </div>

                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold text-glow">{capitulo.titulo}</h1>
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                    {/* Contenedor principal del texto y la imagen */}
                    <div className="prose prose-invert prose-lg max-w-none flex-grow clear-both">
                        {/* La imagen ahora está DENTRO del contenedor del texto */}
                        {capitulo.imagen && (
                            <div className="relative group float-right ml-6 mb-4 w-1/2 md:w-1/3">
                                <img src={capitulo.imagen} alt={`Ilustración para ${capitulo.titulo}`} className="rounded-lg w-full" />
                            </div>
                        )}
                        {capitulo.texto.split('\n').map((paragraph, index) => (
                            <p key={index} className="mb-4">{paragraph}</p>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}