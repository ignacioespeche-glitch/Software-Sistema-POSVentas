import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, Circle, Rocket, ArrowRight, X } from 'lucide-react';

export const ChecklistOnboarding = () => {
  const { perfil, empresa, sucursalActiva } = useAuth();
  const [estado, setEstado] = useState({
    loading: true,
    tieneSucursal: false,
    tieneProductos: false,
    tieneCaja: false,
    tieneVentas: false
  });
  const [oculto, setOculto] = useState(false);

  const storageKey = empresa?.id ? `gemi_checklist_oculto_${empresa.id}` : '';

  useEffect(() => {
    if (!empresa?.id || perfil?.rol !== 'admin') {
      setEstado((prev) => ({ ...prev, loading: false }));
      return;
    }

    if (localStorage.getItem(storageKey) === 'true') {
      setOculto(true);
      setEstado((prev) => ({ ...prev, loading: false }));
      return;
    }

    const verificarAvance = async () => {
      const [resProd, resCaja, resVentas] = await Promise.all([
        supabase
          .from('productos')
          .select('id', { count: 'exact', head: true })
          .eq('empresa_id', empresa.id)
          .eq('activo', true),
        supabase
          .from('turnos_caja')
          .select('id', { count: 'exact', head: true })
          .eq('empresa_id', empresa.id),
        supabase
          .from('ventas')
          .select('id', { count: 'exact', head: true })
          .eq('empresa_id', empresa.id)
      ]);

      setEstado({
        loading: false,
        tieneSucursal: Boolean(sucursalActiva?.id || perfil?.sucursal_id),
        tieneProductos: (resProd.count || 0) > 0,
        tieneCaja: (resCaja.count || 0) > 0,
        tieneVentas: (resVentas.count || 0) > 0
      });
    };

    verificarAvance();
  }, [empresa?.id, perfil?.rol, sucursalActiva?.id]);

  if (estado.loading || oculto || !empresa?.id || perfil?.rol !== 'admin') {
    return null;
  }

  const pasos = [
    {
      id: 'sucursal',
      titulo: '1. Configurar sucursal inicial',
      descripcion: 'Tu local base ya está creado y listo para operar.',
      completado: estado.tieneSucursal,
      ruta: '/admin',
      textoBoton: 'Revisar local'
    },
    {
      id: 'productos',
      titulo: '2. Cargar tu catálogo de prendas',
      descripcion: 'Subí tus productos uno por uno o importalos masivamente desde Excel.',
      completado: estado.tieneProductos,
      ruta: '/catalogo',
      textoBoton: 'Ir a Catálogo'
    },
    {
      id: 'caja',
      titulo: '3. Abrir tu primera caja del día',
      descripcion: 'Iniciá un turno con el efectivo inicial en mostrador.',
      completado: estado.tieneCaja,
      ruta: '/caja',
      textoBoton: 'Abrir Caja'
    },
    {
      id: 'venta',
      titulo: '4. Registrar tu primera venta',
      descripcion: 'Probá cobrar una prenda en el Punto de Venta y generar su ticket.',
      completado: estado.tieneVentas,
      ruta: '/',
      textoBoton: 'Ir al POS'
    }
  ];

  const completadosCount = pasos.filter((p) => p.completado).length;
  const porcentaje = Math.round((completadosCount / pasos.length) * 100);

  // Si ya completó los 4 pasos, ocultamos automáticamente la guía
  if (completadosCount === pasos.length) {
    return null;
  }

  const handleOcultar = () => {
    if (storageKey) localStorage.setItem(storageKey, 'true');
    setOculto(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pt-4">
      <div className="bg-slate-900 border border-sky-500/30 rounded-2xl p-4 md:p-5 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">
                Primeros pasos en G.E.M.I. · {porcentaje}% completado
              </h3>
              <p className="text-xs text-slate-400">
                Completá estos 4 pasos para dejar <strong>{empresa.nombre}</strong> operando al 100%.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-32 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-sky-500 transition-all duration-500"
                style={{ width: `${porcentaje}%` }}
              />
            </div>
            <button
              type="button"
              onClick={handleOcultar}
              className="text-xs text-slate-500 hover:text-slate-300 inline-flex items-center gap-1 cursor-pointer"
              title="Ocultar guía inicial"
            >
              <X className="w-4 h-4" /> Ocultar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {pasos.map((paso) => (
            <div
              key={paso.id}
              className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 ${
                paso.completado
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-start gap-2">
                  {paso.completado ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  )}
                  <span
                    className={`text-xs font-black ${
                      paso.completado ? 'text-emerald-300 line-through' : 'text-white'
                    }`}
                  >
                    {paso.titulo}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 pl-6">{paso.descripcion}</p>
              </div>

              {!paso.completado && (
                <Link
                  to={paso.ruta}
                  className="ml-6 inline-flex items-center gap-1 text-[11px] font-black text-sky-400 hover:text-sky-300"
                >
                  {paso.textoBoton} <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};