import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, LogOut, FileText, Search, FlaskConical } from 'lucide-react';
import { getApiUrl, safeFetchJson, isBorrador, isEnviado, isAprobada } from '../../../shared/apiConfig';

export default function MenuJefeTurno({ 
  usuarioActual, 
  turnoActivo, 
  onVerBitacoraEnCurso, 
  onBuscarBitacoras, 
  onNavegarAnalisisQuimicos,
  onSalir, 
  modoNocturno, 
  setModoNocturno 
}) {
  const navigate = useNavigate();
  const emailUsuario = usuarioActual?.email || 'jsanmartin@generadora.cl';
  const nombreRol = usuarioActual?.rol_nombre || 'Jefe de Turno';
  const folioTurno = String(turnoActivo?.folio || '0001').padStart(4, '0');

  const [fechaHoraActual, setFechaHoraActual] = useState(new Date());
  const [estadoTurnoLocal, setEstadoTurnoLocal] = useState(() => {
    return localStorage.getItem('estado_turno_activo') || turnoActivo?.estado || 'borrador';
  });

  useEffect(() => {
    try {
      localStorage.setItem('origen_menu', 'MENU_JEFE');
      localStorage.setItem('rol_activo', 'Jefe de Turno');
    } catch (_) {}
  }, []);

  useEffect(() => {
    const syncEstado = async () => {
      const stored = localStorage.getItem('estado_turno_activo');
      if (stored) {
        setEstadoTurnoLocal(stored);
        return;
      }
      try {
        const res = await safeFetchJson(getApiUrl('/api/turnos/activo'));
        const st = res.data?.turno?.estado || res.data?.data?.estado;
        if (st) {
          setEstadoTurnoLocal(st);
          localStorage.setItem('estado_turno_activo', st);
          return;
        }
      } catch (_) {}
      
      if (turnoActivo?.estado) {
        setEstadoTurnoLocal(turnoActivo.estado);
      }
    };
    syncEstado();
    window.addEventListener('turno_actualizado', syncEstado);
    window.addEventListener('storage', syncEstado);
    return () => {
      window.removeEventListener('turno_actualizado', syncEstado);
      window.removeEventListener('storage', syncEstado);
    };
  }, [turnoActivo]);

  useEffect(() => {
    const intervalo = setInterval(() => {
      setFechaHoraActual(new Date());
    }, 1000);
    return () => clearInterval(intervalo);
  }, []);

  const obtenerInfoTurnoActual = () => {
    const hora = new Date().getHours();
    if (hora >= 8 && hora < 20) {
      return { nombre: 'Turno Diurno', horario: '08:00 AM - 19:59 PM' };
    } else {
      return { nombre: 'Turno Nocturno', horario: '20:00 PM - 07:59 AM' };
    }
  };

  const infoTurno = obtenerInfoTurnoActual();

  return (
    <div className={`relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 transition-colors duration-300 ${
      modoNocturno ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
    }`}>
      {/* 1. Fondo de Planta Industrial */}
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

      {/* 3. Tarjeta de Menú Jefe de Turno */}
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
            <p className="text-xs text-blue-300 font-semibold mt-1">
              Plataforma del Jefe de Turno
            </p>
          </div>
          <button
            onClick={onSalir}
            title="Cerrar Sesión / Salir a Portada"
            className="p-2 rounded-xl text-orange-500 hover:bg-orange-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>

        {/* Info del Jefe & Turno */}
        <div className="space-y-3 mb-6">
          <div className="w-full bg-[#1e293b] text-slate-200 py-3 px-4 rounded-xl text-center shadow-sm border border-slate-700/50">
            <p className="font-bold text-sm text-slate-100 mb-0.5">Planta Nueva Renca</p>
            <p className="text-xs text-amber-400 font-bold">
              {emailUsuario} — {nombreRol}
            </p>
          </div>

          <div className="w-full bg-[#1e293b] text-slate-100 font-bold rounded-xl shadow-sm border border-slate-700/50 flex items-center justify-around py-3 px-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Folio Activo:</span>
              <span className="bg-orange-600 text-white px-2 py-0.5 rounded font-black">{folioTurno}</span>
            </div>
            <div className="border-r border-slate-700 h-8" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Horario:</span>
              <span className="text-amber-300 font-bold">{infoTurno.nombre}</span>
            </div>
          </div>
        </div>

        {/* 2 BOTONES PRINCIPALES PARA EL JEFE DE TURNO */}
        {(() => {
          const storedState = localStorage.getItem('estado_turno_activo');
          const estadoEfectivo = storedState || estadoTurnoLocal || turnoActivo?.estado || 'borrador';
          const estaEnviado = isEnviado(estadoEfectivo);
          const estaBorrador = isBorrador(estadoEfectivo);
          const estaAprobada = isAprobada(estadoEfectivo);
          
          // El botón que abre la revisión se habilita ÚNICAMENTE cuando el Operador ha enviado la Bitácora a revisión.
          // En estado Borrador o una vez Aprobada/Cerrada por el JDT, PERMANECE BLOQUEADO hasta el ingreso de un nuevo envío.
          const botonHabilitado = estaEnviado;

          return (
            <div className="space-y-4">
              {/* Botón 1: Revisar y Cerrar Bitácora (JDT) */}
              <button
                disabled={!botonHabilitado}
                onClick={() => {
                  if (botonHabilitado) {
                    try {
                      localStorage.setItem('origen_menu', 'MENU_JEFE');
                      localStorage.setItem('rol_activo', 'Jefe de Turno');
                    } catch (_) {}
                    if (onVerBitacoraEnCurso) onVerBitacoraEnCurso();
                    navigate('/hoja-turno');
                  }
                }}
                title={botonHabilitado 
                  ? "Ingresar a la hoja de bitácora para revisar, autorizar y firmar" 
                  : estaAprobada
                    ? "Bloqueado: Turno Aprobado y Cerrado. Esperando nuevo envío del Operador"
                    : "Bloqueado: El Operador de Sala aún no envía la Bitácora a revisión"}
                className={`w-full py-4 px-5 rounded-xl font-bold text-sm sm:text-base transition-all border flex items-center justify-center gap-3 ${
                  botonHabilitado
                    ? 'text-white bg-gradient-to-r from-amber-600 via-emerald-600 to-teal-600 hover:from-amber-500 hover:to-teal-500 cursor-pointer active:scale-[0.99] shadow-xl shadow-emerald-900/40 border-amber-400 transform hover:scale-[1.01] animate-pulse'
                    : 'text-slate-400 bg-slate-800/80 border-slate-700/60 cursor-not-allowed opacity-60'
                }`}
              >
                <FileText className={`w-6 h-6 ${botonHabilitado ? 'text-amber-300' : 'text-slate-500'}`} />
                <div className="text-left">
                  <span className="block font-bold text-base">Revisar y Cerrar Bitácora (JDT)</span>
                  {estaEnviado && (
                    <span className="text-[11px] font-extrabold text-amber-200 block mt-0.5">
                      ⚠️ ¡BITÁCORA ENVIADA! Clic para Revisar, Aprobar y Firmar
                    </span>
                  )}
                  {estaBorrador && (
                    <span className="text-[11px] font-semibold text-amber-400/90 block mt-0.5">
                      🔒 Bloqueado: Operador de Sala aún no envía a revisión
                    </span>
                  )}
                  {estaAprobada && (
                    <span className="text-[11px] font-semibold text-slate-400 block mt-0.5">
                      🔒 Bloqueado: Turno Aprobado y Cerrado — Esperando nuevo envío del Operador
                    </span>
                  )}
                </div>
              </button>

              {/* Botón 2: Buscar Bitácoras */}
              <button
                onClick={() => {
                  onBuscarBitacoras();
                  navigate('/consulta');
                }}
                className="w-full py-4 px-5 rounded-xl font-bold text-sm sm:text-base text-white bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 hover:from-slate-700 hover:to-slate-800 active:scale-[0.99] shadow-lg shadow-slate-900/50 transition-all border border-slate-700/80 flex items-center justify-center gap-3 cursor-pointer"
              >
                <Search className="w-6 h-6 text-cyan-400" />
                <span>Buscar Bitácoras</span>
              </button>
            </div>
          );
        })()}

        {/* Pie de Página */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-700/40 text-[11px] font-semibold text-slate-400">
          <span>Bitácora V2.0</span>
          <span>ADMINISTRACIÓN JEFE DE TURNO</span>
        </div>

      </div>
    </div>
  );
}
