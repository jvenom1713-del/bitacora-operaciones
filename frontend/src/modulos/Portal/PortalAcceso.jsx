import React from 'react';
import { Sun, Moon, BookOpen, FlaskConical, ArrowRight, ShieldCheck, Activity } from 'lucide-react';
import BackgroundSlideshow from '../../shared/components/BackgroundSlideshow';

export default function PortalAcceso({ 
  onIrABitacora, 
  onIrAQuimicos, 
  modoNocturno, 
  setModoNocturno 
}) {
  return (
    <div className={`relative min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 transition-colors duration-300 ${
      modoNocturno ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
    }`}>

      {/* 1. Fondo en Movimiento Dinámico con Galería de Fotos */}
      <BackgroundSlideshow 
        overlayClass={`backdrop-blur-md transition-opacity duration-300 ${
          modoNocturno ? 'bg-slate-950/85' : 'bg-slate-900/50'
        }`}
      />

      {/* 2. Botón Flotante Superior Derecho para Modo Nocturno / Diurno */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={() => setModoNocturno(!modoNocturno)}
          title={modoNocturno ? "Cambiar a Modo Diurno" : "Cambiar a Modo Nocturno"}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg border backdrop-blur-md transition-all duration-200 transform hover:scale-105 ${
            modoNocturno
              ? 'bg-slate-800/90 border-slate-700 text-amber-400 hover:bg-slate-800 hover:border-amber-400/50'
              : 'bg-white/90 border-slate-200 text-slate-700 hover:bg-white hover:text-amber-600'
          }`}
        >
          {modoNocturno ? (
            <>
              <Sun className="w-5 h-5 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-slate-200">Modo Diurno</span>
            </>
          ) : (
            <>
              <Moon className="w-5 h-5 fill-slate-700 text-slate-700" />
              <span className="text-xs font-bold text-slate-700">Modo Nocturno</span>
            </>
          )}
        </button>
      </div>

      {/* 3. Tarjeta / Portal de Selección de Módulos (Smart Portal) */}
      <div className="relative z-10 w-full max-w-4xl space-y-8 text-center">
        
        {/* Encabezado Corporativo del Portal */}
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-orange-500 leading-none drop-shadow-md">
            <span className="text-white">G</span>METROPOLITANA
          </h1>
          <div className="inline-block px-4 py-1.5 rounded-full bg-blue-950/80 border border-blue-400/40 text-xs font-bold uppercase tracking-widest text-blue-200">
            Administración de Datos Operaciones
          </div>
          <p className={`text-sm sm:text-base font-medium max-w-lg mx-auto ${
            modoNocturno ? 'text-slate-400' : 'text-slate-200'
          }`}>
            Portal Centralizado — Seleccione el módulo operativo al que desea acceder:
          </p>
        </div>

        {/* 4. Tarjetas Simétricas de Selección de Módulos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          
          {/* MÓDULO 1: BITÁCORA DE OPERACIONES */}
          <div 
            onClick={onIrABitacora}
            className={`group p-8 rounded-3xl border shadow-2xl transition-all duration-300 transform hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between text-left relative overflow-hidden backdrop-blur-xl ${
              modoNocturno 
                ? 'bg-slate-900/90 border-slate-800 hover:border-orange-500/60 shadow-black/80 hover:shadow-orange-950/40' 
                : 'bg-white/95 border-slate-200 hover:border-orange-500/60 shadow-2xl'
            }`}
          >
            {/* Efecto de Brillo Gradiente */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all pointer-events-none" />

            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-tr from-amber-600 to-orange-600 rounded-2xl w-fit shadow-lg text-white group-hover:scale-110 transition-transform">
                <BookOpen className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400 block mb-1">
                  Módulo 01
                </span>
                <h2 className={`text-2xl font-black ${modoNocturno ? 'text-white' : 'text-slate-900'}`}>
                  Ingreso a Bitácora
                </h2>
                <p className={`text-xs mt-2 font-medium leading-relaxed ${
                  modoNocturno ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Registro operacional diario de novedades, parámetros CEN, estado de planta, contingencias y hoja de turno autorizada.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-orange-400 group-hover:text-orange-300">
              <span>Acceder a Bitácora</span>
              <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 group-hover:bg-orange-500 group-hover:text-white transition-all">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* MÓDULO 2: ANÁLISIS QUÍMICOS */}
          <div 
            onClick={onIrAQuimicos}
            className={`group p-8 rounded-3xl border shadow-2xl transition-all duration-300 transform hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between text-left relative overflow-hidden backdrop-blur-xl ${
              modoNocturno 
                ? 'bg-slate-900/90 border-slate-800 hover:border-cyan-500/60 shadow-black/80 hover:shadow-cyan-950/40' 
                : 'bg-white/95 border-slate-200 hover:border-cyan-500/60 shadow-2xl'
            }`}
          >
            {/* Efecto de Brillo Gradiente */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />

            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-tr from-cyan-600 via-teal-600 to-emerald-600 rounded-2xl w-fit shadow-lg text-white group-hover:scale-110 transition-transform">
                <FlaskConical className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 block mb-1">
                  Módulo 02
                </span>
                <h2 className={`text-2xl font-black ${modoNocturno ? 'text-white' : 'text-slate-900'}`}>
                  Análisis Químicos
                </h2>
                <p className={`text-xs mt-2 font-medium leading-relaxed ${
                  modoNocturno ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Control de muestras de agua/vapor en domos, alimentación, desmineralizadora y torres con trazabilidad y auditoría por roles.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-cyan-400 group-hover:text-cyan-300">
              <span>Acceder a Químicos</span>
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 group-hover:bg-cyan-500 group-hover:text-white transition-all">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

        </div>

        {/* Pie de página corporativo */}
        <div className={`pt-6 text-xs text-center font-medium ${
          modoNocturno ? 'text-slate-500' : 'text-slate-400'
        }`}>
          Central Nueva Renca — Sistema de Control Operacional v2.0
        </div>

      </div>

    </div>
  );
}
