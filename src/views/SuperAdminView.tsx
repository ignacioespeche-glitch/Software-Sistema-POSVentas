import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  ShieldCheck,
  Search,
  DollarSign,
  Users,
  AlertTriangle,
  Activity,
  PlusCircle,
  MessageCircle,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Megaphone,
  Lightbulb,
  Plus,
  ThumbsUp,
  Save,
  Building2,
  Store
} from 'lucide-react';

interface EmpresaMetricas {
  empresa_id: string;
  nombre: string;
  rubro: string;
  es_marca_interna: boolean;
  activa: boolean;
  estado_suscripcion: string;
  nombre_plan: string;
  precio_mensual: number;
  usuarios_extra: number;
  precio_usuario_extra: number;
  fecha_vencimiento: string | null;
  link_mercadopago: string | null;
  telefono_contacto: string | null;
  direccion_local: string | null;
  notas_customer_success: string | null;
  modulo_senas: boolean;
  modulo_cambios: boolean;
  modulo_traspasos: boolean;
  modulo_tareas: boolean;
  modulo_calendario: boolean;
  email_dueno: string | null;
  nombre_dueno: string | null;
  ultima_conexion: string | null;
  dias_sin_conectar: number;
  ventas_ultimos_7_dias: number;
  total_productos: number;
  cantidad_sucursales: number;
  created_at: string;
}

interface MejoraSaaS {
  id: string;
  titulo: string;
  descripcion: string | null;
  local_origen: string | null;
  votos: number;
  estado: 'pendiente' | 'en_progreso' | 'completado';
}

