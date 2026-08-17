import React, { useState, useEffect } from 'react';

const FOTOS_DEFECTO = [
  '/power_plant_bg.png',
  '/centrales_-nueva-renca.jpg',
  '/cnr_foto1.jpg',
  '/cnr_foto2.jpg'
];

export default function BackgroundSlideshow({
  fotos = FOTOS_DEFECTO,
  intervaloMs = 7000,
  overlayClass = "bg-gradient-to-b from-slate-950/80 via-slate-950/70 to-slate-950/90 backdrop-blur-[2px]"
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
      {fotos.map((src, index) => {
        const isActive = index === indiceActual;
        return (
          <div
            key={src}
            className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out transform ${
              isActive ? 'opacity-100 scale-105' : 'opacity-0 scale-100'
            }`}
            style={{
              backgroundImage: `url('${src}')`,
              transitionProperty: 'opacity, transform',
              transitionDuration: '1200ms',
              transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
        );
      })}

      {/* Capa de oscurecimiento para legibilidad total del contenido */}
      <div className={`absolute inset-0 ${overlayClass}`} />
    </div>
  );
}
