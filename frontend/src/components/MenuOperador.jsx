import React, { useState, useEffect } from 'react';
import { Sun, Moon, LogOut, Lock, Clock, AlertCircle, X, FileText, FileCheck, ShieldAlert } from 'lucide-react';

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
  const [mostrarModalConsultaCerrada, setMostrarModalConsultaCerrada] = useState(false);
  const esTurnoCerrado = turnoActivo?.estado === 'CERRADO';
  const emailUsuario = usuarioActual?.email || 'jalbornoz@generadora.cl';
  const nombreRol = usuarioActual?.rol_nombre || 'Operador Sala de Control';
  const folioTurno = turnoActivo?.folio || '2428 - A';

  // Reloj y fecha en vivo (24 Horas es-CL)
  const [fechaHoraActual, setFechaHoraActual] = useState(new Date());

  useEffect(() => {
    const intervalo = setInterval(() => {
      setFechaHoraActual(new Date());
    }, 1000); // Se actualiza cada 1 segundo

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

  if (!turnoActual) {
    return <div style={{ color: 'white', padding: '20px' }}>Cargando o inicializando turno...</div>;
  }

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
              GMETROPOLITANA
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

          {/* Muestra el botón 'Abrir Turno' siempre que turnoActual?.estado !== 'ABIERTO' */}
          {turnoActual?.estado !== 'ABIERTO' && (
            <button
              onClick={() => onNavegarBitacora('ABRIR_TURNO')}
              className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm py-3.5 px-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all duration-200 transform hover:scale-[1.01] cursor-pointer"
            >
              Abrir Turno
            </button>
          )}

          {/* Si turnoActual?.estado === 'ABIERTO': Muestra el botón 'Cierre de Turno y Resumen Operativo' */}
          {turnoActual?.estado === 'ABIERTO' && (
            <button
              onClick={() => onNavegarBitacora('APROBAR_CIERRE')}
              className="w-full font-bold text-sm py-3.5 px-4 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-600/30"
            >
              <FileCheck className="w-5 h-5 text-amber-200" />
              <span>Cierre de Turno</span>
            </button>
          )}


          {/* Botón 2 Principal: Consulta Hojas de Turno */}
          <button
            onClick={() => {
              if (esTurnoCerrado) {
                setMostrarModalConsultaCerrada(true);
                return;
              }
              onNavegarBitacora('HOJAS_TURNO');
            }}
            className={`w-full font-bold text-sm py-3.5 px-4 rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
              esTurnoCerrado
                ? 'bg-slate-800/90 text-slate-400 border border-slate-700/80 cursor-pointer hover:bg-slate-800'
                : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-blue-600/30 transform hover:scale-[1.01]'
            }`}
          >
            {esTurnoCerrado && <Lock className="w-4 h-4 text-amber-400" />}
            <span>{esTurnoCerrado ? 'Consulta Hojas de Turno (Hoja Cerrada)' : 'Consulta Hojas de Turno'}</span>
          </button>

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

          {/* Botón 4: Permiso en Caliente */}
          <button
            onClick={() => {
              if (onAbrirPermisosCaliente) {
                onAbrirPermisosCaliente();
              } else {
                onNavegarBitacora('PERMISOS_CALIENTE');
              }
            }}
            className="w-full font-bold text-sm py-3.5 px-4 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-600 hover:to-indigo-600 text-white shadow-purple-900/40 border border-purple-500/30"
          >
            <ShieldAlert className="w-5 h-5 text-purple-300" />
            <span>Permiso en Caliente</span>
          </button>

        </div>

        {/* Pie de Página Interno del Menú */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-700/40 text-[11px] font-semibold text-slate-400">
          <span>Bitácora V2.0</span>
          <span>NOVEDADES GM</span>
        </div>

      </div>

      {/* MODAL INFORMATIVO: HOJA DE TURNO CERRADA */}
      {mostrarModalConsultaCerrada && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-blue-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-3 right-3">
              <button 
                onClick={() => setMostrarModalConsultaCerrada(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <FileText className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-black text-white tracking-wide">
                BITÁCORA APROBADA Y CERRADA
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                La Hoja de Turno actual ya fue <strong>Aprobada y Cerrada</strong> por el Jefe de Turno. No es posible editar ni ingresar a la vista activa.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 font-mono text-left space-y-1">
              <div className="flex justify-between">
                <span>Estado:</span>
                <span className="font-bold text-emerald-400 uppercase">CERRADO Y ARCHIVADO</span>
              </div>
              <div className="flex justify-between">
                <span>Acceso Disponible:</span>
                <span className="font-bold text-blue-400 uppercase">CONSULTA BITÁCORAS PDF</span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={() => {
                  setMostrarModalConsultaCerrada(false);
                  onNavegarBitacora('BUSQUEDA');
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
              >
                Ir a Consulta de Bitácoras por Fecha y Texto
              </button>
              <button
                onClick={() => setMostrarModalConsultaCerrada(false)}
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
