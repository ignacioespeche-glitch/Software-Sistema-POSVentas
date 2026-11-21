import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes,
  Store,
  ArrowRight,
  CheckCircle2,
  Lock,
  MessageCircle,
  Sparkles,
  Calendar,
  ShoppingCart,
  Plus,
  Trash2,
  Headphones,
  Check,
  X,
  ChevronDown,
  Receipt
} from 'lucide-react';

// =========================================================================
// CONFIGURACIÓN COMERCIAL Y MARCAS ALIADAS (Editá esta sección cuando quieras)
// =========================================================================
const WHATSAPP_COMERCIAL: string = ''; // Ej: '5492615551234'
const MOSTRAR_PRECIOS: boolean = false; // Cambiar a true cuando publiquen valores

// Agregá o editá acá las marcas amigas que trabajan con GEMI
const MARCAS_ALIADAS = [
  { nombre: 'ASPEN CLOTHING', rubro: 'Streetwear & Indumentaria', activa: true },
  { nombre: 'SOUTH COL', rubro: 'Indumentaria Urbana', activa: true },
  { nombre: 'TU MARCA ACÁ', rubro: 'Próximo comercio aliado', activa: false },
  { nombre: 'MARCA ALIADA', rubro: 'Indumentaria & Accesorios', activa: false },
  { nombre: 'TIENDA AMIGA', rubro: 'Comercio Minorista', activa: false },
  { nombre: 'SHOWROOM', rubro: 'Moda & Diseño', activa: false },
];

const PLANES_REFERENCIA = [
  {
    nombre: 'Plan Local Único',
    precio: '$0',
    periodo: '/mes',
    descripcion: 'Todo lo necesario para ordenar un local a la calle o showroom.',
    items: [
      '1 Sucursal operativa + Modo Offline',
      'Punto de Venta con matriz de talles y colores',
      'Facturación ARCA y tickets por WhatsApp',
      'Calendario de vencimientos y gestión de tareas',
      'Acompañamiento 1 a 1 en configuración'
    ]
  },
  {
    nombre: 'Plan Marca Full + GEMI AI',
    precio: '$0',
    periodo: '/mes',
    destacado: true,
    descripcion: 'El ecosistema completo para marcas que buscan escalar y automatizar.',
    items: [
      'Múltiples sucursales y traspasos con remito',
      'GEMI AI: detección de oportunidades, promos y flyers',
      'Caja ciega, PIN de descuentos y bitácora anti-robo',
      'Panel Ejecutivo con márgenes reales',
      'Acompañamiento prioritario 1 a 1 continuo'
    ]
  }
];

const PRENDAS_DEMO = [
  { id: '1', nombre: 'Remera Boxy Heavy', color: 'Negro', precio: 34000, talles: ['S', 'M', 'L'], stock: 14 },
  { id: '2', nombre: 'Hoodie Oversize Wash', color: 'Carbón', precio: 68000, talles: ['M', 'L', 'XL'], stock: 8 },
  { id: '3', nombre: 'Cargo Pant Baggy', color: 'Arena', precio: 74000, talles: ['38', '40', '42'], stock: 6 },
];

const FAQS = [
  {
    pregunta: '¿En qué se diferencia GEMI de otros sistemas tradicionales como Dux o Fudo?',
    respuesta:
      'Los sistemas tradicionales solo cobran y llevan un stock básico, dejándote solo frente a tutoriales o bots de soporte. GEMI reúne en un mismo lugar el Punto de Venta, matriz de talles, facturación ARCA, calendario operativo, inteligencia artificial propia (GEMI AI) y un acompañamiento humano 1 a 1 para configurar y hacer crecer tu negocio.'
  },
  {
    pregunta: '¿Cómo funciona el acompañamiento 1 a 1?',
    respuesta:
      'Desde que creás tu cuenta, un especialista de nuestro equipo te acompaña paso a paso para importar tu catálogo desde Excel, configurar tus sucursales, dejar lista la facturación y armar tus primeras campañas.'
  },
  {
    pregunta: '¿Qué hace exactamente GEMI AI por mi tienda?',
    respuesta:
      'Analiza tus ventas y stock real todos los días, detecta prendas estancadas o productos estrella, calcula hasta qué porcentaje de descuento podés ofrecer sin perder rentabilidad y genera textos y piezas gráficas listas para publicar.'
  },
  {
    pregunta: '¿Qué pasa si se corta internet en el local?',
    respuesta:
      'GEMI cuenta con modo offline automático: podés seguir registrando ventas en el mostrador sin interrupciones y, apenas vuelve la conexión, toda la información se sincroniza sola.'
  }
];

