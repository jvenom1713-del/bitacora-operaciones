import React, { useState, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import { 
  Search, Calendar, Filter, FileText, Download, ArrowLeft, 
  Sun, Moon, ShieldCheck, RefreshCw, Eye, X, ChevronRight, FileDown
} from 'lucide-react';
import { getApiUrl } from '../apiConfig';
import { supabase } from '../supabaseClient';

export default function VistaConsultaBitacora({ onVolverMenu, modoNocturno }) {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [tipoTurnoFiltro, setTipoTurnoFiltro] = useState('TODOS');
  
  const [bitacoras, setBitacoras] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [bitacoraSeleccionada, setBitacoraSeleccionada] = useState(null);
  const [generandoPdfId, setGenerandoPdfId] = useState(null);

  const cargarBitacoras = async () => {
    setCargando(true);
    try {
      // 1. Consulta directa a Supabase
      const { data, error } = await supabase.from('bitacoras').select('*').order('id', { ascending: false });
      
      if (!error && data && data.length > 0) {
        const adaptadas = data.map(item => ({
          ...item,
          id: item.id,
          folio: item.folio || `TRN-${item.id}`,
          fecha_turno: item.fecha || item.fecha_turno,
          tipo_turno: item.turno || item.tipo_turno,
          cerrado_por_nombre: item.jefe_turno || item.cerrado_por_nombre,
          operador_nombre: item.operador || item.operador_nombre,
          estado: item.estado || 'CERRADO',
          resumen_operativo: item.contenido || item.resumen_operativo,
          contenido_texto: item.contenido || item.contenido_texto
        }));
        setBitacoras(adaptadas);
      } else {
        // Fallback a API local
        const params = new URLSearchParams();
        if (fechaInicio) params.append('fecha_inicio', fechaInicio);
        if (fechaFin) params.append('fecha_fin', fechaFin);
        if (textoBusqueda) params.append('texto', textoBusqueda);

        const res = await fetch(getApiUrl(`/api/bitacoras/buscar?${params.toString()}`));
        if (res.ok) {
          const apiData = await res.json();
          setBitacoras(apiData);
        } else {
          setBitacoras([]);
        }
      }
    } catch (err) {
      console.error("Error de conexión al cargar bitácoras", err);
    } finally {
      setCargando(false);
    }
  };


  useEffect(() => {
    cargarBitacoras();
  }, []);

  const descargarPdfCarta = async (item) => {
    setGenerandoPdfId(item.id);
    const container = document.createElement('div');
    container.style.padding = '16px';
    container.style.background = '#ffffff';
    container.style.color = '#0f172a';
    container.style.fontFamily = "Arial, sans-serif";
    container.style.width = '700px';
    container.style.boxSizing = 'border-box';

    const folio = item.folio || `TRN-${item.turno_id}`;
    const fecha = item.fecha_turno || new Date().toISOString().slice(0, 10);
    const jefe = item.cerrado_por_nombre || 'Jefe de Turno';
    const turno = item.tipo_turno || 'DIURNO';
    const resumen = item.resumen_operativo || 'Sin observaciones de cierre.';
    const contenido = item.contenido_texto || '';

    container.innerHTML = `
      <div style="border: 2px solid #1e293b; border-radius: 8px; overflow: hidden; background: #ffffff; padding: 0;">
        <!-- BANNER DE ENCABEZADO -->
        <div style="background: linear-gradient(135deg, #0b2545 0%, #134074 100%); color: #ffffff; padding: 14px 18px; border-bottom: 3px solid #ea580c;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td>
                <div style="font-size: 9px; font-weight: 800; color: #fbbf24; text-transform: uppercase; letter-spacing: 1px;">
                  <span style="color: #ffffff;">G</span>METROPOLITANA — HOJA DE TURNO CERRADA
                </div>
                <div style="font-size: 16px; font-weight: 900; color: #ffffff; text-transform: uppercase; margin: 2px 0;">
                  CENTRAL NUEVA RENCA
                </div>
                <div style="font-size: 10px; color: #93c5fd;">
                  Fecha: ${fecha} | Turno: ${turno}
                </div>
              </td>
              <td style="text-align: right; vertical-align: middle;">
                <div style="background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.3); padding: 6px 12px; border-radius: 6px; display: inline-block;">
                  <div style="font-size: 8px; color: #cbd5e1; font-weight: 700; text-transform: uppercase;">FOLIO</div>
                  <div style="font-size: 15px; font-weight: 900; color: #f59e0b; font-family: monospace;">${folio}</div>
                </div>
              </td>
            </tr>
          </table>
        </div>

        <!-- INFO DOTACIÓN Y CIERRE -->
        <div style="background: #f8fafc; padding: 10px 18px; border-bottom: 1px solid #e2e8f0; font-size: 10px; color: #334155;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="width: 50%;">
                <span style="color: #64748b; font-weight: 800; text-transform: uppercase; display: block; font-size: 8px;">JEFE DE TURNO QUE APROBÓ:</span>
                <strong style="color: #0f172a; font-size: 11px;">${jefe}</strong>
              </td>
              <td style="width: 50%; text-align: right;">
                <span style="color: #64748b; font-weight: 800; text-transform: uppercase; display: block; font-size: 8px;">ESTADO DE DOCUMENTO:</span>
                <strong style="color: #16a34a; font-size: 11px;">APROBADO Y ARCHIVADO</strong>
              </td>
            </tr>
          </table>
        </div>

        <!-- SECCIÓN DE RESUMEN Y ENTREGA -->
        <div style="padding: 16px 18px; border-bottom: 1px solid #e2e8f0;">
          <div style="font-size: 10px; font-weight: 800; color: #0284c7; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #bae6fd; padding-bottom: 3px;">
            1. RESUMEN DE ENTREGA Y CIERRE DE TURNO
          </div>
          <div style="font-size: 11px; color: #1e293b; line-height: 1.5; white-space: pre-line; background: #f1f5f9; padding: 10px; border-radius: 6px; border: 1px solid #cbd5e1;">
            ${resumen}
          </div>
        </div>

        ${contenido ? `
        <!-- SECCIÓN DE CONSOLIDADO -->
        <div style="padding: 16px 18px; border-bottom: 1px solid #e2e8f0;">
          <div style="font-size: 10px; font-weight: 800; color: #0369a1; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #bae6fd; padding-bottom: 3px;">
            2. DETALLE Y REGISTRO CONSOLIDADO DE LA BITÁCORA
          </div>
          <div style="font-size: 10.5px; color: #334155; line-height: 1.5; white-space: pre-line; font-family: monospace; background: #fafafa; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
            ${contenido}
          </div>
        </div>
        ` : ''}

        <!-- FIRMA Y PIE DE PÁGINA CARTA -->
        <div style="padding: 16px 18px; background: #ffffff;">
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <tr>
              <td style="width: 60%; vertical-align: bottom;">
                <div style="font-size: 8px; color: #64748b;">
                  Documento Oficial generado desde el Sistema Integrado de Operaciones.<br/>
                  Impresión en Formato Carta (8.5" x 11") • Central Nueva Renca
                </div>
              </td>
              <td style="width: 40%; text-align: center; vertical-align: bottom;">
                <div style="border-bottom: 1px solid #64748b; width: 150px; margin: 0 auto 4px auto;"></div>
                <div style="font-size: 10px; font-weight: 800; color: #0f172a;">${jefe}</div>
                <div style="font-size: 8px; color: #64748b; font-weight: 700; text-transform: uppercase;">Firma Jefe de Turno</div>
              </td>
            </tr>
          </table>
        </div>

      </div>
    `;

    document.body.appendChild(container);

    const opt = {
      margin:       0.3,
      filename:     `bitacora_${folio}_${fecha}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, logging: false },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
      await html2pdf().from(container).set(opt).save();
    } catch (err) {
      console.error("Error al descargar PDF Carta:", err);
      if (item.ruta_pdf) {
        window.open(item.ruta_pdf, '_blank');
      }
    } finally {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
      setGenerandoPdfId(null);
    }
  };

  const handleLimpiarFiltros = () => {
    setFechaInicio('');
    setFechaFin('');
    setTextoBusqueda('');
    setTipoTurnoFiltro('TODOS');
    setTimeout(() => {
      cargarBitacoras();
    }, 50);
  };

  const bitacorasFiltradas = bitacoras.filter(b => {
    if (tipoTurnoFiltro === 'TODOS') return true;
    return b.tipo_turno === tipoTurnoFiltro;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8">
      {/* HEADER SUPERIOR */}
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 backdrop-blur border border-slate-800 p-5 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-wide">
              CONSULTA DE BITÁCORAS POR FECHA Y TEXTO
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Histórico consolidado de Hojas de Turno cerradas y archivadas en PDF
            </p>
          </div>
        </div>

        <button
          onClick={onVolverMenu}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-2 cursor-pointer w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Menú</span>
        </button>
      </header>

      <main className="max-w-7xl mx-auto space-y-6">
        {/* PANEL DE FILTROS Y BÚSQUEDA */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-blue-400">
              <Filter className="w-4 h-4" />
              <span>FILTROS DE BÚSQUEDA AVANZADA</span>
            </div>
            <button 
              onClick={handleLimpiarFiltros}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Limpiar Filtros</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Búsqueda de Texto */}
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-blue-400" />
                Buscar por texto / palabra clave / folio:
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ej: Fuga, Mantenimiento, Turbina Vapor, Folio TRN..."
                  value={textoBusqueda}
                  onChange={(e) => setTextoBusqueda(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && cargarBitacoras()}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Fecha Desde */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                Fecha Desde:
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Fecha Hasta */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                Fecha Hasta:
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-800/80">
            {/* Filtro Tipo Turno */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Turno:</span>
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
                {['TODOS', 'DIURNO', 'NOCTURNO'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTipoTurnoFiltro(t)}
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      tipoTurnoFiltro === t 
                        ? 'bg-blue-600 text-white shadow' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t === 'DIURNO' && '☀️ '}
                    {t === 'NOCTURNO' && '🌙 '}
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Botón Ejecutar Búsqueda */}
            <button
              onClick={cargarBitacoras}
              disabled={cargando}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {cargando ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>Buscar Registros</span>
            </button>
          </div>
        </div>

        {/* RESULTADOS DE LA BÚSQUEDA */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
            <span>Se encontraron {bitacorasFiltradas.length} bitácora(s) guardadas</span>
            {cargando && <span className="text-blue-400 animate-pulse">Cargando...</span>}
          </div>

          {bitacorasFiltradas.length === 0 && !cargando ? (
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-12 text-center space-y-3">
              <FileText className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-300">No se encontraron bitácoras cerradas</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No existen registros almacenados que coincidan con la fecha o el texto ingresado. Intente cambiar los criterios de búsqueda.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bitacorasFiltradas.map((item) => (
                <div 
                  key={item.id}
                  className="bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-5 shadow-lg transition-all flex flex-col justify-between group space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header de Tarjeta */}
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider block">
                          FOLIO: {item.folio || `TRN-${item.turno_id}`}
                        </span>
                        <h4 className="text-sm font-black text-slate-100 flex items-center gap-2 mt-0.5">
                          <Calendar className="w-4 h-4 text-cyan-400" />
                          {item.fecha_turno}
                        </h4>
                      </div>

                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                        item.tipo_turno === 'NOCTURNO' 
                          ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700/50' 
                          : 'bg-amber-950/80 text-amber-300 border-amber-700/50'
                      }`}>
                        {item.tipo_turno === 'NOCTURNO' ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                        {item.tipo_turno || 'DIURNO'}
                      </span>
                    </div>

                    {/* Supervisor Cierre */}
                    <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span>Cerrado por:</span>
                      <span className="font-bold text-slate-200">{item.cerrado_por_nombre || 'Jefe de Turno'}</span>
                    </div>

                    {/* Resumen Operativo */}
                    <div className="text-xs text-slate-300 line-clamp-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 italic font-mono">
                      "{item.resumen_operativo || item.contenido_texto || 'Sin observaciones de cierre.'}"
                    </div>
                  </div>

                  {/* Acciones de la Tarjeta */}
                  <div className="pt-3 border-t border-slate-800/80">
                    <button
                      onClick={() => descargarPdfCarta(item)}
                      disabled={generandoPdfId === item.id}
                      title="Descargar PDF en Formato Carta cuadrado listo para imprimir"
                      className="w-full py-2.5 px-4 bg-[#ea580c] hover:bg-[#c2410c] active:bg-[#9a3412] text-white text-xs font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {generandoPdfId === item.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span>{generandoPdfId === item.id ? 'Generando PDF Carta...' : 'Descargar PDF Carta'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
