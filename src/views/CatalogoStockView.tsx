import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { registrarAuditoria } from '../lib/auditoria';
import type { Categoria } from '../types/database';
import { 
  Boxes, 
  Plus, 
  Save, 
  Search, 
  Check, 
  AlertCircle,
  Loader2,
  Edit2,
  Trash2,
  X
} from 'lucide-react';

interface TalleCatalogo {
  id: string;
  etiqueta: string;
  tipo_curva: 'superior' | 'numerico' | 'unico';
  orden: number;
}

const COLORES_SUGERIDOS = ['Negro', 'Blanco', 'Gris', 'Arena', 'Azul', 'Verde'];

export const CatalogoStockView = () => {
  const { perfil, sucursalActiva, empresa } = useAuth();
  const esAdmin = perfil?.rol === 'admin';

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [talles, setTalles] = useState<TalleCatalogo[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<any | null>(null);

  const [nuevoColor, setNuevoColor] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Estados Modal Nuevo Producto
  const [mostrarModalNuevo, setMostrarModalNuevo] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaCategoriaId, setNuevaCategoriaId] = useState('');
  const [nuevoCosto, setNuevoCosto] = useState('');
  const [nuevoPrecioVenta, setNuevoPrecioVenta] = useState('');
  const [tallesSeleccionadosIds, setTallesSeleccionadosIds] = useState<string[]>([]);
  const [coloresSeleccionados, setColoresSeleccionados] = useState<string[]>([]);
  const [colorInputModal, setColorInputModal] = useState('');
  const [creandoProducto, setCreandoProducto] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  // Estados Modal Editar Producto
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editCategoriaId, setEditCategoriaId] = useState('');
  const [editCosto, setEditCosto] = useState('');
  const [editPrecioVenta, setEditPrecioVenta] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  // Estados Modal Eliminar Producto
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  const [eliminandoProducto, setEliminandoProducto] = useState(false);

  // Guardamos como string para que el casillero quede vacío en vez de mostrar un 0 fijo
  const [matrizValores, setMatrizValores] = useState<{ [varianteId: string]: string }>({});
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'error' | 'exito'; texto: string } | null>(null);

  const sucursalEfectivaId = esAdmin 
    ? (sucursalActiva?.id || perfil?.sucursal_id) 
    : (perfil?.sucursal_id || sucursalActiva?.id);

  const sucursalEfectivaNombre = sucursalActiva?.nombre || 'Sucursal Asignada';

  useEffect(() => {
    if (empresa?.id) {
      cargarDatosMaestros();
    }
  }, [empresa?.id]);

  useEffect(() => {
    if (sucursalEfectivaId && empresa?.id) {
      cargarProductos();
    }
  }, [sucursalEfectivaId, empresa?.id]);

  useEffect(() => {
    if (productoSeleccionado && sucursalEfectivaId) {
      cargarMatrizValores(productoSeleccionado);
    }
  }, [productoSeleccionado, sucursalEfectivaId]);

  const cargarDatosMaestros = async () => {
    let catQuery = supabase.from('categorias').select('*').order('orden');
    if (empresa?.id) {
      catQuery = catQuery.eq('empresa_id', empresa.id);
    }

    const [resCat, resTalles] = await Promise.all([
      catQuery,
      supabase.from('talles_catalogo').select('*').order('orden')
    ]);

    if (resCat.data) {
      setCategorias(resCat.data as Categoria[]);
      if (resCat.data.length > 0 && !nuevaCategoriaId) {
        setNuevaCategoriaId(resCat.data[0].id);
      }
    }
    if (resTalles.data) {
      setTalles(resTalles.data as TalleCatalogo[]);
      setTallesSeleccionadosIds([]);
    }
  };

  const cargarProductos = async () => {
    if (!sucursalEfectivaId || !empresa?.id) return;

    const { data } = await supabase
      .from('productos')
      .select(`
        *,
        categorias (id, nombre),
        productos_precios_sucursal (
          id,
          sucursal_id,
          precio_costo,
          precio_venta
        ),
        variantes (
          id,
          color,
          sku_interno,
          talle_id,
          talles_catalogo (id, etiqueta, orden, tipo_curva),
          stock_sucursal (cantidad, sucursal_id)
        )
      `)
      .eq('empresa_id', empresa.id)
      .eq('activo', true)
      .order('nombre');

    if (data) {
      setProductos(data);
      if (data.length > 0 && !productoSeleccionado) {
        setProductoSeleccionado(data[0]);
      } else if (productoSeleccionado) {
        const prodActualizado = data.find((p) => p.id === productoSeleccionado.id);
        setProductoSeleccionado(prodActualizado || (data.length > 0 ? data[0] : null));
      } else if (data.length === 0) {
        setProductoSeleccionado(null);
      }
    }
  };

  const obtenerPreciosSucursal = (prod: any) => {
    const precioEspecifico = prod?.productos_precios_sucursal?.find(
      (ps: any) => ps.sucursal_id === sucursalEfectivaId
    );

    return {
      costo: precioEspecifico ? Number(precioEspecifico.precio_costo || 0) : Number(prod?.precio_costo || 0),
      venta: precioEspecifico ? Number(precioEspecifico.precio_venta || 0) : Number(prod?.precio_venta || 0)
    };
  };

  const cargarMatrizValores = (prod: any) => {
    const mapa: { [key: string]: string } = {};
    prod.variantes?.forEach((v: any) => {
      const stock = v.stock_sucursal?.find((s: any) => s.sucursal_id === sucursalEfectivaId)?.cantidad || 0;
      mapa[v.id] = stock > 0 ? String(stock) : '';
    });
    setMatrizValores(mapa);
  };

  const obtenerTipoCurvaPorCategoria = (catId: string): 'superior' | 'numerico' | 'unico' => {
    const cat = categorias.find((c) => c.id === catId);
    if (!cat) return 'superior';
    const nom = cat.nombre.toLowerCase();

    if (nom.includes('pantalon') || nom.includes('bermuda') || nom.includes('denim')) {
      return 'numerico';
    }
    if (nom.includes('accesorio')) {
      return 'unico';
    }
    return 'superior';
  };

  const handleCambiarCategoriaModal = (catId: string) => {
    setNuevaCategoriaId(catId);
    setErrorModal(null);
    const curva = obtenerTipoCurvaPorCategoria(catId);

    if (curva === 'unico') {
      const unico = talles.filter((t) => t.tipo_curva === 'unico').map((t) => t.id);
      setTallesSeleccionadosIds(unico);
    } else {
      setTallesSeleccionadosIds([]);
    }
  };

  const toggleTalleSeleccionado = (talleId: string) => {
    setErrorModal(null);
    setTallesSeleccionadosIds((prev) =>
      prev.includes(talleId) ? prev.filter((id) => id !== talleId) : [...prev, talleId]
    );
  };

  const agregarColorAModal = (valorCrudo: string) => {
    const limpio = valorCrudo.trim();
    if (!limpio) return;
    const capitalizado = limpio.charAt(0).toUpperCase() + limpio.slice(1);
    const yaExiste = coloresSeleccionados.some(
      (c) => c.toLowerCase() === capitalizado.toLowerCase()
    );
    if (!yaExiste) {
      setColoresSeleccionados((prev) => [...prev, capitalizado]);
    }
    setColorInputModal('');
    setErrorModal(null);
  };

  const quitarColorDeModal = (colorAQuitar: string) => {
    setColoresSeleccionados((prev) => prev.filter((c) => c !== colorAQuitar));
  };

  const handleCrearProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorModal(null);
    setMensaje(null);

    if (!esAdmin) return;

    if (!sucursalEfectivaId || !empresa?.id) {
      setErrorModal('No se detectó la sucursal o la empresa asignada del usuario.');
      return;
    }

    if (!nuevoNombre.trim() || !nuevaCategoriaId || !nuevoPrecioVenta) {
      setErrorModal('Completá el nombre, categoría y precio de venta.');
      return;
    }

    if (tallesSeleccionadosIds.length === 0) {
      setErrorModal('Tenés que marcar al menos un talle para este producto.');
      return;
    }

    const listaColoresFinal = [...coloresSeleccionados];
    if (colorInputModal.trim()) {
      const limpio = colorInputModal.trim();
      const cap = limpio.charAt(0).toUpperCase() + limpio.slice(1);
      if (!listaColoresFinal.some((c) => c.toLowerCase() === cap.toLowerCase())) {
        listaColoresFinal.push(cap);
      }
    }

    if (listaColoresFinal.length === 0) {
      setErrorModal('Agregá al menos un color para la prenda (ej. Blanco, Negro, Gris).');
      return;
    }

    const costoNumerico = nuevoCosto.trim() ? parseFloat(nuevoCosto) : 0;
    const ventaNumerica = parseFloat(nuevoPrecioVenta);

    setCreandoProducto(true);

    try {
      const { data: existente } = await supabase
        .from('productos')
        .select('*')
        .eq('empresa_id', empresa.id)
        .ilike('nombre', nuevoNombre.trim())
        .maybeSingle();

      let prodData = existente;

      if (!prodData) {
        const { data: nuevo, error: prodErr } = await supabase
          .from('productos')
          .insert({
            empresa_id: empresa.id,
            nombre: nuevoNombre.trim(),
            categoria_id: nuevaCategoriaId,
            precio_costo: costoNumerico,
            precio_venta: ventaNumerica,
            activo: true
          })
          .select()
          .single();

        if (prodErr) throw prodErr;
        prodData = nuevo;
      }

      await supabase
        .from('productos_precios_sucursal')
        .upsert({
          producto_id: prodData.id,
          sucursal_id: sucursalEfectivaId,
          precio_costo: costoNumerico,
          precio_venta: ventaNumerica,
          updated_at: new Date().toISOString()
        }, { onConflict: 'producto_id,sucursal_id' });

      const tallesACrear = talles.filter((t) => tallesSeleccionadosIds.includes(t.id));

      for (const colorItem of listaColoresFinal) {
        for (const t of tallesACrear) {
          let { data: varExistente } = await supabase
            .from('variantes')
            .select('*')
            .eq('producto_id', prodData.id)
            .eq('talle_id', t.id)
            .ilike('color', colorItem)
            .maybeSingle();

          if (!varExistente) {
            const skuGenerado = `${prodData.nombre.replace(/\s+/g, '').substring(0, 4).toUpperCase()}-${colorItem.substring(0, 3).toUpperCase()}-${t.etiqueta}-${Date.now().toString().slice(-4)}`;

            const { data: varNueva, error: varErr } = await supabase
              .from('variantes')
              .insert({
                producto_id: prodData.id,
                talle_id: t.id,
                color: colorItem,
                sku_interno: skuGenerado
              })
              .select()
              .single();

            if (varErr) throw varErr;
            varExistente = varNueva;
          }

          if (varExistente) {
            await supabase
              .from('stock_sucursal')
              .upsert({
                variante_id: varExistente.id,
                sucursal_id: sucursalEfectivaId,
                cantidad: 0
              }, { onConflict: 'variante_id,sucursal_id' });
          }
        }
      }

      setMostrarModalNuevo(false);
      setNuevoNombre('');
      setNuevoCosto('');
      setNuevoPrecioVenta('');
      setColoresSeleccionados([]);
      setColorInputModal('');
      await cargarProductos();
      setProductoSeleccionado(prodData);
      setMensaje({ tipo: 'exito', texto: `¡Prenda registrada para ${sucursalEfectivaNombre}!` });
    } catch (err: any) {
      setErrorModal(err.message || 'Error al guardar en la base de datos.');
    } finally {
      setCreandoProducto(false);
    }
  };

  const abrirModalEditar = () => {
    if (!productoSeleccionado || !esAdmin) return;
    const precios = obtenerPreciosSucursal(productoSeleccionado);
    setEditNombre(productoSeleccionado.nombre);
    setEditCategoriaId(productoSeleccionado.categoria_id);
    setEditCosto(precios.costo > 0 ? precios.costo.toString() : '');
    setEditPrecioVenta(precios.venta.toString());
    setMostrarModalEditar(true);
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoSeleccionado || !sucursalEfectivaId || !esAdmin) return;

    setGuardandoEdicion(true);
    setMensaje(null);

    const costoEditado = editCosto.trim() ? parseFloat(editCosto) : 0;
    const ventaEditada = parseFloat(editPrecioVenta);

    try {
      const { error: errProd } = await supabase
        .from('productos')
        .update({
          nombre: editNombre.trim(),
          categoria_id: editCategoriaId
        })
        .eq('id', productoSeleccionado.id);

      if (errProd) throw errProd;

      const { error: errPrecio } = await supabase
        .from('productos_precios_sucursal')
        .upsert({
          producto_id: productoSeleccionado.id,
          sucursal_id: sucursalEfectivaId,
          precio_costo: costoEditado,
          precio_venta: ventaEditada,
          updated_at: new Date().toISOString()
        }, { onConflict: 'producto_id,sucursal_id' });

      if (errPrecio) throw errPrecio;

      if (empresa?.id) {
        await registrarAuditoria({
          empresaId: empresa.id,
          sucursalId: sucursalEfectivaId,
          usuarioId: perfil?.id,
          usuarioNombre: `${perfil?.nombre || ''} ${perfil?.apellido || ''}`.trim(),
          accion: 'PRECIO_PRODUCTO_EDITADO',
          detalle: `Producto "${editNombre.trim()}" actualizado en ${sucursalEfectivaNombre} (Venta: $${Number(ventaEditada).toLocaleString()}).`
        });
      }

      setMostrarModalEditar(false);
      await cargarProductos();
      setMensaje({ tipo: 'exito', texto: `¡Precios actualizados para ${sucursalEfectivaNombre}!` });
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error actualizando los datos de la prenda.' });
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const handleEliminarProducto = async () => {
    if (!productoSeleccionado || !sucursalEfectivaId || !esAdmin) return;
    setEliminandoProducto(true);
    setMensaje(null);

    try {
      const nombreEliminado = productoSeleccionado.nombre;
      const varianteIds = (productoSeleccionado.variantes || []).map((v: any) => v.id);

      if (varianteIds.length > 0) {
        await supabase
          .from('stock_sucursal')
          .delete()
          .in('variante_id', varianteIds)
          .eq('sucursal_id', sucursalEfectivaId);
      }

      await supabase
        .from('productos_precios_sucursal')
        .delete()
        .eq('producto_id', productoSeleccionado.id)
        .eq('sucursal_id', sucursalEfectivaId);

      const { count } = await supabase
        .from('stock_sucursal')
        .select('*', { count: 'exact', head: true })
        .in('variante_id', varianteIds);

      if (!count || count === 0) {
        await supabase
          .from('productos')
          .update({ activo: false })
          .eq('id', productoSeleccionado.id);
      }

      if (empresa?.id) {
        await registrarAuditoria({
          empresaId: empresa.id,
          sucursalId: sucursalEfectivaId,
          usuarioId: perfil?.id,
          usuarioNombre: `${perfil?.nombre || ''} ${perfil?.apellido || ''}`.trim(),
          accion: 'PRODUCTO_DADO_DE_BAJA',
          detalle: `Se dio de baja "${nombreEliminado}" en ${sucursalEfectivaNombre}.`
        });
      }

      setMostrarModalEliminar(false);
      setProductoSeleccionado(null);
      await cargarProductos();
      setMensaje({ tipo: 'exito', texto: `¡Prenda dada de baja en ${sucursalEfectivaNombre}!` });
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al eliminar la prenda.' });
    } finally {
      setEliminandoProducto(false);
    }
  };

  const handleAgregarColor = async () => {
    if (!productoSeleccionado || !nuevoColor.trim() || !sucursalEfectivaId) return;

    const limpio = nuevoColor.trim();
    const colorFormateado = limpio.charAt(0).toUpperCase() + limpio.slice(1);
    const tallesActualesIds = Array.from(
      new Set(productoSeleccionado.variantes?.map((v: any) => v.talle_id) || [])
    ) as string[];

    const tallesAptos = talles.filter((t) => tallesActualesIds.includes(t.id));

    for (const t of tallesAptos) {
      let { data: varExistente } = await supabase
        .from('variantes')
        .select('*')
        .eq('producto_id', productoSeleccionado.id)
        .eq('talle_id', t.id)
        .ilike('color', colorFormateado)
        .maybeSingle();

      if (!varExistente) {
        const skuGenerado = `${productoSeleccionado.nombre.replace(/\s+/g, '').substring(0, 4).toUpperCase()}-${colorFormateado.substring(0, 3).toUpperCase()}-${t.etiqueta}-${Date.now().toString().slice(-4)}`;

        const { data: varData } = await supabase
          .from('variantes')
          .insert({
            producto_id: productoSeleccionado.id,
            talle_id: t.id,
            color: colorFormateado,
            sku_interno: skuGenerado
          })
          .select()
          .single();

        varExistente = varData;
      }

      if (varExistente) {
        await supabase
          .from('stock_sucursal')
          .upsert({
            variante_id: varExistente.id,
            sucursal_id: sucursalEfectivaId,
            cantidad: 0
          }, { onConflict: 'variante_id,sucursal_id' });
      }
    }

    setNuevoColor('');
    await cargarProductos();
  };

  const handleEliminarColorDeMatriz = async (colorAEliminar: string) => {
    if (!productoSeleccionado || !sucursalEfectivaId || !esAdmin) return;
    const confirmar = window.confirm(`¿Quitar el color "${colorAEliminar}" de esta prenda en ${sucursalEfectivaNombre}?`);
    if (!confirmar) return;

    const variantesDelColor = (productoSeleccionado.variantes || []).filter(
      (v: any) => v.color.toLowerCase() === colorAEliminar.toLowerCase()
    );
    const ids = variantesDelColor.map((v: any) => v.id);

    if (ids.length > 0) {
      await supabase
        .from('stock_sucursal')
        .delete()
        .in('variante_id', ids)
        .eq('sucursal_id', sucursalEfectivaId);

      for (const vid of ids) {
        const { count } = await supabase
          .from('stock_sucursal')
          .select('*', { count: 'exact', head: true })
          .eq('variante_id', vid);

        if (!count || count === 0) {
          await supabase.from('variantes').delete().eq('id', vid);
        }
      }
    }

    await cargarProductos();
  };

  const handleGuardarStock = async () => {
    if (!productoSeleccionado || !sucursalEfectivaId) return;
    setGuardando(true);
    setMensaje(null);

    try {
      const cambiosLog: string[] = [];

      for (const variante of productoSeleccionado.variantes || []) {
        const textoValor = matrizValores[variante.id] ?? '';
        const valorInput = textoValor === '' ? 0 : parseInt(textoValor, 10) || 0;
        const stockActual = variante.stock_sucursal?.find((s: any) => s.sucursal_id === sucursalEfectivaId)?.cantidad || 0;
        const finalCalculado = Math.max(0, valorInput);

        if (finalCalculado !== stockActual) {
          cambiosLog.push(
            `${variante.color} T.${variante.talles_catalogo?.etiqueta || 'U'}: ${stockActual} -> ${finalCalculado}`
          );
        }

        await supabase
          .from('stock_sucursal')
          .upsert({
            variante_id: variante.id,
            sucursal_id: sucursalEfectivaId,
            cantidad: finalCalculado,
            updated_at: new Date().toISOString()
          }, { onConflict: 'variante_id,sucursal_id' });
      }

      if (cambiosLog.length > 0 && empresa?.id) {
        await registrarAuditoria({
          empresaId: empresa.id,
          sucursalId: sucursalEfectivaId,
          usuarioId: perfil?.id,
          usuarioNombre: `${perfil?.nombre || ''} ${perfil?.apellido || ''}`.trim(),
          accion: 'AJUSTE_STOCK_MANUAL',
          detalle: `${productoSeleccionado.nombre} (${sucursalEfectivaNombre}): ${cambiosLog.join(', ')}`
        });
      }

      setMensaje({ tipo: 'exito', texto: `¡Stock guardado en ${sucursalEfectivaNombre}!` });
      await cargarProductos();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error guardando stock.' });
    } finally {
      setGuardando(false);
    }
  };

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const coloresAgrupados = Array.from(
    new Set(
      (productoSeleccionado?.variantes || [])
        .filter((v: any) =>
          v.stock_sucursal?.some((s: any) => s.sucursal_id === sucursalEfectivaId)
        )
        .map((v: any) => v.color)
    )
  ) as string[];

  const mapaTalles = new Map<string, TalleCatalogo>();
  productoSeleccionado?.variantes?.forEach((v: any) => {
    if (v.talles_catalogo && !mapaTalles.has(v.talles_catalogo.id)) {
      mapaTalles.set(v.talles_catalogo.id, v.talles_catalogo as TalleCatalogo);
    }
  });

  const tallesDeLaPrenda: TalleCatalogo[] = Array.from(mapaTalles.values()).sort(
    (a, b) => a.orden - b.orden
  );

  const curvaActualModal = obtenerTipoCurvaPorCategoria(nuevaCategoriaId);
  const tallesDisponiblesModal = talles.filter((t) => t.tipo_curva === curvaActualModal);

  const preciosSeleccionado = productoSeleccionado 
    ? obtenerPreciosSucursal(productoSeleccionado) 
    : { costo: 0, venta: 0 };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wide text-white flex items-center gap-2">
            <Boxes className="w-6 h-6 text-sky-400" />
            Catálogo & Matriz de Stock
          </h1>
          <p className="text-sm text-slate-400">
            Control de inventario {esAdmin ? 'y precios ' : ''}exclusivo para <strong className="text-sky-400">{sucursalEfectivaNombre}</strong>
          </p>
        </div>

        {esAdmin && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setMostrarModalNuevo(true);
                setErrorModal(null);
                setColoresSeleccionados([]);
                setColorInputModal('');
                if (categorias.length > 0) {
                  handleCambiarCategoriaModal(categorias[0].id);
                }
              }}
              className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-black px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 uppercase tracking-wider transition-colors cursor-pointer shadow-lg"
            >
              <Plus className="w-4 h-4" /> Nuevo Producto Base
            </button>
          </div>
        )}
      </div>

      {mensaje && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            mensaje.tipo === 'error'
              ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
          }`}
        >
          {mensaje.tipo === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <Check className="w-4 h-4 shrink-0" />
          )}
          <span>{mensaje.texto}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar prenda..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {productosFiltrados.map((prod) => {
              const pSucursal = obtenerPreciosSucursal(prod);
              const margen = pSucursal.costo > 0 
                ? Math.round(((pSucursal.venta - pSucursal.costo) / pSucursal.costo) * 100) 
                : null;

              return (
                <div
                  key={prod.id}
                  onClick={() => setProductoSeleccionado(prod)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    productoSeleccionado?.id === prod.id
                      ? 'bg-sky-500/10 border-sky-500/60 shadow-sm'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-xs">{prod.nombre}</h4>
                      <p className="text-[10px] text-slate-400 uppercase mt-0.5">
                        {prod.categorias?.nombre}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-emerald-400 text-xs">
                      ${pSucursal.venta.toLocaleString()}
                    </span>
                  </div>

                  {esAdmin && (
                    <div className="mt-2 pt-2 border-t border-slate-900 flex justify-between text-[10px] text-slate-500 font-medium">
                      <span>
                        {pSucursal.costo > 0
                          ? `Costo (${sucursalEfectivaNombre}): $${pSucursal.costo.toLocaleString()}`
                          : 'Costo: Sin cargar'}
                      </span>
                      {margen !== null && (
                        <span className="text-sky-400 font-bold">
                          Margen: +{margen}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          {productoSeleccionado ? (
            <>
              <div className="border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-black text-white">
                    Matriz de Stock: {productoSeleccionado.nombre}
                  </h2>
                  
                  {esAdmin && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={abrirModalEditar}
                        title={`Editar precios para ${sucursalEfectivaNombre}`}
                        className="p-1.5 bg-slate-800 hover:bg-sky-500 hover:text-slate-950 text-slate-300 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setMostrarModalEliminar(true)}
                        title={`Eliminar prenda de ${sucursalEfectivaNombre}`}
                        className="p-1.5 bg-slate-800 hover:bg-rose-600 hover:text-white text-rose-400 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 mt-1 text-xs text-slate-400">
                  <span>Venta actual: <strong className="text-emerald-400 font-mono">${preciosSeleccionado.venta.toLocaleString()}</strong></span>
                  {esAdmin && (
                    <span>
                      Costo:{' '}
                      <strong className="text-slate-200 font-mono">
                        {preciosSeleccionado.costo > 0 ? `$${preciosSeleccionado.costo.toLocaleString()}` : 'Sin cargar'}
                      </strong>
                    </span>
                  )}
                  <span className="text-slate-500">Navegá casilleros con <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-300">Tab</kbd></span>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Agregar otro color (ej. Blanco, Washed, Gris)"
                  value={nuevoColor}
                  onChange={(e) => setNuevoColor(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAgregarColor();
                    }
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white flex-1 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={handleAgregarColor}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer transition-colors"
                >
                  + Color
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-bold">
                    <tr>
                      <th className="px-4 py-3">Color</th>
                      {tallesDeLaPrenda.map((t) => (
                        <th key={t.id} className="px-3 py-3 text-center">
                          {t.tipo_curva === 'unico' ? 'Único' : `Talle ${t.etiqueta}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {coloresAgrupados.length === 0 ? (
                      <tr>
                        <td colSpan={tallesDeLaPrenda.length + 1} className="text-center py-6 text-slate-500">
                          Agregá un color arriba para comenzar a cargar el stock.
                        </td>
                      </tr>
                    ) : (
                      coloresAgrupados.map((color) => (
                        <tr key={color} className="hover:bg-slate-800/20">
                          <td className="px-4 py-3 font-bold text-white capitalize">
                            <div className="flex items-center gap-2">
                              <span>{color}</span>
                              {esAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleEliminarColorDeMatriz(color)}
                                  title={`Quitar color ${color}`}
                                  className="text-slate-600 hover:text-rose-400 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                          {tallesDeLaPrenda.map((t) => {
                            const variante = productoSeleccionado.variantes?.find(
                              (v: any) => v.color.toLowerCase() === color.toLowerCase() && v.talle_id === t.id
                            );

                            if (!variante) {
                              return <td key={t.id} className="text-center text-slate-600">-</td>;
                            }

                            return (
                              <td key={t.id} className="px-2 py-2 text-center">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  placeholder="0"
                                  value={matrizValores[variante.id] ?? ''}
                                  onChange={(e) => {
                                    const soloDigitos = e.target.value.replace(/\D/g, '');
                                    const limpio = soloDigitos === '' ? '' : String(parseInt(soloDigitos, 10));
                                    setMatrizValores({
                                      ...matrizValores,
                                      [variante.id]: limpio
                                    });
                                  }}
                                  className="w-16 bg-slate-950 border border-slate-700 focus:border-sky-500 rounded px-2 py-1.5 text-center text-white placeholder-slate-600 font-mono font-bold text-xs focus:outline-none"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  disabled={guardando}
                  onClick={handleGuardarStock}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-extrabold px-6 py-2.5 rounded-lg text-xs flex items-center gap-2 uppercase tracking-wider transition-colors cursor-pointer shadow-lg"
                >
                  <Save className="w-4 h-4" />
                  {guardando ? 'Guardando...' : `Guardar Stock en ${sucursalEfectivaNombre}`}
                </button>
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-slate-500 text-xs">
              Seleccioná un producto del listado o creá uno nuevo.
            </div>
          )}
        </div>
      </div>

      {/* MODAL EDITAR PRODUCTO */}
      {mostrarModalEditar && esAdmin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black uppercase text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-sky-400" /> Editar Precios y Datos
                </h3>
                <p className="text-[11px] text-sky-400 font-semibold mt-0.5">
                  Aplicando únicamente para: {sucursalEfectivaNombre}
                </p>
              </div>
              <button
                onClick={() => setMostrarModalEditar(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGuardarEdicion} className="space-y-4 text-xs">
              <div>
                <label className="block uppercase font-bold text-slate-400 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block uppercase font-bold text-slate-400 mb-1">Categoría</label>
                <select
                  value={editCategoriaId}
                  onChange={(e) => setEditCategoriaId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                >
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase font-bold text-slate-400 mb-1">
                    Costo <span className="text-slate-500 font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Opcional"
                    value={editCosto}
                    onChange={(e) => setEditCosto(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block uppercase font-bold text-slate-400 mb-1">Precio Venta ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editPrecioVenta}
                    onChange={(e) => setEditPrecioVenta(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setMostrarModalEditar(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold cursor-pointer hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoEdicion}
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-lg cursor-pointer uppercase tracking-wider transition-colors flex items-center gap-1.5"
                >
                  {guardandoEdicion && <Loader2 className="w-4 h-4 animate-spin" />}
                  {guardandoEdicion ? 'Guardando...' : `Guardar en ${sucursalEfectivaNombre}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR PRODUCTO */}
      {mostrarModalEliminar && esAdmin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black uppercase text-white">
                ¿Bajar {productoSeleccionado?.nombre}?
              </h3>
              <p className="text-xs text-slate-400">
                Se quitará el stock y los precios exclusivamente de <strong className="text-white">{sucursalEfectivaNombre}</strong> sin alterar las demás sucursales.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMostrarModalEliminar(false)}
                className="w-1/2 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold cursor-pointer hover:bg-slate-700 text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={eliminandoProducto}
                onClick={handleEliminarProducto}
                className="w-1/2 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-lg cursor-pointer uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                {eliminandoProducto && <Loader2 className="w-4 h-4 animate-spin" />}
                {eliminandoProducto ? 'Borrando...' : 'Sí, Quitar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO PRODUCTO */}
      {mostrarModalNuevo && esAdmin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl my-auto">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black uppercase text-white">
                  Crear / Asignar Prenda
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Definí talles, colores y precio para <strong className="text-sky-400">{sucursalEfectivaNombre}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalNuevo(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorModal && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorModal}</span>
              </div>
            )}

            <form onSubmit={handleCrearProducto} className="space-y-4 text-xs">
              <div>
                <label className="block uppercase font-bold text-slate-400 mb-1">Nombre de la Prenda</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Remera Boxy Heavy Cotton"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block uppercase font-bold text-slate-400 mb-1">Categoría</label>
                <select
                  value={nuevaCategoriaId}
                  onChange={(e) => handleCambiarCategoriaModal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                >
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="uppercase font-bold text-slate-400">
                    Talles Disponibles ({tallesSeleccionadosIds.length} seleccionados)
                  </label>
                  {curvaActualModal !== 'unico' && (
                    <button
                      type="button"
                      onClick={() => {
                        const todos = tallesDisponiblesModal.map((t) => t.id);
                        if (tallesSeleccionadosIds.length === todos.length) {
                          setTallesSeleccionadosIds([]);
                        } else {
                          setTallesSeleccionadosIds(todos);
                        }
                      }}
                      className="text-[11px] text-sky-400 hover:underline font-semibold cursor-pointer"
                    >
                      {tallesSeleccionadosIds.length === tallesDisponiblesModal.length
                        ? 'Desmarcar todos'
                        : 'Marcar todos'}
                    </button>
                  )}
                </div>

                {curvaActualModal === 'unico' ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-amber-400 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    Talle Único (U) - Se asigna automáticamente para accesorios
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {tallesDisponiblesModal.map((t) => {
                      const seleccionado = tallesSeleccionadosIds.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleTalleSeleccionado(t.id)}
                          className={`py-2 px-1 rounded-lg font-mono font-bold text-xs transition-all cursor-pointer border ${
                            seleccionado
                              ? 'bg-sky-500 border-sky-400 text-slate-950 shadow-sm'
                              : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300'
                          }`}
                        >
                          {t.etiqueta}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="block uppercase font-bold text-slate-400">
                  Colores de la Prenda ({coloresSeleccionados.length})
                </label>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ej. Blanco, Negro, Washed, Arena..."
                    value={colorInputModal}
                    onChange={(e) => setColorInputModal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        agregarColorAModal(colorInputModal);
                      }
                    }}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => agregarColorAModal(colorInputModal)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg cursor-pointer transition-colors"
                  >
                    + Agregar
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-500">Rápidos:</span>
                  {COLORES_SUGERIDOS.map((sug) => {
                    const activo = coloresSeleccionados.some(
                      (c) => c.toLowerCase() === sug.toLowerCase()
                    );
                    return (
                      <button
                        key={sug}
                        type="button"
                        onClick={() =>
                          activo ? quitarColorDeModal(sug) : agregarColorAModal(sug)
                        }
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border cursor-pointer transition-colors ${
                          activo
                            ? 'bg-sky-500/20 border-sky-500 text-sky-400'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {activo ? `✓ ${sug}` : `+ ${sug}`}
                      </button>
                    );
                  })}
                </div>

                {coloresSeleccionados.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {coloresSeleccionados.map((col) => (
                      <span
                        key={col}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/40 text-sky-300 font-bold text-[11px]"
                      >
                        {col}
                        <button
                          type="button"
                          onClick={() => quitarColorDeModal(col)}
                          className="text-sky-400 hover:text-white cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase font-bold text-slate-400 mb-1">
                    Costo <span className="text-slate-500 font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Dejar vacío si no se sabe"
                    value={nuevoCosto}
                    onChange={(e) => setNuevoCosto(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block uppercase font-bold text-slate-400 mb-1">Precio Venta ({sucursalEfectivaNombre}) ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ej. 35000"
                    value={nuevoPrecioVenta}
                    onChange={(e) => setNuevoPrecioVenta(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setMostrarModalNuevo(false)}
                  disabled={creandoProducto}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold cursor-pointer hover:bg-slate-700 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creandoProducto}
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-lg cursor-pointer uppercase tracking-wider transition-colors shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  {creandoProducto && <Loader2 className="w-4 h-4 animate-spin" />}
                  {creandoProducto ? 'Guardando...' : `Registrar en ${sucursalEfectivaNombre}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};