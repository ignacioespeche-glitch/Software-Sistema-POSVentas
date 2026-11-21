import { useEffect, useState } from 'react';
import { X, Palette, ShieldCheck, Upload, Save, Sparkles } from 'lucide-react';
import { type BrandKit, travisService } from '../services/travisService';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  empresaId: string;
  nombreEmpresa: string;
  logoEmpresaUrl?: string | null;
  onGuardado: (kit: BrandKit) => void;
}

export const BrandKitModal = ({
  abierto,
  onCerrar,
  empresaId,
  nombreEmpresa,
  logoEmpresaUrl,
  onGuardado,
}: Props) => {
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState(false);

  const [form, setForm] = useState<BrandKit>({
    empresa_id: empresaId,
    nombre_marca: nombreEmpresa || 'Mi Marca',
    logo_principal_url: logoEmpresaUrl || null,
    color_primario: '#0F172A',
    color_secundario: '#F8FAFC',
    color_acento: '#10B981',
    tipografia_titulos: 'Inter',
    tipografia_cuerpo: 'Inter',
    tono_comunicacion: 'Urbano, directo y comercial',
    estilo_fotografico: 'Editorial streetwear, iluminación natural, alto contraste',
    reglas_identidad: '',
    margen_minimo_pct: 25,
  });

  useEffect(() => {
    if (!abierto || !empresaId) return;
    setCargando(true);
    travisService
      .obtenerBrandKit(empresaId)
      .then((kit) => {
        if (kit) {
          setForm(kit);
        } else {
          setForm((prev) => ({
            ...prev,
            empresa_id: empresaId,
            nombre_marca: nombreEmpresa || prev.nombre_marca,
            logo_principal_url: logoEmpresaUrl || prev.logo_principal_url,
          }));
        }
      })
      .finally(() => setCargando(false));
  }, [abierto, empresaId, nombreEmpresa, logoEmpresaUrl]);

  if (!abierto) return null;

  const handleSubirLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setSubiendoLogo(true);
      const url = await travisService.subirArchivoPrivado(empresaId, 'logos', file);
      setForm((prev) => ({ ...prev, logo_principal_url: url }));
    } catch (err: any) {
      alert('Error al subir logo: ' + err.message);
    } finally {
      setSubiendoLogo(false);
    }
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGuardando(true);
      const guardado = await travisService.guardarBrandKit({
        ...form,
        empresa_id: empresaId,
        margen_minimo_pct: Number(form.margen_minimo_pct),
      });
      onGuardado(guardado);
      onCerrar();
    } catch (err: any) {
      alert('Error al guardar Brand Kit: ' + err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-bold text-white text-sm">Brand Kit & Reglas Comerciales</h2>
              <p className="text-[11px] text-slate-400">Identidad visual y piso de margen para GEMI AI</p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {cargando ? (
          <div className="p-10 text-center text-xs text-slate-400">Cargando configuración de marca...</div>
        ) : (
          <form onSubmit={handleGuardar} className="p-5 space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">Nombre de la Marca</label>
                <input
                  type="text"
                  required
                  value={form.nombre_marca}
                  onChange={(e) => setForm({ ...form, nombre_marca: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">Logo Principal</label>
                <div className="flex items-center gap-3">
                  {form.logo_principal_url ? (
                    <img
                      src={form.logo_principal_url}
                      alt="Logo"
                      className="w-10 h-10 rounded-lg object-contain bg-slate-950 border border-slate-800 p-1"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 font-bold">
                      LOGO
                    </div>
                  )}
                  <label className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2 px-3 rounded-xl cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{subiendoLogo ? 'Subiendo...' : 'Subir PNG/SVG'}</span>
                    <input type="file" accept="image/*" onChange={handleSubirLogo} className="hidden" />
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-2">Paleta de Colores para Piezas</label>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2.5">
                  <input
                    type="color"
                    value={form.color_primario}
                    onChange={(e) => setForm({ ...form, color_primario: e.target.value })}
                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                  />
                  <div>
                    <p className="text-[10px] text-slate-400">Fondo / Base</p>
                    <p className="font-mono text-white font-bold">{form.color_primario}</p>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2.5">
                  <input
                    type="color"
                    value={form.color_secundario}
                    onChange={(e) => setForm({ ...form, color_secundario: e.target.value })}
                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                  />
                  <div>
                    <p className="text-[10px] text-slate-400">Texto</p>
                    <p className="font-mono text-white font-bold">{form.color_secundario}</p>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2.5">
                  <input
                    type="color"
                    value={form.color_acento}
                    onChange={(e) => setForm({ ...form, color_acento: e.target.value })}
                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                  />
                  <div>
                    <p className="text-[10px] text-slate-400">Acento / Promo</p>
                    <p className="font-mono text-white font-bold">{form.color_acento}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  Margen Bruto Mínimo Permitido (%)
                </span>
                <span className="font-mono font-black text-sm text-emerald-300">{form.margen_minimo_pct}%</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">
                GEMI AI bloqueará o advertirá cualquier descuento que deje la ganancia bruta por debajo de este porcentaje.
              </p>
              <input
                type="range"
                min={5}
                max={70}
                step={1}
                value={form.margen_minimo_pct}
                onChange={(e) => setForm({ ...form, margen_minimo_pct: Number(e.target.value) })}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className="flex items-center gap-1 text-slate-400 font-semibold mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Tono de Comunicación
                </label>
                <input
                  type="text"
                  value={form.tono_comunicacion}
                  onChange={(e) => setForm({ ...form, tono_comunicacion: e.target.value })}
                  placeholder="Ej: Streetwear mendocino, cercano, exclusivo, sin vueltas"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Estilo Visual / Fotográfico</label>
                <input
                  type="text"
                  value={form.estilo_fotografico}
                  onChange={(e) => setForm({ ...form, estilo_fotografico: e.target.value })}
                  placeholder="Ej: Fondo hormigón oscuro, luz dramática, lookbook urbano"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onCerrar}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {guardando ? 'Guardando...' : 'Guardar Brand Kit'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};