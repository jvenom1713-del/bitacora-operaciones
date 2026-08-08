import React, { useState, useEffect } from 'react';
import {
  Plus, Printer, X, Flame, CheckCircle2, XCircle,
  Edit3, Trash2, Save, ChevronLeft,
  User, MapPin, Shield
} from 'lucide-react';

const ESTADOS = [
  { valor: 'ABIERTO',  label: 'Abierto',  color: 'bg-green-500/20 text-green-300 border-green-500/40' },
  { valor: 'CERRADO',  label: 'Cerrado',  color: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
];

const COLUMNAS = [
  { key: 'numero',           label: 'N° Permiso',            width: 'w-20  min-w-[80px]'  },
  { key: 'ubicacion',        label: 'Ubicación Técnica',     width: 'w-48  min-w-[192px]' },
  { key: 'solicitado_por',   label: 'Solicitado Por',         width: 'w-40  min-w-[160px]' },
  { key: 'autorizado_por',   label: 'Autorizado Por',         width: 'w-40  min-w-[160px]' },
  { key: 'fecha_apertura',   label: 'Fecha de Apertura',      width: 'w-32  min-w-[128px]' },
  { key: 'fecha_hora_cierre',label: 'Fecha y Hora de Cierre', width: 'w-40  min-w-[160px]' },
  { key: 'cancelado_por',    label: 'Cancelado Por',          width: 'w-36  min-w-[144px]' },
  { key: 'recepcionado_por', label: 'Recepcionado Por',       width: 'w-40  min-w-[160px]' },
  { key: 'estado',           label: 'Estado',                 width: 'w-28  min-w-[112px]' },
];

const PERMISO_VACIO = {
  numero: '', ubicacion: '', solicitado_por: '', autorizado_por: '',
  fecha_apertura: '', fecha_hora_cierre: '',
  cancelado_por: '', recepcionado_por: '', estado: 'ABIERTO',
};

const anioActual = new Date().getFullYear();

const DATA_EJEMPLO = [
  { id: 1, numero: 'P-001', ubicacion: 'Caldera Unidad 1 - Zona Quemadores',  solicitado_por: 'Carlos Muñoz / TECLAB',      autorizado_por: 'Norman Galaz',   fecha_apertura: '2026-08-01', fecha_hora_cierre: '2026-08-01 12:00', cancelado_por: '',             recepcionado_por: 'Pedro Rojas',    estado: 'CERRADO'  },
  { id: 2, numero: 'P-002', ubicacion: 'Turbina Vapor - Cámara de Paletas',   solicitado_por: 'Roberto Silva / Mant.',     autorizado_por: 'Jorge Albornoz', fecha_apertura: '2026-08-05', fecha_hora_cierre: '',                cancelado_por: '',             recepcionado_por: '',               estado: 'ABIERTO'  },
  { id: 3, numero: 'P-003', ubicacion: 'Sala Transformadores - Patio 33 kV',  solicitado_por: 'Luis Pérez / ELECTRUM',     autorizado_por: 'Norman Galaz',   fecha_apertura: '2026-08-08', fecha_hora_cierre: '',                cancelado_por: 'Norman Galaz', recepcionado_por: '',               estado: 'ABIERTO'  },
];

/* ─── Badge de Estado ─── */
function EstadoBadge({ estado }) {
  const def = ESTADOS.find(e => e.valor === estado) || ESTADOS[0];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${def.color}`}>
      {estado === 'ABIERTO'  && <CheckCircle2 className="w-3 h-3" />}
      {estado === 'CERRADO'  && <XCircle className="w-3 h-3" />}
      {def.label}
    </span>
  );
}

const calcularSiguienteNumero = (lista = []) => {
  let max = 0;
  lista.forEach(p => {
    if (p.numero) {
      const match = p.numero.match(/(\d+)/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > max) max = val;
      }
    }
  });
  return `P-${String(max + 1).padStart(3, '0')}`;
};

/* ─── Modal Nuevo / Editar Permiso ─── */
function ModalPermiso({ permiso, siguienteNumero, onGuardar, onCerrar, modoNocturno }) {
  const [form, setForm] = useState(() => ({
    ...PERMISO_VACIO,
    numero: siguienteNumero || '',
    fecha_apertura: new Date().toISOString().split('T')[0],
    ...(permiso || {})
  }));
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-cambio de estado: ABIERTO al crear, CERRADO cuando se recibe (recepcionado_por lleno)
  useEffect(() => {
    const recepcionado = (form.recepcionado_por || '').trim() !== '';
    if (recepcionado && form.estado !== 'CERRADO') {
      setForm(f => ({ ...f, estado: 'CERRADO' }));
    } else if (!recepcionado && form.estado === 'CERRADO') {
      setForm(f => ({ ...f, estado: 'ABIERTO' }));
    }
  }, [form.recepcionado_por]);

  const inp = `w-full rounded-lg border px-3 py-1.5 text-xs focus:outline-none focus:ring-1 transition-all ${
    modoNocturno
      ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-orange-500/50 focus:border-orange-500'
      : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:ring-orange-500/50 focus:border-orange-500'
  }`;

  const lbl = `block text-[10px] font-bold uppercase tracking-wider mb-1 ${modoNocturno ? 'text-slate-400' : 'text-slate-500'}`;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`w-full max-w-2xl rounded-2xl shadow-2xl border overflow-hidden ${modoNocturno ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-orange-600 to-red-700">
          <div className="flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-white" />
            <h2 className="font-bold text-white text-base">
              {permiso?.id ? 'Editar Permiso en Caliente' : 'Nuevo Permiso en Caliente'}
            </h2>
          </div>
          <button onClick={onCerrar} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Campos */}
        <div className="p-6 grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className={lbl}>
              N° Permiso <span className="text-[9px] text-orange-400 font-normal lowercase ml-1">(automático)</span>
            </label>
            <input className={`${inp} font-mono font-bold text-orange-400`} value={form.numero} onChange={e => set('numero', e.target.value)} placeholder="Ej. P-004" />
          </div>
          <div>
            <label className={lbl}>Estado</label>
            <select className={inp} value={form.estado} onChange={e => set('estado', e.target.value)}>
              {ESTADOS.map(e => <option key={e.valor} value={e.valor}>{e.label}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className={lbl}>Ubicación Técnica</label>
            <input className={inp} value={form.ubicacion} onChange={e => set('ubicacion', e.target.value)} placeholder="Ej. Caldera Unidad 1 – Zona Quemadores" />
          </div>
          <div>
            <label className={lbl}>Solicitado Por</label>
            <input className={inp} value={form.solicitado_por} onChange={e => set('solicitado_por', e.target.value)} placeholder="Nombre y empresa" />
          </div>
          <div>
            <label className={lbl}>Autorizado Por</label>
            <input className={inp} value={form.autorizado_por} onChange={e => set('autorizado_por', e.target.value)} placeholder="Jefe de Turno / Supervisor" />
          </div>
          <div>
            <label className={lbl}>Fecha de Apertura</label>
            <input type="date" className={inp} value={form.fecha_apertura} onChange={e => set('fecha_apertura', e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Fecha y Hora de Cierre</label>
            <input type="datetime-local" className={inp} value={form.fecha_hora_cierre} onChange={e => set('fecha_hora_cierre', e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Cancelado Por</label>
            <input className={inp} value={form.cancelado_por} onChange={e => set('cancelado_por', e.target.value)} placeholder="Dejar en blanco si no aplica" />
          </div>
          <div>
            <label className={lbl}>Recepcionado Por</label>
            <input className={inp} value={form.recepcionado_por} onChange={e => set('recepcionado_por', e.target.value)} placeholder="Nombre quien recepciona" />
          </div>
        </div>

        {/* Footer */}
        <div className={`flex justify-end gap-3 px-6 py-4 border-t ${modoNocturno ? 'border-slate-800' : 'border-slate-200'}`}>
          <button onClick={onCerrar} className={`px-5 py-2 rounded-xl text-xs font-bold border transition-all ${modoNocturno ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}>
            Cancelar
          </button>
          <button onClick={() => onGuardar(form)} className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-lg shadow-orange-600/25 transition-all flex items-center gap-2">
            <Save className="w-3.5 h-3.5" />Guardar Permiso
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Vista Principal ─── */
export default function VistaPermisosCaliente({ onVolver, modoNocturno, usuarioActual }) {
  const [permisos, setPermisos]           = useState(DATA_EJEMPLO);
  const [modalAbierto, setModalAbierto]   = useState(false);
  const [permisoEditando, setPermisoEdit] = useState(null);
  const [filtroEstado, setFiltroEstado]   = useState('TODOS');
  const [busqueda, setBusqueda]           = useState('');

  const nextId = () => Math.max(0, ...permisos.map(p => p.id)) + 1;

  const guardarPermiso = (form) => {
    if (form.id) {
      setPermisos(p => p.map(x => x.id === form.id ? form : x));
    } else {
      const numAuto = form.numero || calcularSiguienteNumero(permisos);
      setPermisos(p => [...p, { ...form, id: nextId(), numero: numAuto }]);
    }
    setModalAbierto(false);
    setPermisoEdit(null);
  };

  const eliminarPermiso = (id) => {
    if (window.confirm('¿Eliminar este permiso?')) {
      setPermisos(p => p.filter(x => x.id !== id));
    }
  };

  const permisosFiltrados = permisos.filter(p => {
    const matchEstado = filtroEstado === 'TODOS' || p.estado === filtroEstado;
    const q = busqueda.toLowerCase();
    const matchQ = !q || [p.numero, p.ubicacion, p.solicitado_por, p.autorizado_por, p.cancelado_por, p.recepcionado_por]
      .some(v => (v || '').toLowerCase().includes(q));
    return matchEstado && matchQ;
  });

  const imprimirTabla = () => {
    const filas = permisosFiltrados.map(p => {
      const cls = p.estado === 'ABIERTO' ? 'ab' : 'ce';
      return `<tr>
        <td>${p.numero}</td><td>${p.ubicacion}</td>
        <td>${p.solicitado_por}</td><td>${p.autorizado_por}</td>
        <td>${p.fecha_apertura}</td><td>${p.fecha_hora_cierre || '—'}</td>
        <td>${p.cancelado_por || '—'}</td><td>${p.recepcionado_por || '—'}</td>
        <td class="${cls}">${p.estado}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <title>Permisos en Caliente – Generadora Metropolitana</title>
    <style>
      @page{size:letter landscape;margin:1.5cm}
      body{font-family:Arial,sans-serif;font-size:9pt;color:#111;margin:0;padding:0}
      .ph{display:flex;align-items:center;gap:16px;margin-bottom:8px;border-bottom:3px solid #ea580c;padding-bottom:8px}
      .lb{background:#ea580c;color:#fff;font-weight:900;font-size:11pt;padding:6px 12px;border-radius:6px;white-space:nowrap;line-height:1.3}
      .tt{flex:1;text-align:center}
      .tt h1{font-size:13pt;font-weight:900;color:#ea580c;margin:0 0 2px;text-transform:uppercase;letter-spacing:1px}
      .tt h2{font-size:10pt;font-weight:bold;color:#555;margin:0}
      table{border-collapse:collapse;width:100%}
      thead tr th{background:#ea580c;color:#fff;font-size:8pt;font-weight:bold;padding:5px 6px;border:1px solid #c2410c;text-align:left;white-space:nowrap}
      tbody tr td{font-size:8pt;padding:4px 6px;border:1px solid #d1d5db;vertical-align:top}
      tbody tr:nth-child(even) td{background:#fff7ed}
      tbody tr:nth-child(odd) td{background:#fff}
      .vt{color:#16a34a;font-weight:bold}.ce{color:#6b7280;font-weight:bold}
      .pf{margin-top:10px;text-align:right;font-size:7pt;color:#888}
    </style></head><body>
    <div class="ph">
      <div class="lb">GM<br/>Generadora<br/>Metropolitana</div>
      <div class="tt">
        <h1>Listado de Permisos de Trabajo en Caliente</h1>
        <h2>Año ${anioActual} &nbsp;|&nbsp; Sala de Control – Turno Operacional</h2>
      </div>
    </div>
    <table><thead><tr>
      <th>N° Permiso</th><th>Ubicación Técnica</th><th>Solicitado Por</th><th>Autorizado Por</th>
      <th>Fecha Apertura</th><th>Fecha y Hora Cierre</th><th>Cancelado Por</th><th>Recepcionado Por</th><th>Estado</th>
    </tr></thead><tbody>${filas}</tbody></table>
    <div class="pf">Impreso el ${new Date().toLocaleString('es-CL')} — Generadora Metropolitana S.A.</div>
    </body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  /* ─── Clases por modo ─── */
  const bg    = modoNocturno ? 'bg-[#0b0f19]'                    : 'bg-slate-100';
  const card  = modoNocturno ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200';
  const thCls = modoNocturno ? 'bg-orange-700/80 text-orange-100 border-orange-600/40' : 'bg-orange-600 text-white border-orange-500';
  const tdCls = modoNocturno ? 'border-slate-800 text-slate-200'  : 'border-slate-200 text-slate-700';
  const trEven= modoNocturno ? 'bg-slate-800/40'                  : 'bg-orange-50/50';
  const trOdd = modoNocturno ? 'bg-slate-900/50'                  : 'bg-white';
  const inpCls= `rounded-lg border px-3 py-1.5 text-xs focus:outline-none focus:ring-1 transition-all ${
    modoNocturno
      ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-orange-500 focus:border-orange-500'
      : 'bg-white border-slate-300 text-slate-700 placeholder-slate-400 focus:ring-orange-500 focus:border-orange-500'
  }`;
  const btnSec= `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
    modoNocturno ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
  }`;

  return (
    <div className={`min-h-screen ${bg} flex flex-col`}>

      {/* ── ENCABEZADO TIPO PLANILLA ── */}
      <div className="flex-none">

        {/* Banda naranja-roja */}
        <div className="bg-gradient-to-r from-orange-600 via-red-600 to-orange-700 px-6 py-3 flex items-center gap-4">
          <div className="flex-none bg-white/15 rounded-lg px-3 py-1.5 text-center">
            <div className="text-white font-black text-lg leading-none">GM</div>
            <div className="text-orange-100 text-[9px] font-semibold leading-tight whitespace-nowrap">GENERADORA<br/>METROPOLITANA</div>
          </div>
          <div className="flex-1 text-center">
            <h1 className="text-white font-black text-xl tracking-widest uppercase drop-shadow">
              Listado de Permisos de Trabajo en Caliente
            </h1>
            <p className="text-orange-100 text-xs font-medium tracking-wide mt-0.5">
              AÑO {anioActual} &bull; Sala de Control — Turno Operacional
            </p>
          </div>
          <Flame className="w-10 h-10 text-white/60 flex-none" />
        </div>

        {/* Barra de acciones */}
        <div className={`border-b ${modoNocturno ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} px-6 py-3 flex flex-wrap items-center gap-3`}>
          <button onClick={onVolver} className={btnSec}>
            <ChevronLeft className="w-3.5 h-3.5" />Volver
          </button>

          <div className="flex-1 flex flex-wrap items-center gap-3">
            <input className={`${inpCls} w-52`} placeholder="Buscar permiso…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            <select className={`${inpCls} w-36`} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="TODOS">Todos los estados</option>
              {ESTADOS.map(e => <option key={e.valor} value={e.valor}>{e.label}</option>)}
            </select>
            <div className="hidden sm:flex items-center gap-2">
              {ESTADOS.map(e => {
                const n = permisos.filter(p => p.estado === e.valor).length;
                return (
                  <span key={e.valor} className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${e.color}`}>
                    {e.label}: {n}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={imprimirTabla} className={btnSec}>
              <Printer className="w-3.5 h-3.5" />Imprimir
            </button>
            <button
              onClick={() => { setPermisoEdit(null); setModalAbierto(true); }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-lg shadow-orange-600/25 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />Nuevo Permiso
            </button>
          </div>
        </div>
      </div>

      {/* ── TABLA PRINCIPAL ── */}
      <div className="flex-1 overflow-auto p-4">
        <div className={`rounded-xl border overflow-hidden shadow-xl ${card}`}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {COLUMNAS.map(col => (
                    <th key={col.key} className={`${col.width} px-3 py-2.5 text-left font-bold text-[11px] uppercase tracking-wider border-r last:border-r-0 whitespace-nowrap ${thCls}`}>
                      {col.label}
                    </th>
                  ))}
                  <th className={`w-20 px-2 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider ${thCls}`}>Acc.</th>
                </tr>
              </thead>
              <tbody>
                {permisosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNAS.length + 1} className={`py-12 text-center text-sm ${modoNocturno ? 'text-slate-500' : 'text-slate-400'}`}>
                      <Flame className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      No hay permisos registrados
                    </td>
                  </tr>
                )}

                {permisosFiltrados.map((p, idx) => (
                  <tr key={p.id} className={`border-b last:border-b-0 group hover:brightness-110 transition-all ${idx % 2 === 0 ? trEven : trOdd}`}>
                    <td className={`px-3 py-2 border-r font-mono font-bold text-orange-400 whitespace-nowrap ${tdCls}`}>{p.numero || `#${idx + 1}`}</td>
                    <td className={`px-3 py-2 border-r ${tdCls}`}>
                      <span className="flex items-start gap-1">
                        <MapPin className="w-3 h-3 mt-0.5 flex-none opacity-50" />
                        <span className="leading-tight">{p.ubicacion}</span>
                      </span>
                    </td>
                    <td className={`px-3 py-2 border-r ${tdCls}`}>
                      <span className="flex items-start gap-1">
                        <User className="w-3 h-3 mt-0.5 flex-none opacity-50" />
                        <span className="leading-tight">{p.solicitado_por}</span>
                      </span>
                    </td>
                    <td className={`px-3 py-2 border-r ${tdCls}`}>
                      <span className="flex items-start gap-1">
                        <Shield className="w-3 h-3 mt-0.5 flex-none opacity-50" />
                        <span className="leading-tight">{p.autorizado_por}</span>
                      </span>
                    </td>
                    <td className={`px-3 py-2 border-r font-mono text-[11px] whitespace-nowrap ${tdCls}`}>{p.fecha_apertura}</td>
                    <td className={`px-3 py-2 border-r font-mono text-[11px] whitespace-nowrap ${tdCls}`}>{p.fecha_hora_cierre || <span className="opacity-30">—</span>}</td>
                    <td className={`px-3 py-2 border-r text-[11px] ${tdCls}`}>{p.cancelado_por || <span className="opacity-30">—</span>}</td>
                    <td className={`px-3 py-2 border-r text-[11px] ${tdCls}`}>{p.recepcionado_por || <span className="opacity-30">—</span>}</td>
                    <td className={`px-3 py-2 border-r ${tdCls}`}><EstadoBadge estado={p.estado} /></td>
                    <td className={`px-2 py-2 text-center ${tdCls}`}>
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setPermisoEdit(p); setModalAbierto(true); }} className="p-1 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 transition-all" title="Editar">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => eliminarPermiso(p.id)} className="p-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-all" title="Eliminar">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Filas vacías estilo planilla */}
                {[...Array(Math.max(0, 5 - permisosFiltrados.length))].map((_, i) => (
                  <tr key={`empty-${i}`} className={`border-b last:border-b-0 ${i % 2 === 0 ? trEven : trOdd}`}>
                    {COLUMNAS.map(col => (<td key={col.key} className={`px-3 py-3 border-r ${tdCls} opacity-20`}>&nbsp;</td>))}
                    <td className={`px-2 py-3 ${tdCls}`}>&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pie */}
        <div className={`mt-3 flex items-center justify-between text-[10px] ${modoNocturno ? 'text-slate-600' : 'text-slate-400'}`}>
          <span>Total: <strong className={modoNocturno ? 'text-slate-300' : 'text-slate-600'}>{permisosFiltrados.length}</strong> permiso(s)</span>
          <span>Generadora Metropolitana S.A. — Sistema de Bitácora Operacional</span>
        </div>
      </div>

      {/* Modal */}
      {modalAbierto && (
        <ModalPermiso
          permiso={permisoEditando}
          siguienteNumero={permisoEditando ? permisoEditando.numero : calcularSiguienteNumero(permisos)}
          onGuardar={guardarPermiso}
          onCerrar={() => { setModalAbierto(false); setPermisoEdit(null); }}
          modoNocturno={modoNocturno}
        />
      )}
    </div>
  );
}