export const SuperAdminView = () => {
  const [empresas, setEmpresas] = useState<EmpresaMetricas[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorAcceso, setErrorAcceso] = useState<string | null>(null);

  const [tabActiva, setTabActiva] = useState<'clientes' | 'anuncios' | 'mejoras'>('clientes');
  const [filtro, setFiltro] = useState<'todos' | 'clientes_saas' | 'internas' | 'semaforo_alerta' | 'inactivos_10d'>('todos');
  const [busqueda, setBusqueda] = useState('');

  // Modal de edición rápida de cliente
  const [editando, setEditando] = useState<EmpresaMetricas | null>(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  // Anuncio global
  const [mensajeAnuncio, setMensajeAnuncio] = useState('');
  const [anuncioActivo, setAnuncioActivo] = useState(false);
  const [anuncioId, setAnuncioId] = useState<string | null>(null);

  // Tablero de viernes (mejoras)
  const [mejoras, setMejoras] = useState<MejoraSaaS[]>([]);
  const [nuevaMejoraTitulo, setNuevaMejoraTitulo] = useState('');
  const [nuevaMejoraLocal, setNuevaMejoraLocal] = useState('');

  const cargarTodo = async () => {
    setLoading(true);
    setErrorAcceso(null);

    const { data, error } = await supabase.rpc('obtener_metricas_superadmin');
    if (error) {
      setErrorAcceso(error.message);
      setLoading(false);
      return;
    }

    setEmpresas((data as EmpresaMetricas[]) || []);

    // Cargar último anuncio
    const { data: adData } = await supabase
      .from('saas_anuncios')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (adData) {
      setAnuncioId(adData.id);
      setMensajeAnuncio(adData.mensaje);
      setAnuncioActivo(adData.activo);
    }

    // Cargar mejoras
    const { data: mejData } = await supabase
      .from('saas_mejoras')
      .select('*')
      .order('votos', { ascending: false });

    if (mejData) setMejoras(mejData as MejoraSaaS[]);

    setLoading(false);
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  const calcularDiasRestantes = (fechaVenc: string | null) => {
    if (!fechaVenc) return 30;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const venc = new Date(fechaVenc + 'T00:00:00');
    return Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getSemaforoPago = (emp: EmpresaMetricas) => {
    if (emp.es_marca_interna) {
      return {
        color: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
        dot: 'bg-sky-400',
        texto: 'Marca Propia (Sin cobro)',
        dias: 999
      };
    }

    const dias = calcularDiasRestantes(emp.fecha_vencimiento);

    if (emp.estado_suscripcion === 'pausado' || !emp.activa || dias < 0) {
      return {
        color: 'bg-rose-500/15 text-rose-400 border-rose-500/40',
        dot: 'bg-rose-500 animate-pulse',
        texto: dias < 0 ? `Vencido hace ${Math.abs(dias)}d` : 'Pausado',
        dias
      };
    }
    if (dias <= 3) {
      return {
        color: 'bg-orange-500/15 text-orange-400 border-orange-500/40',
        dot: 'bg-orange-500 animate-pulse',
        texto: dias === 0 ? 'Vence HOY' : `Crítico: quedan ${dias}d`,
        dias
      };
    }
    if (dias <= 5) {
      return {
        color: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
        dot: 'bg-amber-400',
        texto: `Preventivo: quedan ${dias}d`,
        dias
      };
    }
    return {
      color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      dot: 'bg-emerald-400',
      texto: `Al día (${dias}d)`,
      dias
    };
  };

  const handleRenovar30Dias = async (emp: EmpresaMetricas) => {
    const baseFecha =
      emp.fecha_vencimiento && calcularDiasRestantes(emp.fecha_vencimiento) > 0
        ? new Date(emp.fecha_vencimiento + 'T00:00:00')
        : new Date();

    baseFecha.setDate(baseFecha.getDate() + 30);
    const nuevaFecha = baseFecha.toISOString().split('T')[0];

    await supabase
      .from('empresas')
      .update({
        fecha_vencimiento: nuevaFecha,
        estado_suscripcion: 'activo',
        activa: true
      })
      .eq('id', emp.empresa_id);

    cargarTodo();
  };

  const handleTogglePausa = async (emp: EmpresaMetricas) => {
    const nuevoEstado = emp.estado_suscripcion === 'pausado' ? 'activo' : 'pausado';
    await supabase
      .from('empresas')
      .update({
        estado_suscripcion: nuevoEstado,
        activa: nuevoEstado !== 'pausado'
      })
      .eq('id', emp.empresa_id);

    cargarTodo();
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editando) return;
    setGuardandoEdicion(true);

    await supabase
      .from('empresas')
      .update({
        es_marca_interna: editando.es_marca_interna,
        nombre_plan: editando.nombre_plan,
        precio_mensual: Number(editando.precio_mensual),
        usuarios_extra: Number(editando.usuarios_extra),
        precio_usuario_extra: Number(editando.precio_usuario_extra),
        fecha_vencimiento: editando.fecha_vencimiento,
        estado_suscripcion: editando.estado_suscripcion,
        link_mercadopago: editando.link_mercadopago,
        telefono_contacto: editando.telefono_contacto,
        direccion_local: editando.direccion_local,
        notas_customer_success: editando.notas_customer_success,
        modulo_senas: editando.modulo_senas,
        modulo_cambios: editando.modulo_cambios,
        modulo_traspasos: editando.modulo_traspasos,
        modulo_tareas: editando.modulo_tareas,
        modulo_calendario: editando.modulo_calendario
      })
      .eq('id', editando.empresa_id);

    setGuardandoEdicion(false);
    setEditando(null);
    cargarTodo();
  };

  const handleGuardarAnuncio = async () => {
    if (anuncioId) {
      await supabase
        .from('saas_anuncios')
        .update({ mensaje: mensajeAnuncio, activo: anuncioActivo })
        .eq('id', anuncioId);
    } else {
      await supabase
        .from('saas_anuncios')
        .insert({ mensaje: mensajeAnuncio, activo: anuncioActivo });
    }
    alert('Anuncio global actualizado.');
    cargarTodo();
  };

  const handleAgregarMejora = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaMejoraTitulo.trim()) return;
    await supabase.from('saas_mejoras').insert({
      titulo: nuevaMejoraTitulo.trim(),
      local_origen: nuevaMejoraLocal.trim() || 'General',
      votos: 1,
      estado: 'pendiente'
    });
    setNuevaMejoraTitulo('');
    setNuevaMejoraLocal('');
    cargarTodo();
  };

  const handleSumarVoto = async (mejora: MejoraSaaS) => {
    await supabase
      .from('saas_mejoras')
      .update({ votos: mejora.votos + 1 })
      .eq('id', mejora.id);
    cargarTodo();
  };

  const handleCambiarEstadoMejora = async (id: string, estado: MejoraSaaS['estado']) => {
    await supabase.from('saas_mejoras').update({ estado }).eq('id', id);
    cargarTodo();
  };

  // KPIs calculados
  const clientesSaaS = empresas.filter((e) => !e.es_marca_interna);
  const marcasInternas = empresas.filter((e) => e.es_marca_interna);

  const mrrTotal = clientesSaaS
    .filter((e) => e.estado_suscripcion === 'activo' && e.activa)
    .reduce(
      (acc, e) => acc + Number(e.precio_mensual || 0) + Number(e.usuarios_extra || 0) * Number(e.precio_usuario_extra || 0),
      0
    );

  const alertasCobro = clientesSaaS.filter((e) => {
    const d = calcularDiasRestantes(e.fecha_vencimiento);
    return d <= 5 || e.estado_suscripcion === 'pausado';
  }).length;

  const alertasInactividad = clientesSaaS.filter((e) => e.dias_sin_conectar >= 10).length;

  // Filtrado de tabla
  const empresasFiltradas = empresas.filter((e) => {
    const matchTexto =
      e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (e.email_dueno || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (e.nombre_dueno || '').toLowerCase().includes(busqueda.toLowerCase());

    if (!matchTexto) return false;
    if (filtro === 'clientes_saas') return !e.es_marca_interna;
    if (filtro === 'internas') return e.es_marca_interna;
    if (filtro === 'semaforo_alerta') {
      if (e.es_marca_interna) return false;
      const d = calcularDiasRestantes(e.fecha_vencimiento);
      return d <= 5 || e.estado_suscripcion === 'pausado';
    }
    if (filtro === 'inactivos_10d') return !e.es_marca_interna && e.dias_sin_conectar >= 10;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        Cargando Torre de Control SuperAdmin...
      </div>
    );
  }

  if (errorAcceso) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-6 rounded-2xl max-w-md text-center space-y-2">
          <h2 className="font-black text-base">Acceso Restringido</h2>
          <p className="text-xs">{errorAcceso}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 max-w-7xl mx-auto space-y-6 pb-20">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-sky-400" />
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
              TORRE DE CONTROL · SUPERADMIN
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestión de clientes SaaS, semáforo de cobros y seguimiento de Customer Success (separado de Aspen y SouthCol).
          </p>
        </div>

        <div className="flex gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setTabActiva('clientes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              tabActiva === 'clientes' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Cartera & Semáforos
          </button>
          <button
            onClick={() => setTabActiva('mejoras')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              tabActiva === 'mejoras' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Viernes de Mejoras ({mejoras.filter((m) => m.estado !== 'completado').length})
          </button>
          <button
            onClick={() => setTabActiva('anuncios')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              tabActiva === 'anuncios' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Anuncio Global
          </button>
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>MRR (Clientes Activos)</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-1">
            ${mrrTotal.toLocaleString('es-AR')}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Excluye {marcasInternas.length} marcas propias
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Locales Clientes</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-black text-white mt-1">{clientesSaaS.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {clientesSaaS.filter((c) => c.estado_suscripcion === 'prueba').length} en prueba gratis
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Semáforo Cobros (≤5d)</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-1">{alertasCobro}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Por vencer o pausados</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Inactivos +10 días</span>
            <Activity className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-rose-400 mt-1">{alertasInactividad}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Visitar o contactar (Juan)</p>
        </div>
      </div>

      {/* TAB 1: CARTERA DE CLIENTES */}
      {tabActiva === 'clientes' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar marca, dueño o correo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'clientes_saas', label: 'Solo Clientes SaaS' },
                { id: 'internas', label: 'Aspen & SouthCol' },
                { id: 'semaforo_alerta', label: '🟡🔴 Por Vencer / Vencidos' },
                { id: 'inactivos_10d', label: '🚨 +10 días sin entrar' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFiltro(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    filtro === f.id
                      ? 'bg-sky-500/15 border-sky-400 text-sky-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {empresasFiltradas.map((emp) => {
              const semaforo = getSemaforoPago(emp);
              const totalCuota =
                Number(emp.precio_mensual || 0) +
                Number(emp.usuarios_extra || 0) * Number(emp.precio_usuario_extra || 0);

              return (
                <div
                  key={emp.empresa_id}
                  className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Info Marca & Dueño */}
                  <div className="space-y-1 min-w-[230px]">
                    <div className="flex items-center gap-2">
                      {emp.es_marca_interna ? (
                        <Building2 className="w-4 h-4 text-sky-400 shrink-0" />
                      ) : (
                        <Store className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      <h3 className="font-black text-base text-white">{emp.nombre}</h3>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {emp.cantidad_sucursales} suc.
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {emp.nombre_dueno || 'Sin dueño'} ·{' '}
                      <span className="text-slate-500">{emp.email_dueno || 'Sin email'}</span>
                    </p>
                    {emp.notas_customer_success && (
                      <p className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg mt-1">
                        📝 {emp.notas_customer_success}
                      </p>
                    )}
                  </div>

                  {/* Termómetro Customer Success */}
                  <div className="grid grid-cols-3 gap-3 bg-slate-950/70 border border-slate-800/80 px-4 py-2.5 rounded-xl text-center">
                    <div>
                      <span className="block text-[10px] uppercase text-slate-500 font-bold">
                        Última conexión
                      </span>
                      <span
                        className={`text-xs font-black ${
                          emp.dias_sin_conectar >= 10
                            ? 'text-rose-400'
                            : emp.dias_sin_conectar >= 5
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {emp.ultima_conexion ? `Hace ${emp.dias_sin_conectar}d` : 'Nunca entró'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-slate-500 font-bold">
                        Ventas (7d)
                      </span>
                      <span className="text-xs font-black text-white">
                        {emp.ventas_ultimos_7_dias}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-slate-500 font-bold">
                        Catálogo
                      </span>
                      <span className="text-xs font-black text-sky-400">
                        {emp.total_productos} prod.
                      </span>
                    </div>
                  </div>

                  {/* Semáforo de Pago & Acciones */}
                  <div className="flex flex-wrap items-center gap-2 justify-end">
                    <div className="text-right mr-1">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${semaforo.color}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${semaforo.dot}`} />
                        {semaforo.texto}
                      </span>
                      {!emp.es_marca_interna && (
                        <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                          ${totalCuota.toLocaleString('es-AR')}/mes · Vence: {emp.fecha_vencimiento || 'S/D'}
                        </p>
                      )}
                    </div>

                    {!emp.es_marca_interna && (
                      <button
                        type="button"
                        onClick={() => handleRenovar30Dias(emp)}
                        title="Registrar pago y sumar +30 días"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-xl text-xs inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <PlusCircle className="w-3.5 h-3.5" /> +30d
                      </button>
                    )}

                    {emp.telefono_contacto && (
                      <a
                        href={`https://wa.me/${emp.telefono_contacto.replace(/\D/g, '')}?text=${encodeURIComponent(
                          `Hola ${emp.nombre_dueno || ''}! Te escribimos del equipo de soporte del sistema POS de ${emp.nombre}.`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Escribir por WhatsApp"
                        className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 rounded-xl transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}

                    {!emp.es_marca_interna && (
                      <button
                        type="button"
                        onClick={() => handleTogglePausa(emp)}
                        title={emp.estado_suscripcion === 'pausado' ? 'Reactivar cuenta' : 'Pausar cuenta por falta de pago'}
                        className={`p-2 rounded-xl border cursor-pointer transition-colors ${
                          emp.estado_suscripcion === 'pausado'
                            ? 'bg-sky-500/10 border-sky-500/30 text-sky-400 hover:bg-sky-500/20'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                        }`}
                      >
                        {emp.estado_suscripcion === 'pausado' ? (
                          <PlayCircle className="w-4 h-4" />
                        ) : (
                          <PauseCircle className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setEditando(emp)}
                      className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors"
                    >
                      Configurar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: VIERNES DE MEJORAS */}
      {tabActiva === 'mejoras' && (
        <div className="space-y-4">
          <form
            onSubmit={handleAgregarMejora}
            className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row gap-3"
          >
            <input
              type="text"
              required
              placeholder="Ej. Imprimir etiquetas con código de barras..."
              value={nuevaMejoraTitulo}
              onChange={(e) => setNuevaMejoraTitulo(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            />
            <input
              type="text"
              placeholder="Local que lo pidió (ej. Tienda Centro)"
              value={nuevaMejoraLocal}
              onChange={(e) => setNuevaMejoraLocal(e.target.value)}
              className="sm:w-60 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-black px-5 py-2 rounded-xl text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Cargar Pedido
            </button>
          </form>

          <div className="space-y-2">
            {mejoras.map((m) => (
              <div
                key={m.id}
                className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-sm text-white">{m.titulo}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Origen: <span className="text-slate-300 font-semibold">{m.local_origen}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSumarVoto(m)}
                    className="bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20 px-3 py-1.5 rounded-xl text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" /> {m.votos} {m.votos === 1 ? 'local' : 'locales'}
                  </button>

                  <select
                    value={m.estado}
                    onChange={(e) => handleCambiarEstadoMejora(m.id, e.target.value as any)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en_progreso">En desarrollo</option>
                    <option value="completado">Listo ✅</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ANUNCIO GLOBAL */}
      {tabActiva === 'anuncios' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-2xl space-y-4">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-sky-400" />
            <h3 className="font-black text-base text-white">Banner de Novedades para Todos los Locales</h3>
          </div>
          <p className="text-xs text-slate-400">
            Si lo activás, aparecerá una barra informativa discreta en la parte superior de todas las tiendas conectadas.
          </p>

          <textarea
            rows={3}
            placeholder="Ej. 🚀 Nueva actualización: Ya podés buscar prendas por nombre dentro del módulo de Señas."
            value={mensajeAnuncio}
            onChange={(e) => setMensajeAnuncio(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-sky-500"
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={anuncioActivo}
                onChange={(e) => setAnuncioActivo(e.target.checked)}
                className="rounded border-slate-700"
              />
              Mostrar anuncio activo en los locales
            </label>

            <button
              type="button"
              onClick={handleGuardarAnuncio}
              className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Guardar Anuncio
            </button>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURACIÓN DE CLIENTE */}
      {editando && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleGuardarEdicion}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 my-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-lg text-white">Configurar: {editando.nombre}</h3>
              <label className="flex items-center gap-2 text-xs font-bold text-sky-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editando.es_marca_interna}
                  onChange={(e) => setEditando({ ...editando, es_marca_interna: e.target.checked })}
                />
                Es Marca Interna (Aspen / SouthCol)
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-400 mb-1">Nombre del Plan</label>
                <input
                  type="text"
                  value={editando.nombre_plan}
                  onChange={(e) => setEditando({ ...editando, nombre_plan: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Estado Suscripción</label>
                <select
                  value={editando.estado_suscripcion}
                  onChange={(e) => setEditando({ ...editando, estado_suscripcion: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="prueba">Prueba Gratis</option>
                  <option value="activo">Activo (Pago al día)</option>
                  <option value="pausado">Pausado (Bloqueado)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Precio Mensual Base ($)</label>
                <input
                  type="number"
                  value={editando.precio_mensual}
                  onChange={(e) => setEditando({ ...editando, precio_mensual: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Fecha Próximo Vencimiento</label>
                <input
                  type="date"
                  value={editando.fecha_vencimiento || ''}
                  onChange={(e) => setEditando({ ...editando, fecha_vencimiento: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Usuarios / Sucursales Extra (Cant.)</label>
                <input
                  type="number"
                  value={editando.usuarios_extra}
                  onChange={(e) => setEditando({ ...editando, usuarios_extra: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Precio c/ Extra ($)</label>
                <input
                  type="number"
                  value={editando.precio_usuario_extra}
                  onChange={(e) => setEditando({ ...editando, precio_usuario_extra: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">WhatsApp del Dueño</label>
                <input
                  type="text"
                  placeholder="Ej. 5492615551234"
                  value={editando.telefono_contacto || ''}
                  onChange={(e) => setEditando({ ...editando, telefono_contacto: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Dirección del Local</label>
                <input
                  type="text"
                  placeholder="Ej. San Martín 123, Mendoza"
                  value={editando.direccion_local || ''}
                  onChange={(e) => setEditando({ ...editando, direccion_local: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-400 mb-1">
                  Link de Pago Mercado Pago (Dejar vacío hasta crear cuenta MP)
                </label>
                <input
                  type="url"
                  placeholder="https://mpago.la/..."
                  value={editando.link_mercadopago || ''}
                  onChange={(e) => setEditando({ ...editando, link_mercadopago: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-400 mb-1">
                  Notas de Customer Success / Visitas (Juan)
                </label>
                <textarea
                  rows={2}
                  placeholder="Anotaciones de visitas, dudas del cliente o pedidos..."
                  value={editando.notas_customer_success || ''}
                  onChange={(e) => setEditando({ ...editando, notas_customer_success: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>
            </div>

            {/* Módulos habilitados */}
            <div className="border-t border-slate-800 pt-3">
              <span className="block text-xs font-bold text-slate-400 mb-2">Módulos Activos en este Local</span>
              <div className="flex flex-wrap gap-3 text-xs">
                {[
                  { key: 'modulo_senas', label: 'Señas' },
                  { key: 'modulo_cambios', label: 'Cambios' },
                  { key: 'modulo_traspasos', label: 'Traspasos' },
                  { key: 'modulo_tareas', label: 'Tareas' },
                  { key: 'modulo_calendario', label: 'Calendario' }
                ].map((mod) => (
                  <label
                    key={mod.key}
                    className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean((editando as any)[mod.key])}
                      onChange={(e) => setEditando({ ...editando, [mod.key]: e.target.checked })}
                    />
                    <span>{mod.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditando(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoEdicion}
                className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-black px-5 py-2 rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                {guardandoEdicion ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};