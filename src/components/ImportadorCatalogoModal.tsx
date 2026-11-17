import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import type { Categoria } from '../types/database';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  RefreshCw,
  Info
} from 'lucide-react';

interface TalleCatalogo {
  id: string;
  etiqueta: string;
  tipo_curva: 'superior' | 'numerico' | 'unico';
  orden: number;
}

interface FilaImportada {
  filaNumero: number;
  nombre: string;
  categoria: string;
  color: string;
  talle: string;
  sku: string;
  costo: number;
  venta: number;
  stock: number;
  valida: boolean;
  error?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  empresaId: string;
  sucursalId: string;
  sucursalNombre: string;
  categorias: Categoria[];
  talles: TalleCatalogo[];
  onImportacionCompleta: () => Promise<void>;
}

const COLUMNAS_PLANTILLA = [
  { nombre: 'Nombre', obligatoria: true, detalle: 'Nombre de la prenda (ej. Remera Boxy)' },
  { nombre: 'Categoria', obligatoria: false, detalle: 'Si queda vacío usa tu categoría principal' },
  { nombre: 'Color', obligatoria: false, detalle: 'Si queda vacío asigna "Negro"' },
  { nombre: 'Talle', obligatoria: false, detalle: 'S, M, L, XL, 38..48 o U (por defecto "U")' },
  { nombre: 'SKU', obligatoria: false, detalle: 'Código de barras propio (si queda vacío se genera solo)' },
  { nombre: 'Precio_Costo', obligatoria: false, detalle: 'Costo unitario sin signo $ (por defecto 0)' },
  { nombre: 'Precio_Venta', obligatoria: true, detalle: 'Precio al público sin signo $ (mayor a 0)' },
  { nombre: 'Stock_Inicial', obligatoria: false, detalle: 'Cantidad de unidades (por defecto 0)' }
];

