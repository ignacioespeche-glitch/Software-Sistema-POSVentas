import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Boxes,
  Store,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  WifiOff,
  Lock,
  BarChart3,
  MessageCircle,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';

// =========================================================================
// CONFIGURACIÓN COMERCIAL (Completar en la puesta a punto final)
// =========================================================================
const WHATSAPP_COMERCIAL: string = ''; // Ej: '5492615551234' (si queda vacío, el botón se oculta limpio)
const MOSTRAR_PRECIOS: boolean = false; // Cambiar a true cuando definan los precios exactos

const PLANES_REFERENCIA = [
  {
    nombre: 'Plan Local Inicial',
    precio: '$0',
    periodo: '/mes',
    descripcion: 'Ideal para tiendas con un único punto de venta que buscan ordenar su stock.',
    items: [
      '1 Sucursal operativa',
      'Punto de Venta rápido + Modo Offline',
      'Matriz de talles y colores ilimitada',
      'Importador masivo desde Excel / CSV',
      'Tickets digitales por WhatsApp'
    ]
  },
  {
    nombre: 'Plan Marca Multisucursal',
    precio: '$0',
    periodo: '/mes',
    destacado: true,
    descripcion: 'Control total para marcas en expansión con múltiples locales y depósitos.',
    items: [
      'Múltiples sucursales conectadas en vivo',
      'Traspasos entre locales con remito y auditoría',
      'Caja ciega, PIN de descuentos y bitácora anti-robo',
      'Panel Ejecutivo con márgenes y mapa de calor',
      'Soporte prioritario por WhatsApp'
    ]
  }
];

