import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { type BrandKit, type OportunidadCampana, travisService } from '../services/travisService';
import { BrandKitModal } from '../components/BrandKitModal';
import {
  Sparkles,
  TrendingDown,
  Flame,
  PackageOpen,
  Layers,
  Palette,
  Plus,
  ArrowLeft,
  Sliders,
  MessageSquareText,
  Image as ImageIcon,
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Download,
  Rocket,
  Loader2,
  Upload
} from 'lucide-react';

export const TravisStudioView = () => {
  const { perfil, empresa } = useAuth();

  // Estado general
  const [vista, setVista] = useState<'dashboard' | 'crear_manual' | 'studio'>('dashboard');
  const [cargando, setCargando] = useState(true);
  const [generandoIA, setGenerandoIA] = useState(false);
  const [modalBrandKit, setModalBrandKit] = useState(false);

  // Datos del dashboard
  const [oportunidades, setOportunidades] = useState<OportunidadCampana[]>([]);
  const [campanas, setCampanas] = useState<any[]>([]);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);

  // Creación manual
  const [catalogoProductos, setCatalogoProductos] = useState<any[]>([]);
  const [seleccionadosManual, setSeleccionadosManual] = useState<string[]>([]);
  const [objetivoManual, setObjetivoManual] = useState('');
  const [descuentoManual, setDescuentoManual] = useState<number>(15);

  // Studio (campaña activa en edición)
  const [pasoStudio, setPasoStudio] = useState<1 | 2 | 3 | 4>(1);
  const [detalle, setDetalle] = useState<any | null>(null);
  const [descuentoSimulado, setDescuentoSimulado] = useState<number>(20);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [guardandoPaso, setGuardandoPaso] = useState(false);

  // Creative Studio (Canvas controlado)
  const [formatoPieza, setFormatoPieza] = useState<'4:5' | '9:16'>('4:5');
  const [fotoProductoCustom, setFotoProductoCustom] = useState<string | null>(null);
  const [tituloBanner, setTituloBanner] = useState('');
  const [subtituloBanner, setSubtituloBanner] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cargarTodo = async () => {
    if (!empresa?.id) return;
    try {
      setCargando(true);
      const [opps, camps, kit] = await Promise.all([
        travisService.obtenerOportunidades(empresa.id),
        travisService.listarCampanas(empresa.id),
        travisService.obtenerBrandKit(empresa.id),
      ]);
      setOportunidades(opps);
      setCampanas(camps);
      setBrandKit(kit);
    } catch (err) {
      console.error('Error cargando GEMI AI:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, [empresa?.id]);

  // Iniciar campaña desde una oportunidad detectada
  const handleAccionarOportunidad = async (op: OportunidadCampana) => {
    try {
      setGenerandoIA(true);
      const descuentoInicial = Math.min(20, op.descuento_max_sugerido_pct || 15);
      const res = await travisService.generarCampanaConIA({
        origen: 'opportunity_finder',
        tipo_oportunidad: op.tipo_oportunidad,
        datos_respaldo: {
          stock_total: op.stock_total,
          unidades_vendidas_30d: op.unidades_vendidas_30d,
          margen_actual_pct: op.margen_actual_pct,
          motivo: op.motivo_recomendacion,
        },
        objetivo_usuario: op.motivo_recomendacion,
        productos: [{ producto_id: op.producto_id, rol_en_campana: 'principal' }],
        descuento_solicitado_pct: descuentoInicial,
      });

      await cargarTodo();
      await abrirCampanaEnStudio(res.campaign_id);
    } catch (err: any) {
      alert('Error al generar campaña con GEMI AI: ' + err.message);
    } finally {
      setGenerandoIA(false);
    }
  };

  // Abrir creador manual y traer productos
  const abrirCreadorManual = async () => {
    if (!empresa?.id) return;
    setVista('crear_manual');
    const { data } = await supabase
      .from('productos')
      .select('id, nombre, precio_venta, precio_costo, imagen_url')
      .eq('empresa_id', empresa.id)
      .eq('activo', true)
      .order('nombre');
    setCatalogoProductos(data ?? []);
  };

  const handleCrearManualConIA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (seleccionadosManual.length === 0) {
      alert('Seleccioná al menos un producto');
      return;
    }
    try {
      setGenerandoIA(true);
      const res = await travisService.generarCampanaConIA({
        origen: 'manual',
        objetivo_usuario: objetivoManual || 'Impulsar ventas y rotación del catálogo',
        productos: seleccionadosManual.map((id) => ({ producto_id: id, rol_en_campana: 'principal' })),
        descuento_solicitado_pct: descuentoManual,
      });
      await cargarTodo();
      await abrirCampanaEnStudio(res.campaign_id);
    } catch (err: any) {
      alert('Error generando campaña: ' + err.message);
    } finally {
      setGenerandoIA(false);
    }
  };

  // Abrir campaña existente en el Studio de 4 pasos
  const abrirCampanaEnStudio = async (campaignId: string) => {
    try {
      setCargando(true);
      const data = await travisService.obtenerDetalleCampana(campaignId);
      setDetalle(data);
      const promo = data.promociones?.[0];
      setDescuentoSimulado(Number(promo?.valor_descuento ?? 15));
      setTituloBanner(promo?.nombre_promo || data.campana.nombre);
      setSubtituloBanner(data.productos?.[0]?.snapshot_nombre || empresa?.nombre || '');
      const imgProd = data.productos?.[0]?.productos?.imagen_url || null;
      setFotoProductoCustom(imgProd);
      setPasoStudio(1);
      setVista('studio');
    } catch (err: any) {
      alert('No se pudo abrir la campaña: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  // Cálculos del Promotion Engine en tiempo real
  const calcularSimulacion = () => {
    const prods = detalle?.productos ?? [];
    if (prods.length === 0) {
      return { costoProm: 0, precioListaProm: 0, precioFinal: 0, margenPct: 0, seguro: true, margenMin: 25 };
    }
    const costoProm =
      prods.reduce((acc: number, p: any) => acc + Number(p.snapshot_costo ?? 0), 0) / prods.length;
    const precioListaProm =
      prods.reduce((acc: number, p: any) => acc + Number(p.snapshot_precio_lista ?? 0), 0) / prods.length;
    const precioFinal = precioListaProm * (1 - descuentoSimulado / 100);
    const margenPct = precioFinal > 0 ? ((precioFinal - costoProm) / precioFinal) * 100 : 0;
    const margenMin = Number(brandKit?.margen_minimo_pct ?? 25);
    const hayCostoFaltante = prods.some((p: any) => p.costo_faltante);

    return {
      costoProm,
      precioListaProm,
      precioFinal,
      margenPct: Number(margenPct.toFixed(2)),
      seguro: !hayCostoFaltante && margenPct >= margenMin,
      margenMin,
    };
  };

  const handleGuardarYAprobarPromo = async () => {
    const promo = detalle?.promociones?.[0];
    if (!promo || !empresa?.id || !perfil?.id) return;
    const sim = calcularSimulacion();

    try {
      setGuardandoPaso(true);
      await travisService.actualizarPromocion(promo.id, {
        valor_descuento: descuentoSimulado,
        precio_promocional_promedio: Number(sim.precioFinal.toFixed(2)),
        margen_bruto_resultante_pct: sim.margenPct,
        alerta_margen: !sim.seguro,
        mensaje_alerta: sim.seguro
          ? null
          : `Margen (${sim.margenPct}%) inferior al mínimo (${sim.margenMin}%)`,
        estado_aprobacion: 'aprobado',
      });

      await travisService.aprobarComponente({
        empresaId: empresa.id,
        campaignId: detalle.campana.id,
        componenteTipo: 'promocion',
        componenteId: promo.id,
        accion: 'aprobado',
        usuarioId: perfil.id,
      });

      await abrirCampanaEnStudio(detalle.campana.id);
      setPasoStudio(2);
    } catch (err: any) {
      alert('Error al aprobar promoción: ' + err.message);
    } finally {
      setGuardandoPaso(false);
    }
  };

  // Renderizado controlado de pieza gráfica en HTML5 Canvas
  useEffect(() => {
    if (vista !== 'studio' || pasoStudio !== 3 || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1080;
    const height = formatoPieza === '4:5' ? 1350 : 1920;
    canvas.width = width;
    canvas.height = height;

    const bg = brandKit?.color_primario || '#090D16';
    const textCol = brandKit?.color_secundario || '#F8FAFC';
    const accent = brandKit?.color_acento || '#0EA5E9';
    const sim = calcularSimulacion();

    // Fondo base
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Marco editorial sutil
    ctx.strokeStyle = accent;
    ctx.lineWidth = 6;
    ctx.strokeRect(48, 48, width - 96, height - 96);

    // Encabezado marca
    ctx.fillStyle = textCol;
    ctx.font = '900 42px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText((brandKit?.nombre_marca || empresa?.nombre || 'MARCA').toUpperCase(), width / 2, 140);

    // Badge descuento
    ctx.fillStyle = accent;
    ctx.fillRect(width / 2 - 220, 185, 440, 74);
    ctx.fillStyle = '#090D16';
    ctx.font = '900 38px Inter, sans-serif';
    ctx.fillText(`${descuentoSimulado}% OFF ESPECIAL`, width / 2, 235);

    const dibujarTextosInferiores = () => {
      const baseTextY = formatoPieza === '4:5' ? 1060 : 1520;

      ctx.fillStyle = textCol;
      ctx.font = '900 64px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(tituloBanner.toUpperCase().slice(0, 26), width / 2, baseTextY);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '600 36px Inter, sans-serif';
      ctx.fillText(subtituloBanner.slice(0, 38), width / 2, baseTextY + 65);

      if (sim.precioFinal > 0) {
        ctx.fillStyle = '#64748B';
        ctx.font = '600 32px Inter, sans-serif';
        ctx.fillText(`Antes $${Math.round(sim.precioListaProm).toLocaleString('es-AR')}`, width / 2, baseTextY + 135);

        ctx.fillStyle = accent;
        ctx.font = '900 72px Inter, sans-serif';
        ctx.fillText(`$${Math.round(sim.precioFinal).toLocaleString('es-AR')}`, width / 2, baseTextY + 215);
      }
    };

    if (fotoProductoCustom) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const boxSize = formatoPieza === '4:5' ? 620 : 960;
        const boxX = (width - boxSize) / 2;
        const boxY = 310;
        ctx.drawImage(img, boxX, boxY, boxSize, boxSize);
        dibujarTextosInferiores();
      };
      img.onerror = () => dibujarTextosInferiores();
      img.src = fotoProductoCustom;
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      const boxSize = formatoPieza === '4:5' ? 620 : 960;
      ctx.fillRect((width - boxSize) / 2, 310, boxSize, boxSize);
      ctx.fillStyle = '#64748B';
      ctx.font = '600 30px Inter, sans-serif';
      ctx.fillText('Subí o elegí una foto de prenda arriba', width / 2, 310 + boxSize / 2);
      dibujarTextosInferiores();
    }
  }, [vista, pasoStudio, formatoPieza, fotoProductoCustom, tituloBanner, subtituloBanner, descuentoSimulado, brandKit]);

  const descargarPiezaPNG = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `GEMI-AI-${detalle?.campana?.nombre || 'pieza'}-${formatoPieza.replace(':', 'x')}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const iconoOportunidad = (tipo: string) => {
    switch (tipo) {
      case 'exceso_inventario':
        return <PackageOpen className="w-4 h-4 text-rose-400" />;
      case 'liquidacion':
        return <TrendingDown className="w-4 h-4 text-amber-400" />;
      case 'producto_estrella':
        return <Flame className="w-4 h-4 text-emerald-400" />;
      default:
        return <Layers className="w-4 h-4 text-sky-400" />;
    }
  };

  if (generandoIA) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
          <Loader2 className="w-7 h-7 text-sky-400 animate-spin" />
        </div>
        <div>
          <h2 className="text-lg font-black text-white">GEMI AI está armando tu campaña...</h2>
          <p className="text-xs text-slate-400 max-w-md mt-1">
            Analizando costos y márgenes reales, redactando textos para redes y preparando tu plan de ejecución.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Cabecera del módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          {vista !== 'dashboard' && (
            <button
              onClick={() => setVista('dashboard')}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-400" />
              <h1 className="text-lg md:text-xl font-black tracking-tight text-white">
                GEMI AI <span className="text-slate-500 font-semibold">| Campaign Studio</span>
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Tu inteligencia artificial personalizada conectada a tu stock, costos y márgenes reales.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalBrandKit(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            <Palette className="w-3.5 h-3.5 text-sky-400" />
            Brand Kit ({brandKit?.margen_minimo_pct ?? 25}% mín.)
          </button>

          {vista === 'dashboard' && (
            <button
              onClick={abrirCreadorManual}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nueva Campaña
            </button>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* VISTA 1: DASHBOARD (OPPORTUNITY FINDER + CAMPAÑAS)                */}
      {/* ================================================================= */}
      {vista === 'dashboard' && (
        <div className="space-y-8">
          {/* Bloque A: Radar de Oportunidades */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-wider font-black text-slate-400">
                Oportunidades Detectadas en tu Inventario
              </h2>
              <span className="text-[11px] text-slate-500">{oportunidades.length} sugerencias activas</span>
            </div>

            {cargando ? (
              <div className="text-xs text-slate-500 py-8 text-center">Analizando inventario y ventas...</div>
            ) : oportunidades.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-400">
                Todavía no hay suficiente movimiento de stock para sugerir oportunidades automáticas. Podés crear una campaña manual arriba.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {oportunidades.slice(0, 6).map((op) => (
                  <div
                    key={op.producto_id}
                    className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between gap-4 transition-all"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-black px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-200">
                          {iconoOportunidad(op.tipo_oportunidad)}
                          {op.tipo_oportunidad.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-emerald-400">
                          Hasta {op.descuento_max_sugerido_pct}% OFF
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold text-white text-sm">{op.producto_nombre}</h3>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{op.motivo_recomendacion}</p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                        <div>
                          <span className="text-slate-500 block">Stock</span>
                          <span className="font-bold text-white">{op.stock_total} u.</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Ventas 30d</span>
                          <span className="font-bold text-white">{op.unidades_vendidas_30d} u.</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Margen</span>
                          <span className="font-bold text-sky-400">{op.margen_actual_pct}%</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAccionarOportunidad(op)}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-slate-950 border border-sky-500/30 font-bold text-xs transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Armar campaña con IA
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Bloque B: Campañas del Comercio */}
          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-wider font-black text-slate-400">
              Tus Campañas ({campanas.length})
            </h2>

            {campanas.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
                Aún no creaste ninguna campaña. Elegí una oportunidad arriba o tocá <strong>Nueva Campaña</strong>.
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 font-bold">Campaña</th>
                      <th className="py-3 px-4 font-bold">Promoción</th>
                      <th className="py-3 px-4 font-bold">Estado</th>
                      <th className="py-3 px-4 font-bold text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {campanas.map((c) => {
                      const promo = c.campaign_promotions?.[0];
                      return (
                        <tr key={c.id} className="hover:bg-slate-900/80 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-bold text-white">{c.nombre}</p>
                            <p className="text-[11px] text-slate-400 line-clamp-1">{c.concepto}</p>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-sky-400">
                            {promo ? `${promo.valor_descuento}% OFF (${promo.nombre_promo})` : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                c.estado === 'activa'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-amber-500/10 text-amber-400'
                              }`}
                            >
                              {c.estado}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => abrirCampanaEnStudio(c.id)}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-sky-500 text-slate-200 hover:text-slate-950 font-bold transition-colors cursor-pointer"
                            >
                              Abrir Studio
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ================================================================= */}
      {/* VISTA 2: CREACIÓN MANUAL                                          */}
      {/* ================================================================= */}
      {vista === 'crear_manual' && (
        <form onSubmit={handleCrearManualConIA} className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 text-xs">
          <h2 className="text-base font-black text-white">Crear Nueva Campaña Manual</h2>

          <div>
            <label className="block text-slate-400 font-bold mb-1.5">1. ¿Qué querés lograr con esta campaña?</label>
            <input
              type="text"
              value={objetivoManual}
              onChange={(e) => setObjetivoManual(e.target.value)}
              placeholder="Ej: Liquidar remeras boxy de temporada o lanzar cápsula fin de semana"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1.5">
              2. Descuento inicial a simular ({descuentoManual}% OFF)
            </label>
            <input
              type="range"
              min={0}
              max={60}
              step={5}
              value={descuentoManual}
              onChange={(e) => setDescuentoManual(Number(e.target.value))}
              className="w-full accent-sky-400 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-2">
              3. Seleccioná los productos incluidos ({seleccionadosManual.length} elegidos)
            </label>
            <div className="max-h-60 overflow-y-auto space-y-1.5 border border-slate-800 rounded-xl p-2 bg-slate-950">
              {catalogoProductos.map((p) => {
                const marcado = seleccionadosManual.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                      marcado ? 'bg-sky-500/15 border border-sky-500/40' : 'hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() =>
                          setSeleccionadosManual((prev) =>
                            prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                          )
                        }
                        className="accent-sky-400"
                      />
                      <span className="font-bold text-white">{p.nombre}</span>
                    </div>
                    <span className="font-mono text-slate-400">
                      ${Number(p.precio_venta).toLocaleString('es-AR')}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Generar Estrategia, Textos y Piezas con GEMI AI
          </button>
        </form>
      )}

      {/* ================================================================= */}
      {/* VISTA 3: CAMPAIGN STUDIO (4 PASOS GUIADOS)                        */}
      {/* ================================================================= */}
      {vista === 'studio' && detalle && (
        <div className="space-y-6">
          {/* Barra de progreso de 4 pasos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-900/80 p-2 rounded-2xl border border-slate-800 text-xs">
            {[
              { num: 1, label: '1. Estrategia y Margen', icon: Sliders },
              { num: 2, label: '2. Copywriting', icon: MessageSquareText },
              { num: 3, label: '3. Creative Studio', icon: ImageIcon },
              { num: 4, label: '4. Calendario y Activar', icon: CalendarCheck },
            ].map((step) => {
              const Icon = step.icon;
              const activo = pasoStudio === step.num;
              return (
                <button
                  key={step.num}
                  onClick={() => setPasoStudio(step.num as any)}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold transition-all cursor-pointer ${
                    activo
                      ? 'bg-sky-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{step.label}</span>
                </button>
              );
            })}
          </div>

          {/* PASO 1: PROMOTION ENGINE */}
          {pasoStudio === 1 && (() => {
            const sim = calcularSimulacion();
            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-sky-400">Concepto Comercial</span>
                    <h2 className="text-lg font-black text-white mt-0.5">{detalle.campana.nombre}</h2>
                    <p className="text-slate-300 mt-1 leading-relaxed">{detalle.campana.concepto}</p>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Simulador de Descuento en Vivo</span>
                      <span className="text-lg font-mono font-black text-sky-400">{descuentoSimulado}% OFF</span>
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={70}
                      step={5}
                      value={descuentoSimulado}
                      onChange={(e) => setDescuentoSimulado(Number(e.target.value))}
                      className="w-full accent-sky-400 cursor-pointer"
                    />

                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-500 block">Precio Lista Prom.</span>
                        <span className="font-mono font-bold text-white text-sm">
                          ${Math.round(sim.precioListaProm).toLocaleString('es-AR')}
                        </span>
                      </div>
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-500 block">Precio con Promo</span>
                        <span className="font-mono font-bold text-sky-400 text-sm">
                          ${Math.round(sim.precioFinal).toLocaleString('es-AR')}
                        </span>
                      </div>
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-500 block">Margen Bruto Final</span>
                        <span
                          className={`font-mono font-black text-sm ${
                            sim.seguro ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {sim.margenPct}%
                        </span>
                      </div>
                    </div>

                    {!sim.seguro ? (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>
                          Atención: el margen resultante ({sim.margenPct}%) perfora tu piso mínimo configurado ({sim.margenMin}%).
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Promoción rentable: respeta tu margen mínimo del {sim.margenMin}%.</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleGuardarYAprobarPromo}
                    disabled={guardandoPaso}
                    className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black transition-colors cursor-pointer"
                  >
                    {guardandoPaso ? 'Guardando...' : 'Aprobar Promoción y Pasar a Textos →'}
                  </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h3 className="font-bold text-white">Productos en esta Campaña</h3>
                  <div className="space-y-2">
                    {detalle.productos.map((p: any) => (
                      <div key={p.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <p className="font-bold text-white">{p.snapshot_nombre}</p>
                        <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                          <span>Costo: ${Number(p.snapshot_costo).toLocaleString('es-AR')}</span>
                          <span>Stock: {p.snapshot_stock_total} u.</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* PASO 2: COPYWRITING ENGINE */}
          {pasoStudio === 2 && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {detalle.copies.map((copy: any) => (
                  <div key={copy.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="uppercase font-black text-[10px] px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400">
                        {copy.canal.replace('_', ' ')}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${copy.titulo}\n\n${copy.cuerpo}\n\n${copy.llamado_accion}`);
                          setCopiadoId(copy.id);
                          setTimeout(() => setCopiadoId(null), 2000);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
                      >
                        {copiadoId === copy.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiadoId === copy.id ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>

                    <textarea
                      rows={5}
                      defaultValue={copy.cuerpo}
                      onBlur={(e) => travisService.actualizarCopy(copy.id, { cuerpo: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-sky-500 focus:outline-none leading-relaxed"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setPasoStudio(3)}
                  className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black cursor-pointer"
                >
                  Continuar a Piezas Visuales →
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: CREATIVE STUDIO (COMPOSICIÓN CONTROLADA) */}
          {pasoStudio === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-white text-sm">Personalizar Pieza Gráfica</h3>

                <div>
                  <label className="block text-slate-400 font-bold mb-1.5">Formato</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['4:5', '9:16'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setFormatoPieza(fmt)}
                        className={`py-2 rounded-xl font-bold border cursor-pointer ${
                          formatoPieza === fmt
                            ? 'bg-sky-500/15 border-sky-500 text-sky-400'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        {fmt === '4:5' ? '4:5 Post Feed' : '9:16 Historia / WhatsApp'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1.5">Foto de la Prenda</label>
                  <label className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-950 border border-dashed border-slate-700 hover:border-sky-500 text-slate-300 cursor-pointer">
                    <Upload className="w-4 h-4 text-sky-400" />
                    <span>Cargar foto real de la prenda</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setFotoProductoCustom(URL.createObjectURL(f));
                      }}
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Titular Principal</label>
                  <input
                    type="text"
                    value={tituloBanner}
                    onChange={(e) => setTituloBanner(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Subtítulo / Prenda</label>
                  <input
                    type="text"
                    value={subtituloBanner}
                    onChange={(e) => setSubtituloBanner(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={descargarPiezaPNG}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Descargar Pieza PNG
                  </button>
                  <button
                    onClick={() => setPasoStudio(4)}
                    className="px-4 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black cursor-pointer"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  className="max-h-[480px] w-auto rounded-xl shadow-2xl border border-slate-800"
                />
              </div>
            </div>
          )}

          {/* PASO 4: CALENDARIO Y ACTIVACIÓN */}
          {pasoStudio === 4 && (
            <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 text-xs">
              <h3 className="text-base font-black text-white">Plan de Ejecución y Activación</h3>

              <div className="space-y-2">
                {detalle.calendario.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800"
                  >
                    <div>
                      <p className="font-bold text-white">{item.actividad}</p>
                      <p className="text-[11px] text-slate-400 uppercase">{item.canal}</p>
                    </div>
                    <span className="font-mono text-sky-400 font-bold">
                      {new Date(item.fecha_programada).toLocaleDateString('es-AR')}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={async () => {
                  if (!empresa?.id || !perfil?.id) return;
                  await travisService.aprobarComponente({
                    empresaId: empresa.id,
                    campaignId: detalle.campana.id,
                    componenteTipo: 'campana_completa',
                    componenteId: detalle.campana.id,
                    accion: 'aprobado',
                    usuarioId: perfil.id,
                  });
                  alert('¡Campaña aprobada y activada!');
                  await cargarTodo();
                  setVista('dashboard');
                }}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-colors cursor-pointer"
              >
                <Rocket className="w-4 h-4" />
                Aprobar y Activar Campaña en GEMI
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal Brand Kit */}
      {empresa?.id && (
        <BrandKitModal
          abierto={modalBrandKit}
          onCerrar={() => setModalBrandKit(false)}
          empresaId={empresa.id}
          nombreEmpresa={empresa.nombre}
          logoEmpresaUrl={(empresa as any)?.logo_url}
          onGuardado={(kit) => setBrandKit(kit)}
        />
      )}
    </div>
  );
};