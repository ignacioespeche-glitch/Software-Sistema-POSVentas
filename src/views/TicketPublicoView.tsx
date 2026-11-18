import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle2, Store, Calendar, CreditCard, ShieldCheck, Printer } from 'lucide-react';

export const TicketPublicoView = () => {
  const { id } = useParams<{ id: string }>();
  const [venta, setVenta] = useState<any | null>(null);
  const [datosFiscales, setDatosFiscales] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargarComprobante() {
      if (!id) return;

      const { data, error } = await supabase
        .from('ventas')
        .select(`
          *,
          empresas (nombre),
          sucursales (nombre, direccion, telefono),
          clientes (nombre, telefono_whatsapp),
          ventas_detalle (
            cantidad,
            precio_unitario_cobrado,
            subtotal_linea,
            variantes (
              color,
              talles_catalogo (etiqueta),
              productos (nombre)
            )
          )
        `)
        .eq('id', id)
        .single();

      if (!error && data) {
        setVenta(data);

        // Si es comprobante fiscal ARCA, cargar datos públicos del emisor (CUIT, Razón Social, Condición IVA)
        if (data.es_fiscal && data.empresa_id) {
          const { data: cfgFiscal } = await supabase
            .from('configuracion_fiscal_arca')
            .select('cuit, razon_social, condicion_iva, domicilio_fiscal, inicio_actividades, iibb')
            .eq('empresa_id', data.empresa_id)
            .maybeSingle();

          if (cfgFiscal) {
            setDatosFiscales(cfgFiscal);
          }
        }
      }
      setLoading(false);
    }

    cargarComprobante();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        Cargando comprobante...
      </div>
    );
  }

  if (!venta) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-lg font-bold text-white mb-1">Comprobante no encontrado</h2>
        <p className="text-xs text-slate-500">El enlace no es válido o la operación ha sido anulada.</p>
      </div>
    );
  }

  const nombreMarca = venta.empresas?.nombre || 'Comercio';
  const esFacturaArca = Boolean(venta.es_fiscal && venta.cae);

  // Armar URL oficial del QR de ARCA (RG 4892 / Specs oficiales)
  let urlQrArca = '';
  if (esFacturaArca && datosFiscales?.cuit) {
    const fechaEmision = new Date(venta.created_at).toISOString().split('T')[0];
    const payloadQr = {
      ver: 1,
      fecha: fechaEmision,
      cuit: Number(String(datosFiscales.cuit).replace(/\D/g, '')),
      ptoVta: Number(venta.punto_venta_arca || 1),
      tipoCmp: Number(venta.tipo_comprobante_arca || 11),
      nroCmp: Number(venta.numero_comprobante_arca || 1),
      importe: Number(Number(venta.total_final).toFixed(2)),
      moneda: 'PES',
      ctz: 1,
      tipoDocRec: Number(venta.receptor_doc_tipo || 99),
      nroDocRec: Number(String(venta.receptor_doc_nro || '0').replace(/\D/g, '')),
      tipoCodAut: 'E',
      codAut: Number(String(venta.cae).replace(/\D/g, ''))
    };
    const base64Qr = btoa(JSON.stringify(payloadQr));
    urlQrArca = `https://www.afip.gob.ar/fe/qr/?p=${encodeURIComponent(base64Qr)}`;
  }

  const numeroFormateado = esFacturaArca
    ? `${String(venta.punto_venta_arca || 1).padStart(4, '0')}-${String(venta.numero_comprobante_arca || 1).padStart(8, '0')}`
    : '';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 self-start">
        
        {/* Cabecera Ticket / Factura Fiscal */}
        <div className="text-center space-y-2 border-b border-slate-800 pb-5">
          {esFacturaArca && (
            <div className="flex flex-col items-center justify-center mb-2">
              <div className="w-12 h-12 rounded-xl bg-slate-950 border-2 border-slate-600 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-white leading-none">{venta.letra_comprobante}</span>
                <span className="text-[8px] font-mono text-slate-400 mt-0.5">
                  COD. {String(venta.tipo_comprobante_arca).padStart(2, '0')}
                </span>
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-sky-400 mt-1.5">
                Factura {venta.letra_comprobante} · Nº {numeroFormateado}
              </span>
            </div>
          )}

          <span className="text-2xl font-black tracking-widest uppercase text-white block">
            {nombreMarca}
          </span>

          {esFacturaArca && datosFiscales ? (
            <div className="text-[11px] text-slate-400 space-y-0.5 pt-1">
              <p className="font-bold text-slate-300">{datosFiscales.razon_social}</p>
              <p>CUIT: <span className="font-mono text-slate-200">{datosFiscales.cuit}</span></p>
              <p className="capitalize">
                Cond. IVA: {datosFiscales.condicion_iva === 'responsable_inscripto' ? 'IVA Responsable Inscripto' : 'Responsable Monotributo'}
              </p>
              {datosFiscales.iibb && <p>IIBB: {datosFiscales.iibb}</p>}
              {datosFiscales.domicilio_fiscal && <p>{datosFiscales.domicilio_fiscal}</p>}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Comprobante Digital Oficial</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">ID: {venta.id}</p>
            </>
          )}
        </div>

        {/* Datos de la Sucursal y Fecha */}
        <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
              <Store className="w-3 h-3 text-sky-400" /> Local
            </span>
            <p className="font-semibold text-slate-200">{venta.sucursales?.nombre}</p>
            <p className="text-[10px] text-slate-500">{venta.sucursales?.direccion}</p>
          </div>

          <div className="space-y-0.5 text-right">
            <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center justify-end gap-1">
              <Calendar className="w-3 h-3 text-sky-400" /> Fecha
            </span>
            <p className="font-semibold text-slate-200">
              {new Date(venta.created_at).toLocaleDateString()}
            </p>
            <p className="text-[10px] text-slate-500">
              {new Date(venta.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
            </p>
          </div>
        </div>

        {/* Datos del Receptor (si es factura fiscal) */}
        {esFacturaArca && (
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Cliente:</span>
              <span className="font-bold text-slate-200">{venta.receptor_nombre || venta.clientes?.nombre || 'Consumidor Final'}</span>
            </div>
            {venta.receptor_doc_tipo !== 99 && venta.receptor_doc_nro && (
              <div className="flex justify-between">
                <span className="text-slate-400">{venta.receptor_doc_tipo === 80 ? 'CUIT:' : 'DNI:'}</span>
                <span className="font-mono text-slate-200">{venta.receptor_doc_nro}</span>
              </div>
            )}
          </div>
        )}

        {/* Detalle de Prendas */}
        <div className="space-y-3">
          <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Prendas Adquiridas</h3>
          
          <div className="divide-y divide-slate-800 border-t border-b border-slate-800">
            {venta.ventas_detalle?.map((d: any, index: number) => (
              <div key={index} className="py-2.5 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-slate-100">{d.variantes?.productos?.nombre}</p>
                  <p className="text-[11px] text-slate-400">
                    {d.variantes?.color} · Talle {d.variantes?.talles_catalogo?.etiqueta} (×{d.cantidad})
                  </p>
                </div>
                <span className="font-bold text-slate-200">
                  ${Number(d.subtotal_linea).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Resumen Financiero */}
        <div className="space-y-1.5 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="flex justify-between text-slate-400">
            <span>Subtotal:</span>
            <span>${Number(venta.subtotal).toLocaleString()}</span>
          </div>

          {Number(venta.descuento_valor) > 0 && (
            <div className="flex justify-between text-rose-400">
              <span>Descuento aplicado:</span>
              <span>
                {venta.descuento_tipo === 'porcentaje'
                  ? `-${venta.descuento_valor}%`
                  : `-$${Number(venta.descuento_valor).toLocaleString()}`}
              </span>
            </div>
          )}

          {esFacturaArca && Number(venta.importe_iva) > 0 && (
            <>
              <div className="flex justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-800/60">
                <span>Importe Neto Gravado:</span>
                <span>${Number(venta.importe_neto).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>IVA (21%):</span>
                <span>${Number(venta.importe_iva).toLocaleString()}</span>
              </div>
            </>
          )}

          <div className="flex justify-between text-sm pt-2 border-t border-slate-800 font-black">
            <span className="text-white">TOTAL ABONADO:</span>
            <span className="text-emerald-400 text-base">${Number(venta.total_final).toLocaleString()}</span>
          </div>

          <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1 capitalize">
              <CreditCard className="w-3.5 h-3.5 text-sky-400" /> Método de pago:
            </span>
            <span className="font-semibold text-slate-200 capitalize">{venta.metodo_pago}</span>
          </div>
        </div>

        {/* Bloque Oficial CAE y QR ARCA */}
        {esFacturaArca && (
          <div className="bg-white text-slate-950 p-4 rounded-xl flex items-center justify-between gap-3 shadow-inner">
            {urlQrArca && (
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(urlQrArca)}`}
                alt="QR Fiscal ARCA"
                className="w-24 h-24 shrink-0 border border-slate-200 rounded"
              />
            )}
            <div className="text-[11px] space-y-1 flex-1">
              <p className="font-black uppercase tracking-wider text-xs text-slate-900">
                Comprobante Autorizado
              </p>
              <p className="font-mono font-bold text-slate-800">
                CAE Nº: {venta.cae}
              </p>
              {venta.cae_vencimiento && (
                <p className="text-slate-600">
                  Vto. CAE: <strong className="font-mono">{venta.cae_vencimiento.split('-').reverse().join('/')}</strong>
                </p>
              )}
              <p className="text-[9px] text-slate-500 leading-tight pt-1">
                Esta Administración Federal no se responsabiliza por los datos ingresados en el detalle de la operación.
              </p>
            </div>
          </div>
        )}

        {/* Políticas de Cambio y Pie */}
        <div className="p-3.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1 bg-slate-900/50">
          <div className="flex items-center gap-1.5 text-slate-300 font-bold mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" /> Políticas de Cambio
          </div>
          <p>Los cambios se realizan dentro de los 30 días de corrida la compra.</p>
          <p>Es indispensable presentar este comprobante digital y la prenda con etiqueta en perfecto estado.</p>
          <p>Válido en cualquier sucursal oficial de {nombreMarca}.</p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors print:hidden"
        >
          <Printer className="w-4 h-4" /> Imprimir / Guardar PDF
        </button>

      </div>
    </div>
  );
};