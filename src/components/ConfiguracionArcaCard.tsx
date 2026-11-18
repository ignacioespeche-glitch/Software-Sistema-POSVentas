import { useState, useEffect } from 'react';
import forge from 'node-forge';
import { supabase } from '../lib/supabase';
import { registrarAuditoria } from '../lib/auditoria';
import type { Sucursal } from '../types/database';
import {
  FileCheck2,
  KeyRound,
  Upload,
  Download,
  Save,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Building2,
  ShieldAlert
} from 'lucide-react';

interface Props {
  empresaId: string;
  usuarioId?: string;
  usuarioNombre: string;
  sucursales: Sucursal[];
  onActualizarSucursales: () => Promise<void>;
}

export const ConfiguracionArcaCard = ({
  empresaId,
  usuarioId,
  usuarioNombre,
  sucursales,
  onActualizarSucursales
}: Props) => {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [generandoCsr, setGenerandoCsr] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);

  const [activo, setActivo] = useState(false);
  const [entorno, setEntorno] = useState<'homologacion' | 'produccion'>('homologacion');
  const [cuit, setCuit] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [condicionIva, setCondicionIva] = useState<'monotributo' | 'responsable_inscripto' | 'exento'>('monotributo');
  const [domicilioFiscal, setDomicilioFiscal] = useState('');
  const [inicioActividades, setInicioActividades] = useState('');
  const [iibb, setIibb] = useState('');
  const [certificadoCrt, setCertificadoCrt] = useState('');
  const [clavePrivadaKey, setClavePrivadaKey] = useState('');

  // Puntos de venta por sucursal
  const [puntosVentaSucursal, setPuntosVentaSucursal] = useState<{ [sucursalId: string]: number }>({});
  const [autoFacturaSucursal, setAutoFacturaSucursal] = useState<{ [sucursalId: string]: boolean }>({});

  useEffect(() => {
    if (empresaId) cargarConfiguracion();
  }, [empresaId]);

  useEffect(() => {
    const mapPv: { [id: string]: number } = {};
    const mapAuto: { [id: string]: boolean } = {};
    sucursales.forEach((s: any) => {
      mapPv[s.id] = Number(s.punto_venta_arca || 1);
      mapAuto[s.id] = Boolean(s.facturacion_arca_por_defecto);
    });
    setPuntosVentaSucursal(mapPv);
    setAutoFacturaSucursal(mapAuto);
  }, [sucursales]);

  const cargarConfiguracion = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('configuracion_fiscal_arca')
      .select('*')
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (data) {
      setActivo(Boolean(data.activo));
      setEntorno(data.entorno || 'homologacion');
      setCuit(data.cuit || '');
      setRazonSocial(data.razon_social || '');
      setCondicionIva(data.condicion_iva || 'monotributo');
      setDomicilioFiscal(data.domicilio_fiscal || '');
      setInicioActividades(data.inicio_actividades || '');
      setIibb(data.iibb || '');
      setCertificadoCrt(data.certificado_crt || '');
      setClavePrivadaKey(data.clave_privada_key || '');
    }
    setLoading(false);
  };

  const handleGenerarCsrYClave = () => {
    const cuitLimpio = cuit.replace(/\D/g, '');
    if (cuitLimpio.length !== 11) {
      setMensaje({ tipo: 'err', texto: 'Ingresá primero un CUIT válido de 11 dígitos sin guiones.' });
      return;
    }
    if (!razonSocial.trim()) {
      setMensaje({ tipo: 'err', texto: 'Ingresá la Razón Social o Nombre del Titular antes de generar el CSR.' });
      return;
    }

    setGenerandoCsr(true);
    setMensaje(null);

    setTimeout(() => {
      try {
        const keys = forge.pki.rsa.generateKeyPair(2048);
        const csr = forge.pki.createCertificationRequest();
        csr.publicKey = keys.publicKey;
        csr.setSubject([
          { name: 'countryName', value: 'AR' },
          { name: 'organizationName', value: razonSocial.trim() },
          { name: 'commonName', value: 'GEMI_POS' },
          { type: '2.5.4.5', value: `CUIT ${cuitLimpio}` }
        ]);
        csr.sign(keys.privateKey, forge.md.sha256.create());

        const pemCsr = forge.pki.certificationRequestToPem(csr);
        const pemKey = forge.pki.privateKeyToPem(keys.privateKey);

        setClavePrivadaKey(pemKey);

        // Descargar automáticamente el archivo .csr para subir a ARCA
        const blob = new Blob([pemCsr], { type: 'application/pkcs10' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pedido_ARCA_${cuitLimpio}.csr`;
        a.click();
        URL.revokeObjectURL(url);

        setMensaje({
          tipo: 'ok',
          texto: `¡Clave privada generada y archivo pedido_ARCA_${cuitLimpio}.csr descargado! Subilo en ARCA -> "Administración de Certificados Digitales", descargá el .crt y cargalo acá abajo. No olvides guardar los cambios.`
        });
      } catch (err: any) {
        setMensaje({ tipo: 'err', texto: 'Error generando el CSR: ' + err.message });
      } finally {
        setGenerandoCsr(false);
      }
    }, 50);
  };

  const handleLeerArchivoTexto = (
    e: React.ChangeEvent<HTMLInputElement>,
    destino: 'crt' | 'key'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const contenido = String(ev.target?.result || '').trim();
      if (destino === 'crt') {
        setCertificadoCrt(contenido);
      } else {
        setClavePrivadaKey(contenido);
      }
    };
    reader.readAsText(file);
  };

  const handleGuardarConfiguracion = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    const cuitLimpio = cuit.replace(/\D/g, '');
    if (cuitLimpio.length !== 11) {
      setMensaje({ tipo: 'err', texto: 'El CUIT debe tener exactamente 11 números.' });
      return;
    }

    if (activo && (!certificadoCrt.trim() || !clavePrivadaKey.trim())) {
      setMensaje({
        tipo: 'err',
        texto: 'Para activar la facturación ARCA debés tener cargados el Certificado (.crt) y la Clave Privada (.key).'
      });
      return;
    }

    setGuardando(true);

    try {
      const { error } = await supabase
        .from('configuracion_fiscal_arca')
        .upsert(
          {
            empresa_id: empresaId,
            activo,
            entorno,
            cuit: cuitLimpio,
            razon_social: razonSocial.trim(),
            condicion_iva: condicionIva,
            domicilio_fiscal: domicilioFiscal.trim() || null,
            inicio_actividades: inicioActividades || null,
            iibb: iibb.trim() || null,
            certificado_crt: certificadoCrt.trim() || null,
            clave_privada_key: clavePrivadaKey.trim() || null,
            // Invalidar token previo si cambió certificado o entorno
            wsaa_token: null,
            wsaa_sign: null,
            wsaa_expiracion: null,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'empresa_id' }
        );

      if (error) throw error;

      // Guardar puntos de venta de cada sucursal
      for (const suc of sucursales) {
        await supabase
          .from('sucursales')
          .update({
            punto_venta_arca: Number(puntosVentaSucursal[suc.id] || 1),
            facturacion_arca_por_defecto: Boolean(autoFacturaSucursal[suc.id])
          })
          .eq('id', suc.id);
      }

      await registrarAuditoria({
        empresaId,
        usuarioId,
        usuarioNombre,
        accion: 'CONFIG_FISCAL_ARCA',
        detalle: `Configuración fiscal ARCA actualizada (CUIT ${cuitLimpio} · ${condicionIva.toUpperCase()} · Entorno: ${entorno.toUpperCase()} · Activo: ${activo ? 'SÍ' : 'NO'}).`
      });

      await onActualizarSucursales();
      setMensaje({ tipo: 'ok', texto: '¡Configuración fiscal ARCA y puntos de venta guardados correctamente!' });
    } catch (err: any) {
      setMensaje({ tipo: 'err', texto: 'Error guardando configuración: ' + err.message });
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-xs text-slate-400">
        Cargando configuración fiscal ARCA...
      </div>
    );
  }

  const comprobantesQueEmite =
    condicionIva === 'responsable_inscripto'
      ? 'Factura A (a Resp. Inscriptos) y Factura B (a Consumidor Final / Monotributo)'
      : 'Factura C (a todos los clientes sin discriminar IVA)';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-sky-400" />
            Facturación Electrónica ARCA (ex-AFIP)
          </h2>
          <p className="text-xs text-slate-400">
            Conexión directa con Web Services de ARCA (WSAA + WSFEv1) sin costos por comprobante.
          </p>
        </div>

        <label className="inline-flex items-center gap-2.5 bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-xl cursor-pointer select-none">
          <input
            type="checkbox"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
            className="w-4 h-4 accent-emerald-500 cursor-pointer"
          />
          <span className={`text-xs font-black uppercase ${activo ? 'text-emerald-400' : 'text-slate-400'}`}>
            {activo ? 'Facturación ARCA Activa' : 'Facturación Desactivada'}
          </span>
        </label>
      </div>

      {mensaje && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2 ${
            mensaje.tipo === 'err'
              ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
          }`}
        >
          {mensaje.tipo === 'err' ? (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{mensaje.texto}</span>
        </div>
      )}

      <form onSubmit={handleGuardarConfiguracion} className="space-y-5 text-xs">
        {/* Datos Fiscales del Titular */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block uppercase font-bold text-slate-400 mb-1">CUIT (11 dígitos sin guiones)</label>
            <input
              type="text"
              maxLength={11}
              required
              placeholder="Ej. 20384567891"
              value={cuit}
              onChange={(e) => setCuit(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block uppercase font-bold text-slate-400 mb-1">Razón Social / Titular</label>
            <input
              type="text"
              required
              placeholder="Ej. ESPECHE IGNACIO o ASPEN S.R.L."
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block uppercase font-bold text-slate-400 mb-1">Entorno ARCA</label>
            <select
              value={entorno}
              onChange={(e) => setEntorno(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="homologacion">Homologación (Pruebas)</option>
              <option value="produccion">Producción (Real)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block uppercase font-bold text-slate-400 mb-1">Condición frente al IVA</label>
            <select
              value={condicionIva}
              onChange={(e) => setCondicionIva(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="monotributo">Responsable Monotributo</option>
              <option value="responsable_inscripto">IVA Responsable Inscripto</option>
              <option value="exento">IVA Sujeto Exento</option>
            </select>
          </div>

          <div>
            <label className="block uppercase font-bold text-slate-400 mb-1">Ingresos Brutos (IIBB)</label>
            <input
              type="text"
              placeholder="Ej. 913-123456-7 o Exento"
              value={iibb}
              onChange={(e) => setIibb(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block uppercase font-bold text-slate-400 mb-1">Inicio de Actividades</label>
            <input
              type="date"
              value={inicioActividades}
              onChange={(e) => setInicioActividades(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block uppercase font-bold text-slate-400 mb-1">Domicilio Comercial</label>
            <input
              type="text"
              placeholder="Calle Montevideo 27, Mendoza"
              value={domicilioFiscal}
              onChange={(e) => setDomicilioFiscal(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-3 text-sky-300 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-sky-400" />
          <span>
            Según tu condición fiscal, el sistema emitirá automáticamente: <strong>{comprobantesQueEmite}</strong>.
          </span>
        </div>

        {/* Certificados Digitales ARCA */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-black text-white flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-amber-400" />
                Certificado Digital (.crt) y Clave Privada (.key)
              </h3>
              <p className="text-[11px] text-slate-400">
                Si todavía no tenés certificado, generá el pedido (.csr) en 1 clic y subilo en tu cuenta de ARCA.
              </p>
            </div>

            <button
              type="button"
              disabled={generandoCsr}
              onClick={handleGenerarCsrYClave}
              className="bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold px-3.5 py-2 rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              {generandoCsr ? 'Generando...' : '1. Generar Pedido (.csr) y Clave'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold uppercase text-slate-400">Certificado ARCA (.crt)</label>
                <label className="text-sky-400 hover:underline font-bold cursor-pointer inline-flex items-center gap-1">
                  <Upload className="w-3 h-3" /> Subir archivo .crt
                  <input
                    type="file"
                    accept=".crt,.pem,.txt"
                    onChange={(e) => handleLeerArchivoTexto(e, 'crt')}
                    className="hidden"
                  />
                </label>
              </div>
              <textarea
                rows={4}
                placeholder="-----BEGIN CERTIFICATE----- ..."
                value={certificadoCrt}
                onChange={(e) => setCertificadoCrt(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono text-[10px] text-slate-300 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold uppercase text-slate-400">Clave Privada (.key)</label>
                <label className="text-sky-400 hover:underline font-bold cursor-pointer inline-flex items-center gap-1">
                  <Upload className="w-3 h-3" /> Subir archivo .key
                  <input
                    type="file"
                    accept=".key,.pem,.txt"
                    onChange={(e) => handleLeerArchivoTexto(e, 'key')}
                    className="hidden"
                  />
                </label>
              </div>
              <textarea
                rows={4}
                placeholder="-----BEGIN RSA PRIVATE KEY----- ..."
                value={clavePrivadaKey}
                onChange={(e) => setClavePrivadaKey(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono text-[10px] text-slate-300 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Puntos de Venta por Sucursal */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="font-black text-white flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-emerald-400" />
            Puntos de Venta ARCA (Web Services RECE) por Sucursal
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sucursales.map((s) => (
              <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{s.nombre}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">PV Nº:</span>
                    <input
                      type="number"
                      min="1"
                      max="99999"
                      value={puntosVentaSucursal[s.id] ?? 1}
                      onChange={(e) =>
                        setPuntosVentaSucursal({
                          ...puntosVentaSucursal,
                          [s.id]: Number(e.target.value)
                        })
                      }
                      className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-center text-white font-mono font-bold"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(autoFacturaSucursal[s.id])}
                    onChange={(e) =>
                      setAutoFacturaSucursal({
                        ...autoFacturaSucursal,
                        [s.id]: e.target.checked
                      })
                    }
                    className="accent-sky-500"
                  />
                  Marcar "Emitir Factura ARCA" por defecto en caja
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={guardando}
            className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-black px-6 py-2.5 rounded-xl uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer transition-colors shadow-lg"
          >
            {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {guardando ? 'Guardando...' : 'Guardar Configuración Fiscal'}
          </button>
        </div>
      </form>
    </div>
  );
};