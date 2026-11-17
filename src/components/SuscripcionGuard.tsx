import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { AlertTriangle, CreditCard, Lock, MessageCircle, ExternalLink, Loader2 } from 'lucide-react';

interface EmpresaSuscripcion {
  id: string;
  nombre: string;
  es_marca_interna: boolean;
  activa: boolean;
  estado_suscripcion: string;
  nombre_plan: string;
  precio_mensual: number;
  usuarios_extra: number;
  precio_usuario_extra: number;
  fecha_vencimiento: string | null;
  link_mercadopago: string | null;
}

export const SuscripcionGuard = ({ children }: { children: React.ReactNode }) => {
  const { perfil } = useAuth();
  const [empresa, setEmpresa] = useState<EmpresaSuscripcion | null>(null);
  const [loading, setLoading] = useState(true);
  const [mostrarModalPago, setMostrarModalPago] = useState(false);
  const [generandoLink, setGenerandoLink] = useState(false);

  const cargarEmpresa = async () => {
    if (!perfil?.empresa_id) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('empresas')
      .select(
        'id, nombre, es_marca_interna, activa, estado_suscripcion, nombre_plan, precio_mensual, usuarios_extra, precio_usuario_extra, fecha_vencimiento, link_mercadopago'
      )
      .eq('id', perfil.empresa_id)
      .single();

    if (data) {
      setEmpresa(data as EmpresaSuscripcion);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarEmpresa();
  }, [perfil?.empresa_id]);

  const handleIniciarPagoMP = async () => {
    if (!empresa) return;

    // Si tiene un link manual cargado en SuperAdmin, lo usa primero
    if (empresa.link_mercadopago) {
      window.open(empresa.link_mercadopago, '_blank');
      return;
    }

    // Genera el link de pago automático por el monto exacto en Mercado Pago
    setGenerandoLink(true);
    const { data, error } = await supabase.functions.invoke('crear-pago-mp', {
      body: { empresa_id: empresa.id }
    });
    setGenerandoLink(false);

    if (error || !data?.init_point) {
      alert('No se pudo iniciar el pago con Mercado Pago. Intentá nuevamente o escribinos por WhatsApp.');
      return;
    }

    window.location.href = data.init_point;
  };

  if (loading || !empresa || empresa.es_marca_interna) {
    return <>{children}</>;
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const venc = empresa.fecha_vencimiento ? new Date(empresa.fecha_vencimiento + 'T00:00:00') : null;
  const diasRestantes = venc ? Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)) : 30;

  const estaBloqueado =
    empresa.estado_suscripcion === 'pausado' || !empresa.activa || diasRestantes < 0;

  const porVencer = !estaBloqueado && diasRestantes >= 0 && diasRestantes <= 5;

  const totalPagar =
    Number(empresa.precio_mensual || 0) +
    Number(empresa.usuarios_extra || 0) * Number(empresa.precio_usuario_extra || 0);

  // PANTALLA DE BLOQUEO TOTAL (Cuenta en pausa o vencida)
  if (estaBloqueado) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl max-w-lg w-full p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-600">
                Suscripción G.E.M.I. Vencida
              </span>
              <h1 className="text-xl font-black text-slate-900">Tu cuenta está en pausa</h1>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            El período activo de <strong>{empresa.nombre}</strong> finalizó. Tus datos, ventas e inventario están intactos; aboná tu renovación para reactivar el sistema al instante.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Plan contratado:</span>
              <span className="font-black text-slate-900">{empresa.nombre_plan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Abono base mensual:</span>
              <span className="font-bold text-slate-800">${Number(empresa.precio_mensual).toLocaleString('es-AR')}</span>
            </div>
            {empresa.usuarios_extra > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">
                  Sucursales / Usuarios extra ({empresa.usuarios_extra}):
                </span>
                <span className="font-bold text-slate-800">
                  ${(empresa.usuarios_extra * empresa.precio_usuario_extra).toLocaleString('es-AR')}
                </span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-2 flex justify-between text-sm">
              <span className="font-black text-slate-900">Total a abonar (30 días):</span>
              <span className="font-black text-sky-600">${totalPagar.toLocaleString('es-AR')}</span>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              disabled={generandoLink}
              onClick={handleIniciarPagoMP}
              className="w-full bg-[#009EE3] hover:bg-[#0089C7] text-white font-black py-3.5 px-4 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 cursor-pointer transition-colors disabled:opacity-60"
            >
              {generandoLink ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Conectando con Mercado Pago...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" /> Reactivar ahora pagando a través de Mercado Pago
                </>
              )}
            </button>

            <a
              href={`https://wa.me/5492610000000?text=${encodeURIComponent(
                `Hola equipo de G.E.M.I.! Necesito ayuda con la renovación de ${empresa.nombre}.`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" /> Contactar a soporte por WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* BANNER PREVENTIVO URGENTE (1 a 5 días antes de vencer) */}
      {porVencer && (
        <div className="bg-rose-600 text-white px-4 py-2 text-xs font-bold flex flex-wrap items-center justify-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {diasRestantes === 0
              ? 'Tu suscripción de G.E.M.I. vence HOY.'
              : `Tu suscripción de G.E.M.I. vence en ${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'}.`}
          </span>
          <button
            type="button"
            onClick={() => setMostrarModalPago(true)}
            className="bg-white text-rose-700 hover:bg-rose-50 font-black px-3 py-1 rounded-lg text-[11px] uppercase tracking-wider cursor-pointer transition-colors"
          >
            PAGAR AHORA →
          </button>
        </div>
      )}

      {children}

      {/* MODAL DE PAGO PREVENTIVO */}
      {mostrarModalPago && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-base">Renovar Suscripción G.E.M.I.</h3>
              <button
                type="button"
                onClick={() => setMostrarModalPago(false)}
                className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Local:</span>
                <span className="font-bold">{empresa.nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Plan:</span>
                <span className="font-bold text-sky-400">{empresa.nombre_plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Base mensual:</span>
                <span>${Number(empresa.precio_mensual).toLocaleString('es-AR')}</span>
              </div>
              {empresa.usuarios_extra > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Extras ({empresa.usuarios_extra}):</span>
                  <span>
                    ${(empresa.usuarios_extra * empresa.precio_usuario_extra).toLocaleString('es-AR')}
                  </span>
                </div>
              )}
              <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-black">
                <span>Total (30 días):</span>
                <span className="text-emerald-400">${totalPagar.toLocaleString('es-AR')}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={generandoLink}
              onClick={handleIniciarPagoMP}
              className="w-full bg-[#009EE3] hover:bg-[#0089C7] text-white font-black py-3.5 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-60"
            >
              {generandoLink ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Generando orden en Mercado Pago...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4" /> Pagar ahora a través de Mercado Pago
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
};