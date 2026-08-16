import React, { useState } from 'react';
import { ArrowLeft, CheckSquare, Square, Sun, Moon, X } from 'lucide-react';

export default function CambioPersonalModal({ 
  isOpen = true, 
  onClose, 
  usuarioActual, 
  modoNocturno,
  setModoNocturno,
  equipoTurno = { jdt: 'Javier San Martín', osc: 'Humberto Barra Tapia', ot: 'Eric Godoy Díaz' },
  onConfirmarReemplazo,
  folio = '01'
}) {
  if (!isOpen) return null;

  const [reemplazarCheck, setReemplazarCheck] = useState(true);
  const [cargoSeleccionado, setCargoSeleccionado] = useState('Jefe de Turno');
  
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

  const safeEquipo = equipoTurno || {};

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

  const handleConfirmar = () => {
    if (onConfirmarReemplazo) {
      onConfirmarReemplazo({
        jdt: (reemplazarCheck && reemplazoJDT?.nombre) ? reemplazoJDT.nombre : (safeEquipo?.jdt || 'Javier San Martín'),
        osc: (reemplazarCheck && reemplazoOSC?.nombre) ? reemplazoOSC.nombre : (safeEquipo?.osc || 'Humberto Barra Tapia'),
        ot: (reemplazarCheck && reemplazoOT?.nombre) ? reemplazoOT.nombre : (safeEquipo?.ot || 'Eric Godoy Díaz')
      });
    }
    if (onClose) onClose();
  };

  // Nombres dinámicos para el encabezado EQUIPO DE TURNO
  const nombreJDTObservado = (reemplazarCheck && reemplazoJDT?.nombre) ? reemplazoJDT.nombre : (safeEquipo?.jdt || 'Javier San Martín');
  const nombreOSCObservado = (reemplazarCheck && reemplazoOSC?.nombre) ? reemplazoOSC.nombre : (safeEquipo?.osc || 'Humberto Barra Tapia');
  const nombreOTObservado = (reemplazarCheck && reemplazoOT?.nombre) ? reemplazoOT.nombre : (safeEquipo?.ot || 'Eric Godoy Díaz');

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

        {/* SUBHEADER CORPORATIVO INFO */}
        <div className="grid grid-cols-1 md:grid-cols-3 text-xs font-semibold bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 mb-4">
          <div className="flex items-center">
            <span className="text-slate-400">Usuario:</span>
            <span className="ml-1.5 text-slate-200 font-bold">{usuarioActual?.nombre || 'Jorge Albornoz'}</span>
          </div>
          <div className="flex items-center justify-center">
            <span className="text-slate-400">Planta:</span>
            <span className="ml-1.5 text-blue-400 font-bold">Nueva Renca</span>
          </div>
          <div className="flex items-center justify-end font-mono text-[11px]">
            <span className="text-slate-400 mr-2">Folio:</span>
            <span className="bg-slate-800 text-amber-400 px-2 py-0.5 rounded border border-slate-700 font-bold">{folio || '01'}</span>
          </div>
        </div>

        {/* SUBHEADER AZUL - BITÁCORA DIARIA & EQUIPO DE TURNO */}
        <div className="bg-[#0f2b48] text-white text-center text-xs font-bold uppercase tracking-wider rounded-xl overflow-hidden mb-6 border border-blue-900 shadow-md">
          <div className="py-2 font-extrabold text-sm tracking-wide bg-[#0b2545]">
            EQUIPO DE TURNO ACTUAL
          </div>
          <div className="grid grid-cols-4 text-[11px] font-semibold divide-x divide-blue-800 bg-[#0a2340]">
            <div className="py-2 px-1 flex items-center justify-center text-blue-300">TURNO</div>
            <div className="py-2 px-1">
              <span className="block text-blue-300 text-[10px]">JDT</span>
              <span className={reemplazarCheck && reemplazoJDT ? "text-amber-400 font-bold" : "text-white font-bold"}>
                {nombreJDTObservado}
              </span>
            </div>
            <div className="py-2 px-1">
              <span className="block text-blue-300 text-[10px]">OSC</span>
              <span className={reemplazarCheck && reemplazoOSC ? "text-amber-400 font-bold" : "text-white font-bold"}>
                {nombreOSCObservado}
              </span>
            </div>
            <div className="py-2 px-1">
              <span className="block text-blue-300 text-[10px]">OT</span>
              <span className={reemplazarCheck && reemplazoOT ? "text-amber-400 font-bold" : "text-white font-bold"}>
                {nombreOTObservado}
              </span>
            </div>
          </div>
        </div>

        {/* ÁREA PRINCIPAL DE CONTENIDO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

          {/* PANEL IZQUIERDO: Formulario y Selección */}
          <div className="space-y-4">
            
            {/* Checkbox Habilitador de Reemplazo */}
            <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setReemplazarCheck(!reemplazarCheck)}>
              {reemplazarCheck ? (
                <CheckSquare className="w-5 h-5 text-blue-500" />
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
                            ? 'bg-blue-600/20 border-blue-500 text-blue-400 font-bold shadow-sm'
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

        {/* PIE DE TARJETA CON BOTÓN CANCELAR (X / VOLVER) Y CONFIRMAR */}
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
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs py-2.5 px-6 rounded-xl shadow-lg shadow-orange-600/30 transition-all duration-200 transform hover:scale-[1.01] cursor-pointer"
          >
            Confirmar Reemplazo
          </button>
        </div>

      </div>
    </div>
  );
}
