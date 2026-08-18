import React, { useMemo, useEffect } from 'react';
import { Zap, Activity, Clock, ShieldCheck, Database, RefreshCw, BarChart2 } from 'lucide-react';
import { fetchGeneracionCoordinador, getFechaObjetivoCoordinador } from '../../../shared/services/coordinadorService';

export default function GeneracionDiaria({
  fecha = getFechaObjetivoCoordinador(),
  registros = [],
  onActualizarRegistros = () => {},
  parametros = {},
  onActualizarParametros = () => {},
  modoNocturno = false
}) {
  // Suscripción al evento FORZAR_CARGA_CELDAS_CEN emitido por el botón azul lateral
  useEffect(() => {
    const actualizarCeldas = async () => {
      console.log("Celdas enteradas: Buscando datos del día objetivo...");
      try {
        const nuevosDatos = await fetchGeneracionCoordinador(
          fecha || getFechaObjetivoCoordinador(),
          'NUEVARENCA_TG1+TV1_GN_A'
        );
        if (Array.isArray(nuevosDatos) && nuevosDatos.length === 24) {
          if (typeof onActualizarRegistros === 'function') {
            onActualizarRegistros(nuevosDatos);
          }
        }
      } catch (error) {
        console.error("Fallo al inyectar datos en celdas:", error);
      }
    };

    window.addEventListener('FORZAR_CARGA_CELDAS_CEN', actualizarCeldas);
    window.addEventListener('registros_actualizados', actualizarCeldas);

    return () => {
      window.removeEventListener('FORZAR_CARGA_CELDAS_CEN', actualizarCeldas);
      window.removeEventListener('registros_actualizados', actualizarCeldas);
    };
  }, [fecha, onActualizarRegistros]);

  // Asegurar que existan siempre 24 registros para la matriz horaria
  const safeRegistros = useMemo(() => {
    if (Array.isArray(registros) && registros.length === 24) {
      return registros;
    }
    const base = Array.isArray(registros) ? registros : [];
    return Array.from({ length: 24 }, (_, i) => {
      const h = i + 1;
      const exist = base.find(r => Number(r.hora) === h) || {};
      const pot = parseFloat(exist.potencia_mw ?? exist.mw ?? 0) || 0;
      const genBruta = parseFloat(exist.generacion_mwh ?? exist.mwh ?? pot) || 0;
      const ssaa = parseFloat(exist.ssaa_mwh ?? 0) || 0;
      const genNeta = parseFloat(exist.generacion_neta ?? (genBruta - ssaa)) || 0;

      return {
        hora: h,
        potencia_mw: pot,
        generacion_mwh: genBruta,
        ssaa_mwh: ssaa,
        generacion_neta: genNeta
      };
    });
  }, [registros]);

  // Recálculo reactivo dinámico mediante useMemo
  const resumenCalculado = useMemo(() => {
    let mwhBrutos = 0;
    let mwhNetos = 0;
    let horasOperativas = 0;
    let sumaPotencia = 0;
    let hrsCB = 0;
    let hrsMT = 0;

    safeRegistros.forEach(r => {
      const pot = parseFloat(r.potencia_mw || 0);
      const gen = parseFloat(r.generacion_mwh || pot || 0);
      const neta = parseFloat(r.generacion_neta || gen || 0);

      mwhBrutos += gen;
      mwhNetos += neta;

      if (pot > 0) {
        horasOperativas++;
        sumaPotencia += pot;
      }

      if (pot >= 330) {
        hrsCB++;
      } else if (pot > 0 && pot < 330) {
        hrsMT++;
      }
    });

    const promMW = horasOperativas > 0 ? (sumaPotencia / horasOperativas).toFixed(1) : '0.0';

    return {
      totalMwhBruta: mwhBrutos.toFixed(1),
      totalMwhNeta: mwhNetos.toFixed(1),
      promedioPotenciaMW: promMW,
      horasOperativas,
      hrsCargaBase: hrsCB,
      hrsMinTec: hrsMT
    };
  }, [safeRegistros]);

  const handleChangeRegistro = (horaIdx, campo, valor) => {
    const numVal = parseFloat(valor) || 0;
    const copia = safeRegistros.map((reg, idx) => {
      if (idx === horaIdx) {
        const act = { ...reg, [campo]: numVal };
        if (campo === 'generacion_mwh' || campo === 'ssaa_mwh') {
          act.generacion_neta = Math.max(0, (act.generacion_mwh || 0) - (act.ssaa_mwh || 0));
        }
        return act;
      }
      return reg;
    });

    onActualizarRegistros(copia);
  };

  return (
    <div className={`space-y-6 rounded-2xl p-4 sm:p-6 transition-colors shadow-xl border ${
      modoNocturno ? 'bg-[#061527] border-blue-900/80 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
    }`}>
      {/* Encabezado del Módulo */}
      <div className={`text-center font-extrabold text-sm sm:text-base py-2 uppercase tracking-wider border-b ${
        modoNocturno ? 'border-blue-900/60 text-slate-100' : 'border-slate-300 text-slate-900'
      }`}>
        GENERACIÓN DIARIA
      </div>

      {/* Tarjetas de Métricas Recalculadas en Tiempo Real */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${
          modoNocturno ? 'bg-[#0a1f3a] border-cyan-500/30 text-cyan-300' : 'bg-cyan-50 border-cyan-200 text-cyan-900'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider">MWh Totales Brutos</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 font-mono font-black text-2xl sm:text-3xl">
            {resumenCalculado.totalMwhBruta} <span className="text-xs font-sans font-bold">MWh</span>
          </div>
        </div>

        <div className={`p-4 rounded-xl border flex flex-col justify-between ${
          modoNocturno ? 'bg-[#0a1f3a] border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider">MWh Totales Netos</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 font-mono font-black text-2xl sm:text-3xl">
            {resumenCalculado.totalMwhNeta} <span className="text-xs font-sans font-bold">MWh</span>
          </div>
        </div>

        <div className={`p-4 rounded-xl border flex flex-col justify-between ${
          modoNocturno ? 'bg-[#0a1f3a] border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider">Promedio Carga</span>
            <BarChart2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 font-mono font-black text-2xl sm:text-3xl">
            {resumenCalculado.promedioPotenciaMW} <span className="text-xs font-sans font-bold">MW</span>
          </div>
        </div>

        <div className={`p-4 rounded-xl border flex flex-col justify-between ${
          modoNocturno ? 'bg-[#0a1f3a] border-indigo-500/30 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-900'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider">Horas de Operación</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 font-mono font-black text-2xl sm:text-3xl">
            {resumenCalculado.horasOperativas} <span className="text-xs font-sans font-bold">hrs</span>
          </div>
        </div>
      </div>

      {/* Matriz de Entrada de Mediciones 24 Horas */}
      <div className="space-y-3">
        <h4 className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          Matriz Horaria de Mediciones (24 Horas)
        </h4>

        <div className="overflow-x-auto rounded-xl border border-slate-700/80 max-h-[420px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className={`sticky top-0 z-10 font-extrabold text-[11px] uppercase tracking-wider ${
              modoNocturno ? 'bg-slate-900 text-slate-200 border-b border-slate-700' : 'bg-slate-100 text-slate-800 border-b border-slate-300'
            }`}>
              <tr>
                <th className="p-2.5 text-center w-16">Hora</th>
                <th className="p-2.5 text-center">Potencia (MW)</th>
                <th className="p-2.5 text-center">Gen. Bruta (MWh)</th>
                <th className="p-2.5 text-center">SSAA (MWh)</th>
                <th className="p-2.5 text-center">Gen. Neta (MWh)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {safeRegistros.map((reg, idx) => (
                <tr key={reg.hora || idx} className={modoNocturno ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}>
                  <td className="p-2 text-center font-bold text-slate-400">
                    {String(reg.hora).padStart(2, '0')}:00
                  </td>
                  <td className="p-1.5 text-center">
                    <input
                      type="number"
                      step="0.1"
                      value={reg.potencia_mw}
                      onChange={(e) => handleChangeRegistro(idx, 'potencia_mw', e.target.value)}
                      className={`w-full max-w-[120px] text-center font-bold px-2 py-1 rounded border focus:outline-none focus:ring-1 ${
                        modoNocturno ? 'bg-slate-900 border-slate-700 text-amber-400 focus:ring-amber-500' : 'bg-white border-slate-300 text-amber-800 focus:ring-amber-500'
                      }`}
                    />
                  </td>
                  <td className="p-1.5 text-center">
                    <input
                      type="number"
                      step="0.1"
                      value={reg.generacion_mwh}
                      onChange={(e) => handleChangeRegistro(idx, 'generacion_mwh', e.target.value)}
                      className={`w-full max-w-[120px] text-center font-bold px-2 py-1 rounded border focus:outline-none focus:ring-1 ${
                        modoNocturno ? 'bg-slate-900 border-slate-700 text-cyan-300 focus:ring-cyan-500' : 'bg-white border-slate-300 text-cyan-900 focus:ring-cyan-500'
                      }`}
                    />
                  </td>
                  <td className="p-1.5 text-center">
                    <input
                      type="number"
                      step="0.1"
                      value={reg.ssaa_mwh}
                      onChange={(e) => handleChangeRegistro(idx, 'ssaa_mwh', e.target.value)}
                      className={`w-full max-w-[120px] text-center font-bold px-2 py-1 rounded border focus:outline-none focus:ring-1 ${
                        modoNocturno ? 'bg-slate-900 border-slate-700 text-slate-300 focus:ring-slate-400' : 'bg-white border-slate-300 text-slate-800 focus:ring-slate-400'
                      }`}
                    />
                  </td>
                  <td className="p-2 text-center font-black text-emerald-400 text-sm">
                    {reg.generacion_neta.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
