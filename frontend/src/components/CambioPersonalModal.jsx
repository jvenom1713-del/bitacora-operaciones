import React, { useState } from 'react';
import { ArrowLeft, CheckSquare, Square, Sun, Moon } from 'lucide-react';

export default function CambioPersonalModal({ 
  isOpen = true, 
  onClose, 
  usuarioActual, 
  modoNocturno,
  setModoNocturno,
  equipoTurno = { jdt: 'Javier San Martín', osc: 'Humberto Barra Tapia', ot: 'Eric Godoy Díaz' },
  onConfirmarReemplazo
}) {
  if (!isOpen) return null;

  const [reemplazarCheck, setReemplazarCheck] = useState(true);
  const [cargoSeleccionado, setCargoSeleccionado] = useState('Jefe de Turno');
  
  // Reemplazos seleccionados por cargo (INICIALMENTE VACÍOS / NULL)
  const [reemplazoJDT, setReemplazoJDT] = useState(null);
  const [reemplazoOSC, setReemplazoOSC] = useState(null);
  const [reemplazoOT, setReemplazoOT] = useState(null);

  const [guardiaContingenciaSel, setGuardiaContingenciaSel] = useState('');
  const [tipoMotivo, setTipoMotivo] = useState('Licencia médica');

  // Personal de Turno Regular (SOLO personal de turno)
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

  // Personal de Guardia de Contingencia (ÚNICAMENTE los 3 nombres mencionados)
  const personalContingencia = [
    { nombre: 'Rodrigo Troncoso', email: 'rtroncoso@generadora.cl', cargoHabitual: 'Jefe de Turno' },
    { nombre: 'Máximo Cortés', email: 'mcortes@generadora.cl', cargoHabitual: 'Operador Sala Control' },
    { nombre: 'Enzo Cornejo', email: 'ecornejo@generadora.cl', cargoHabitual: 'Operador Terreno' }
  ];

  // Personas actualmente asignadas al equipo de turno (originales o reemplazos seleccionados)
  const nombresEnEquipo = new Set([
    equipoTurno?.jdt,
    equipoTurno?.osc,
    equipoTurno?.ot,
    reemplazarCheck && reemplazoJDT?.nombre,
    reemplazarCheck && reemplazoOSC?.nombre,
    reemplazarCheck && reemplazoOT?.nombre,
  ].filter(Boolean));

  // Para el cargo en edición actual, permitir mantener el candidato ya seleccionado si aplica
  const esCandidatoActivoDelCargo = (nombre) => {
    if (cargoSeleccionado === 'Jefe de Turno') return reemplazoJDT?.nombre === nombre;
    if (cargoSeleccionado === 'Operador Sala Control') return reemplazoOSC?.nombre === nombre;
    if (cargoSeleccionado === 'Operador Terreno') return reemplazoOT?.nombre === nombre;
    return false;
  };

  const listaCandidatos = candidatosPorCargo[cargoSeleccionado] || [];

  // Filtrar candidatos para mostrar únicamente los RESTANTES (no asignados en el equipo actual)
  const candidatosFiltrados = listaCandidatos.filter(cand => 
    esCandidatoActivoDelCargo(cand.nombre) || !nombresEnEquipo.has(cand.nombre)
  );

  // Filtrar personal de contingencia para mostrar únicamente los RESTANTES
  const contingenciaFiltrada = personalContingencia.filter(p => 
    esCandidatoActivoDelCargo(p.nombre) || !nombresEnEquipo.has(p.nombre)
  );

  const getCandidatoActual = () => {
    if (cargoSeleccionado === 'Jefe de Turno') return reemplazoJDT;
    if (cargoSeleccionado === 'Operador Sala Control') return reemplazoOSC;
    return reemplazoOT;
  };

  const candidatoActivo = getCandidatoActual();

  const handleSeleccionarCandidato = (cand) => {
    if (!reemplazarCheck) setReemplazarCheck(true);
    const item = { nombre: cand.nombre, email: cand.email };
    if (cargoSeleccionado === 'Jefe de Turno') setReemplazoJDT(item);
    else if (cargoSeleccionado === 'Operador Sala Control') setReemplazoOSC(item);
    else setReemplazoOT(item);
  };

  const handleSeleccionarContingencia = (e) => {
    const nombreSel = e.target.value;
    setGuardiaContingenciaSel(nombreSel);
    if (!nombreSel) return;
    if (!reemplazarCheck) setReemplazarCheck(true);

    const p = personalContingencia.find(x => x.nombre === nombreSel);
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
        jdt: (reemplazarCheck && reemplazoJDT) ? reemplazoJDT.nombre : equipoTurno.jdt,
        osc: (reemplazarCheck && reemplazoOSC) ? reemplazoOSC.nombre : equipoTurno.osc,
        ot: (reemplazarCheck && reemplazoOT) ? reemplazoOT.nombre : equipoTurno.ot
      });
    }
    if (onClose) onClose();
  };

  // Nombres dinámicos para el encabezado EQUIPO DE TURNO
  const nombreJDTObservado = (reemplazarCheck && reemplazoJDT) ? reemplazoJDT.nombre : equipoTurno.jdt;
  const nombreOSCObservado = (reemplazarCheck && reemplazoOSC) ? reemplazoOSC.nombre : equipoTurno.osc;
  const nombreOTObservado = (reemplazarCheck && reemplazoOT) ? reemplazoOT.nombre : equipoTurno.ot;

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
          onClick={() => setModoNocturno && setModoNocturno(!modoNocturno)}
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

      {/* 3. Tarjeta Principal de Cambio de Personal (Pantalla Individual) */}
      <div className={`relative z-10 w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl border transition-all duration-300 ${
        modoNocturno 
          ? 'bg-slate-900/95 border-slate-800 shadow-black/70' 
          : 'bg-white/95 border-slate-200 shadow-2xl'
      }`}>

        {/* HEADER CORPORATIVO SUPERIOR */}
        <div className={`grid grid-cols-1 md:grid-cols-4 text-xs font-semibold border-b ${
          modoNocturno ? 'border-slate-700 bg-slate-900' : 'border-slate-300 bg-slate-50'
        }`}>
          <div className="p-3 border-r border-b md:border-b-0 flex items-center gap-2">
            <span className="font-black text-xl text-orange-500 tracking-tight"><span className="text-white">G</span>METROPOLITANA</span>
          </div>
          <div className="p-3 border-r border-b md:border-b-0 flex items-center">
            <span>Usuario: {usuarioActual?.nombre || 'Jorge Albornoz'}</span>
          </div>
          <div className="p-3 border-r border-b md:border-b-0 flex items-center justify-center">
            <span>Nueva Renca</span>
          </div>
          <div className="p-3 flex items-center justify-between font-mono text-[11px]">
            <span>Fecha: 29/07/2026</span>
            <span className="bg-slate-800 text-white px-2 py-0.5 rounded border border-slate-700 font-bold">{folio || '01'}</span>
          </div>
        </div>

        {/* SUBHEADER AZUL - BITÁCORA DIARIA & EQUIPO DE TURNO (SE REFLEJA AL ELEGIR UN REEMPLAZO) */}
        <div className="bg-[#0f2b48] text-white text-center text-xs font-bold uppercase tracking-wider divide-y divide-blue-800">
          <div className="py-2 font-extrabold text-sm tracking-wide bg-[#0b2545]">
            BITÁCORA DIARIA
          </div>
          <div className="py-1.5 bg-[#0e3057]">
            EQUIPO DE TURNO
          </div>
          <div className="grid grid-cols-4 text-[11px] font-semibold divide-x divide-blue-800 bg-[#0a2340]">
            <div className="py-2 px-1">TURNO</div>
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
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* PANEL IZQUIERDO: Formulario y Selección */}
          <div className="space-y-4">
            
            {/* Checkbox Habilitador de Reemplazo */}
            <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setReemplazarCheck(!reemplazarCheck)}>
              {reemplazarCheck ? (
                <CheckSquare className="w-5 h-5 text-blue-600" />
              ) : (
                <Square className="w-5 h-5 text-slate-400" />
              )}
              <span className="text-sm font-bold">Reemplazar personal de Turno</span>
            </div>

            {/* Select Dropdown Cargo */}
            <div>
              <label className="block text-xs font-bold mb-1">Seleccionar Cargo a Reemplazar</label>
              <select
                disabled={!reemplazarCheck}
                value={cargoSeleccionado}
                onChange={(e) => setCargoSeleccionado(e.target.value)}
                className={`w-full text-xs font-bold py-2.5 px-3 rounded-lg border transition-colors ${
                  !reemplazarCheck
                    ? 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-500 border-slate-700'
                    : modoNocturno
                      ? 'bg-[#0f2b48] border-blue-600 text-white'
                      : 'bg-[#1e40af] border-blue-700 text-white'
                }`}
              >
                <option value="Jefe de Turno">Jefe de Turno</option>
                <option value="Operador Sala Control">Operador Sala Control</option>
                <option value="Operador Terreno">Operador de Terreno</option>
              </select>
            </div>

            {/* Lista Interactiva de Personal de Turno Regular */}
            <div>
              <label className="block text-xs font-bold mb-1">Personal de Turno Disponible ({cargoSeleccionado})</label>
              <div className={`rounded-xl border p-2 space-y-1.5 text-xs max-h-44 overflow-y-auto ${
                !reemplazarCheck
                  ? 'opacity-50 pointer-events-none bg-slate-800/40 border-slate-700'
                  : modoNocturno ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-300'
              }`}>
                {candidatosFiltrados.length === 0 ? (
                  <div className="p-3 text-center opacity-60 italic text-[11px]">
                    No hay otros candidatos disponibles para este cargo (personas ya asignadas al turno).
                  </div>
                ) : (
                  candidatosFiltrados.map((c) => {
                    const esSel = candidatoActivo && c.nombre === candidatoActivo.nombre;
                    return (
                      <div
                        key={c.email}
                        onClick={() => handleSeleccionarCandidato(c)}
                        className={`p-2 rounded-lg cursor-pointer transition-all border font-medium flex items-center justify-between ${
                          esSel
                            ? 'bg-blue-600/20 border-blue-500 text-blue-400 font-bold shadow-sm'
                            : modoNocturno
                              ? 'border-slate-700/60 hover:bg-slate-700/50 text-slate-300'
                              : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span>{c.nombre}</span>
                        <span className="text-[10px] opacity-75 font-mono">{c.email}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Recuadro de Guardia de Contingencia (RECUADRO INDEPENDIENTE) */}
            <div>
              <label className="block text-xs font-bold mb-1">Guardia Contingencia</label>
              <select
                disabled={!reemplazarCheck}
                value={guardiaContingenciaSel}
                onChange={handleSeleccionarContingencia}
                className={`w-full text-xs font-bold py-2.5 px-3 rounded-lg border transition-colors ${
                  !reemplazarCheck
                    ? 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-500 border-slate-700'
                    : modoNocturno
                      ? 'bg-[#0f2b48] border-blue-600 text-white'
                      : 'bg-[#1e40af] border-blue-700 text-white'
                }`}
              >
                <option value="">-- Seleccionar de Contingencia --</option>
                {contingenciaFiltrada.map((p) => (
                  <option key={p.email} value={p.nombre}>
                    {p.nombre} ({p.cargoHabitual})
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* PANEL DERECHO: Motivo Desplegable y Consolidación (INICIALMENTE VACÍO) */}
          <div className="space-y-4">
            
            {/* Campo Motivo de Reemplazo */}
            <div className={`p-4 rounded-xl border space-y-2 ${
              modoNocturno ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-300'
            }`}>
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
                    : modoNocturno
                      ? 'bg-slate-900 border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
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

            {/* Resumen de Reemplazos Confirmados (INICIALMENTE VACÍO CON "—") */}
            <div className={`rounded-xl border overflow-hidden text-xs divide-y ${
              modoNocturno ? 'bg-slate-800/60 border-slate-700 divide-slate-700' : 'bg-white border-slate-300 divide-slate-200'
            }`}>
              {/* Fila Jefe de Turno */}
              <div className="p-2.5 space-y-1">
                <div className="flex justify-between font-bold">
                  <span className="text-slate-300">Reemplazo de Jefe de Turno</span>
                  <span className="text-blue-400 font-bold">
                    {(reemplazarCheck && reemplazoJDT) ? reemplazoJDT.nombre : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Correo Electrónico</span>
                  <span>{(reemplazarCheck && reemplazoJDT) ? reemplazoJDT.email : '—'}</span>
                </div>
              </div>

              {/* Fila Operador Sala */}
              <div className="p-2.5 space-y-1">
                <div className="flex justify-between font-bold">
                  <span className="text-slate-300">Reemplazo Operador Sala</span>
                  <span className="text-blue-400 font-bold">
                    {(reemplazarCheck && reemplazoOSC) ? reemplazoOSC.nombre : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Correo Electrónico</span>
                  <span>{(reemplazarCheck && reemplazoOSC) ? reemplazoOSC.email : '—'}</span>
                </div>
              </div>

              {/* Fila Operador Terreno */}
              <div className="p-2.5 space-y-1">
                <div className="flex justify-between font-bold">
                  <span className="text-slate-300">Reemplazo Operador Terreno:</span>
                  <span className="text-blue-400 font-bold">
                    {(reemplazarCheck && reemplazoOT) ? reemplazoOT.nombre : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Correo Electrónico</span>
                  <span>{(reemplazarCheck && reemplazoOT) ? reemplazoOT.email : '—'}</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* PIE DE TARJETA CON BOTÓN ATRÁS Y CONFIRMAR */}
        <div className={`p-4 border-t flex items-center justify-between ${
          modoNocturno ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-slate-50'
        }`}>
          <button
            onClick={onClose}
            title="Volver a Apertura de Turno"
            className="flex items-center gap-2 p-2.5 rounded-xl border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 transition-colors text-xs font-bold"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
          </button>

          <button
            onClick={handleConfirmar}
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs py-2.5 px-6 rounded-xl shadow-lg shadow-orange-600/30 transition-all duration-200 transform hover:scale-[1.01]"
          >
            Confirmar Reemplazo
          </button>
        </div>

      </div>
    </div>
  );
}
