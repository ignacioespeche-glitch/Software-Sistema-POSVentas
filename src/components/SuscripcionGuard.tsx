import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { AlertTriangle, ArrowRight, CreditCard, Lightbulb, RefreshCw, Wallet, MessageCircle, X, Megaphone } from 'lucide-react';

export const SuscripcionGuard = ({ children }: { children: React.ReactNode }) => {
  const { empresa, perfil, cerrarSesion } = useAuth();
  const location = useLocation();
  const [modalPagoAbierto, setModalPagoAbierto] = useState(false);
  const [avisoMpSinLink, setAvisoMpSinLink] = useState(false);
  const [anuncioGlobal, setAnuncioGlobal] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('saas_anuncios')
      .select('mensaje')
      .eq('activo', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.mensaje) setAnuncioGlobal(data.mensaje);
      });
  }, []);

  // Nunca bloquear rutas públicas ni el panel de superadmin
  const esRutaExenta =
    location.pathname === '/login' ||
    location.pathname === '/onboarding' ||
    location.pathname === '/registro' ||
    location.pathname === '/superadmin' ||
    location.pathname.startsWith('/ticket/');

  if (esRutaExenta || !empresa || !perfil) {
    return <>{children}</>;
  }

  const emp: any = empresa;

  // Marcas propias (Aspen, SouthCol) nunca se bloquean
  if (emp.es_marca_interna) {
    return (
      <>
        {anuncioGlobal && (
          <div className="bg-sky-950/90 border-b border-sky-500/30 px-4 py-1.5 text-xs text-sky-200 flex items-center justify-center gap-2">
            <Megaphone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>{anuncioGlobal}</span>
          </div>
        )}
        {children}
      </>
    );
  }

  // Cálculo de días restantes
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let diasRestantes = 30;
  if (emp.fecha_vencimiento) {
    const venc = new Date(emp.fecha_vencimiento + 'T00:00:00');
    const diffMs = venc.getTime() - hoy.getTime();
    diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  const estaPausada =
    emp.estado_suscripcion === 'pausado' ||
    emp.activa === false ||
    diasRestantes < 0;

  const enAlertaPreventiva = !estaPausada && diasRestantes <= 5;

  const precioBase = Number(emp.precio_mensual ?? 35000);
  const cantExtra = Number(emp.usuarios_extra ?? 0);
  const precioExtraUnit = Number(emp.precio_usuario_extra ?? 5000);
  const subtotalExtras = cantExtra * precioExtraUnit;
  const totalPagar = precioBase + subtotalExtras;
  const nombrePlan = emp.nombre_plan || 'PLAN BÁSICO';

  const handleClickMercadoPago = () => {
    if (emp.link_mercadopago && emp.link_mercadopago.trim().length > 5) {
      window.open(emp.link_mercadopago, '_blank');
    } else {
      setAvisoMpSinLink(true);
    }
  };

  // PANTALLA DE BLOQUEO TOTAL (CUENTA EN PAUSA / VENCIDA)
  if (estaPausada) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
        <div className="max-w-xl w-full space-y-6 text-center">
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              👋 ¡Nos alegra verte de nuevo por acá!
            </h1>
            <p className="text-sm sm:text-base text-slate-600 font-medium">
              Volvé a disfrutar de tu sistema de gestión 🚀
            </p>
          </div>

          <div className="bg-rose-50/90 border-2 border-rose-500/80 rounded-xl p-5 space-y-1.5 shadow-sm">
            <h2 className="text-lg sm:text-xl font-black text-rose-600">
              Tu cuenta está en pausa en este momento.
            </h2>
            <p className="text-xs sm:text-sm text-rose-600/90 leading-relaxed max-w-md mx-auto">
              Para seguir utilizando el sistema y acceder a la información de{' '}
              <span className="font-bold">{emp.nombre}</span>, solo necesitás reactivarla con un pago rápido y seguro.
            </p>
          </div>

          <p className="text-xs sm:text-sm text-slate-700 max-w-lg mx-auto leading-relaxed">
            <Lightbulb className="w-4 h-4 text-amber-500 inline mr-1 -mt-0.5" />
            <span className="font-bold">Recordá que el servicio se paga por período adelantado</span>, por eso, para seguir gestionando tu negocio sin interrupciones, deberás abonar el período de facturación en curso.
          </p>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md text-left space-y-4">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-base">
              <RefreshCw className="w-4 h-4" />
              <span>Detalle de la reactivación</span>
              <span className="text-slate-400 font-normal text-xs">(Mensual)</span>
            </div>

            <div className="divide-y divide-slate-100 text-sm">
              <div className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span className="font-semibold text-slate-700 uppercase">{nombrePlan}</span>
                </div>
                <span className="font-bold text-slate-900">
                  ${precioBase.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {cantExtra > 0 && (
                <div className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <span className="font-semibold text-slate-700">USUARIO / SUCURSAL EXTRA</span>
                    <span className="text-xs text-slate-400 font-bold">x{cantExtra}</span>
                  </div>
                  <span className="font-bold text-slate-900">
                    ${subtotalExtras.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div className="pt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <Wallet className="w-4 h-4 text-blue-600" />
                  <span>Total general a pagar:</span>
                </div>
                <span className="text-xl sm:text-2xl font-black text-rose-600">
                  ${totalPagar.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={handleClickMercadoPago}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3.5 rounded-xl text-sm shadow-lg shadow-blue-600/25 transition-all cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Reactivar ahora pagando a través de Mercado Pago
            </button>

            {avisoMpSinLink && (
              <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-3.5 text-xs max-w-md mx-auto space-y-2">
                <p className="font-bold">
                  El botón automático de Mercado Pago se está terminando de vincular para tu cuenta.
                </p>
                <p>
                  Podés abonar por transferencia y enviarnos el comprobante por WhatsApp para reactivarte en el acto:
                </p>
                <a
                  href={`https://wa.me/5492610000000?text=${encodeURIComponent(
                    `Hola! Quiero reactivar la cuenta de ${emp.nombre} (${nombrePlan} - $${totalPagar.toLocaleString('es-AR')}).`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 bg-emerald-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-emerald-700"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Enviar comprobante por WhatsApp
                </a>
              </div>
            )}

            <div>
              <button
                type="button"
                onClick={cerrarSesion}
                className="text-xs text-slate-400 hover:text-slate-600 underline cursor-pointer"
              >
                Cerrar sesión o cambiar de usuario
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* BANNER SUPERIOR DE AVISO URGENTE (1 A 5 DÍAS ANTES DE VENCER) */}
      {enAlertaPreventiva && (
        <div className="bg-red-600 text-white px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold shadow-md z-50 relative">
          <div className="flex items-center gap-2.5 mx-auto sm:mx-0">
            <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
            <span>
              URGENTE: Tu cuenta tiene un pago pendiente
              {diasRestantes === 0
                ? ' (vence hoy).'
                : diasRestantes === 1
                ? ' (vence mañana).'
                : ` (vence en ${diasRestantes} días).`}{' '}
              Regularizalo para seguir usando el sistema sin cortes.
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setAvisoMpSinLink(false);
              setModalPagoAbierto(true);
            }}
            className="bg-white hover:bg-slate-100 text-red-600 font-black px-3.5 py-1.5 rounded-md text-[11px] uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm cursor-pointer mx-auto sm:mx-0 transition-colors"
          >
            PAGAR AHORA <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* BANNER DE ANUNCIO GLOBAL DEL SAAS */}
      {anuncioGlobal && !enAlertaPreventiva && (
        <div className="bg-sky-950/90 border-b border-sky-500/30 px-4 py-1.5 text-xs text-sky-200 flex items-center justify-center gap-2">
          <Megaphone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>{anuncioGlobal}</span>
        </div>
      )}

      {children}

      {/* MODAL DE PAGO PREVENTIVO (CUANDO TOCAN "PAGAR AHORA" EN EL BANNER ROJO) */}
      {modalPagoAbierto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
            <button
              type="button"
              onClick={() => setModalPagoAbierto(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-600 px-2.5 py-1 rounded-full">
                Renovación Mensual
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-2">
                Detalle de tu suscripción
              </h3>
              <p className="text-xs text-slate-500">
                Abonando ahora evitás la pausa automática de {emp.nombre}.
              </p>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 divide-y divide-slate-100 text-sm">
              <div className="pb-2.5 flex justify-between">
                <span className="font-semibold text-slate-700">{nombrePlan}</span>
                <span className="font-bold">${precioBase.toLocaleString('es-AR')}</span>
              </div>
              {cantExtra > 0 && (
                <div className="py-2.5 flex justify-between">
                  <span className="font-semibold text-slate-700">Extras (x{cantExtra})</span>
                  <span className="font-bold">${subtotalExtras.toLocaleString('es-AR')}</span>
                </div>
              )}
              <div className="pt-2.5 flex justify-between items-center">
                <span className="font-bold text-slate-800">Total a abonar:</span>
                <span className="text-xl font-black text-red-600">
                  ${totalPagar.toLocaleString('es-AR')}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClickMercadoPago}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              Pagar ahora a través de Mercado Pago
            </button>

            {avisoMpSinLink && (
              <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-3 text-xs space-y-2 text-center">
                <p className="font-bold">
                  Pasarela automática de Mercado Pago en configuración.
                </p>
                <p>
                  Escribinos por WhatsApp para enviarte el alias o link directo y acreditar tus +30 días al instante.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};