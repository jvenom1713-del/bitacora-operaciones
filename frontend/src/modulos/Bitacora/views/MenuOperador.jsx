import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import fotoPowerPlant from '/power_plant_bg.png';
import { Sun, Moon, LogOut, Lock, Clock, AlertCircle, X, FileText, FileCheck, ShieldAlert, Flame, FlaskConical, RefreshCw } from 'lucide-react';
import { isBorrador, isEnviado, isAprobada } from '../../../shared/apiConfig';

export default function MenuOperador({ 
  usuarioActual, 
  turnoActivo, 
  turnoActual,
  onNavegarBitacora, 
  onAbrirPermisosCaliente,
  onSalir, 
  modoNocturno, 
  setModoNocturno 
}) {
  const navigate = useNavigate();
  const esTurnoCerrado = isAprobada(turnoActivo?.estado);
  const emailUsuario = usuarioActual?.email || 'jalbornoz@generadora.cl';
  const nombreRol = usuarioActual?.rol_nombre || 'Operador Sala de Control';
  const folioTurno = String(turnoActivo?.folio || turnoActual?.folio || '0001').padStart(4, '0');

  const [fechaHoraActual, setFechaHoraActual] = useState(new Date());
  const [estadoTurnoLocal, setEstadoTurnoLocal] = useState(() => {
    return localStorage.getItem('estado_turno_activo') || turnoActivo?.estado || turnoActual?.estado || 'borrador';
  });

  useEffect(() => {
    try {
      localStorage.setItem('origen_menu', 'MENU_OPERADOR');
      localStorage.setItem('rol_activo', 'Operador');
    } catch (_) {}
  }, []);

  useEffect(() => {
    const syncEstado = () => {
      const stored = localStorage.getItem('estado_turno_activo');
      if (stored) {
        setEstadoTurnoLocal(stored);
      } else if (turnoActivo?.estado) {
        setEstadoTurnoLocal(turnoActivo.estado);
      } else if (turnoActual?.estado) {
        setEstadoTurnoLocal(turnoActual.estado);
      }
    };
    syncEstado();
    window.addEventListener('turno_actualizado', syncEstado);
    window.addEventListener('storage', syncEstado);
    return () => {
      window.removeEventListener('turno_actualizado', syncEstado);
      window.removeEventListener('storage', syncEstado);
    };
  }, [turnoActivo, turnoActual]);

  useEffect(() => {
    const intervalo = setInterval(() => {
      setFechaHoraActual(new Date());
    }, 1000);

    return () => clearInterval(intervalo);
  }, []);

  const esJefeOAdmin = usuarioActual?.rol_codigo === 'JEFE_TURNO' || 
                       usuarioActual?.rol_codigo === 'ADMIN' || 
                       (usuarioActual?.email && [
                         'jsanmartin@generadora.cl', 
                         'pflores@generadora.cl', 
                         'atorres@generadora.cl', 
                         'ngalaz@generadora.cl', 
                         'cvaldivia@generadora.cl', 
                         'admin@generadora.cl'
                       ].includes(usuarioActual.email.toLowerCase()));

  const obtenerInfoTurnoActual = () => {
    const hora = new Date().getHours();
    if (hora >= 8 && hora < 20) {
      return { nombre: 'Turno Diurno', horario: '08:00 AM - 19:59 PM' };
    } else {
      return { nombre: 'Turno Nocturno', horario: '20:00 PM - 07:59 AM' };
    }
  };

  const infoTurno = obtenerInfoTurnoActual();

  if (!turnoActual && !turnoActivo) {
    return (
      <div className={`relative min-h-screen w-full flex items-center justify-center p-4 ${
        modoNocturno ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
      }`}>
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
          style={{ backgroundImage: `url("${fotoPowerPlant}")` }}
        />
        <div className={`absolute inset-0 z-0 backdrop-blur-sm ${
          modoNocturno ? 'bg-slate-950/80' : 'bg-slate-900/40'
        }`} />
        <div className="relative z-10 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl flex items-center gap-3 text-sm text-slate-200">
          <RefreshCw className="w-5 h-5 text-orange-500 animate-spin" />
          <span>Cargando datos de la Sala de Control...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 transition-colors duration-300 ${
      modoNocturno ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
    }`}>

      {/* 1. Fondo de Planta Industrial con Superposición y Desenfoque */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-500"
        style={{ backgroundImage: `url("${fotoPowerPlant}")` }}
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

      {/* 3. Tarjeta de Menú Principal (Menu Card) */}
      <div className={`relative z-10 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl border p-6 sm:p-8 transition-all duration-300 ${
        modoNocturno 
          ? 'bg-slate-900/95 border-slate-800 shadow-black/70' 
          : 'bg-white/95 border-slate-200 shadow-2xl'
      }`}>
        
        {/* Encabezado Interno del Menú */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-700/40">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-orange-500 leading-none">
              <span className="text-white">G</span>METROPOLITANA
            </h1>
          </div>
          <button
            onClick={onSalir}
            title="Cerrar Sesión / Salir a Portada"
            className="p-2 rounded-xl text-orange-500 hover:bg-orange-500/10 transition-colors"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>

        {/* Lista de Cajas de Estado y Botones de Acción */}
        <div className="space-y-3">
          
          {/* Bloque 1: Título de Administración */}
          <div className="w-full bg-[#1e293b] text-slate-100 font-bold text-sm py-3 px-4 rounded-xl text-center shadow-sm border border-slate-700/50">
            Administración de Bitácoras GM
          </div>

          {/* Bloque 2: Planta e Información de Usuario */}
          <div className="w-full bg-[#1e293b] text-slate-200 py-3 px-4 rounded-xl text-center shadow-sm border border-slate-700/50">
            <p className="font-bold text-sm text-slate-100 mb-0.5">Planta Nueva Renca</p>
            <p className="text-xs text-slate-300/90 font-medium">
              {emailUsuario} - {nombreRol}
            </p>
          </div>

          {/* Bloque 3: Folio Activo (Reloj únicamente para Operadores) */}
          <div className="w-full bg-[#1e293b] text-slate-100 font-bold rounded-xl shadow-sm border border-slate-700/50 flex flex-col divide-y divide-slate-700 text-center overflow-hidden">
            <div className="py-2.5 px-4 text-xs sm:text-sm flex items-center justify-center gap-2">
              <span>Folio Activo:</span>
              <span className="bg-orange-600 text-white px-2 py-0.5 rounded font-black text-xs shadow-md">{folioTurno}</span>
            </div>
            {!esJefeOAdmin && (
              <div className="py-2.5 px-4 flex flex-col sm:flex-row items-center justify-center gap-2 text-cyan-300 font-mono font-bold text-xs sm:text-sm tracking-widest drop-shadow-[0_0_8px_rgba(34,211,238,0.9)]">
                <div className="flex items-center gap-1.5 font-black">
                  <Clock className="w-4 h-4 text-cyan-400 shrink-0 inline animate-pulse" />
                  <span>
                    {fechaHoraActual.toLocaleTimeString('es-CL', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <span className="hidden sm:inline text-slate-600">•</span>
                <span className="text-slate-300 text-xs font-normal">
                  {fechaHoraActual.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
              </div>
            )}
          </div>

          {/* Bloque 4: Horario Actual */}
          <div className="w-full bg-[#1e293b] text-slate-100 font-bold text-xs py-3 px-4 rounded-xl text-center shadow-sm border border-slate-700/50">
            Horario Actual: <span className="text-amber-400 font-black">{infoTurno.nombre}</span> ({infoTurno.horario})
          </div>

          {/* Botón Principal Naranja Dinámico */}
          {(() => {
            const storedState = localStorage.getItem('estado_turno_activo');
            const estadoEval = storedState || turnoActivo?.estado || turnoActual?.estado || estadoTurnoLocal || 'borrador';
            const estaAprobadaTurno = isAprobada(estadoEval);
            const estaEnviadoTurno = isEnviado(estadoEval);

            if (estaAprobadaTurno) {
              return (
                <button
                  onClick={() => {
                    onNavegarBitacora('ABRIR_TURNO');
                    navigate('/abrir-turno');
                  }}
                  className="w-full font-bold text-sm py-3.5 px-4 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-600/30"
                >
                  <span>🚀 Abrir Siguiente Turno</span>
                </button>
              );
            } else if (estaEnviadoTurno && !esJefeOAdmin) {
              return (
                <button
                  onClick={() => {
                    onNavegarBitacora('SALA_CONTROL');
                    navigate('/dashboard');
                  }}
                  title="La bitácora se encuentra enviada a revisión. Clic para ingresar a revisar novedades."
                  className="w-full font-bold text-sm py-3.5 px-4 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.01] flex flex-col items-center justify-center gap-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-600/30 cursor-pointer"
                >
                  <div className="flex items-center gap-2 font-black text-sm uppercase">
                    <FileText className="w-5 h-5 text-amber-200" />
                    <span>Ingreso Bitácora Operacional</span>
                  </div>
                  <span className="text-[11px] text-amber-100 font-medium">
                    Enviada a revisión del Jefe — Clic para ingresar
                  </span>
                </button>
              );
            } else {
              return (
                <button
                  onClick={() => {
                    onNavegarBitacora('ABRIR_TURNO');
                    navigate('/abrir-turno');
                  }}
                  className="w-full font-bold text-sm py-3.5 px-4 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-600/30"
                >
                  <FileText className="w-5 h-5 text-amber-200" />
                  <span>Ingreso Bitácora Operacional (Selección de Guardia)</span>
                </button>
              );
            }
          })()}
          {/* Botón 3 Principal: Consulta Bitácoras por Fecha y Texto */}
          <button
            onClick={() => onNavegarBitacora('BUSQUEDA')}
            className={`w-full font-bold text-sm py-3.5 px-4 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.01] ${
              esTurnoCerrado
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/40 ring-2 ring-blue-400/40'
                : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-blue-600/30'
            }`}
          >
            Consulta Bitácoras por Fecha y Texto
          </button>
        </div>

        {/* Pie de Página Interno del Menú */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-700/40 text-[11px] font-semibold text-slate-400">
          <span>Bitácora V2.0</span>
          <span>NOVEDADES GM</span>
        </div>

      </div>
    </div>
  );
}
