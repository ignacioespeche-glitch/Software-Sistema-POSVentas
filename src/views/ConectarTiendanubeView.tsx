import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Globe, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';

export const ConectarTiendanubeView = () => {
  const [estado, setEstado] = useState<'inicial' | 'procesando' | 'exito' | 'error'>('inicial');
  const [nombreEmpresa, setNombreEmpresa] = useState<string>('');
  const [nombreTiendaTn, setNombreTiendaTn] = useState<string>('');
  const [mensajeError, setMensajeError] = useState<string>('');
  const [empresaId, setEmpresaId] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const empParam = params.get('empresa_id');
    const codeTn = params.get('code');

    // Caso 1: El dueño abrió el link que le mandaste por WhatsApp (?empresa_id=...)
    if (empParam) {
      localStorage.setItem('gemi_oauth_empresa_id', empParam);
      setEmpresaId(empParam);

      supabase
        .from('empresas')
        .select('nombre')
        .eq('id', empParam)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.nombre) setNombreEmpresa(data.nombre);
        });
    }

    // Caso 2: Tiendanube lo redirigió de vuelta con el código de autorización (?code=...)
    if (codeTn) {
      const targetEmpresaId = empParam || localStorage.getItem('gemi_oauth_empresa_id') || '';
      window.history.replaceState({}, '', '/conectar-tiendanube');

      if (!targetEmpresaId) {
        setEstado('error');
        setMensajeError('No se encontró la referencia del local. Pedile a soporte de GEMI que te reenvíe el enlace de vinculación.');
        return;
      }

      setEstado('procesando');
      supabase.functions
        .invoke('tiendanube-sync', {
          body: {
            action: 'oauth_callback',
            empresa_id: targetEmpresaId,
            code: codeTn,
          },
        })
        .then(({ data, error }) => {
          if (error || data?.error) {
            setEstado('error');
            setMensajeError(data?.error || error?.message || 'Error al vincular la tienda.');
          } else {
            localStorage.removeItem('gemi_oauth_empresa_id');
            setNombreTiendaTn(data.store_name || 'Tu Tiendanube');
            setEstado('exito');
          }
        });
    }
  }, []);

  const iniciarAutorizacion = () => {
    if (!empresaId) {
      setEstado('error');
      setMensajeError('El enlace no tiene un identificador de comercio válido. Solicitá un nuevo enlace a GEMI.');
      return;
    }
    localStorage.setItem('gemi_oauth_empresa_id', empresaId);
    window.location.href = 'https://www.tiendanube.com/apps/55006/authorize';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-7 space-y-6 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center">
            <Globe className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-sky-400">
              GEMI Software · Integración Oficial
            </span>
            <h1 className="text-lg font-black text-white leading-tight">
              Vincular Tiendanube
            </h1>
          </div>
        </div>

        {estado === 'inicial' && (
          <div className="space-y-5">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1.5">
              <p className="text-xs text-slate-400">Comercio a vincular en GEMI:</p>
              <p className="text-base font-black text-white">
                {nombreEmpresa || (empresaId ? 'Comercio verificado' : 'Enlace sin comercio')}
              </p>
            </div>

            <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
              <p>
                Al tocar el botón de abajo vas a ser redirigido a <strong>Tiendanube</strong> para autorizar la conexión de stock y ventas con <strong>GEMI</strong>.
              </p>
              <p className="text-slate-400 flex items-center gap-1.5 pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                No necesitás compartir tu contraseña con nadie.
              </p>
            </div>

            <button
              type="button"
              onClick={iniciarAutorizacion}
              disabled={!empresaId}
              className="w-full bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black py-3 px-4 rounded-xl text-xs uppercase tracking-wider cursor-pointer transition-colors flex items-center justify-center gap-2"
            >
              Autorizar mi Tiendanube <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {estado === 'procesando' && (
          <div className="py-8 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-white">Conectando tu tienda con GEMI...</p>
            <p className="text-xs text-slate-400">Esto demora solo unos segundos.</p>
          </div>
        )}

        {estado === 'exito' && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h2 className="text-base font-black text-white">
              ¡{nombreTiendaTn} vinculada con éxito!
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Ya podés cerrar esta ventana y avisarle al equipo de <strong>GEMI</strong> para que active la sincronización inicial de tu catálogo.
            </p>
          </div>
        )}

        {estado === 'error' && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              No se pudo completar la vinculación
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{mensajeError}</p>
          </div>
        )}
      </div>
    </div>
  );
};