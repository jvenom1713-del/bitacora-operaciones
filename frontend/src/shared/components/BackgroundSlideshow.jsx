import React, { useState, useEffect } from 'react';
import foto1 from '/power_plant_bg.png';
import foto2 from '/centrales_-nueva-renca.jpg';
import foto3 from '/cnr_foto1.jpg';
import foto4 from '/cnr_foto2.jpg';

const FOTOS_DEFECTO = [foto1, foto2, foto3, foto4];

export default function BackgroundSlideshow({
  fotos = FOTOS_DEFECTO,
  intervaloMs = 6000,
  overlayClass = "bg-gradient-to-b from-slate-950/50 via-slate-950/40 to-slate-950/60 backdrop-blur-[1px]"
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
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-slate-950">
      {fotos.map((src, index) => {
        const isActive = index === indiceActual;
        return (
          <div
            key={`${src}-${index}`}
            className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out transform ${
              isActive ? 'opacity-100 scale-105 z-10' : 'opacity-0 scale-100 z-0'
            }`}
            style={{
              backgroundImage: `url("${src}")`,
              transitionProperty: 'opacity, transform',
              transitionDuration: '1400ms',
              transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
        );
      })}

      {/* Capa de contraste optimizada para que las fotos brillen y el texto sea 100% legible */}
      <div className={`absolute inset-0 z-20 pointer-events-none ${overlayClass}`} />
    </div>
  );
}
