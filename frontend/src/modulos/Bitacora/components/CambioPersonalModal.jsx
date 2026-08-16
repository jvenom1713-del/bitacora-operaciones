import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckSquare, Square, Sun, Moon, X } from 'lucide-react';

export default function CambioPersonalModal({ 
  isOpen = false, 
  onClose = () => {}, 
  onSave = () => {},
  onConfirmarReemplazo = () => {},
  usuarioActual = {}, 
  modoNocturno = false,
  setModoNocturno = () => {},
  equipoTurno = {},
  turno = {},
  personal = [],
  guardiaActual = {},
  folio = '01'
}) {
  if (!isOpen) return null;

  // Botón y checkbox deshabilitados por defecto hasta que se active o seleccione un reemplazo válido
  const [reemplazarCheck, setReemplazarCheck] = useState(false);
  const [cargoSeleccionado, setCargoSeleccionado] = useState('Jefe de Turno');
  
  const safeEquipo = equipoTurno ?? turno ?? {};
  const safePersonal = Array.isArray(personal) ? personal : [];

  // Estado local para Tipo de Turno (Diurno / Nocturno)
  const [tipoTurno, setTipoTurno] = useState(() => {
    const t = safeEquipo?.tipo_turno ?? safeEquipo?.turno ?? localStorage.getItem('tipo_turno_activo') ?? 'DIURNO';
    return String(t).toUpperCase() === 'NOCTURNO' ? 'Nocturno' : 'Diurno';
  });

  useEffect(() => {
    if (isOpen) {
      const t = safeEquipo?.tipo_turno ?? safeEquipo?.turno ?? localStorage.getItem('tipo_turno_activo') ?? 'DIURNO';
      setTipoTurno(String(t).toUpperCase() === 'NOCTURNO' ? 'Nocturno' : 'Diurno');
    }
  }, [isOpen, safeEquipo]);

  // Reemplazos seleccionados por cargo
  const [reemplazoJDT, setReemplazoJDT] = useState(null);
  const [reemplazoOSC, setReemplazoOSC] = useState(null);
  const [reemplazoOT, setReemplazoOT] = useState(null);

  const [guardiaContingenciaSel, setGuardiaContingenciaSel] = useState('');
  const [tipoMotivo, setTipoMotivo] = useState('Licencia médica');

  // Personal de Turno Regular
  const candidatosPorCargo = {
    'Jefe de Turno': [
      { nombre: 'Javier San Martín', email: 'jsanmartin@generadora.cl' },
      { nombre: 'Pablo Flores Vásquez', email: 'pflores@generadora.cl' },
      { nombre: 'Ariel Torres', email: 'atorres@generadora.cl' },
      { nombre: 'Norman Galaz', email: 'ngalaz@generadora.cl' },
      { nombre: 'Cristian Valdivia Maldonado', email: 'cvaldivia@generadora.cl' }
    ],
    'Operador Sala Control': [
      { nombre: 'Humberto Barra Tapia', email: 'hbarra@generadora.cl' },
      { nombre: 'Jorge Albornoz', email: 'jalbornoz@generadora.cl' },
      { nombre: 'Luis Morales', email: 'lmorales@generadora.cl' },
      { nombre: 'Eduardo Armijo Retamal', email: 'earmijo@generadora.cl' },
      { nombre: 'Arístides Toledo Peña', email: 'atoledo@generadora.cl' }
    ],
    'Operador Terreno': [
      { nombre: 'Eric Godoy Díaz', email: 'egodoy@generadora.cl' },
      { nombre: 'Gerson Cofré', email: 'gcofre@generadora.cl' },
      { nombre: 'Matías Cisternas', email: 'mcisternas@generadora.cl' },
      { nombre: 'Carlos Vivero', email: 'cvivero@generadora.cl' },
      { nombre: 'Claudio Garrido San Martín', email: 'cgarrido@generadora.cl' }
    ]
  };

  // Personal de Guardia de Contingencia
  const personalContingencia = [
    { nombre: 'Rodrigo Troncoso', email: 'rtroncoso@generadora.cl', cargoHabitual: 'Jefe de Turno' },
    { nombre: 'Máximo Cortés', email: 'mcortes@generadora.cl', cargoHabitual: 'Operador Sala Control' },
    { nombre: 'Enzo Cornejo', email: 'ecornejo@generadora.cl', cargoHabitual: 'Operador Terreno' }
  ];

  // Lista dinámica de integrantes del equipo de turno actual
  const integrantesActuales = [
    { 
      rolKey: 'jdt', 
      cargo: 'Jefe de Turno', 
      etiqueta: 'JDT (Jefe de Turno)', 
      nombre: safeEquipo?.jdt, 
      esReemplazado: reemplazarCheck && Boolean(reemplazoJDT), 
      nuevoNombre: reemplazoJDT?.nombre 
    },
    { 
      rolKey: 'osc', 
      cargo: 'Operador Sala Control', 
      etiqueta: 'OSC (Operador Sala)', 
      nombre: safeEquipo?.osc, 
      esReemplazado: reemplazarCheck && Boolean(reemplazoOSC), 
      nuevoNombre: reemplazoOSC?.nombre 
    },
    { 
      rolKey: 'ot', 
      cargo: 'Operador Terreno', 
      etiqueta: 'OT (Operador Terreno)', 
      nombre: safeEquipo?.ot, 
      esReemplazado: reemplazarCheck && Boolean(reemplazoOT), 
      nuevoNombre: reemplazoOT?.nombre 
    }
  ];

  const hayEquipoAsignado = Boolean(safeEquipo?.jdt || safeEquipo?.osc || safeEquipo?.ot);

  // Personas actualmente asignadas al equipo de turno
  const nombresEnEquipo = new Set([
    safeEquipo?.jdt,
    safeEquipo?.osc,
    safeEquipo?.ot,
    reemplazarCheck && reemplazoJDT?.nombre,
    reemplazarCheck && reemplazoOSC?.nombre,
    reemplazarCheck && reemplazoOT?.nombre,
  ].filter(Boolean));

  // Para el cargo en edición actual, permitir mantener el candidato ya seleccionado si aplica
  const esCandidatoActivoDelCargo = (nombre) => {
    if (!nombre) return false;
    if (cargoSeleccionado === 'Jefe de Turno') return reemplazoJDT?.nombre === nombre;
    if (cargoSeleccionado === 'Operador Sala Control') return reemplazoOSC?.nombre === nombre;
    if (cargoSeleccionado === 'Operador Terreno') return reemplazoOT?.nombre === nombre;
    return false;
  };

  const listaCandidatos = (candidatosPorCargo && cargoSeleccionado && candidatosPorCargo[cargoSeleccionado]) || [];

  // Filtrar candidatos para mostrar únicamente los RESTANTES
  const candidatosFiltrados = (listaCandidatos || []).filter(cand => 
    cand?.nombre && (esCandidatoActivoDelCargo(cand.nombre) || !nombresEnEquipo.has(cand.nombre))
  );

  // Filtrar personal de contingencia para mostrar únicamente los RESTANTES
  const contingenciaFiltrada = (personalContingencia || []).filter(p => 
    p?.nombre && (esCandidatoActivoDelCargo(p.nombre) || !nombresEnEquipo.has(p.nombre))
  );

  const getCandidatoActual = () => {
    if (cargoSeleccionado === 'Jefe de Turno') return reemplazoJDT;
    if (cargoSeleccionado === 'Operador Sala Control') return reemplazoOSC;
    return reemplazoOT;
  };

  const candidatoActivo = getCandidatoActual();

  const handleSeleccionarCandidato = (cand) => {
    if (!cand) return;
    if (!reemplazarCheck) setReemplazarCheck(true);
    const item = { nombre: cand.nombre, email: cand.email };
    if (cargoSeleccionado === 'Jefe de Turno') setReemplazoJDT(item);
    else if (cargoSeleccionado === 'Operador Sala Control') setReemplazoOSC(item);
    else setReemplazoOT(item);
  };

  const handleSeleccionarContingencia = (e) => {
    const nombreSel = e?.target?.value;
    setGuardiaContingenciaSel(nombreSel || '');
    if (!nombreSel) return;
    if (!reemplazarCheck) setReemplazarCheck(true);

    const p = (personalContingencia || []).find(x => x?.nombre === nombreSel);
    if (p) {
      const item = { nombre: p.nombre, email: p.email };
      if (cargoSeleccionado === 'Jefe de Turno') setReemplazoJDT(item);
      else if (cargoSeleccionado === 'Operador Sala Control') setReemplazoOSC(item);
      else setReemplazoOT(item);
    }
  };

  // Validación para habilitar el botón "Reemplazar personal de turno"
  const esValidoParaConfirmar = reemplazarCheck && (Boolean(reemplazoJDT) || Boolean(reemplazoOSC) || Boolean(reemplazoOT)) && Boolean(tipoMotivo && tipoMotivo.trim() !== '');

  const handleConfirmar = () => {
    if (!esValidoParaConfirmar) return;
    const tipoNorm = tipoTurno.toUpperCase();
    try {
      localStorage.setItem('tipo_turno_activo', tipoNorm);
      window.dispatchEvent(new Event('turno_actualizado'));
    } catch (_) {}

    const payload = {
      ...safeEquipo,
      tipo_turno: tipoNorm,
      turno: tipoNorm,
      jdt: (reemplazarCheck && reemplazoJDT?.nombre) ? reemplazoJDT.nombre : (safeEquipo?.jdt || ''),
      osc: (reemplazarCheck && reemplazoOSC?.nombre) ? reemplazoOSC.nombre : (safeEquipo?.osc || ''),
      ot: (reemplazarCheck && reemplazoOT?.nombre) ? reemplazoOT.nombre : (safeEquipo?.ot || ''),
      motivoJDT: reemplazoJDT ? tipoMotivo : safeEquipo?.motivoJDT,
      motivoOSC: reemplazoOSC ? tipoMotivo : safeEquipo?.motivoOSC,
      motivoOT: reemplazoOT ? tipoMotivo : safeEquipo?.motivoOT,
    };

    if (typeof onSave === 'function') {
      try { onSave(payload); } catch (e) { console.error("Error en onSave:", e); }
    }
    if (typeof onConfirmarReemplazo === 'function') {
      try { onConfirmarReemplazo(payload); } catch (e) { console.error("Error en onConfirmarReemplazo:", e); }
    }
    // Limpieza de formulario
    setReemplazoJDT(null);
    setReemplazoOSC(null);
    setReemplazoOT(null);
    setReemplazarCheck(false);
    setGuardiaContingenciaSel('');
    if (typeof onClose === 'function') onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      
      {/* Tarjeta central del modal */}
      <div className={`bg-slate-900 border border-slate-700 text-white rounded-2xl p-6 max-w-4xl w-full shadow-2xl relative z-10 overflow-hidden my-auto transition-all duration-300 ${
        modoNocturno ? 'bg-slate-900/95 border-slate-800' : 'bg-slate-900 border-slate-700'
      }`}>

        {/* HEADER CORPORATIVO SUPERIOR CON BOTÓN DE CIERRE (X) Y MODO NOCTURNO */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="font-black text-xl text-orange-500 tracking-tight">
              <span className="text-white">G</span>METROPOLITANA
            </span>
            <span className="text-xs text-slate-400 font-semibold border-l border-slate-700 pl-3">
              Cambio de Personal de Turno
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setModoNocturno && setModoNocturno(!modoNocturno)}
              title={modoNocturno ? "Cambiar a Modo Diurno" : "Cambiar a Modo Nocturno"}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-amber-400 hover:bg-slate-700 transition-colors"
            >
              {modoNocturno ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-slate-300" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SUBHEADER CORPORATIVO INFO CON TOGGLE DE TIPO DE TURNO */}
        <div className="grid grid-cols-1 md:grid-cols-3 text-xs font-semibold bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 mb-4 gap-2 items-center">
          <div className="flex items-center">
            <span className="text-slate-400">Usuario:</span>
            <span className="ml-1.5 text-slate-200 font-bold">{usuarioActual?.nombre || 'Jorge Albornoz'}</span>
          </div>

          {/* Selector Explícito Diurno / Nocturno */}
          <div className="flex items-center justify-center">
            <div className="flex gap-1.5 p-1 bg-slate-900 rounded-lg border border-slate-700 w-full max-w-[240px]">
              <button
                type="button"
                onClick={() => setTipoTurno('Diurno')}
                className={`flex-1 py-1 px-2.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  tipoTurno === 'Diurno'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Diurno</span>
              </button>

              <button
                type="button"
                onClick={() => setTipoTurno('Nocturno')}
                className={`flex-1 py-1 px-2.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  tipoTurno === 'Nocturno'
                    ? 'bg-indigo-600 text-white shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                <span>Nocturno</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end font-mono text-[11px]">
            <span className="text-slate-400 mr-2">Guardia:</span>
            <span className="text-amber-400 font-bold uppercase mr-3">{safeEquipo?.rotacion || 'Guardia Activa'}</span>
            <span className="text-slate-400 mr-1.5">Folio:</span>
            <span className="bg-slate-800 text-amber-400 px-2 py-0.5 rounded border border-slate-700 font-bold">{folio || '01'}</span>
          </div>
        </div>

        {/* SUBHEADER AZUL - EQUIPO DE TURNO ACTUAL DINÁMICO */}
        <div className="bg-[#0f2b48] text-white text-center text-xs font-bold uppercase tracking-wider rounded-xl overflow-hidden mb-6 border border-blue-900 shadow-md">
          <div className="py-2 font-extrabold text-sm tracking-wide bg-[#0b2545]">
            EQUIPO DE TURNO ACTUAL
          </div>
          {!hayEquipoAsignado ? (
            <div className="p-3 text-center text-xs text-slate-300 italic font-medium bg-[#0a2340]">
              Sin personal asignado al turno
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 text-[11px] font-semibold divide-y sm:divide-y-0 sm:divide-x divide-blue-800 bg-[#0a2340]">
              {integrantesActuales.map((miembro) => (
                <div key={miembro.rolKey} className="py-2.5 px-2 text-center">
                  <span className="block text-blue-300 text-[10px] font-extrabold tracking-wide uppercase">{miembro.etiqueta}</span>
                  {miembro.nombre ? (
                    <span className={miembro.esReemplazado ? "text-amber-400 font-bold block" : "text-white font-bold block"}>
                      {miembro.esReemplazado ? `${miembro.nuevoNombre} (Reemplazo)` : miembro.nombre}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic block text-[10px]">Sin personal asignado</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ÁREA PRINCIPAL DE CONTENIDO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

          {/* PANEL IZQUIERDO: Formulario y Selección */}
          <div className="space-y-4">
            
            {/* Checkbox Habilitador de Reemplazo */}
            <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setReemplazarCheck(!reemplazarCheck)}>
              {reemplazarCheck ? (
                <CheckSquare className="w-5 h-5 text-amber-500" />
              ) : (
                <Square className="w-5 h-5 text-slate-500" />
              )}
              <span className="text-sm font-bold text-slate-200">Reemplazar personal de Turno</span>
            </div>

            {/* Select Dropdown Cargo */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Seleccionar Cargo a Reemplazar</label>
              <select
                disabled={!reemplazarCheck}
                value={cargoSeleccionado}
                onChange={(e) => setCargoSeleccionado(e.target.value)}
                className={`w-full text-xs font-bold py-2.5 px-3 rounded-lg border transition-colors ${
                  !reemplazarCheck
                    ? 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-500 border-slate-700'
                    : 'bg-[#0f2b48] border-blue-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
                }`}
              >
                <option value="Jefe de Turno">Jefe de Turno</option>
                <option value="Operador Sala Control">Operador Sala Control</option>
                <option value="Operador Terreno">Operador de Terreno</option>
              </select>
            </div>

            {/* Lista Interactiva de Personal de Turno Regular */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Personal de Turno Disponible ({cargoSeleccionado})</label>
              <div className={`rounded-xl border p-2 space-y-1.5 text-xs max-h-44 overflow-y-auto ${
                !reemplazarCheck
                  ? 'opacity-50 pointer-events-none bg-slate-800/40 border-slate-700'
                  : 'bg-slate-800/80 border-slate-700'
              }`}>
                {(candidatosFiltrados || []).length === 0 ? (
                  <div className="p-3 text-center opacity-60 italic text-[11px] text-slate-400">
                    No hay otros candidatos disponibles para este cargo (personas ya asignadas al turno).
                  </div>
                ) : (
                  (candidatosFiltrados || []).map((c) => {
                    const esSel = candidatoActivo && c?.nombre === candidatoActivo?.nombre;
                    return (
                      <div
                        key={c?.email || c?.nombre}
                        onClick={() => handleSeleccionarCandidato(c)}
                        className={`p-2 rounded-lg cursor-pointer transition-all border font-medium flex items-center justify-between ${
                          esSel
                            ? 'bg-amber-600/20 border-amber-500 text-amber-300 font-bold shadow-sm'
                            : 'border-slate-700/60 hover:bg-slate-700/50 text-slate-300'
                        }`}
                      >
                        <span>{c?.nombre}</span>
                        <span className="text-[10px] opacity-75 font-mono">{c?.email}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Recuadro de Guardia de Contingencia */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Guardia Contingencia</label>
              <select
                disabled={!reemplazarCheck}
                value={guardiaContingenciaSel}
                onChange={handleSeleccionarContingencia}
                className={`w-full text-xs font-bold py-2.5 px-3 rounded-lg border transition-colors ${
                  !reemplazarCheck
                    ? 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-500 border-slate-700'
                    : 'bg-[#0f2b48] border-blue-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
                }`}
              >
                <option value="">-- Seleccionar de Contingencia --</option>
                {(contingenciaFiltrada || []).map((p) => (
                  <option key={p?.email || p?.nombre} value={p?.nombre}>
                    {p?.nombre} ({p?.cargoHabitual})
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* PANEL DERECHO: Motivo y Consolidación */}
          <div className="space-y-4">
            
            {/* Campo Motivo de Reemplazo */}
            <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/80 space-y-2">
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Motivo de reemplazo
              </label>

              <select
                disabled={!reemplazarCheck}
                value={tipoMotivo}
                onChange={(e) => setTipoMotivo(e.target.value)}
                className={`w-full text-xs font-semibold p-2.5 rounded-lg border transition-all ${
                  !reemplazarCheck
                    ? 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-500 border-slate-700'
                    : 'bg-slate-900 border-slate-700 text-white focus:outline-none focus:border-blue-500'
                }`}
              >
                <option value="Licencia médica">Licencia médica</option>
                <option value="Día compensado">Día compensado</option>
                <option value="Día administrativo">Día administrativo</option>
                <option value="Vacaciones">Vacaciones</option>
                <option value="Emergencia climática">Emergencia climática</option>
                <option value="Otros">Otros</option>
              </select>
            </div>

            {/* Resumen de Reemplazos Confirmados */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/60 overflow-hidden text-xs divide-y divide-slate-700">
              {/* Fila Jefe de Turno */}
              <div className="p-3 space-y-1">
                <div className="flex justify-between font-bold">
                  <span className="text-slate-300">Reemplazo Jefe de Turno</span>
                  <span className="text-amber-400 font-bold">
                    {(reemplazarCheck && reemplazoJDT?.nombre) ? reemplazoJDT.nombre : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Correo Electrónico</span>
                  <span>{(reemplazarCheck && reemplazoJDT?.email) ? reemplazoJDT.email : '—'}</span>
                </div>
              </div>

              {/* Fila Operador Sala */}
              <div className="p-3 space-y-1">
                <div className="flex justify-between font-bold">
                  <span className="text-slate-300">Reemplazo Operador Sala</span>
                  <span className="text-amber-400 font-bold">
                    {(reemplazarCheck && reemplazoOSC?.nombre) ? reemplazoOSC.nombre : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Correo Electrónico</span>
                  <span>{(reemplazarCheck && reemplazoOSC?.email) ? reemplazoOSC.email : '—'}</span>
                </div>
              </div>

              {/* Fila Operador Terreno */}
              <div className="p-3 space-y-1">
                <div className="flex justify-between font-bold">
                  <span className="text-slate-300">Reemplazo Operador Terreno</span>
                  <span className="text-amber-400 font-bold">
                    {(reemplazarCheck && reemplazoOT?.nombre) ? reemplazoOT.nombre : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Correo Electrónico</span>
                  <span>{(reemplazarCheck && reemplazoOT?.email) ? reemplazoOT.email : '—'}</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* PIE DE TARJETA CON BOTÓN CANCELAR (X / VOLVER) Y CONFIRMAR REEMPLAZO DESHABILITADO HASTA VALIDACIÓN */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cancelar</span>
          </button>

          <button
            type="button"
            onClick={handleConfirmar}
            disabled={!esValidoParaConfirmar}
            className={`font-bold text-xs py-2.5 px-6 rounded-xl transition-all duration-200 ${
              esValidoParaConfirmar
                ? 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer shadow-lg shadow-amber-600/20 transform hover:scale-[1.01]'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-50 shadow-none'
            }`}
          >
            Reemplazar personal de turno
          </button>
        </div>

      </div>
    </div>
  );
}

