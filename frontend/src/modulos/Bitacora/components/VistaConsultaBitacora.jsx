import React, { useState, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import { 
  Search, Calendar, Filter, FileText, Download, ArrowLeft, 
  Sun, Moon, ShieldCheck, RefreshCw, Eye, X, ChevronRight, FileDown
} from 'lucide-react';
import { getApiUrl, formatearFechaHoraLegible, obtenerNombreJefeActual } from '../../../shared/apiConfig';
import { supabase } from '../../../shared/supabaseClient';

export default function VistaConsultaBitacora({ onVolverMenu, modoNocturno, usuarioActual }) {
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
          folio: item.folio ? String(item.folio).padStart(4, '0') : String(item.id || 1).padStart(4, '0'),
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

    const folio = item.folio ? String(item.folio).padStart(4, '0') : String(item.id || 1).padStart(4, '0');
    const fecha = item.fecha_turno || new Date().toISOString().slice(0, 10);
    const jefe = item.jefe_turno || item.cerrado_por_nombre || item.jdt_nombre || obtenerNombreJefeActual(usuarioActual, item);
    const turno = item.tipo_turno || 'DIURNO';
    const resumen = item.resumen_operativo || item.contenido_texto || 'Sin observaciones de cierre.';

    const partesF = fecha.split('-');
    const diaNum = partesF.length === 3 ? parseInt(partesF[2], 10) : new Date().getDate();

    let permisosLista = [];
    try {
      const storedP = localStorage.getItem('permisos_caliente_turno');
      permisosLista = storedP ? JSON.parse(storedP) : [];
    } catch (_) {}
    const permisosAbiertos = permisosLista.filter(p => p.estado === 'ABIERTO');

    const filasPermisos = permisosAbiertos.length > 0 ? permisosAbiertos.map(p => `
      <tr>
        <td style="padding: 4px 6px; border: 1px solid #fed7aa; font-weight: bold; color: #c2410c;">${p.numero || 'P-001'}</td>
        <td style="padding: 4px 6px; border: 1px solid #fed7aa; font-weight: bold; color: #1e293b;">${p.ubicacion || 'General'}</td>
        <td style="padding: 4px 6px; border: 1px solid #fed7aa;">${p.solicitado_por || p.solicitadoPor || '-'}</td>
        <td style="padding: 4px 6px; border: 1px solid #fed7aa;">${p.autorizado_por || p.autorizadoPor || '-'}</td>
        <td style="padding: 4px 6px; border: 1px solid #fed7aa; color: #c2410c; font-weight: bold;">ABIERTO</td>
      </tr>
    `).join('') : `
      <tr>
        <td colspan="5" style="padding: 8px; border: 1px solid #fed7aa; text-align: center; color: #64748b; font-style: italic;">
          Sin permisos de trabajo en caliente abiertos en este turno.
        </td>
      </tr>
    `;

    const rawCierre = item.hora_cierre || item.cerrado_el || item.fecha_cierre || item.created_at || item.actualizado_el;
    const fechaHoraCierreStr = formatearFechaHoraLegible(rawCierre);

    container.innerHTML = `
      <div style="border: 2px solid #1e293b; border-radius: 8px; overflow: hidden; background: #ffffff; padding: 0; position: relative;">
        <!-- BANNER DE ENCABEZADO -->
        <div style="background: linear-gradient(135deg, #0b2545 0%, #134074 100%); color: #ffffff; padding: 14px 18px; border-bottom: 3px solid #ea580c;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td>
                <div style="font-size: 9px; font-weight: 800; color: #fbbf24; text-transform: uppercase; letter-spacing: 1px;">
                  <span style="color: #ffffff;">G</span>METROPOLITANA — REGISTRO DE TURNO
                </div>
                <div style="font-size: 16px; font-weight: 900; color: #ffffff; text-transform: uppercase; margin: 2px 0;">
                  CENTRAL NUEVA RENCA
                </div>
                <div style="font-size: 10px; color: #93c5fd;">
                  Fecha: ${fecha} | Turno: ${turno} | Cierre: ${fechaHoraCierreStr}
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

        <!-- SECCIONES DESTACADAS -->
        <div style="padding: 16px 18px;">
          <!-- 1. RESUMEN DE GENERACIÓN DIARIA: -->
          <div style="background: #0369a1; color: #ffffff; font-size: 11px; font-weight: 900; text-transform: uppercase; padding: 6px 10px; border-radius: 4px; margin-bottom: 6px;">
            1. RESUMEN DE GENERACIÓN DIARIA:
          </div>
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; margin-bottom: 10px;">
            <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 9.5px; font-weight: bold;">
              <tr>
                <td style="padding: 4px; background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 4px; color: #0369a1;">
                  <span style="font-size: 8px; color: #0284c7; display: block; text-transform: uppercase;">SISTEMA PROM</span>
                  55.8 USD/MWh
                </td>
                <td style="padding: 4px; background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 4px; color: #15803d;">
                  <span style="font-size: 8px; color: #16a34a; display: block; text-transform: uppercase;">POT. ESPERA</span>
                  4046 MW
                </td>
                <td style="padding: 4px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 4px; color: #b45309;">
                  <span style="font-size: 8px; color: #d97706; display: block; text-transform: uppercase;">HRS CARGA BASE</span>
                  1 hrs
                </td>
                <td style="padding: 4px; background: #f3e8ff; border: 1px solid #e9d5ff; border-radius: 4px; color: #7e22ce;">
                  <span style="font-size: 8px; color: #9333ea; display: block; text-transform: uppercase;">MIN. TÉCNICO</span>
                  22 hrs
                </td>
                <td style="padding: 4px; background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 4px; color: #0369a1;">
                  <span style="font-size: 8px; color: #0284c7; display: block; text-transform: uppercase;">COSTO MARGINAL</span>
                  50.6 USD/MWh
                </td>
              </tr>
            </table>
          </div>
          <div style="font-size: 11px; color: #1e293b; line-height: 1.5; white-space: pre-line; background: #f1f5f9; padding: 10px; border-radius: 6px; border: 1px solid #cbd5e1; margin-bottom: 14px;">
            Día ${diaNum}: ${resumen}
          </div>

          <!-- 2. CELDAS ESTRUCTURADAS DE NOVEDADES OPERACIONALES E INSTRUCCIONES -->
          <div style="background: #0b2545; color: #ffffff; font-size: 10px; font-weight: 900; text-transform: uppercase; padding: 6px 10px; border-radius: 4px; margin-bottom: 8px;">
            2. DETALLE DE FRAGILIDADES, INSTRUCCIONES Y SEÑALES DEL TURNO
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9.5px;">
            <tr>
              <td style="width: 50%; vertical-align: top; padding-right: 4px;">
                <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; background: #f8fafc;">
                  <div style="font-weight: 900; color: #d97706; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 3px; margin-bottom: 5px; font-size: 9.5px; text-transform: uppercase;">
                    FRAGILIDADES OPERACIONALES
                  </div>
                  <div style="font-family: monospace; font-size: 9px; color: #334155; white-space: pre-line; background: #ffffff; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px;">
                    ${item.fragilidades_texto || 'Sin fragilidades operacionales registradas.'}
                  </div>
                </div>
              </td>
              <td style="width: 50%; vertical-align: top; padding-left: 4px;">
                <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; background: #f8fafc;">
                  <div style="font-weight: 900; color: #0284c7; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 3px; margin-bottom: 5px; font-size: 9.5px; text-transform: uppercase;">
                    INSTRUCCIONES OPERACIONALES
                  </div>
                  <div style="font-family: monospace; font-size: 9px; color: #334155; white-space: pre-line; background: #ffffff; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px;">
                    ${item.instrucciones_texto || 'Sin instrucciones operacionales registradas.'}
                  </div>
                </div>
              </td>
            </tr>
          </table>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 9.5px;">
            <tr>
              <td style="width: 50%; vertical-align: top; padding-right: 4px;">
                <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; background: #f8fafc;">
                  <div style="font-weight: 900; color: #dc2626; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 3px; margin-bottom: 5px; font-size: 9.5px; text-transform: uppercase;">
                    SEÑALES FORZADAS
                  </div>
                  <div style="font-family: monospace; font-size: 9px; color: #334155; white-space: pre-line; background: #ffffff; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px;">
                    ${item.senales_forzadas_texto || 'Sin señales forzadas registradas.'}
                  </div>
                </div>
              </td>
              <td style="width: 50%; vertical-align: top; padding-left: 4px;">
                <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; background: #fff7ed;">
                  <div style="font-weight: 900; color: #ea580c; border-bottom: 1.5px solid #fed7aa; padding-bottom: 3px; margin-bottom: 5px; font-size: 9.5px; text-transform: uppercase;">
                    PERMISOS DE TRABAJO EN CALIENTE ABIERTOS
                  </div>
                  <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 8.5px; background: #ffffff; border: 1px solid #fed7aa; border-radius: 4px;">
                    <thead>
                      <tr style="background: #ffedd5; color: #9a3412; font-weight: 800;">
                        <th style="padding: 3px 5px; border: 1px solid #fed7aa;">N° Permiso</th>
                        <th style="padding: 3px 5px; border: 1px solid #fed7aa;">Ubicación</th>
                        <th style="padding: 3px 5px; border: 1px solid #fed7aa;">Solicitante</th>
                        <th style="padding: 3px 5px; border: 1px solid #fed7aa;">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${filasPermisos}
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          </table>
        </div>

        <!-- FIRMA, TIMBRE OFICIAL REDONDO Y PIE DE PÁGINA -->
        <div style="padding: 14px 18px; background: #ffffff; border-top: 1.5px solid #cbd5e1;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="width: 35%; vertical-align: middle;">
                <div style="font-size: 8px; color: #64748b;">
                  Documento Oficial generado desde el Sistema Integrado de Operaciones.<br/>
                  Central Nueva Renca • Generadora Metropolitana
                </div>
              </td>
              <td style="width: 30%; text-align: center; vertical-align: middle;">
                <!-- SELLO OFICIAL CIRCULAR REDONDO DE AGUA -->
                <div style="border: 3px double #15803d; border-radius: 50%; width: 115px; height: 115px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #166534; background: #ecfdf5; font-family: 'Helvetica Neue', Arial, sans-serif; box-sizing: border-box; padding: 6px; box-shadow: inset 0 0 0 1px #86efac;">
                  <div style="font-size: 6.5px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; color: #166534; line-height: 1.1;">GENERADORA METROPOLITANA</div>
                  <div style="font-size: 12px; font-weight: 900; margin: 1px 0; color: #15803d; letter-spacing: 0.5px;">✔ APROBADO</div>
                  <div style="font-size: 7px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-top: 1px;">CERRADO POR:</div>
                  <div style="font-size: 8.5px; font-weight: 900; color: #0b2545; line-height: 1.1; max-width: 100px; text-align: center; word-break: break-word;">${jefe}</div>
                  <div style="font-size: 6.5px; font-weight: 800; margin-top: 2px; color: #166534; font-family: monospace;">${fechaHoraCierreStr}</div>
                </div>
              </td>
              <td style="width: 35%; text-align: center; vertical-align: middle;">
                <div style="border-bottom: 1px solid #64748b; width: 140px; margin: 0 auto 4px auto;"></div>
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
      console.error("Error al descargar PDF:", err);
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
  };

  const bitacorasFiltradas = bitacoras.filter(b => {
    if (tipoTurnoFiltro !== 'TODOS' && (b.tipo_turno || '').toUpperCase() !== tipoTurnoFiltro) {
      return false;
    }
    if (fechaInicio && b.fecha_turno < fechaInicio) return false;
    if (fechaFin && b.fecha_turno > fechaFin) return false;
    if (textoBusqueda) {
      const q = textoBusqueda.toLowerCase();
      const txt = `${b.folio} ${b.cerrado_por_nombre} ${b.resumen_operativo} ${b.contenido_texto}`.toLowerCase();
      if (!txt.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER PRINCIPAL */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={onVolverMenu}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700 cursor-pointer"
              title="Volver al Menú Principal"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <FileText className="w-6 h-6 text-orange-500" />
                Consulta de Bitácoras Operacionales
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Historial de bitácoras cerradas, consolidados y descargas PDF
              </p>
            </div>
          </div>

          <button
            onClick={cargarBitacoras}
            disabled={cargando}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-xl border border-slate-700 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-blue-400 ${cargando ? 'animate-spin' : ''}`} />
            <span>Actualizar Registros</span>
          </button>
        </div>

        {/* CONTROLES DE BÚSQUEDA Y FILTROS */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Buscador Texto */}
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por folio, observaciones o jefe de turno..."
                value={textoBusqueda}
                onChange={(e) => setTextoBusqueda(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 outline-none transition-all"
              />
              {textoBusqueda && (
                <button
                  onClick={() => setTextoBusqueda('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Rango de Fechas */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer"
                />
                <span className="text-slate-600 text-xs">—</span>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer"
                />
              </div>

              {(fechaInicio || fechaFin || textoBusqueda || tipoTurnoFiltro !== 'TODOS') && (
                <button
                  onClick={handleLimpiarFiltros}
                  title="Limpiar Filtros"
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl border border-slate-700 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
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
                          FOLIO: {item.folio ? String(item.folio).padStart(4, '0') : String(item.id || 1).padStart(4, '0')}
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

                    {/* Supervisor Cierre & Hora de Guardado */}
                    <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">🕒 Guardado / Cierre:</span>
                        <span className="font-mono font-bold text-amber-400">
                          {formatearFechaHoraLegible(item.hora_cierre || item.cerrado_el || item.fecha_cierre || item.created_at || item.fecha)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-800/60 pt-1">
                        <span className="text-slate-400">👤 Cerrado por:</span>
                        <span className="font-bold text-emerald-400">
                          {item.jefe_turno || item.cerrado_por_nombre || item.jdt_nombre || obtenerNombreJefeActual(usuarioActual, item)}
                        </span>
                      </div>
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
                      title="Descargar PDF en formato listo para imprimir"
                      className="w-full py-2.5 px-4 bg-[#ea580c] hover:bg-[#c2410c] active:bg-[#9a3412] text-white text-xs font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {generandoPdfId === item.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span>{generandoPdfId === item.id ? 'Generando PDF...' : 'Descargar PDF'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
