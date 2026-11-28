import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ConfiguracionArcaCard } from '../components/ConfiguracionArcaCard';
import { ImportadorCatalogoModal } from '../components/ImportadorCatalogoModal';
import type { Sucursal, Categoria, IntegracionEcommerce } from '../types/database';
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
  Store,
  Trash2,
  RotateCcw,
  FileText,
  X,
  FileSpreadsheet,
  Tags,
  Loader2,
  Globe,
  RefreshCw,
  Copy,
  Check,
  Link2
} from 'lucide-react';

// Lista centralizada de módulos: agregando uno acá aparece automáticamente en todos los clientes
const MODULOS_DISPONIBLES = [
  { key: 'modulo_senas', label: 'Señas' },
  { key: 'modulo_cambios', label: 'Cambios' },
  { key: 'modulo_traspasos', label: 'Traspasos' },
  { key: 'modulo_tareas', label: 'Tareas' },
  { key: 'modulo_calendario', label: 'Calendario' }
] as const;

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

interface InteresadoAnuncio {
  empresa_id: string;
  nombre: string;
  fecha: string;
}

export const SuperAdminView = () => {
  const { perfil } = useAuth();
  const [empresas, setEmpresas] = useState<EmpresaMetricas[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorAcceso, setErrorAcceso] = useState<string | null>(null);

  const [tabActiva, setTabActiva] = useState<'clientes' | 'anuncios' | 'mejoras'>('clientes');
  const [filtro, setFiltro] = useState<'todos' | 'clientes_saas' | 'internas' | 'semaforo_alerta' | 'inactivos_10d'>('todos');
  const [busqueda, setBusqueda] = useState('');

  // Modal de edición rápida de cliente
  const [editando, setEditando] = useState<EmpresaMetricas | null>(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  // Modal exclusivo de Configuración ARCA por empresa
  const [empresaArcaSeleccionada, setEmpresaArcaSeleccionada] = useState<EmpresaMetricas | null>(null);
  const [sucursalesEmpresaArca, setSucursalesEmpresaArca] = useState<Sucursal[]>([]);
  const [cargandoSucsArca, setCargandoSucsArca] = useState(false);

  // Modal de Categorías por empresa
  const [empresaCategoriasSeleccionada, setEmpresaCategoriasSeleccionada] = useState<EmpresaMetricas | null>(null);
  const [categoriasEmpresa, setCategoriasEmpresa] = useState<Categoria[]>([]);
  const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState('');
  const [cargandoCategorias, setCargandoCategorias] = useState(false);
  const [guardandoCategoria, setGuardandoCategoria] = useState(false);

  // Modal de Importador Excel / CSV por empresa
  const [empresaImportarSeleccionada, setEmpresaImportarSeleccionada] = useState<EmpresaMetricas | null>(null);
  const [sucursalesImportar, setSucursalesImportar] = useState<Sucursal[]>([]);
  const [categoriasImportar, setCategoriasImportar] = useState<Categoria[]>([]);
  const [tallesCatalogo, setTallesCatalogo] = useState<any[]>([]);
  const [cargandoDatosImportar, setCargandoDatosImportar] = useState(false);

  // Modal de E-Commerce (Tiendanube + API Web Propia) por empresa
  const [empresaEcommerceSeleccionada, setEmpresaEcommerceSeleccionada] = useState<EmpresaMetricas | null>(null);
  const [sucursalesEcommerce, setSucursalesEcommerce] = useState<Sucursal[]>([]);
  const [integracionEcommerce, setIntegracionEcommerce] = useState<IntegracionEcommerce | null>(null);
  const [modulosEcommerce, setModulosEcommerce] = useState<{ modulo_tiendanube: boolean; modulo_api_web: boolean }>({
    modulo_tiendanube: false,
    modulo_api_web: false
  });
  const [cargandoEcommerce, setCargandoEcommerce] = useState(false);
  const [sincronizandoEcommerce, setSincronizandoEcommerce] = useState(false);
  const [copiadoLinkTn, setCopiadoLinkTn] = useState(false);
  const [copiadoApiKey, setCopiadoApiKey] = useState(false);

  // Anuncio global
  const [mensajeAnuncio, setMensajeAnuncio] = useState('');
  const [anuncioActivo, setAnuncioActivo] = useState(false);
  const [anuncioId, setAnuncioId] = useState<string | null>(null);
  const [interesadosAnuncio, setInteresadosAnuncio] = useState<InteresadoAnuncio[]>([]);

  // Tablero de viernes (mejoras)
  const [mejoras, setMejoras] = useState<MejoraSaaS[]>([]);
  const [nuevaMejoraTitulo, setNuevaMejoraTitulo] = useState('');
  const [nuevaMejoraLocal, setNuevaMejoraLocal] = useState('General');

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
      setInteresadosAnuncio((adData.interesados as InteresadoAnuncio[]) || []);
    }

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

  const abrirConfiguracionArcaCliente = async (emp: EmpresaMetricas) => {
    setEmpresaArcaSeleccionada(emp);
    setCargandoSucsArca(true);
    const { data } = await supabase
      .from('sucursales')
      .select('*')
      .eq('empresa_id', emp.empresa_id)
      .order('nombre');
    setSucursalesEmpresaArca((data as Sucursal[]) || []);
    setCargandoSucsArca(false);
  };

  // Gestor de Categorías por Empresa
  const abrirGestorCategorias = async (emp: EmpresaMetricas) => {
    setEmpresaCategoriasSeleccionada(emp);
    setNuevaCategoriaNombre('');
    setCargandoCategorias(true);
    const { data } = await supabase
      .from('categorias')
      .select('*')
      .eq('empresa_id', emp.empresa_id)
      .order('orden');
    setCategoriasEmpresa((data as Categoria[]) || []);
    setCargandoCategorias(false);
  };

  const handleAgregarCategoriaEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaCategoriasSeleccionada || !nuevaCategoriaNombre.trim()) return;

    const nombreLimpio = nuevaCategoriaNombre.trim();
    const yaExiste = categoriasEmpresa.some(
      (c) => c.nombre.toLowerCase() === nombreLimpio.toLowerCase()
    );
    if (yaExiste) {
      alert('Esa categoría ya existe en esta empresa.');
      return;
    }

    setGuardandoCategoria(true);
    const { error } = await supabase.from('categorias').insert({
      empresa_id: empresaCategoriasSeleccionada.empresa_id,
      nombre: nombreLimpio,
      orden: categoriasEmpresa.length + 1
    });
    setGuardandoCategoria(false);

    if (error) {
      alert('Error creando categoría: ' + error.message);
      return;
    }

    setNuevaCategoriaNombre('');
    abrirGestorCategorias(empresaCategoriasSeleccionada);
  };

  const handleEliminarCategoriaEmpresa = async (cat: Categoria) => {
    if (!empresaCategoriasSeleccionada) return;
    if (!confirm(`¿Eliminar la categoría "${cat.nombre}" de ${empresaCategoriasSeleccionada.nombre}?`)) return;

    const { error } = await supabase.from('categorias').delete().eq('id', cat.id);
    if (error) {
      alert('No se pudo eliminar (puede tener productos asociados): ' + error.message);
      return;
    }
    abrirGestorCategorias(empresaCategoriasSeleccionada);
  };

  // Abrir Importador Excel / CSV desde Super Admin
  const abrirImportadorCliente = async (emp: EmpresaMetricas) => {
    setCargandoDatosImportar(true);
    setEmpresaImportarSeleccionada(emp);

    const [resSucs, resCats, resTalles] = await Promise.all([
      supabase.from('sucursales').select('*').eq('empresa_id', emp.empresa_id).order('nombre'),
      supabase.from('categorias').select('*').eq('empresa_id', emp.empresa_id).order('orden'),
      supabase.from('talles_catalogo').select('*').order('orden')
    ]);

    setSucursalesImportar((resSucs.data as Sucursal[]) || []);
    setCategoriasImportar((resCats.data as Categoria[]) || []);
    setTallesCatalogo(resTalles.data || []);
    setCargandoDatosImportar(false);
  };

  // Abrir Configuración E-Commerce (Tiendanube + API Web Propia) por Empresa
  const abrirEcommerceCliente = async (emp: EmpresaMetricas) => {
    setEmpresaEcommerceSeleccionada(emp);
    setCargandoEcommerce(true);
    setCopiadoLinkTn(false);
    setCopiadoApiKey(false);

    const [resSucs, resEmp, resInteg] = await Promise.all([
      supabase.from('sucursales').select('*').eq('empresa_id', emp.empresa_id).order('nombre'),
      supabase.from('empresas').select('modulo_tiendanube, modulo_api_web').eq('id', emp.empresa_id).single(),
      supabase.from('integraciones_ecommerce').select('*').eq('empresa_id', emp.empresa_id).maybeSingle()
    ]);

    setSucursalesEcommerce((resSucs.data as Sucursal[]) || []);
    setModulosEcommerce({
      modulo_tiendanube: Boolean(resEmp.data?.modulo_tiendanube),
      modulo_api_web: Boolean(resEmp.data?.modulo_api_web)
    });

    let integ = resInteg.data;
    if (!integ) {
      const { data: creada } = await supabase
        .from('integraciones_ecommerce')
        .insert({ empresa_id: emp.empresa_id })
        .select()
        .single();
      integ = creada;
    }
    setIntegracionEcommerce((integ as IntegracionEcommerce) || null);
    setCargandoEcommerce(false);
  };

  const handleToggleModuloEcommerce = async (
    campo: 'modulo_tiendanube' | 'modulo_api_web',
    valor: boolean
  ) => {
    if (!empresaEcommerceSeleccionada) return;
    await supabase
      .from('empresas')
      .update({ [campo]: valor })
      .eq('id', empresaEcommerceSeleccionada.empresa_id);
    setModulosEcommerce((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleCambiarSucursalStockEcommerce = async (sucId: string) => {
    if (!empresaEcommerceSeleccionada) return;
    await supabase
      .from('integraciones_ecommerce')
      .update({ sucursal_stock_id: sucId || null })
      .eq('empresa_id', empresaEcommerceSeleccionada.empresa_id);
    setIntegracionEcommerce((prev) => (prev ? { ...prev, sucursal_stock_id: sucId || null } : prev));
  };

  const handleSincronizarTodoTiendanube = async () => {
    if (!empresaEcommerceSeleccionada) return;
    setSincronizandoEcommerce(true);
    const { data, error } = await supabase.functions.invoke('tiendanube-sync', {
      body: { action: 'sync_masivo', empresa_id: empresaEcommerceSeleccionada.empresa_id }
    });
    setSincronizandoEcommerce(false);

    if (error || data?.error) {
      alert('Error al sincronizar: ' + (data?.error || error?.message));
      return;
    }

    alert(
      `Sincronización completa:\n• ${data.resumen.vinculados_auto} variantes vinculadas y actualizadas.\n• ${data.resumen.sin_coincidencia} sin coincidencia.`
    );
    abrirEcommerceCliente(empresaEcommerceSeleccionada);
  };

  const calcularDiasRestantes = (fechaVenc: string | null) => {
    if (!fechaVenc) return 30;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const venc = new Date(fechaVenc + 'T00:00:00');
    return Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  };

  const estaInactivo10Dias = (emp: EmpresaMetricas) => {
    return !emp.ultima_conexion || emp.dias_sin_conectar >= 10;
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

    const { error } = await supabase.rpc('actualizar_empresa_superadmin', {
      p_empresa_id: emp.empresa_id,
      p_es_marca_interna: emp.es_marca_interna,
      p_nombre_plan: emp.nombre_plan,
      p_precio_mensual: Number(emp.precio_mensual),
      p_usuarios_extra: Number(emp.usuarios_extra),
      p_precio_usuario_extra: Number(emp.precio_usuario_extra),
      p_fecha_vencimiento: nuevaFecha,
      p_estado_suscripcion: 'activo',
      p_link_mercadopago: emp.link_mercadopago,
      p_telefono_contacto: emp.telefono_contacto,
      p_direccion_local: emp.direccion_local,
      p_notas_customer_success: emp.notas_customer_success,
      p_modulo_senas: emp.modulo_senas,
      p_modulo_cambios: emp.modulo_cambios,
      p_modulo_traspasos: emp.modulo_traspasos,
      p_modulo_tareas: emp.modulo_tareas,
      p_modulo_calendario: emp.modulo_calendario
    });

    if (error) {
      alert('Error al renovar: ' + error.message);
      return;
    }

    cargarTodo();
  };

  const handleTogglePausa = async (emp: EmpresaMetricas) => {
    const nuevoEstado = emp.estado_suscripcion === 'pausado' ? 'activo' : 'pausado';

    const { error } = await supabase.rpc('actualizar_empresa_superadmin', {
      p_empresa_id: emp.empresa_id,
      p_es_marca_interna: emp.es_marca_interna,
      p_nombre_plan: emp.nombre_plan,
      p_precio_mensual: Number(emp.precio_mensual),
      p_usuarios_extra: Number(emp.usuarios_extra),
      p_precio_usuario_extra: Number(emp.precio_usuario_extra),
      p_fecha_vencimiento: emp.fecha_vencimiento,
      p_estado_suscripcion: nuevoEstado,
      p_link_mercadopago: emp.link_mercadopago,
      p_telefono_contacto: emp.telefono_contacto,
      p_direccion_local: emp.direccion_local,
      p_notas_customer_success: emp.notas_customer_success,
      p_modulo_senas: emp.modulo_senas,
      p_modulo_cambios: emp.modulo_cambios,
      p_modulo_traspasos: emp.modulo_traspasos,
      p_modulo_tareas: emp.modulo_tareas,
      p_modulo_calendario: emp.modulo_calendario
    });

    if (error) {
      alert('Error al cambiar estado: ' + error.message);
      return;
    }

    cargarTodo();
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editando) return;
    setGuardandoEdicion(true);

    const { error } = await supabase.rpc('actualizar_empresa_superadmin', {
      p_empresa_id: editando.empresa_id,
      p_es_marca_interna: editando.es_marca_interna,
      p_nombre_plan: editando.nombre_plan,
      p_precio_mensual: Number(editando.precio_mensual),
      p_usuarios_extra: Number(editando.usuarios_extra),
      p_precio_usuario_extra: Number(editando.precio_usuario_extra),
      p_fecha_vencimiento: editando.fecha_vencimiento || null,
      p_estado_suscripcion: editando.estado_suscripcion,
      p_link_mercadopago: editando.link_mercadopago,
      p_telefono_contacto: editando.telefono_contacto,
      p_direccion_local: editando.direccion_local,
      p_notas_customer_success: editando.notas_customer_success,
      p_modulo_senas: editando.modulo_senas,
      p_modulo_cambios: editando.modulo_cambios,
      p_modulo_traspasos: editando.modulo_traspasos,
      p_modulo_tareas: editando.modulo_tareas,
      p_modulo_calendario: editando.modulo_calendario
    });

    setGuardandoEdicion(false);

    if (error) {
      alert('Error al guardar: ' + error.message);
      return;
    }

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
        .insert({ mensaje: mensajeAnuncio, activo: anuncioActivo, interesados: [] });
    }
    alert('Anuncio global actualizado.');
    cargarTodo();
  };

  const handleReiniciarInteresados = async () => {
    if (!anuncioId) return;
    await supabase
      .from('saas_anuncios')
      .update({ interesados: [] })
      .eq('id', anuncioId);
    cargarTodo();
  };

  const handleAgregarMejora = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaMejoraTitulo.trim()) return;
    await supabase.from('saas_mejoras').insert({
      titulo: nuevaMejoraTitulo.trim(),
      local_origen: nuevaMejoraLocal || 'General',
      votos: 1,
      estado: 'pendiente'
    });
    setNuevaMejoraTitulo('');
    setNuevaMejoraLocal('General');
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

  const handleEliminarMejora = async (id: string) => {
    await supabase.from('saas_mejoras').delete().eq('id', id);
    cargarTodo();
  };

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

  const alertasInactividad = empresas.filter((e) => estaInactivo10Dias(e)).length;

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
    if (filtro === 'inactivos_10d') return estaInactivo10Dias(e);
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        Cargando GEMI · Torre de Control...
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

  const linkInvitacionTiendanube = empresaEcommerceSeleccionada
    ? `${window.location.origin}/conectar-tiendanube?empresa_id=${empresaEcommerceSeleccionada.empresa_id}`
    : '';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 max-w-7xl mx-auto space-y-6 pb-20">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-sky-400" />
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
              GEMI · TORRE DE CONTROL
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestión de clientes SaaS, importación masiva, e-commerce, configuración fiscal ARCA y seguimiento 1 a 1.
          </p>
        </div>

        <div className="flex gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setTabActiva('clientes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              tabActiva === 'clientes' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Cartera & ARCA
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
            Anuncio Global {interesadosAnuncio.length > 0 ? `(${interesadosAnuncio.length})` : ''}
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

        <div
          onClick={() => {
            setTabActiva('clientes');
            setFiltro('inactivos_10d');
          }}
          className="bg-slate-900/80 border border-slate-800 hover:border-rose-500/40 p-4 rounded-2xl cursor-pointer transition-colors"
        >
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
                          estaInactivo10Dias(emp)
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
                          `Hola ${emp.nombre_dueno || ''}! Te escribimos del equipo de GEMI por el sistema de ${emp.nombre}.`
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

                    {/* Botón Importar Excel / CSV (Exclusivo Super Admin) */}
                    <button
                      type="button"
                      onClick={() => abrirImportadorCliente(emp)}
                      title={`Importar Excel / CSV para ${emp.nombre}`}
                      className="bg-emerald-500/10 hover:bg-emerald-600 border border-emerald-500/30 text-emerald-400 hover:text-white font-bold px-3 py-2 rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" /> Importar Excel
                    </button>

                    {/* Botón Gestor de Categorías (Exclusivo Super Admin) */}
                    <button
                      type="button"
                      onClick={() => abrirGestorCategorias(emp)}
                      title={`Cargar o editar categorías de ${emp.nombre}`}
                      className="bg-sky-500/10 hover:bg-sky-500 border border-sky-500/30 text-sky-400 hover:text-slate-950 font-bold px-3 py-2 rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Tags className="w-3.5 h-3.5" /> Categorías
                    </button>

                    {/* Botón E-Commerce Tiendanube + API Web (Exclusivo Super Admin) */}
                    <button
                      type="button"
                      onClick={() => abrirEcommerceCliente(emp)}
                      title={`Conectar Tiendanube o API Web Propia de ${emp.nombre}`}
                      className="bg-indigo-500/10 hover:bg-indigo-500 border border-indigo-500/30 text-indigo-400 hover:text-white font-bold px-3 py-2 rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5" /> E-Commerce
                    </button>

                    <button
                      type="button"
                      onClick={() => abrirConfiguracionArcaCliente(emp)}
                      title="Configurar Facturación Electrónica ARCA (Servicio Setup)"
                      className="bg-amber-500/10 hover:bg-amber-500 border border-amber-500/30 text-amber-400 hover:text-slate-950 font-bold px-3 py-2 rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" /> ARCA / AFIP
                    </button>

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
            <select
              value={nuevaMejoraLocal}
              onChange={(e) => setNuevaMejoraLocal(e.target.value)}
              className="sm:w-64 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="General">General / Idea Interna</option>
              {empresas.map((emp) => (
                <option key={emp.empresa_id} value={emp.nombre}>
                  {emp.nombre} {emp.es_marca_interna ? '(Marca Propia)' : ''}
                </option>
              ))}
            </select>
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
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en_progreso">En desarrollo</option>
                    <option value="completado">Listo ✅</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleEliminarMejora(m.id)}
                    title="Eliminar pedido"
                    className="p-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 rounded-xl cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ANUNCIO GLOBAL */}
      {tabActiva === 'anuncios' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-sky-400" />
              <h3 className="font-black text-base text-white">Banner de Novedades para Todos los Locales</h3>
            </div>
            <p className="text-xs text-slate-400">
              Si lo activás, aparecerá arriba en todos los locales con un botón <strong>"Estamos interesados"</strong> para medir demanda antes de programar.
            </p>

            <textarea
              rows={3}
              placeholder="Ej. 🚀 Próximamente: Calendario Super Extremo con recordatorios a clientes. ¿Lo querés en tu local?"
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

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-white">
                  Locales Interesados ({interesadosAnuncio.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Tiendas que hicieron clic en "Estamos interesados" en este anuncio.
                </p>
              </div>
              {interesadosAnuncio.length > 0 && (
                <button
                  type="button"
                  onClick={handleReiniciarInteresados}
                  className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-xl cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Limpiar lista
                </button>
              )}
            </div>

            {interesadosAnuncio.length === 0 ? (
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-6 text-center text-xs text-slate-500">
                Todavía ningún local tocó el botón de interés en el anuncio actual.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {interesadosAnuncio.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs"
                  >
                    <span className="font-black text-emerald-400">🙋‍♂️ {item.nombre}</span>
                    <span className="text-slate-500">
                      {new Date(item.fecha).toLocaleDateString('es-AR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL E-COMMERCE: TIENDANUBE & API WEB PROPIA (EXCLUSIVO SUPER ADMIN) */}
      {empresaEcommerceSeleccionada && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 space-y-5 my-auto shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                  Integración Omnicanal · Solo SuperAdmin
                </span>
                <h3 className="font-black text-lg text-white flex items-center gap-2 mt-0.5">
                  <Globe className="w-5 h-5 text-sky-400" />
                  E-Commerce · {empresaEcommerceSeleccionada.nombre}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEmpresaEcommerceSeleccionada(null)}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cargandoEcommerce ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Cargando configuración de tienda online...
              </div>
            ) : (
              <div className="space-y-5">
                {/* Switches de permisos por plan */}
                <div className="flex flex-wrap gap-3 text-xs">
                  <label className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={modulosEcommerce.modulo_tiendanube}
                      onChange={(e) => handleToggleModuloEcommerce('modulo_tiendanube', e.target.checked)}
                    />
                    <span className="font-bold text-slate-200">Habilitar Tiendanube (Turbo IA / Élite)</span>
                  </label>

                  <label className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={modulosEcommerce.modulo_api_web}
                      onChange={(e) => handleToggleModuloEcommerce('modulo_api_web', e.target.checked)}
                    />
                    <span className="font-bold text-slate-200">Habilitar API Web Propia (Élite)</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Bloque 1: Tiendanube */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-black text-white">1. Tiendanube OAuth & Sync</h4>
                      {integracionEcommerce?.tiendanube_conectado ? (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          ● {integracionEcommerce.tiendanube_store_name}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          Sin vincular
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase text-slate-400">
                        Link para mandar al dueño por WhatsApp
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={linkInvitacionTiendanube}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 font-mono text-[11px] text-slate-300"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(linkInvitacionTiendanube);
                            setCopiadoLinkTn(true);
                            setTimeout(() => setCopiadoLinkTn(false), 2500);
                          }}
                          className="px-3 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl text-xs font-black cursor-pointer inline-flex items-center gap-1 shrink-0"
                        >
                          {copiadoLinkTn ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                          {copiadoLinkTn ? 'Copiado' : 'Copiar'}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        El dueño entra a ese link, toca Autorizar con su cuenta y queda vinculado sin pasarte claves.
                      </p>
                    </div>

                    {integracionEcommerce?.tiendanube_conectado && (
                      <div className="space-y-3 pt-3 border-t border-slate-800">
                        <div>
                          <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                            Sucursal que abastece la Tienda Online
                          </label>
                          <select
                            value={integracionEcommerce.sucursal_stock_id || ''}
                            onChange={(e) => handleCambiarSucursalStockEcommerce(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-semibold"
                          >
                            <option value="">-- Seleccionar sucursal --</option>
                            {sucursalesEcommerce.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.nombre}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          disabled={sincronizandoEcommerce}
                          onClick={handleSincronizarTodoTiendanube}
                          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
                        >
                          <RefreshCw className={`w-4 h-4 ${sincronizandoEcommerce ? 'animate-spin' : ''}`} />
                          {sincronizandoEcommerce ? 'Sincronizando...' : 'Auto-Vincular y Sincronizar Todo'}
                        </button>

                        {integracionEcommerce.resumen_ultima_sync && (
                          <p className="text-[11px] text-emerald-400 font-semibold">
                            ✓ {integracionEcommerce.resumen_ultima_sync.vinculados_auto} variantes vinculadas ·{' '}
                            {integracionEcommerce.resumen_ultima_sync.sin_coincidencia || 0} sin coincidencia
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bloque 2: API Key Web Propia */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
                    <h4 className="text-sm font-black text-white">2. API Web Propia (Plan Élite)</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Clave privada para conectar páginas web propias fuera de Tiendanube (header <code className="text-sky-400">x-api-key</code>).
                    </p>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={integracionEcommerce?.api_key_publica || ''}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 font-mono text-xs text-sky-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(integracionEcommerce?.api_key_publica || '');
                          setCopiadoApiKey(true);
                          setTimeout(() => setCopiadoApiKey(false), 2000);
                        }}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1 shrink-0"
                      >
                        {copiadoApiKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiadoApiKey ? 'Copiada' : 'Copiar'}
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-400 bg-slate-900/70 border border-slate-800 rounded-xl p-3 break-all">
                      <span className="block font-bold text-slate-300 mb-1">Endpoint Stock & Ventas:</span>
                      <code>{`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tiendanube-sync`}</code>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL GESTOR DE CATEGORÍAS POR EMPRESA */}
      {empresaCategoriasSeleccionada && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-400">
                  Gestión Rápida de Rubros
                </span>
                <h3 className="font-black text-base text-white flex items-center gap-2 mt-0.5">
                  <Tags className="w-4 h-4 text-sky-400" />
                  Categorías · {empresaCategoriasSeleccionada.nombre}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEmpresaCategoriasSeleccionada(null)}
                className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAgregarCategoriaEmpresa} className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Ej. Remeras Manga Corta, Buzos, Jeans..."
                value={nuevaCategoriaNombre}
                onChange={(e) => setNuevaCategoriaNombre(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                autoFocus
              />
              <button
                type="submit"
                disabled={guardandoCategoria}
                className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-black px-4 py-2 rounded-xl text-xs inline-flex items-center gap-1 cursor-pointer"
              >
                {guardandoCategoria ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Agregar
              </button>
            </form>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {cargandoCategorias ? (
                <p className="text-center text-xs text-slate-500 py-6">Cargando categorías...</p>
              ) : categoriasEmpresa.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-6">
                  Esta empresa todavía no tiene categorías cargadas.
                </p>
              ) : (
                categoriasEmpresa.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl text-xs"
                  >
                    <span className="font-bold text-white">{cat.nombre}</span>
                    <button
                      type="button"
                      onClick={() => handleEliminarCategoriaEmpresa(cat)}
                      title="Eliminar categoría"
                      className="text-slate-500 hover:text-rose-400 p-1 rounded cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEmpresaCategoriasSeleccionada(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORTADOR EXCEL / CSV POR EMPRESA */}
      {empresaImportarSeleccionada && !cargandoDatosImportar && sucursalesImportar.length > 0 && (
        <ImportadorCatalogoModal
          isOpen={Boolean(empresaImportarSeleccionada)}
          onClose={() => setEmpresaImportarSeleccionada(null)}
          empresaId={empresaImportarSeleccionada.empresa_id}
          empresaNombre={empresaImportarSeleccionada.nombre}
          sucursalId={sucursalesImportar[0].id}
          sucursalNombre={sucursalesImportar[0].nombre}
          sucursalesDisponibles={sucursalesImportar}
          categorias={categoriasImportar}
          talles={tallesCatalogo}
          onImportacionCompleta={cargarTodo}
        />
      )}

      {/* MODAL CONFIGURACIÓN ARCA (EXCLUSIVO SUPER ADMIN POR EMPRESA) */}
      {empresaArcaSeleccionada && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-5xl w-full p-5 sm:p-6 space-y-4 my-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                  Configuración Técnica Exclusiva Super Admin
                </span>
                <h3 className="font-black text-lg text-white">
                  Facturación Electrónica ARCA · {empresaArcaSeleccionada.nombre}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEmpresaArcaSeleccionada(null)}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cargandoSucsArca ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Cargando sucursales y certificados fiscales de {empresaArcaSeleccionada.nombre}...
              </div>
            ) : (
              <ConfiguracionArcaCard
                empresaId={empresaArcaSeleccionada.empresa_id}
                usuarioId={perfil?.id}
                usuarioNombre={`${perfil?.nombre || ''} ${perfil?.apellido || ''}`.trim()}
                sucursales={sucursalesEmpresaArca}
                onActualizarSucursales={() => abrirConfiguracionArcaCliente(empresaArcaSeleccionada)}
              />
            )}
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white [color-scheme:dark]"
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
                  Link de Pago Mercado Pago (Opcional: si queda vacío usa Checkout Automático)
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

            <div className="border-t border-slate-800 pt-3">
              <span className="block text-xs font-bold text-slate-400 mb-2">Módulos Activos en este Local</span>
              <div className="flex flex-wrap gap-3 text-xs">
                {MODULOS_DISPONIBLES.map((mod) => (
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