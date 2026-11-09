import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon, 
  X, 
  Check, 
  Trash2,
} from 'lucide-react';

interface Evento {
  id: string;
  titulo: string;
  descripcion?: string;
  fecha_inicio: string;
  fecha_fin?: string;
  monto?: number | null;
  tipo: 'cheque' | 'proveedor' | 'gasto_fijo' | 'general';
  estado: 'pendiente' | 'pagado' | 'cancelado';
  color: string;
}

const DIAS_CABECERA = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  indigo: { bg: 'bg-indigo-600/80 hover:bg-indigo-600', text: 'text-white', border: 'border-indigo-400/40' },
  emerald: { bg: 'bg-emerald-600/80 hover:bg-emerald-600', text: 'text-white', border: 'border-emerald-400/40' },
  amber: { bg: 'bg-amber-600/80 hover:bg-amber-600', text: 'text-white', border: 'border-amber-400/40' },
  rose: { bg: 'bg-rose-600/80 hover:bg-rose-600', text: 'text-white', border: 'border-rose-400/40' },
  sky: { bg: 'bg-sky-600/80 hover:bg-sky-600', text: 'text-white', border: 'border-sky-400/40' },
};

export const CalendarioView = () => {
  const { perfil, empresa } = useAuth();

  const fechaHoy = new Date();
  const [mesActual, setMesActual] = useState(fechaHoy.getMonth());
  const [anioActual, setAnioActual] = useState(fechaHoy.getFullYear());
  const [eventos, setEventos] = useState<Evento[]>([]);

  // Modal Crear / Editar
  const [modalAbierto, setModalAbierto] = useState(false);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<Evento | null>(null);

  // Formulario
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [monto, setMonto] = useState('');
  const [tipo, setTipo] = useState<'cheque' | 'proveedor' | 'gasto_fijo' | 'general'>('proveedor');
  const [color, setColor] = useState('indigo');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarEventos();
  }, [mesActual, anioActual, empresa?.id]);

  const cargarEventos = async () => {
    const empresaId = empresa?.id || perfil?.empresa_id;
    if (!empresaId) return;

    // Rango del mes visible con margen para días de meses adyacentes
    const primerDia = new Date(anioActual, mesActual - 1, 20).toISOString().split('T')[0];
    const ultimoDia = new Date(anioActual, mesActual + 2, 10).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('calendario_eventos')
      .select('*')
      .eq('empresa_id', empresaId)
      .gte('fecha_inicio', primerDia)
      .lte('fecha_inicio', ultimoDia)
      .order('fecha_inicio', { ascending: true });

    if (!error && data) {
      setEventos(data as Evento[]);
    }
  };

  const cambiarMes = (delta: number) => {
    let nuevoMes = mesActual + delta;
    let nuevoAnio = anioActual;
    if (nuevoMes < 0) {
      nuevoMes = 11;
      nuevoAnio -= 1;
    } else if (nuevoMes > 11) {
      nuevoMes = 0;
      nuevoAnio += 1;
    }
    setMesActual(nuevoMes);
    setAnioActual(nuevoAnio);
  };

  const irAHoy = () => {
    const hoy = new Date();
    setMesActual(hoy.getMonth());
    setAnioActual(hoy.getFullYear());
  };

  const abrirModalCrear = (fechaSugerida?: string) => {
    setEventoSeleccionado(null);
    setTitulo('');
    setDescripcion('');
    setFechaInicio(fechaSugerida || new Date().toISOString().split('T')[0]);
    setMonto('');
    setTipo('proveedor');
    setColor('indigo');
    setModalAbierto(true);
  };

  const abrirModalEditar = (ev: Evento) => {
    setEventoSeleccionado(ev);
    setTitulo(ev.titulo);
    setDescripcion(ev.descripcion || '');
    setFechaInicio(ev.fecha_inicio);
    setMonto(ev.monto ? String(ev.monto) : '');
    setTipo(ev.tipo);
    setColor(ev.color || 'indigo');
    setModalAbierto(true);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const empresaId = empresa?.id || perfil?.empresa_id;
    if (!empresaId || !titulo.trim() || !fechaInicio) return;

    setGuardando(true);

    const payload = {
      empresa_id: empresaId,
      creador_id: perfil?.id,
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || null,
      fecha_inicio: fechaInicio,
      monto: monto ? parseFloat(monto) : null,
      tipo,
      color,
    };

    if (eventoSeleccionado) {
      await supabase
        .from('calendario_eventos')
        .update(payload)
        .eq('id', eventoSeleccionado.id);
    } else {
      await supabase
        .from('calendario_eventos')
        .insert(payload);
    }

    setGuardando(false);
    setModalAbierto(false);
    cargarEventos();
  };

  const toggleEstadoEvento = async (ev: Evento) => {
    const nuevoEstado = ev.estado === 'pagado' ? 'pendiente' : 'pagado';
    await supabase
      .from('calendario_eventos')
      .update({ estado: nuevoEstado })
      .eq('id', ev.id);
    cargarEventos();
  };

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Eliminar este compromiso?')) return;
    await supabase.from('calendario_eventos').delete().eq('id', id);
    setModalAbierto(false);
    cargarEventos();
  };

  // Construcción de la matriz del mes
  const primerDiaMes = new Date(anioActual, mesActual, 1);
  const ultimoDiaMes = new Date(anioActual, mesActual + 1, 0);
  const diaSemanaInicio = primerDiaMes.getDay(); // 0 = Domingo
  const totalDiasMes = ultimoDiaMes.getDate();

  const celdas: { diaNumero: number; fechaStr: string; esMesActual: boolean }[] = [];

  // Días previos del mes anterior para completar la primera fila
  const ultimoDiaMesAnterior = new Date(anioActual, mesActual, 0).getDate();
  for (let i = diaSemanaInicio - 1; i >= 0; i--) {
    const diaNum = ultimoDiaMesAnterior - i;
    const mesAnt = mesActual === 0 ? 11 : mesActual - 1;
    const anioAnt = mesActual === 0 ? anioActual - 1 : anioActual;
    const fechaStr = `${anioAnt}-${String(mesAnt + 1).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`;
    celdas.push({ diaNumero: diaNum, fechaStr, esMesActual: false });
  }

  // Días del mes en curso
  for (let d = 1; d <= totalDiasMes; d++) {
    const fechaStr = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    celdas.push({ diaNumero: d, fechaStr, esMesActual: true });
  }

  // Días siguientes para completar la última semana
  const remanente = (7 - (celdas.length % 7)) % 7;
  for (let d = 1; d <= remanente; d++) {
    const mesSig = mesActual === 11 ? 0 : mesActual + 1;
    const anioSig = mesActual === 11 ? anioActual + 1 : anioActual;
    const fechaStr = `${anioSig}-${String(mesSig + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    celdas.push({ diaNumero: d, fechaStr, esMesActual: false });
  }

  const fechaHoyStr = new Date().toISOString().split('T')[0];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-950 text-white select-none">
      {/* Barra superior estilo Google Calendar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-slate-100 tracking-tight">Calendario</span>
          </div>

          <button
            onClick={irAHoy}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
          >
            Hoy
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => cambiarMes(-1)}
              className="p-1.5 hover:bg-slate-800 text-slate-300 rounded-full transition cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => cambiarMes(1)}
              className="p-1.5 hover:bg-slate-800 text-slate-300 rounded-full transition cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <h2 className="text-xl font-semibold text-white min-w-48">
            {MESES[mesActual]} de {anioActual}
          </h2>
        </div>

        <button
          onClick={() => abrirModalCrear()}
          className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Crear Compromiso
        </button>
      </header>

      {/* Cabecera de días de la semana */}
      <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900/60 text-xs font-semibold text-slate-400 text-center py-2">
        {DIAS_CABECERA.map((dia) => (
          <div key={dia}>{dia}</div>
        ))}
      </div>

      {/* Grilla mensual de celdas */}
      <div className="grid grid-cols-7 flex-1 divide-x divide-y divide-slate-800 overflow-y-auto">
        {celdas.map((celda, idx) => {
          const esHoy = celda.fechaStr === fechaHoyStr;
          const eventosDelDia = eventos.filter((e) => e.fecha_inicio === celda.fechaStr);

          return (
            <div
              key={idx}
              onClick={() => abrirModalCrear(celda.fechaStr)}
              className={`p-2 flex flex-col justify-between min-h-[110px] cursor-pointer transition hover:bg-slate-900/40 ${
                !celda.esMesActual ? 'bg-slate-950/40 text-slate-600' : 'text-slate-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <span
                  className={`text-xs font-mono font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                    esHoy
                      ? 'bg-sky-500 text-slate-950 shadow-md'
                      : celda.esMesActual
                      ? 'text-slate-300'
                      : 'text-slate-600'
                  }`}
                >
                  {celda.diaNumero}
                </span>

                {eventosDelDia.length > 0 && (
                  <span className="text-[10px] font-mono text-slate-500">
                    {eventosDelDia.length}
                  </span>
                )}
              </div>

              {/* Lista de tarjetas horizontales estilo Google Calendar */}
              <div className="mt-1 space-y-1 overflow-y-auto max-h-24">
                {eventosDelDia.map((ev) => {
                  const estColor = COLOR_MAP[ev.color] || COLOR_MAP.indigo;
                  const estaPagado = ev.estado === 'pagado';

                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirModalEditar(ev);
                      }}
                      className={`text-[11px] px-2 py-1 rounded border font-medium truncate flex items-center justify-between gap-1 shadow-xs transition ${
                        estColor.bg
                      } ${estColor.text} ${estColor.border} ${
                        estaPagado ? 'opacity-50 line-through' : ''
                      }`}
                      title={`${ev.titulo}${ev.monto ? ` - $${ev.monto.toLocaleString()}` : ''}`}
                    >
                      <span className="truncate">{ev.titulo}</span>
                      {ev.monto && (
                        <span className="text-[10px] font-mono font-bold shrink-0">
                          ${Number(ev.monto).toLocaleString()}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal para Crear / Editar Compromiso */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-sky-400" />
                {eventoSeleccionado ? 'Detalle del Compromiso' : 'Nuevo Compromiso'}
              </h3>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardar} className="space-y-3 text-xs">
              <div>
                <label className="block uppercase font-bold text-slate-400 mb-1">
                  Título del Vencimiento / Evento
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Cheque Taller Confección, Alquiler Local, Tela Morley"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase font-bold text-slate-400 mb-1">Fecha Límite</label>
                  <input
                    type="date"
                    required
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block uppercase font-bold text-slate-400 mb-1">Monto ($ Opcional)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ej. 180000"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase font-bold text-slate-400 mb-1">Tipo de Compromiso</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="cheque">Cheque</option>
                    <option value="proveedor">Proveedor / Taller</option>
                    <option value="gasto_fijo">Gasto Fijo / Alquiler</option>
                    <option value="general">Nota / Tarea Operativa</option>
                  </select>
                </div>

                <div>
                  <label className="block uppercase font-bold text-slate-400 mb-1">Color de Etiqueta</label>
                  <select
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="indigo">Violeta / Azul (Clásico)</option>
                    <option value="emerald">Verde (Ingreso / Pagado)</option>
                    <option value="amber">Amarillo (Precaución / Banco)</option>
                    <option value="rose">Rojo (Urgente / Vencimiento)</option>
                    <option value="sky">Celeste (General)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block uppercase font-bold text-slate-400 mb-1">Descripción / Notas</label>
                <textarea
                  rows={2}
                  placeholder="Número de cheque, banco, detalle de prendas a retirar..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                {eventoSeleccionado ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleEstadoEvento(eventoSeleccionado)}
                      className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer text-xs ${
                        eventoSeleccionado.estado === 'pagado'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      {eventoSeleccionado.estado === 'pagado' ? 'Marcar Pendiente' : 'Marcar Pagado'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEliminar(eventoSeleccionado.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <span />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModalAbierto(false)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardando}
                    className="px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 rounded-xl font-black uppercase tracking-wider cursor-pointer"
                  >
                    {guardando ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};