import React, { useState } from 'react';
import { FlaskConical, Lock, Mail, ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';

export default function LoginQuimico({ onLoginExitoso, onVolver, modoNocturno }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const emailTrim = email.trim();
    const passTrim = password.trim();

    if (!emailTrim) {
      setErrorMsg('Por favor ingrese su correo corporativo.');
      return;
    }

    // Lógica de validación estricta de roles por contraseña
    let rolAsignado = null;
    if (passTrim === '1234') {
      rolAsignado = 'Operador Terreno';
    } else if (passTrim === '12345') {
      rolAsignado = 'Químico';
    } else if (passTrim === '123456') {
      rolAsignado = 'Veolia';
    } else {
      setErrorMsg('Contraseña equivocada.');
      return;
    }

    const usuarioSesion = {
      email: emailTrim,
      rol: rolAsignado,
      loginAt: new Date().toISOString()
    };

    // Guardar sesión de módulo químico en localStorage para persistencia
    try {
      localStorage.setItem('sesion_modulo_quimico', JSON.stringify(usuarioSesion));
    } catch (_) {}

    onLoginExitoso(usuarioSesion);
  };

  return (
    <div className={`min-h-[80vh] flex flex-col items-center justify-center p-4 transition-colors duration-300 ${
      modoNocturno ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
    }`}>
      {/* Botón de Regreso al Menú Principal */}
      <div className="w-full max-w-md mb-4 flex justify-start">
        <button
          onClick={onVolver}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${
            modoNocturno
              ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Menú Operativo
        </button>
      </div>

      {/* Tarjeta de Autenticación Módulo Químico */}
      <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 sm:p-8 backdrop-blur-md relative ${
        modoNocturno ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        {/* Encabezado */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-3.5 bg-gradient-to-tr from-cyan-600 via-teal-600 to-emerald-600 rounded-2xl shadow-lg mb-3">
            <FlaskConical className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-wider bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            Módulo de Análisis Químicos
          </h2>
          <p className={`text-xs mt-1 font-medium ${modoNocturno ? 'text-slate-400' : 'text-slate-500'}`}>
            Autenticación de Acceso y Trazabilidad de Muestras
          </p>
        </div>

        {/* Alerta de Error */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl border border-red-500/50 bg-red-950/60 text-red-300 text-xs font-bold flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
              modoNocturno ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Correo Corporativo
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@generadora.cl"
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                  modoNocturno
                    ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
              modoNocturno ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Contraseña de Rol
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                  modoNocturno
                    ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex flex-wrap gap-2 justify-between">
              <span>Claves asignadas por rol:</span>
              <span className="font-mono text-cyan-400 font-bold">1234 | 12345 | 123456</span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-4 rounded-xl font-black text-sm uppercase tracking-wider bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white shadow-lg shadow-teal-900/40 transform hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-5 h-5" />
            Ingresar a Análisis Químicos
          </button>
        </form>

        {/* Leyenda Informativa */}
        <div className={`mt-6 pt-4 border-t text-[11px] text-center ${
          modoNocturno ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
        }`}>
          Sistema con trazabilidad y registro de auditoría en Supabase.
        </div>
      </div>
    </div>
  );
}
