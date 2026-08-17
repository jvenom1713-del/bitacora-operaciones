import React, { useState, useEffect } from 'react';

import foto1 from '/power_plant_bg.png';
import foto2 from '/centrales_-nueva-renca.jpg';
import foto3 from '/cnr_foto1.jpg';
import foto4 from '/cnr_foto2.jpg';

const FOTOS_DEFECTO = [foto1, foto2, foto3, foto4];

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
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* 1. Fondo base estático de seguridad */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: `url("${foto1}")` }}
      />

      {/* 2. Capas del carrusel animado */}
      {fotos.map((src, index) => {
        const isActive = index === indiceActual;
        return (
          <div
            key={`${src}-${index}`}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
              isActive ? 'opacity-100 z-[1]' : 'opacity-0 z-0'
            }`}
            style={{
              backgroundImage: `url("${src}")`
            }}
          />
        );
      })}

      {/* 3. Capa de contraste protectora (z-[2] para que quede detrás del contenido z-10) */}
      <div className={`absolute inset-0 z-[2] pointer-events-none ${overlayClass}`} />
    </div>
  );
}