export const LandingView = () => {
  const telefonoLimpio = WHATSAPP_COMERCIAL.replace(/\D/g, '');
  const whatsappLink = telefonoLimpio
    ? `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(
        'Hola equipo de G.E.M.I.! Quiero conocer más sobre el sistema POS para mi local.'
      )}`
    : '';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* NAVBAR COMERCIAL */}
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/40 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-sky-400" />
            </div>
            <span className="font-black text-lg tracking-wider text-white">G.E.M.I.</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-400">
            <a href="#funciones" className="hover:text-white transition-colors">
              Funciones
            </a>
            <a href="#seguridad" className="hover:text-white transition-colors">
              Control & Seguridad
            </a>
            <a href="#empezar" className="hover:text-white transition-colors">
              Prueba Gratis
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              to="/login"
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800 transition-colors"
            >
              Ingresar
            </Link>
            <Link
              to="/onboarding"
              className="px-4 py-2 rounded-xl text-xs font-black bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors shadow-lg shadow-sky-500/10"
            >
              Probar Gratis
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-14 pb-20 md:pt-20 md:pb-28 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              Software de Gestión & Punto de Venta para Indumentaria y Comercios
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-[1.1]">
              Controlá tus ventas, talles y sucursales{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400">
                sin caos ni planillas sueltas.
              </span>
            </h1>

            <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-400 leading-relaxed">
              Cobrá en segundos desde el mostrador, enviá tickets digitales por WhatsApp, auditá la caja de tus empleados y manejá el stock de todas tus tiendas desde un solo lugar.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                to="/onboarding"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-sm inline-flex items-center justify-center gap-2 transition-all shadow-xl shadow-sky-500/15"
              >
                Crear cuenta gratis <ArrowRight className="w-4 h-4" />
              </Link>

              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" /> Hablar por WhatsApp
                </a>
              )}
            </div>

            {/* Prueba social */}
            <div className="pt-8 border-t border-slate-800/70 max-w-xl mx-auto">
              <p className="text-[11px] uppercase tracking-widest font-bold text-slate-500 mb-3">
                Marcas que ya operan todos los días con G.E.M.I.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6 text-slate-300 font-black tracking-wider text-sm">
                <span className="px-4 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                  ASPEN CLOTHING
                </span>
                <span className="px-4 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                  SOUTH COL
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* GRILLA DE FUNCIONES */}
        <section id="funciones" className="py-16 px-4 sm:px-6 bg-slate-900/40 border-y border-slate-800/80">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Todo lo que necesita tu local para vender más rápido
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Diseñado directamente junto a dueños de locales de ropa para resolver los problemas reales del mostrador.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center">
                  <Boxes className="w-5 h-5" />
                </div>
                <h3 className="font-black text-base text-white">Matriz de Talles y Colores</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Cargá curvas de talles completas (S a XXL o numéricos) y controlá exactamente cuántas unidades quedan de cada color por sucursal.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h3 className="font-black text-base text-white">Importación Masiva con Excel</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  ¿Tenés cientos de prendas? Descargá nuestra plantilla vacía, completala y subí todo tu catálogo y precios iniciales en segundos.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="font-black text-base text-white">Tickets Digitales por WhatsApp</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Ahorrá papel térmico y fidelizá clientes enviando el comprobante digital con un clic apenas cerrás la venta.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                  <Store className="w-5 h-5" />
                </div>
                <h3 className="font-black text-base text-white">Multisucursal & Traspasos</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enviá mercadería de un local a otro con remitos digitales y confirmación de recepción para que nunca desaparezca una prenda.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                  <WifiOff className="w-5 h-5" />
                </div>
                <h3 className="font-black text-base text-white">Modo Offline Automático</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Si se corta internet en el local, seguís cobrando igual. Cuando vuelve la conexión, las ventas se sincronizan solas.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="font-black text-base text-white">Métricas Reales de Ganancia</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Conocé tu ticket promedio, margen bruto real, horarios pico de ventas y comparativa mes contra mes en tiempo real.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SEGURIDAD Y AUDITORÍA */}
        <section id="seguridad" className="py-16 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-400">
                <Lock className="w-4 h-4" /> Tranquilidad para dueños
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Delegá el mostrador sin perder el control
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Cada movimiento sensible queda grabado en tu Bitácora de Auditoría para que puedas revisar todo desde tu celular o computadora.
              </p>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  Arqueo de caja ciego al cerrar cada turno.
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  Tope de descuento para vendedores con autorización por PIN de Admin.
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  Ocultamiento automático de costos y márgenes a empleados.
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  Registro de anulaciones y ajustes manuales de inventario.
                </li>
              </ul>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="font-black text-white">Bitácora de Seguridad en Vivo</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold">
                  Activo
                </span>
              </div>
              <div className="space-y-2.5">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-black text-amber-400 uppercase">Ajuste Stock Manual</span>
                  <p className="text-slate-300 mt-0.5">Remera Boxy Negra T.L: 12 → 10 unid. · Sucursal Centro</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-black text-sky-400 uppercase">Descuento Especial Autorizado</span>
                  <p className="text-slate-300 mt-0.5">Descuento 15% aprobado con PIN de Administrador</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-black text-emerald-400 uppercase">Cierre de Turno</span>
                  <p className="text-slate-300 mt-0.5">Caja cerrada sin diferencias ($0)</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECCIÓN DE PLANES / PRUEBA GRATIS */}
        <section id="empezar" className="py-16 px-4 sm:px-6 bg-slate-900/40 border-t border-slate-800/80">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Empezá hoy sin complicaciones
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Creá la cuenta de tu tienda en 2 minutos, cargá tus prendas y probá G.E.M.I. en funcionamiento real.
              </p>
            </div>

            {MOSTRAR_PRECIOS ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {PLANES_REFERENCIA.map((plan) => (
                  <div
                    key={plan.nombre}
                    className={`rounded-2xl p-6 border flex flex-col justify-between space-y-6 ${
                      plan.destacado
                        ? 'bg-slate-900 border-sky-500/60 shadow-xl shadow-sky-500/10'
                        : 'bg-slate-900/70 border-slate-800'
                    }`}
                  >
                    <div className="space-y-3">
                      <h3 className="font-black text-lg text-white">{plan.nombre}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-emerald-400">{plan.precio}</span>
                        <span className="text-xs text-slate-400">{plan.periodo}</span>
                      </div>
                      <p className="text-xs text-slate-400">{plan.descripcion}</p>
                      <ul className="space-y-2 pt-2 text-xs text-slate-300">
                        {plan.items.map((item) => (
                          <li key={item} className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Link
                      to="/onboarding"
                      className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs text-center uppercase tracking-wider transition-colors"
                    >
                      Probar Gratis
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-sky-500/30 rounded-3xl p-8 md:p-10 text-center max-w-3xl mx-auto space-y-5 shadow-2xl">
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Activá tu prueba gratuita y adaptamos el plan a tus sucursales
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
                  Sin instalaciones ni servidores propios. Funciona desde cualquier computadora, notebook o celular conectado a internet.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <Link
                    to="/onboarding"
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-sm inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    Crear mi tienda gratis <ArrowRight className="w-4 h-4" />
                  </Link>
                  {whatsappLink && (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-400" /> Consultar por WhatsApp
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-950 py-8 px-4 sm:px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span className="font-bold text-slate-300">G.E.M.I.</span>
            <span>· Sistema de Gestión Comercial & POS</span>
          </div>

          <div className="flex items-center gap-5">
            <Link to="/terminos" className="hover:text-slate-300 transition-colors">
              Términos y Condiciones
            </Link>
            <Link to="/privacidad" className="hover:text-slate-300 transition-colors">
              Política de Privacidad
            </Link>
            <Link to="/login" className="hover:text-slate-300 transition-colors">
              Acceso Clientes
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};