export const ImportadorCatalogoModal = ({
  isOpen,
  onClose,
  empresaId,
  sucursalId,
  sucursalNombre,
  categorias,
  talles,
  onImportacionCompleta
}: Props) => {
  const [filas, setFilas] = useState<FilaImportada[]>([]);
  const [nombreArchivo, setNombreArchivo] = useState<string>('');
  const [modoStock, setModoStock] = useState<'sumar' | 'sobrescribir'>('sumar');
  const [importando, setImportando] = useState(false);
  const [progreso, setProgreso] = useState({ actual: 0, total: 0 });
  const [resultadoFinal, setResultadoFinal] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDescargarPlantilla = () => {
    // Hoja 1: Solo encabezados exactos y filas completamente vacías para llenar
    const encabezados = [COLUMNAS_PLANTILLA.map((c) => c.nombre)];
    const ws = XLSX.utils.aoa_to_sheet(encabezados);
    ws['!cols'] = [
      { wch: 24 },
      { wch: 16 },
      { wch: 14 },
      { wch: 10 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 }
    ];

    // Hoja 2: Guía rápida de referencia para el cliente
    const guiaData = COLUMNAS_PLANTILLA.map((c) => ({
      Columna: c.nombre,
      Requisito: c.obligatoria ? 'OBLIGATORIA' : 'Opcional',
      Explicacion: c.detalle
    }));
    const wsGuia = XLSX.utils.json_to_sheet(guiaData);
    wsGuia['!cols'] = [{ wch: 16 }, { wch: 15 }, { wch: 52 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Catalogo_GEMI');
    XLSX.utils.book_append_sheet(wb, wsGuia, 'Guia_Columnas');
    XLSX.writeFile(wb, `Plantilla_Vacia_GEMI_${sucursalNombre.replace(/\s+/g, '_')}.xlsx`);
  };

  const normalizarClave = (obj: any, posiblesNombres: string[]) => {
    const keys = Object.keys(obj);
    for (const posible of posiblesNombres) {
      const encontrada = keys.find(
        (k) => k.trim().toLowerCase().replace(/[\s_-]+/g, '') === posible.toLowerCase().replace(/[\s_-]+/g, '')
      );
      if (encontrada !== undefined && obj[encontrada] !== undefined && obj[encontrada] !== null) {
        return obj[encontrada];
      }
    }
    return '';
  };

  const handleArchivoSeleccionado = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNombreArchivo(file.name);
    setResultadoFinal(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const rawData = XLSX.utils.sheet_to_json(ws);

      // Filtrar filas completamente vacías por si el usuario dejó renglones en blanco
      const filasConDatos = rawData.filter((row: any) =>
        Object.values(row).some((val) => val !== undefined && val !== null && String(val).trim() !== '')
      );

      const procesadas: FilaImportada[] = filasConDatos.map((row: any, idx: number) => {
        const nombre = String(normalizarClave(row, ['nombre', 'producto', 'prenda', 'titulo'])).trim();
        const categoria =
          String(normalizarClave(row, ['categoria', 'rubro', 'tipo'])).trim() ||
          (categorias[0]?.nombre || 'General');
        const color = String(normalizarClave(row, ['color', 'variante', 'tono'])).trim() || 'Negro';
        const talle = String(normalizarClave(row, ['talle', 'size', 'talla'])).trim().toUpperCase() || 'U';
        const sku = String(normalizarClave(row, ['sku', 'codigo', 'codigobarras', 'skuinterno'])).trim();
        const costo = Number(normalizarClave(row, ['preciocosto', 'costo', 'costotaller'])) || 0;
        const venta = Number(normalizarClave(row, ['precioventa', 'venta', 'precio'])) || 0;
        const stock = Math.max(0, Math.floor(Number(normalizarClave(row, ['stockinicial', 'stock', 'cantidad'])) || 0));

        let error: string | undefined;
        if (!nombre) {
          error = 'Falta el nombre de la prenda';
        } else if (venta <= 0) {
          error = 'Precio de venta debe ser mayor a $0';
        }

        return {
          filaNumero: idx + 2,
          nombre,
          categoria,
          color,
          talle,
          sku,
          costo,
          venta,
          stock,
          valida: !error,
          error
        };
      });

      setFilas(procesadas);
    };

    reader.readAsBinaryString(file);
  };

  const handleEjecutarImportacion = async () => {
    const filasValidas = filas.filter((f) => f.valida);
    if (filasValidas.length === 0) return;

    setImportando(true);
    setProgreso({ actual: 0, total: filasValidas.length });

    try {
      const mapaCategorias = new Map<string, string>();
      categorias.forEach((c) => mapaCategorias.set(c.nombre.toLowerCase(), c.id));

      const mapaTalles = new Map<string, string>();
      talles.forEach((t) => mapaTalles.set(t.etiqueta.toUpperCase(), t.id));
      const talleUnicoDefault = talles.find((t) => t.tipo_curva === 'unico')?.id || talles[0]?.id;

      const mapaProductos = new Map<string, string>();

      for (let i = 0; i < filasValidas.length; i++) {
        const fila = filasValidas[i];
        setProgreso({ actual: i + 1, total: filasValidas.length });

        // 1. Resolver o crear Categoría
        let catId: string | undefined = mapaCategorias.get(fila.categoria.toLowerCase());
        if (!catId) {
          const { data: catNueva } = await supabase
            .from('categorias')
            .insert({
              empresa_id: empresaId,
              nombre: fila.categoria,
              orden: mapaCategorias.size + 1
            })
            .select('id')
            .single();

          if (catNueva?.id) {
            catId = String(catNueva.id);
            mapaCategorias.set(fila.categoria.toLowerCase(), catId);
          } else if (categorias[0]?.id) {
            catId = categorias[0].id;
          }
        }

        // 2. Resolver o crear Producto Base
        let prodId: string | undefined = mapaProductos.get(fila.nombre.toLowerCase());
        if (!prodId) {
          const { data: prodExistente } = await supabase
            .from('productos')
            .select('id')
            .eq('empresa_id', empresaId)
            .ilike('nombre', fila.nombre)
            .maybeSingle();

          if (prodExistente?.id) {
            prodId = String(prodExistente.id);
            await supabase
              .from('productos')
              .update({ activo: true })
              .eq('id', prodId);
          } else {
            const { data: prodNuevo, error: errProd } = await supabase
              .from('productos')
              .insert({
                empresa_id: empresaId,
                nombre: fila.nombre,
                categoria_id: catId || null,
                precio_costo: fila.costo,
                precio_venta: fila.venta,
                activo: true
              })
              .select('id')
              .single();

            if (errProd) throw errProd;
            prodId = String(prodNuevo.id);
          }
          mapaProductos.set(fila.nombre.toLowerCase(), prodId);
        }

        // 3. Actualizar precios en la sucursal activa
        await supabase
          .from('productos_precios_sucursal')
          .upsert(
            {
              producto_id: prodId,
              sucursal_id: sucursalId,
              precio_costo: fila.costo,
              precio_venta: fila.venta,
              updated_at: new Date().toISOString()
            },
            { onConflict: 'producto_id,sucursal_id' }
          );

        // 4. Resolver Talle
        const talleId = mapaTalles.get(fila.talle.toUpperCase()) || talleUnicoDefault;

        // 5. Resolver o crear Variante (Producto + Talle + Color)
        let { data: varExistente } = await supabase
          .from('variantes')
          .select('id')
          .eq('producto_id', prodId)
          .eq('talle_id', talleId)
          .ilike('color', fila.color)
          .maybeSingle();

        if (!varExistente) {
          const skuFinal =
            fila.sku ||
            `${fila.nombre.replace(/\s+/g, '').substring(0, 4).toUpperCase()}-${fila.color
              .substring(0, 3)
              .toUpperCase()}-${fila.talle}-${Date.now().toString().slice(-4)}`;

          const { data: varNueva, error: errVar } = await supabase
            .from('variantes')
            .insert({
              producto_id: prodId,
              talle_id: talleId,
              color: fila.color,
              sku_interno: skuFinal
            })
            .select('id')
            .single();

          if (errVar) throw errVar;
          varExistente = varNueva;
        }

        // 6. Actualizar Stock en la sucursal
        if (varExistente) {
          let cantidadFinal = fila.stock;

          if (modoStock === 'sumar') {
            const { data: stockPrevio } = await supabase
              .from('stock_sucursal')
              .select('cantidad')
              .eq('variante_id', varExistente.id)
              .eq('sucursal_id', sucursalId)
              .maybeSingle();

            cantidadFinal = Number(stockPrevio?.cantidad || 0) + fila.stock;
          }

          await supabase
            .from('stock_sucursal')
            .upsert(
              {
                variante_id: varExistente.id,
                sucursal_id: sucursalId,
                cantidad: cantidadFinal,
                updated_at: new Date().toISOString()
              },
              { onConflict: 'variante_id,sucursal_id' }
            );
        }
      }

      await onImportacionCompleta();
      setResultadoFinal(`¡Se importaron ${filasValidas.length} variantes correctamente en ${sucursalNombre}!`);
      setFilas([]);
      setNombreArchivo('');
    } catch (err: any) {
      alert('Error durante la importación: ' + (err.message || 'Error desconocido'));
    } finally {
      setImportando(false);
    }
  };

  const validasCount = filas.filter((f) => f.valida).length;
  const invalidasCount = filas.length - validasCount;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 space-y-5 shadow-2xl my-auto">
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-black uppercase text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              Importar Catálogo Masivo desde Excel / CSV
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Destino: <strong className="text-sky-400">{sucursalNombre}</strong> · Subí cientos de prendas, talles y precios en segundos.
            </p>
          </div>
          <button
            type="button"
            disabled={importando}
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paso 1 y Paso 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-400">
              Paso 1 · Plantilla en blanco
            </span>
            <h4 className="text-xs font-bold text-white">Descargá el Excel vacío con los encabezados</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Viene sin productos cargados (solo con las columnas exactas y una pestaña de guía) para que completes directo desde la fila 2.
            </p>
            <button
              type="button"
              onClick={handleDescargarPlantilla}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3.5 py-2 rounded-lg text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" /> Descargar Plantilla Vacía (.xlsx)
            </button>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
              Paso 2 · Subir archivo completo
            </span>
            <h4 className="text-xs font-bold text-white">Cargá tu Excel o CSV ya completado</h4>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleArchivoSeleccionado}
              className="hidden"
            />
            <button
              type="button"
              disabled={importando}
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-xl py-3 px-4 text-xs text-slate-300 font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Upload className="w-4 h-4 text-sky-400" />
              {nombreArchivo ? nombreArchivo : 'Seleccionar archivo (.xlsx, .xls, .csv)'}
            </button>
          </div>
        </div>

        {/* Esquema visual de columnas antes de subir archivo */}
        {filas.length === 0 && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-black text-white">
              <Info className="w-4 h-4 text-sky-400" />
              <span>Estructura de columnas del archivo:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {COLUMNAS_PLANTILLA.map((col) => (
                <div
                  key={col.nombre}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 space-y-1"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono font-bold text-xs text-white">{col.nombre}</span>
                    <span
                      className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                        col.obligatoria
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {col.obligatoria ? 'Obligatoria' : 'Opcional'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-snug">{col.detalle}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {resultadoFinal && (
          <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 p-4 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{resultadoFinal}</span>
          </div>
        )}

        {filas.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs">
              <div className="flex items-center gap-3">
                <span className="text-emerald-400 font-black">
                  ✅ {validasCount} filas listas
                </span>
                {invalidasCount > 0 && (
                  <span className="text-rose-400 font-black">
                    ⚠️ {invalidasCount} con error (se omitirán)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold">Si la prenda ya existe:</span>
                <select
                  value={modoStock}
                  onChange={(e) => setModoStock(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-bold cursor-pointer"
                >
                  <option value="sumar">Sumar al stock actual (+)</option>
                  <option value="sobrescribir">Reemplazar stock exacto (=)</option>
                </select>
              </div>
            </div>

            <div className="max-h-64 overflow-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-950 text-slate-400 uppercase font-bold sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Fila</th>
                    <th className="px-3 py-2">Prenda</th>
                    <th className="px-3 py-2">Categoría</th>
                    <th className="px-3 py-2">Color / Talle</th>
                    <th className="px-3 py-2">Costo</th>
                    <th className="px-3 py-2">Venta</th>
                    <th className="px-3 py-2">Stock</th>
                    <th className="px-3 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filas.map((f) => (
                    <tr
                      key={f.filaNumero}
                      className={f.valida ? 'hover:bg-slate-800/30' : 'bg-rose-500/10'}
                    >
                      <td className="px-3 py-2 font-mono text-slate-500">#{f.filaNumero}</td>
                      <td className="px-3 py-2 font-bold text-white">{f.nombre || '(Vacío)'}</td>
                      <td className="px-3 py-2 text-slate-300">{f.categoria}</td>
                      <td className="px-3 py-2 text-slate-300">
                        {f.color} · <strong>{f.talle}</strong>
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-400">${f.costo.toLocaleString()}</td>
                      <td className="px-3 py-2 font-mono text-emerald-400 font-bold">
                        ${f.venta.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 font-mono text-white font-bold">{f.stock}</td>
                      <td className="px-3 py-2">
                        {f.valida ? (
                          <span className="text-emerald-400 font-bold">OK</span>
                        ) : (
                          <span className="text-rose-400 font-bold inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {f.error}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          {importando ? (
            <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Procesando fila {progreso.actual} de {progreso.total}... No cierres esta ventana.
            </div>
          ) : (
            <span className="text-[11px] text-slate-500">
              Las categorías o variantes nuevas se crean solas.
            </span>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={importando}
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              Cerrar
            </button>
            {validasCount > 0 && (
              <button
                type="button"
                disabled={importando}
                onClick={handleEjecutarImportacion}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {importando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Importando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Importar {validasCount} Filas
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};