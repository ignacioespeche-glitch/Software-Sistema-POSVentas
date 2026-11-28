import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  AlertTriangle,
  CreditCard,
  Lock,
  MessageCircle,
  ExternalLink,
  Loader2,
  ArrowLeft,
  LogOut
} from 'lucide-react';

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
  const { perfil, signOut } = useAuth() as any;
  const navigate = useNavigate();
  const [empresa, setEmpresa] = useState<EmpresaSuscripcion | null>(null);
  const [loading, setLoading] = useState(true);
  const [mostrarModalPago, setMostrarModalPago] = useState(false);
  const [generandoLink, setGenerandoLink] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  const cargarEmpresa = async () => {
    if (!perfil?.empresa_id) {
      setEmpresa(null);
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

  const handleVolverYCambiarCuenta = async () => {
    setCerrandoSesion(true);
    try {
      if (typeof signOut === 'function') {
        await signOut();
      } else {
        await supabase.auth.signOut();
      }
      setEmpresa(null);
      navigate('/', { replace: true });
    } catch {
      await supabase.auth.signOut();
      window.location.href = '/';
    } finally {
      setCerrandoSesion(false);
    }
  };

  const handleIniciarPagoMP = async () => {
    if (!empresa) return;

    if (empresa.link_mercadopago) {
      window.open(empresa.link_mercadopago, '_blank');
      return;
    }

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

  if (loading || !perfil || !empresa || empresa.es_marca_interna) {
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

  // PANTALLA DE BLOQUEO TOTAL (Temática oscura + naranja GEMI)
  if (estaBloqueado) {
    return (
      <div className="relative min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 overflow-hidden">
        {/* Fondo decorativo con logo GEMI y resplandor naranja */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-orange-500/15 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl" />
          <img
            src="/logo-gemi.jpeg"
            alt=""
            className="w-[520px] max-w-[90vw] rounded-full opacity-[0.07] grayscale contrast-125 select-none"
          />
        </div>

        {/* Barra superior para volver atrás / cambiar de cuenta */}
        <div className="absolute top-4 left-4 right-4 max-w-4xl mx-auto flex items-center justify-between z-10">
          <button
            type="button"
            disabled={cerrandoSesion}
            onClick={handleVolverYCambiarCuenta}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-orange-500/40 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-orange-400" />
            {cerrandoSesion ? 'Saliendo...' : 'Volver al menú principal'}
          </button>

          <button
            type="button"
            disabled={cerrandoSesion}
            onClick={handleVolverYCambiarCuenta}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-500/40 text-xs font-bold text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cambiar de cuenta
          </button>
        </div>

        {/* Tarjeta principal */}
        <div className="relative z-10 bg-slate-900/95 backdrop-blur-md border border-slate-800 shadow-2xl shadow-black/70 rounded-3xl max-w-lg w-full p-6 md:p-8 space-y-6 mt-10 sm:mt-0">
          {/* Cabecera con logo GEMI */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo-gemi.jpeg"
                alt="GEMI"
                className="w-11 h-11 rounded-2xl object-cover border border-orange-500/40 shadow-md shadow-orange-500/10"
              />
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-orange-400 flex items-center gap-1.5">
                  <Lock className="w-3 h-3" /> Suscripción GEMI Vencida
                </span>
                <h1 className="text-xl font-black text-white">Tu cuenta está en pausa</h1>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">
            El período activo de <strong className="text-white">{empresa.nombre}</strong> finalizó. Tus datos, ventas e inventario están intactos; aboná tu renovación para reactivar el sistema al instante.
          </p>

          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Plan contratado:</span>
              <span className="font-black uppercase text-orange-400">{empresa.nombre_plan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Abono base mensual:</span>
              <span className="font-bold text-slate-200 font-mono">
                ${Number(empresa.precio_mensual).toLocaleString('es-AR')}
              </span>
            </div>
            {empresa.usuarios_extra > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">
                  Sucursales / Usuarios extra ({empresa.usuarios_extra}):
                </span>
                <span className="font-bold text-slate-200 font-mono">
                  ${(empresa.usuarios_extra * empresa.precio_usuario_extra).toLocaleString('es-AR')}
                </span>
              </div>
            )}
            <div className="border-t border-slate-800 pt-2.5 flex justify-between items-baseline text-sm">
              <span className="font-black text-white">Total a abonar (30 días):</span>
              <span className="font-black text-orange-400 text-base font-mono">
                ${totalPagar.toLocaleString('es-AR')}
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              disabled={generandoLink}
              onClick={handleIniciarPagoMP}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black py-3.5 px-4 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer transition-all disabled:opacity-60"
            >
              {generandoLink ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Conectando con Mercado Pago...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" /> Reactivar ahora con Mercado Pago
                </>
              )}
            </button>

            <a
              href={`https://wa.me/5492610000000?text=${encodeURIComponent(
                `Hola equipo de GEMI! Necesito ayuda con la renovación de ${empresa.nombre}.`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" /> Contactar a soporte por WhatsApp
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
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-slate-950 px-4 py-2 text-xs font-black flex flex-wrap items-center justify-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {diasRestantes === 0
              ? 'Tu suscripción de GEMI vence HOY.'
              : `Tu suscripción de GEMI vence en ${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'}.`}
          </span>
          <button
            type="button"
            onClick={() => setMostrarModalPago(true)}
            className="bg-slate-950 text-orange-400 hover:bg-slate-900 font-black px-3 py-1 rounded-lg text-[11px] uppercase tracking-wider cursor-pointer transition-colors"
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
              <div className="flex items-center gap-2.5">
                <img
                  src="/logo-gemi.jpeg"
                  alt="GEMI"
                  className="w-7 h-7 rounded-lg object-cover border border-orange-500/40"
                />
                <h3 className="font-black text-base">Renovar Suscripción GEMI</h3>
              </div>
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
                <span className="font-bold text-orange-400">{empresa.nombre_plan}</span>
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
                <span className="text-orange-400">${totalPagar.toLocaleString('es-AR')}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={generandoLink}
              onClick={handleIniciarPagoMP}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black py-3.5 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60"
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