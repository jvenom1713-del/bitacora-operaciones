import React, { useState, useEffect } from 'react';

const FOTOS_DEFECTO = [
  '/power_plant_bg.png',
  '/centrales_-nueva-renca.jpg',
  '/cnr_foto1.jpg',
  '/cnr_foto2.jpg'
];

export default function BackgroundSlideshow({
  fotos = FOTOS_DEFECTO,
  intervaloMs = 6000,
  overlayClass = "bg-slate-900/40 backdrop-blur-[1px]"
}) {
  const [indiceActual, setIndiceActual] = useState(0);

  useEffect(() => {
    if (!fotos || fotos.length <= 1) return;
    const timer = setInterval(() => {
      setIndiceActual(prev => (prev + 1) % fotos.length);
    }, intervaloMs);
    return () => clearInterval(timer);
  }, [fotos, intervaloMs]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-slate-900">
      {/* Fondo base estático garantizado para prevenir cualquier pantalla negra */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('/power_plant_bg.png')` }}
      />

      {/* Capas del carrusel animado */}
      {fotos.map((src, index) => {
        const isActive = index === indiceActual;
        return (
          <div
            key={`${src}-${index}`}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
              isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
            style={{
              backgroundImage: `url("${src}")`
            }}
          />
        );
      })}

      {/* Capa de contraste protectora */}
      <div className={`absolute inset-0 z-20 pointer-events-none ${overlayClass}`} />
    </div>
  );
}
