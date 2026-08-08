import React, { useState, useEffect } from 'react';
import { Sun, Moon, ArrowLeft, Clock, AlertTriangle, ShieldCheck, X } from 'lucide-react';
import CambioPersonalModal from './CambioPersonalModal';

export default function AbrirTurnoMenu({ 
  usuarioActual, 
  turnoActivo, 
  onIniciarTurno, 
  onVolver, 
  onNavegarCambioPersonal,
  modoNocturno, 
  setModoNocturno 
}) {
  const [rotacionSeleccionada, setRotacionSeleccionada] = useState('TIGRES');
  const [mostrarModalCambio, setMostrarModalCambio] = useState(false);
  const [mostrarModalBloqueo, setMostrarModalBloqueo] = useState(false);
  const [cargandoNuevo, setCargandoNuevo] = useState(false);

  // Reloj en vivo (12 Horas AM/PM)
  const [horaActual, setHoraActual] = useState(() => 
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setHoraActual(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [rotacionesLista, setRotacionesLista] = useState([
    {
      nombre: 'JAGUAR',
      jefe: { nombre: 'Javier San Martín', email: 'jsanmartin@generadora.cl' },
      operadorSala: { nombre: 'Humberto Barra Tapia', email: 'hbarra@generadora.cl' },
      operadorTurno: { nombre: 'Eric Godoy Díaz', email: 'egodoy@generadora.cl' }
    },
    {
      nombre: 'HALCONES',
      jefe: { nombre: 'Pablo Flores Vásquez', email: 'pflores@generadora.cl' },
      operadorSala: { nombre: 'Luis Morales', email: 'lmorales@generadora.cl' },
      operadorTurno: { nombre: 'Gerson Cofré', email: 'gcofre@generadora.cl' }
    },
    {
      nombre: 'TIGRES',
      jefe: { nombre: 'Ariel Torres', email: 'atorres@generadora.cl' },
      operadorSala: { nombre: 'Jorge Albornoz', email: 'jalbornoz@generadora.cl' },
      operadorTurno: { nombre: 'Matías Cisternas', email: 'mcisternas@generadora.cl' }
    },
    {
      nombre: 'LEONES',
      jefe: { nombre: 'Norman Galaz', email: 'ngalaz@generadora.cl' },
      operadorSala: { nombre: 'Eduardo Armijo Retamal', email: 'earmijo@generadora.cl' },
      operadorTurno: { nombre: 'Carlos Vivero', email: 'cvivero@generadora.cl' }
    },
    {
      nombre: 'ÁGUILAS',
      jefe: { nombre: 'Cristian Valdivia Maldonado', email: 'cvaldivia@generadora.cl' },
      operadorSala: { nombre: 'Arístides Toledo Peña', email: 'atoledo@generadora.cl' },
      operadorTurno: { nombre: 'Claudio Garrido San Martín', email: 'cgarrido@generadora.cl' }
    }
  ]);

  const rotacionActualObj = rotacionesLista.find(r => r.nombre === rotacionSeleccionada) || rotacionesLista[2];

  const handleConfirmarReemplazoEquipo = (nuevoEquipo) => {
    setRotacionesLista(prev => prev.map(r => {
      if (r.nombre === rotacionSeleccionada) {
        return {
          ...r,
          jefe: { ...r.jefe, nombre: nuevoEquipo.jdt },
          operadorSala: { ...r.operadorSala, nombre: nuevoEquipo.osc },
          operadorTurno: { ...r.operadorTurno, nombre: nuevoEquipo.ot }
        };
      }
      return r;
    }));
  };

  return (
    <div className={`relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 transition-colors duration-300 ${
      modoNocturno ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
    }`}>

      {/* 1. Fondo de Planta Industrial con Superposición y Desenfoque */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-500"
        style={{ backgroundImage: `url('/power_plant_bg.png')` }}
      />
      <div className={`absolute inset-0 backdrop-blur-sm transition-opacity duration-300 ${
        modoNocturno ? 'bg-slate-950/80' : 'bg-slate-900/40'
      }`} />

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

      {/* 3. Tarjeta de Apertura de Turno (Full Card) */}
      <div className={`relative z-10 w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl border p-6 sm:p-8 transition-all duration-300 ${
        modoNocturno 
          ? 'bg-slate-900/95 border-slate-800 shadow-black/70' 
          : 'bg-white/95 border-slate-200 shadow-2xl'
      }`}>
        
        {/* Encabezado Interno */}
        <div className="flex items-center justify-between pb-4 mb-4">
          <h1 className="text-2xl font-black tracking-tight text-orange-500 leading-none">
            GMETROPOLITANA
          </h1>
          <span className="text-base sm:text-lg font-black tracking-wider text-blue-300 font-mono">
            Fecha: 29-07-2026
          </span>
        </div>

        {/* Banner Azul Dividido con Folio, Horario de Turno y Reloj */}
        {(() => {
          const h = new Date().getHours();
          const esDiurno = h >= 8 && h < 20;
          const turnoTxt = esDiurno ? 'Turno Diurno (08:00 - 19:59)' : 'Turno Nocturno (20:00 - 07:59)';
          return (
            <div className="w-full bg-[#1e40af] text-white font-bold rounded-xl shadow-md mb-6 tracking-wide flex flex-row items-center justify-between divide-x divide-blue-400/50 text-center overflow-hidden">
              <div className="w-1/2 py-2.5 px-4 text-xs sm:text-sm flex flex-wrap items-center justify-center gap-2">
                <span className="opacity-90 font-medium">Folio:</span>
                <span className="bg-orange-600 text-white px-2.5 py-0.5 rounded font-black text-xs sm:text-sm shadow-md">2428-A</span>
                <span className="bg-amber-500/30 text-amber-200 border border-amber-400/40 px-2 py-0.5 rounded text-[11px] font-bold">{turnoTxt}</span>
              </div>
              <div className="w-1/2 py-2.5 px-4 flex items-center justify-center gap-2 text-cyan-200 font-mono font-black text-xs sm:text-sm tracking-widest drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
                <Clock className="w-4 h-4 text-cyan-300 animate-pulse shrink-0" />
                <span>{horaActual}</span>
              </div>
            </div>
          );
        })()}

        {/* Tabla de Dotaciones / Rotaciones */}
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className={`text-xs font-semibold uppercase tracking-wider ${
                modoNocturno ? 'text-slate-300' : 'text-slate-600'
              }`}>
                <th className="py-2 px-3 w-1/4">Guardias</th>
                <th className="py-2 px-3 w-1/4">Jefe de Turno</th>
                <th className="py-2 px-3 w-1/4">Operador Sala Control</th>
                <th className="py-2 px-3 w-1/4">Operador de Terreno</th>
              </tr>
            </thead>
            <tbody className="space-y-2 text-xs">
              {rotacionesLista.map((rot) => {
                const esActiva = rot.nombre === rotacionSeleccionada;
                return (
                  <tr 
                    key={rot.nombre}
                    onClick={() => setRotacionSeleccionada(rot.nombre)}
                    className={`cursor-pointer transition-all duration-200 rounded-xl ${
                      esActiva
                        ? modoNocturno
                          ? 'bg-blue-900/70 border-2 border-blue-500 text-white shadow-lg'
                          : 'bg-blue-100/90 border-2 border-blue-600 text-blue-950 font-bold shadow-md'
                        : modoNocturno
                          ? 'hover:bg-slate-800/60 text-slate-300'
                          : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {/* Columna Rotación */}
                    <td className="py-3 px-2 font-bold tracking-wider">
                      <div className={`p-2.5 rounded-xl border text-center font-extrabold ${
                        esActiva
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                          : modoNocturno
                            ? 'bg-slate-800/90 border-slate-700 text-slate-200'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}>
                        {rot.nombre}
                      </div>
                    </td>

                    {/* Columna Jefe de Turno */}
                    <td className="py-3 px-2">
                      <div className={`p-2 rounded-xl border text-center leading-tight ${
                        esActiva
                          ? 'bg-blue-50/20 border-blue-400/60'
                          : modoNocturno
                            ? 'bg-slate-800/40 border-slate-700/60'
                            : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="font-semibold">{rot.jefe.nombre}</div>
                        <div className="text-[10px] opacity-75">{rot.jefe.email}</div>
                      </div>
                    </td>

                    {/* Columna Operador Sala Control */}
                    <td className="py-3 px-2">
                      <div className={`p-2 rounded-xl border text-center leading-tight ${
                        esActiva
                          ? 'bg-blue-50/20 border-blue-400/60'
                          : modoNocturno
                            ? 'bg-slate-800/40 border-slate-700/60'
                            : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="font-semibold">{rot.operadorSala.nombre}</div>
                        <div className="text-[10px] opacity-75">{rot.operadorSala.email}</div>
                      </div>
                    </td>

                    {/* Columna Operador de Turno */}
                    <td className="py-3 px-2">
                      <div className={`p-2 rounded-xl border text-center leading-tight ${
                        esActiva
                          ? 'bg-blue-50/20 border-blue-400/60'
                          : modoNocturno
                            ? 'bg-slate-800/40 border-slate-700/60'
                            : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="font-semibold">{rot.operadorTurno.nombre}</div>
                        <div className="text-[10px] opacity-75">{rot.operadorTurno.email}</div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Botones de Acción de Pie de Tarjeta */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
          <button
            onClick={async () => {
              /* 
              // Validación deshabilitada: no se requiere aprobación de jefe de turno para abrir nuevo turno
              if (turnoActivo && turnoActivo.estado !== 'CERRADO' && turnoActivo.estado !== 'APROBADO') {
                setMostrarModalBloqueo(true);
                return;
              }
              */
              try {
                setCargandoNuevo(true);
                await onIniciarTurno(rotacionSeleccionada);
              } catch (e) {
                console.error("Error al iniciar turno:", e);
              } finally {
                setCargandoNuevo(false);
              }
            }}
            disabled={cargandoNuevo}
            className="w-full sm:w-auto min-w-[220px] bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm py-3.5 px-6 rounded-xl shadow-lg shadow-blue-600/30 transition-all duration-200 transform hover:scale-[1.01] cursor-pointer"
          >
            {cargandoNuevo ? 'Abriendo Turno...' : 'Iniciar Turno 2428-A'}
          </button>

          <button
            onClick={() => {
              if (onNavegarCambioPersonal) {
                onNavegarCambioPersonal({
                  rotacion: rotacionSeleccionada,
                  jdt: rotacionActualObj.jefe.nombre,
                  osc: rotacionActualObj.operadorSala.nombre,
                  ot: rotacionActualObj.operadorTurno.nombre
                });
              }
            }}
            className="w-full sm:w-auto min-w-[220px] bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-bold text-sm py-3.5 px-6 rounded-xl shadow-lg shadow-orange-600/30 transition-all duration-200 transform hover:scale-[1.01]"
          >
            Cambio Personal de Turno
          </button>
        </div>

        {/* Botón Atrás (Flecha Izquierda) */}
        <div className="pt-4 flex items-center justify-start border-t border-slate-700/40">
          <button
            onClick={onVolver}
            title="Volver al Menú Principal"
            className="flex items-center justify-center p-2.5 rounded-xl border transition-all text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 border-blue-500/30"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>

      </div>

      {/* MODAL DE BLOQUEO: BITÁCORA ANTERIOR NO APROBADA */}
      {mostrarModalBloqueo && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-3 right-3">
              <button 
                onClick={() => setMostrarModalBloqueo(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-black text-white tracking-wide">
                APROBACIÓN DE JEFE DE TURNO REQUERIDA
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                No es posible abrir un nuevo turno. La bitácora del turno actual (Folio <strong className="text-amber-400">{turnoActivo?.folio || '2428-A'}</strong>) aún no ha sido <strong>Aprobada y Cerrada</strong> por el Jefe de Turno.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 font-mono text-left space-y-1">
              <div className="flex justify-between">
                <span>Estado Actual:</span>
                <span className="font-bold text-amber-400 uppercase">{turnoActivo?.estado || 'ABIERTO'}</span>
              </div>
              <div className="flex justify-between">
                <span>Requisito:</span>
                <span className="font-bold text-emerald-400 uppercase">CERRADO / APROBADO</span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={() => {
                  setMostrarModalBloqueo(false);
                  onVolver();
                }}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
              >
                Ir a Consulta de Hoja de Turno (Para Aprobar)
              </button>
              <button
                onClick={() => setMostrarModalBloqueo(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Entendido / Regresar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