export const LandingView = () => {
  // Estados interactivos de la landing
  const [carritoDemo, setCarritoDemo] = useState<{ id: string; nombre: string; talle: string; precio: number }[]>([
    { id: '1-M', nombre: 'Remera Boxy Heavy', talle: 'M', precio: 34000 }
  ]);
  const [tallesElegidos, setTallesElegidos] = useState<Record<string, string>>({
    '1': 'M',
    '2': 'L',
    '3': '40'
  });
  const [ventaSimuladaOk, setVentaSimuladaOk] = useState(false);

  const [tabActiva, setTabActiva] = useState<'pos' | 'ai' | 'control' | 'multi' | 'agenda'>('pos');
  const [descuentoDemoIA, setDescuentoDemoIA] = useState<number>(20);
  const [faqAbierta, setFaqAbierta] = useState<number | null>(0);

  const telefonoLimpio = WHATSAPP_COMERCIAL.replace(/\D/g, '');
  const whatsappLink = telefonoLimpio
    ? `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(
        'Hola equipo de GEMI! Quiero conocer más sobre el sistema y el acompañamiento 1 a 1 para mi negocio.'
      )}`
    : '';

  const agregarAlCarritoDemo = (prenda: typeof PRENDAS_DEMO[0]) => {
    const talle = tallesElegidos[prenda.id] || prenda.talles[0];
    setCarritoDemo((prev) => [
      ...prev,
      { id: `${prenda.id}-${talle}-${Date.now()}`, nombre: prenda.nombre, talle, precio: prenda.precio }
    ]);
    setVentaSimuladaOk(false);
  };

  const totalDemo = carritoDemo.reduce((acc, item) => acc + item.precio, 0);

  // Cálculo en vivo para el simulador de GEMI AI
  const precioBaseDemo = 68000;
  const costoBaseDemo = 29000;
  const precioPromoDemo = precioBaseDemo * (1 - descuentoDemoIA / 100);
  const margenDemo = Math.round(((precioPromoDemo - costoBaseDemo) / precioPromoDemo) * 100);

  return (
    <div className="min-h-screen bg-[#121212] text-zinc-100 flex flex-col justify-between selection:bg-[#FF4500] selection:text-white">
      {/* ================================================================= */}
      {/* NAVBAR COMERCIAL                                                  */}
      {/* ================================================================= */}
      <header className="sticky top-0 z-40 bg-[#121212]/90 backdrop-blur-md border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/logo-gemi.jpeg"
              alt="GEMI Software"
              className="h-9 w-auto rounded-lg object-contain bg-[#1E1E1E]"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-xs font-bold text-zinc-400">
            <a href="#interactivo" className="hover:text-white transition-colors">
              Probalo en Vivo
            </a>
            <a href="#gemi-ai" className="hover:text-white transition-colors">
              GEMI AI
            </a>
            <a href="#acompanamiento" className="hover:text-white transition-colors">
              Acompañamiento 1 a 1
            </a>
            <a href="#comparativa" className="hover:text-white transition-colors">
              ¿Por qué GEMI?
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              to="/login"
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-300 hover:text-white hover:bg-[#1E1E1E] border border-zinc-800 transition-colors"
            >
              Ingresar
            </Link>
            <Link
              to="/onboarding"
              className="px-4 py-2 rounded-xl text-xs font-black bg-[#FF4500] hover:bg-[#ff571a] text-white transition-colors shadow-lg shadow-[#FF4500]/20"
            >
              Probar Gratis
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ================================================================= */}
        {/* HERO SECTION INTERACTIVO (ESTILO FUDO)                            */}
        {/* ================================================================= */}
        <section className="relative overflow-hidden pt-12 pb-16 md:pt-16 md:pb-24 px-4 sm:px-6 border-b border-zinc-800/80">
          {/* Resplandor sutil naranja del logo */}
          <div className="absolute -top-24 right-1/4 w-96 h-96 bg-[#FF4500]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Columna Izquierda: Propuesta de Valor + Eslogan */}
            <div className="lg:col-span-6 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FF4500]/10 border border-[#FF4500]/30 text-[#FF4500] text-xs font-bold">
                <Headphones className="w-3.5 h-3.5" />
                Acompañamiento 1 a 1 único + Inteligencia Artificial incluida
              </div>

              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-[1.08]">
                Toda la gestión de tu negocio{' '}
                <span className="text-[#FF4500]">en un mismo lugar.</span>
              </h1>

              <p className="text-base sm:text-lg text-zinc-300 font-medium leading-relaxed">
                Tu inteligencia artificial personalizada y un acompañamiento 1 a 1 único.
              </p>

              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Punto de venta ultrarrápido, stock con talles y colores, facturación ARCA, calendario operativo y campañas automáticas con <strong className="text-white">GEMI AI</strong>. Sin planillas sueltas y sin quedarte solo frente a la pantalla.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <Link
                  to="/onboarding"
                  className="px-7 py-4 rounded-xl bg-[#FF4500] hover:bg-[#ff571a] text-white font-black text-sm inline-flex items-center justify-center gap-2 transition-all shadow-xl shadow-[#FF4500]/25"
                >
                  Crear mi cuenta gratis <ArrowRight className="w-4 h-4" />
                </Link>

                {whatsappLink ? (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noreferrer"
                    className="px-6 py-4 rounded-xl bg-[#1E1E1E] hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-400" /> Hablar 1 a 1 por WhatsApp
                  </a>
                ) : (
                  <a
                    href="#interactivo"
                    className="px-6 py-4 rounded-xl bg-[#1E1E1E] hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    Probar demo interactiva
                  </a>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-zinc-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#FF4500]" /> Configuración guiada 1 a 1
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#FF4500]" /> Funciona incluso sin internet
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#FF4500]" /> Sin instalaciones
                </span>
              </div>
            </div>

            {/* Columna Derecha: SIMULADOR POS INTERACTIVO (ESTILO FUDO) */}
            <div className="lg:col-span-6">
              <div className="bg-[#1E1E1E] border border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4">
                {/* Barra superior ventana */}
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF4500]" />
                    <span className="text-xs font-black tracking-wider text-white uppercase">
                      Mostrador en Vivo · GEMI POS
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FF4500]/15 text-[#FF4500]">
                    ¡Hacé clic y probalo!
                  </span>
                </div>

                {/* Selector de prendas interactivo */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {PRENDAS_DEMO.map((prenda) => {
                    const talleActual = tallesElegidos[prenda.id] || prenda.talles[0];
                    return (
                      <div
                        key={prenda.id}
                        className="bg-[#121212] border border-zinc-800 hover:border-[#FF4500]/60 rounded-2xl p-3 flex flex-col justify-between gap-2.5 transition-all"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-zinc-400">
                            <span>{prenda.color}</span>
                            <span className="text-emerald-400 font-bold">{prenda.stock} disp.</span>
                          </div>
                          <p className="font-bold text-white text-xs mt-0.5">{prenda.nombre}</p>
                          <p className="font-mono font-black text-[#FF4500] text-sm mt-1">
                            ${prenda.precio.toLocaleString('es-AR')}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex gap-1">
                            {prenda.talles.map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setTallesElegidos((prev) => ({ ...prev, [prenda.id]: t }))}
                                className={`flex-1 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                  talleActual === t
                                    ? 'bg-white text-black'
                                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                                }`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => agregarAlCarritoDemo(prenda)}
                            className="w-full py-1.5 rounded-lg bg-[#FF4500]/15 hover:bg-[#FF4500] text-[#FF4500] hover:text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Sumar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Ticket en vivo */}
                <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                      <ShoppingCart className="w-3.5 h-3.5 text-[#FF4500]" />
                      Ticket Actual ({carritoDemo.length} {carritoDemo.length === 1 ? 'prenda' : 'prendas'})
                    </span>
                    {carritoDemo.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setCarritoDemo([]);
                          setVentaSimuladaOk(false);
                        }}
                        className="text-[11px] text-zinc-500 hover:text-rose-400 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Vaciar
                      </button>
                    )}
                  </div>

                  {carritoDemo.length === 0 ? (
                    <p className="text-[11px] text-zinc-500 py-3 text-center">
                      Tocá "Sumar" en cualquier prenda de arriba para simular una venta.
                    </p>
                  ) : (
                    <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                      {carritoDemo.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs bg-[#1E1E1E] px-2.5 py-1.5 rounded-lg"
                        >
                          <span className="text-zinc-200 font-medium">
                            {item.nombre} <span className="text-zinc-400">(Talle {item.talle})</span>
                          </span>
                          <span className="font-mono font-bold text-white">
                            ${item.precio.toLocaleString('es-AR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold">Total a Cobrar</span>
                      <span className="text-lg font-mono font-black text-white">
                        ${totalDemo.toLocaleString('es-AR')}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={carritoDemo.length === 0}
                      onClick={() => setVentaSimuladaOk(true)}
                      className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      {ventaSimuladaOk ? '¡Ticket Enviado!' : 'Cobrar y Emitir Ticket'}
                    </button>
                  </div>

                  {ventaSimuladaOk && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center justify-between">
                      <span>✓ Stock descontado, caja actualizada y ticket digital listo.</span>
                      <button
                        type="button"
                        onClick={() => setVentaSimuladaOk(false)}
                        className="text-emerald-400 font-bold underline ml-2 cursor-pointer"
                      >
                        OK
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* CARRUSEL / GRID DE MARCAS ALIADAS (LISTO PARA COMPLETAR)          */}
        {/* ================================================================= */}
        <section className="py-10 px-4 sm:px-6 bg-[#181818] border-b border-zinc-800/80">
          <div className="max-w-7xl mx-auto space-y-5 text-center">
            <p className="text-[11px] uppercase tracking-widest font-black text-zinc-400">
              Marcas y comercios que confían en GEMI
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {MARCAS_ALIADAS.map((marca, i) => (
                <div
                  key={i}
                  className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center transition-all ${
                    marca.activa
                      ? 'bg-[#1E1E1E] border-zinc-700 hover:border-[#FF4500]/50'
                      : 'bg-[#121212]/60 border-zinc-800/70 opacity-65 hover:opacity-100'
                  }`}
                >
                  <span className="font-black text-xs tracking-wider text-white">{marca.nombre}</span>
                  <span className="text-[10px] text-zinc-500 mt-0.5">{marca.rubro}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* EXPLORADOR INTERACTIVO POR PESTAÑAS (ESTILO FUDO)                 */}
        {/* ================================================================= */}
        <section id="interactivo" className="py-16 md:py-24 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-[#FF4500]">
                Ecosistema Todo-en-Uno
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white">
                Todo lo que otros te venden por separado, acá está conectado
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400">
                Tocá cada módulo para ver cómo GEMI ordena cada área de tu negocio.
              </p>
            </div>

            {/* Selector de pestañas */}
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { id: 'pos', label: 'Punto de Venta & Talles', icon: Boxes },
                { id: 'ai', label: 'GEMI AI (Marketing)', icon: Sparkles },
                { id: 'control', label: 'Caja, ARCA & Seguridad', icon: Lock },
                { id: 'multi', label: 'Multisucursal & Traspasos', icon: Store },
                { id: 'agenda', label: 'Calendario & Tareas', icon: Calendar },
              ].map((tab) => {
                const Icon = tab.icon;
                const activa = tabActiva === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTabActiva(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activa
                        ? 'bg-[#FF4500] text-white shadow-lg shadow-[#FF4500]/25'
                        : 'bg-[#1E1E1E] text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Panel dinámico según pestaña */}
            <div className="bg-[#1E1E1E] border border-zinc-800 rounded-3xl p-6 md:p-10">
              {tabActiva === 'pos' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4">
                    <h3 className="text-2xl font-black text-white">
                      Cobrá en segundos y controlá cada talle sin errores
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                      Olvidate de anotar ventas en cuadernos o buscar precios en planillas eternas. Cargá tu catálogo masivamente con Excel y vendé desde computadora, tablet o celular.
                    </p>
                    <ul className="space-y-2.5 text-xs text-zinc-200">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#FF4500]" /> Matriz completa de talles, colores y códigos de barra.
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#FF4500]" /> Gestión integrada de señas, reservas y cambios de prendas.
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#FF4500]" /> Modo Offline automático: seguís cobrando aunque se corte internet.
                      </li>
                    </ul>
                  </div>
                  <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-5 space-y-3 text-xs">
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                      <span className="font-bold text-white">Matriz de Stock en Tiempo Real</span>
                      <span className="text-[10px] text-emerald-400 font-bold">Sincronizado</span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { prenda: 'Hoodie Oversize Wash · Carbón', s: 4, m: 7, l: 5, xl: 2 },
                        { prenda: 'Remera Boxy Heavy · Negro', s: 8, m: 12, l: 6, xl: 3 },
                        { prenda: 'Jean Baggy 90s · Azul', s: 2, m: 5, l: 4, xl: 1 },
                      ].map((fila, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-[#1E1E1E] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="font-bold text-zinc-200">{fila.prenda}</span>
                          <div className="flex gap-1.5 font-mono text-[11px]">
                            <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-300">S:{fila.s}</span>
                            <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-300">M:{fila.m}</span>
                            <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-300">L:{fila.l}</span>
                            <span className="px-2 py-0.5 rounded bg-zinc-900 text-[#FF4500] font-bold">XL:{fila.xl}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tabActiva === 'ai' && (
                <div id="gemi-ai" className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-[#FF4500]">
                      <Sparkles className="w-4 h-4" /> Exclusivo de GEMI
                    </div>
                    <h3 className="text-2xl font-black text-white">
                      GEMI AI: Tu inteligencia artificial comercial personalizada
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                      A diferencia de otros sistemas que solo muestran números fríos, GEMI AI analiza tu inventario, detecta prendas sin rotación y te arma promociones rentables, textos para redes y piezas gráficas listas para descargar.
                    </p>
                    <ul className="space-y-2.5 text-xs text-zinc-200">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#FF4500]" /> Radar automático de oportunidades sobre tu stock real.
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#FF4500]" /> Escudo de margen: calcula descuentos sin que pierdas ganancia.
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#FF4500]" /> Flyers y textos con el logo y colores de tu marca en 1 clic.
                      </li>
                    </ul>
                  </div>

                  {/* Simulador vivo de GEMI AI */}
                  <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-5 space-y-4 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Probá el Simulador de Margen GEMI AI</span>
                      <span className="font-mono font-black text-base text-[#FF4500]">{descuentoDemoIA}% OFF</span>
                    </div>

                    <input
                      type="range"
                      min={5}
                      max={55}
                      step={5}
                      value={descuentoDemoIA}
                      onChange={(e) => setDescuentoDemoIA(Number(e.target.value))}
                      className="w-full accent-[#FF4500] cursor-pointer"
                    />

                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="bg-[#1E1E1E] p-3 rounded-xl">
                        <span className="text-zinc-500 block text-[10px]">Precio Lista</span>
                        <span className="font-mono font-bold text-white">$68.000</span>
                      </div>
                      <div className="bg-[#1E1E1E] p-3 rounded-xl">
                        <span className="text-zinc-500 block text-[10px]">Precio Promo</span>
                        <span className="font-mono font-bold text-[#FF4500]">
                          ${Math.round(precioPromoDemo).toLocaleString('es-AR')}
                        </span>
                      </div>
                      <div className="bg-[#1E1E1E] p-3 rounded-xl">
                        <span className="text-zinc-500 block text-[10px]">Tu Margen</span>
                        <span className={`font-mono font-black ${margenDemo >= 25 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {margenDemo}%
                        </span>
                      </div>
                    </div>

                    <div
                      className={`p-3 rounded-xl border text-[11px] ${
                        margenDemo >= 25
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      {margenDemo >= 25
                        ? '✓ Descuento seguro: mantiene tu margen mínimo saludable.'
                        : '⚠ Alerta GEMI AI: este descuento perfora tu piso de rentabilidad del 25%.'}
                    </div>
                  </div>
                </div>
              )}

              {tabActiva === 'control' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4">
                    <h3 className="text-2xl font-black text-white">
                      Delegá el mostrador con tranquilidad total
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                      Cada apertura de caja, descuento especial o ajuste manual queda registrado en tiempo real para que tengas el control absoluto desde tu celular.
                    </p>
                    <ul className="space-y-2.5 text-xs text-zinc-200">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#FF4500]" /> Facturación Electrónica ARCA (AFIP) integrada con CAE y QR.
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#FF4500]" /> Arqueo de caja ciego al cerrar cada turno.
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#FF4500]" /> PIN de autorización de administrador para descuentos o anulaciones.
                      </li>
                    </ul>
                  </div>
                  <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-5 space-y-2.5 text-xs">
                    <p className="font-bold text-white border-b border-zinc-800 pb-2">Bitácora de Auditoría en Vivo</p>
                    <div className="p-3 rounded-xl bg-[#1E1E1E]">
                      <span className="text-[10px] font-black text-emerald-400 uppercase">Factura C Emitida · ARCA</span>
                      <p className="text-zinc-300 mt-0.5">Comprobante 0001-00000412 autorizado con CAE al instante.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-[#1E1E1E]">
                      <span className="text-[10px] font-black text-[#FF4500] uppercase">Control de Permisos</span>
                      <p className="text-zinc-300 mt-0.5">Costos y márgenes ocultos automáticamente para perfiles de vendedor.</p>
                    </div>
                  </div>
                </div>
              )}

              {tabActiva === 'multi' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4">
                    <h3 className="text-2xl font-black text-white">
                      Conectá todos tus locales y depósitos
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                      Consultá desde el mostrador si un talle está disponible en otra sucursal y enviá mercadería con remitos digitales trazables.
                    </p>
                    <ul className="space-y-2.5 text-xs text-zinc-200">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#FF4500]" /> Stock unificado y por sucursal en tiempo real.
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#FF4500]" /> Traspasos entre locales con confirmación de recepción.
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#FF4500]" /> Ranking de ventas y rentabilidad comparada por tienda.
                      </li>
                    </ul>
                  </div>
                  <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-5 space-y-3 text-xs">
                    <p className="font-bold text-white border-b border-zinc-800 pb-2">Disponibilidad entre Sucursales</p>
                    <div className="p-3 rounded-xl bg-[#1E1E1E] flex justify-between items-center">
                      <span>Sucursal Centro</span>
                      <span className="font-bold text-emerald-400">124 unidades · Caja Abierta</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#1E1E1E] flex justify-between items-center">
                      <span>Sucursal Shopping / Este</span>
                      <span className="font-bold text-[#FF4500]">98 unidades · Caja Abierta</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#1E1E1E] flex justify-between items-center">
                      <span>Depósito Central</span>
                      <span className="font-bold text-zinc-300">410 unidades en reserva</span>
                    </div>
                  </div>
                </div>
              )}

              {tabActiva === 'agenda' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4">
                    <h3 className="text-2xl font-black text-white">
                      Calendario operativo y tareas del equipo adentro del POS
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                      Dejá de usar 4 aplicaciones distintas para organizar tu día. Asigná tareas a tus vendedores y agendá pagos a proveedores, cheques y lanzamientos en el mismo lugar.
                    </p>
                    <ul className="space-y-2.5 text-xs text-zinc-200">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#FF4500]" /> Checklist diario para apertura y cierre de locales.
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#FF4500]" /> Calendario de vencimientos, pagos fijos y fechas de drops.
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#FF4500]" /> Sincronizado con las campañas creadas por GEMI AI.
                      </li>
                    </ul>
                  </div>
                  <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-5 space-y-2.5 text-xs">
                    <p className="font-bold text-white border-b border-zinc-800 pb-2">Agenda Operativa del Día</p>
                    <div className="p-3 rounded-xl bg-[#1E1E1E] flex items-center justify-between">
                      <span>✓ Controlar ingreso de mercadería nueva</span>
                      <span className="text-[10px] text-emerald-400 font-bold">Completado</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#1E1E1E] flex items-center justify-between">
                      <span>• Vencimiento pago taller / proveedor</span>
                      <span className="text-[10px] text-[#FF4500] font-bold">Hoy</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#1E1E1E] flex items-center justify-between">
                      <span>• Publicar campaña fin de semana (GEMI AI)</span>
                      <span className="text-[10px] text-zinc-400 font-bold">Programado</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* BLOQUE DIFERENCIAL: ACOMPAÑAMIENTO 1 A 1 ÚNICO                    */}
        {/* ================================================================= */}
        <section id="acompanamiento" className="py-16 px-4 sm:px-6 bg-[#181818] border-y border-zinc-800/80">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#FF4500]">
                <Headphones className="w-4 h-4" /> Nuestro compromiso real
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                Un acompañamiento 1 a 1 único. Nunca te dejamos solo.
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                Sabemos lo frustrante que es contratar un software y que te manden a leer manuales o hablar con un bot. En <strong>GEMI</strong> trabajamos mano a mano con vos desde el primer minuto.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="bg-[#1E1E1E] border border-zinc-800 p-4 rounded-2xl">
                  <span className="text-lg font-black text-[#FF4500]">01</span>
                  <h4 className="font-bold text-white text-xs mt-1">Migración Asistida</h4>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Te ayudamos a subir tus prendas, talles y precios sin perder tiempo.
                  </p>
                </div>
                <div className="bg-[#1E1E1E] border border-zinc-800 p-4 rounded-2xl">
                  <span className="text-lg font-black text-[#FF4500]">02</span>
                  <h4 className="font-bold text-white text-xs mt-1">Puesta a Punto</h4>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Configuramos tus sucursales, permisos y facturación ARCA junto a vos.
                  </p>
                </div>
                <div className="bg-[#1E1E1E] border border-zinc-800 p-4 rounded-2xl">
                  <span className="text-lg font-black text-[#FF4500]">03</span>
                  <h4 className="font-bold text-white text-xs mt-1">Soporte Directo</h4>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Contacto humano directo para resolver dudas y optimizar tus ventas.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-[#1E1E1E] border border-[#FF4500]/30 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3">
                <img src="/logo-gemi.jpeg" alt="GEMI" className="h-10 w-auto rounded-lg" />
                <div>
                  <p className="font-black text-white text-sm">Tu Guía Personalizada</p>
                  <p className="text-[11px] text-[#FF4500] font-bold">Incluida en todos los planes</p>
                </div>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                "Toda la gestión de tu negocio en un mismo lugar. Tu inteligencia artificial personalizada y un acompañamiento 1 a 1 único."
              </p>
              <Link
                to="/onboarding"
                className="w-full py-3.5 rounded-xl bg-[#FF4500] hover:bg-[#ff571a] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
              >
                Empezar con acompañamiento 1 a 1 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* TABLA COMPARATIVA: GEMI VS SISTEMAS TRADICIONALES                 */}
        {/* ================================================================= */}
        <section id="comparativa" className="py-16 md:py-24 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                ¿Por qué elegir GEMI frente a un sistema tradicional?
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400">
                Compará lo que obtenés en un solo lugar sin pagar módulos extra ni sufrir soporte lento.
              </p>
            </div>

            <div className="bg-[#1E1E1E] border border-zinc-800 rounded-3xl overflow-hidden text-xs">
              <div className="grid grid-cols-12 bg-[#121212] border-b border-zinc-800 p-4 font-black">
                <div className="col-span-6 text-zinc-400">Característica</div>
                <div className="col-span-3 text-center text-zinc-500">Sistemas Tradicionales</div>
                <div className="col-span-3 text-center text-[#FF4500]">GEMI Software</div>
              </div>

              {[
                { feat: 'Punto de Venta + Matriz de Talles y Colores', trad: true, gemi: true },
                { feat: 'Facturación Electrónica ARCA + Tickets WhatsApp', trad: true, gemi: true },
                { feat: 'Calendario Operativo y Tareas del Equipo integradas', trad: false, gemi: true },
                { feat: 'Inteligencia Artificial propia (GEMI AI) para campañas', trad: false, gemi: true },
                { feat: 'Escudo de margen antes de lanzar descuentos', trad: false, gemi: true },
                { feat: 'Acompañamiento humano 1 a 1 en configuración', trad: false, gemi: true },
              ].map((row, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 items-center p-4 border-b border-zinc-800/60 last:border-b-0 hover:bg-zinc-900/40"
                >
                  <div className="col-span-6 font-semibold text-zinc-200">{row.feat}</div>
                  <div className="col-span-3 flex justify-center">
                    {row.trad ? (
                      <Check className="w-4 h-4 text-zinc-500" />
                    ) : (
                      <X className="w-4 h-4 text-zinc-700" />
                    )}
                  </div>
                  <div className="col-span-3 flex justify-center">
                    <span className="w-6 h-6 rounded-full bg-[#FF4500]/15 text-[#FF4500] flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* PREGUNTAS FRECUENTES (ACORDEÓN INTERACTIVO)                       */}
        {/* ================================================================= */}
        <section className="py-12 px-4 sm:px-6 bg-[#181818] border-t border-zinc-800/80">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-xl sm:text-2xl font-black text-white text-center">
              Preguntas Frecuentes
            </h2>

            <div className="space-y-2.5">
              {FAQS.map((faq, idx) => {
                const abierta = faqAbierta === idx;
                return (
                  <div
                    key={idx}
                    className="bg-[#1E1E1E] border border-zinc-800 rounded-2xl overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setFaqAbierta(abierta ? null : idx)}
                      className="w-full p-4 text-left flex items-center justify-between gap-4 text-xs sm:text-sm font-bold text-white cursor-pointer"
                    >
                      <span>{faq.pregunta}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-[#FF4500] shrink-0 transition-transform ${
                          abierta ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {abierta && (
                      <div className="px-4 pb-4 text-xs text-zinc-400 leading-relaxed border-t border-zinc-800/60 pt-3">
                        {faq.respuesta}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* CTA FINAL / PLANES                                                */}
        {/* ================================================================= */}
        <section id="empezar" className="py-16 px-4 sm:px-6 border-t border-zinc-800">
          <div className="max-w-5xl mx-auto space-y-8">
            {MOSTRAR_PRECIOS ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {PLANES_REFERENCIA.map((plan) => (
                  <div
                    key={plan.nombre}
                    className={`rounded-3xl p-6 border flex flex-col justify-between space-y-6 ${
                      plan.destacado
                        ? 'bg-[#1E1E1E] border-[#FF4500] shadow-xl shadow-[#FF4500]/10'
                        : 'bg-[#1E1E1E]/70 border-zinc-800'
                    }`}
                  >
                    <div className="space-y-3">
                      <h3 className="font-black text-lg text-white">{plan.nombre}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-[#FF4500]">{plan.precio}</span>
                        <span className="text-xs text-zinc-400">{plan.periodo}</span>
                      </div>
                      <p className="text-xs text-zinc-400">{plan.descripcion}</p>
                      <ul className="space-y-2 pt-2 text-xs text-zinc-200">
                        {plan.items.map((item) => (
                          <li key={item} className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#FF4500] shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Link
                      to="/onboarding"
                      className="w-full py-3.5 rounded-xl bg-[#FF4500] hover:bg-[#ff571a] text-white font-black text-xs text-center uppercase tracking-wider transition-colors"
                    >
                      Probar Gratis
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#1E1E1E] border border-[#FF4500]/40 rounded-3xl p-8 md:p-12 text-center max-w-3xl mx-auto space-y-5 shadow-2xl">
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  Empezá hoy con GEMI y transformá la gestión de tu negocio
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 max-w-xl mx-auto leading-relaxed">
                  Toda la gestión de tu negocio en un mismo lugar. Tu inteligencia artificial personalizada y un acompañamiento 1 a 1 único.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <Link
                    to="/onboarding"
                    className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#FF4500] hover:bg-[#ff571a] text-white font-black text-sm inline-flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#FF4500]/25"
                  >
                    Crear mi tienda gratis <ArrowRight className="w-4 h-4" />
                  </Link>
                  {whatsappLink && (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#121212] hover:bg-zinc-900 border border-zinc-700 text-white font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-400" /> Hablar 1 a 1 por WhatsApp
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ================================================================= */}
      {/* FOOTER                                                            */}
      {/* ================================================================= */}
      <footer className="border-t border-zinc-800 bg-[#121212] py-8 px-4 sm:px-6 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo-gemi.jpeg" alt="GEMI Software" className="h-7 w-auto rounded" />
            <span className="hidden md:inline text-zinc-400">
              · Toda la gestión de tu negocio en un mismo lugar.
            </span>
          </div>

          <div className="flex items-center gap-5">
            <Link to="/terminos" className="hover:text-zinc-300 transition-colors">
              Términos y Condiciones
            </Link>
            <Link to="/privacidad" className="hover:text-zinc-300 transition-colors">
              Política de Privacidad
            </Link>
            <Link to="/login" className="hover:text-zinc-300 transition-colors">
              Acceso Clientes
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};