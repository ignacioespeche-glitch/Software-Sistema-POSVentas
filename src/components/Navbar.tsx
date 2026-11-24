import { useEffect, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Sucursal } from '../types/database';
import {
  Store,
  ShoppingCart,
  DollarSign,
  BookmarkCheck,
  RotateCcw,
  Boxes,
  ArrowLeftRight,
  ShieldAlert,
  LogOut,
  Wifi,
  WifiOff,
  Menu,
  X,
  CheckSquare,
  Calendar,
  Sparkles
} from 'lucide-react';

export const Navbar = () => {
  const { perfil, empresa, sucursalActiva, setSucursalActiva, cajaActiva, cerrarSesion } = useAuth();
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [online, setOnline] = useState(navigator.onLine);
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    if (empresa?.id) {
      supabase
        .from('sucursales')
        .select('*')
        .eq('empresa_id', empresa.id)
        .order('nombre')
        .then(({ data }) => {
          if (data) setSucursales(data as Sucursal[]);
        });
    }

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [empresa?.id]);

  const esAdmin = perfil?.rol === 'admin';
  const cerrarMenu = () => setMenuAbierto(false);
  const nombreMarca = empresa?.nombre?.toUpperCase() || 'GEMI POS';
  const nombreLocalActual = sucursalActiva?.nombre || 'Local';

  return (
    <>
      <header className="bg-slate-950 border-b border-slate-800/80 px-3 md:px-5 py-2.5 flex items-center justify-between text-xs sticky top-0 z-40 select-none">
        {/* Izquierda: Botón 3 líneas + Marca + Selector de Sucursal */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="p-2 text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors cursor-pointer"
            aria-label="Abrir menú de navegación"
            title="Menú de secciones"
          >
            {menuAbierto ? <X className="w-5 h-5 text-sky-400" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2 hover:opacity-85 transition-opacity cursor-pointer"
          >
            <span className="font-black text-sm md:text-base tracking-widest text-white">{nombreMarca}</span>
            <span className="text-[9px] md:text-[10px] bg-slate-900 text-sky-400 font-mono px-1.5 py-0.5 rounded border border-slate-800">
              v1.0
            </span>
          </Link>

          <div className="hidden sm:block">
            {esAdmin ? (
              <div className="relative flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200">
                <Store className="w-3.5 h-3.5 text-sky-400 mr-2 shrink-0" />
                <select
                  value={sucursalActiva?.id || ''}
                  onChange={(e) => {
                    const encontrada = sucursales.find((s) => s.id === e.target.value);
                    if (encontrada) setSucursalActiva(encontrada);
                  }}
                  className="bg-transparent font-bold text-xs text-white focus:outline-none cursor-pointer pr-2"
                >
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id} className="bg-slate-950 text-white">
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center bg-slate-900/90 border border-slate-800/80 rounded-xl px-3 py-1.5 text-slate-200">
                <Store className="w-3.5 h-3.5 text-sky-400 mr-2 shrink-0" />
                <span className="font-bold text-xs text-white">
                  {sucursalActiva?.nombre || 'Mi Sucursal'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Derecha: Accesos directos Dueños (GEMI AI + Panel Admin) + Estado + Perfil */}
        <div className="flex items-center gap-2 md:gap-3">
          {esAdmin && (
            <div className="hidden md:flex items-center gap-1.5 mr-1">
              {(empresa as any)?.modulo_campaign_studio !== false && (
                <NavLink
                  to="/gemi-ai"
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-colors ${
                      isActive
                        ? 'bg-sky-500 text-slate-950 shadow-sm'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 hover:text-sky-300 hover:border-sky-500/40'
                    }`
                  }
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>GEMI AI</span>
                </NavLink>
              )}

              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-colors ${
                    isActive
                      ? 'bg-sky-500 text-slate-950 shadow-sm'
                      : 'bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20'
                  }`
                }
              >
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>Panel Admin</span>
              </NavLink>
            </div>
          )}

          <div
            className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
              online ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
            }`}
          >
            {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{online ? 'Online' : 'Offline'}</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
              cajaActiva ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${cajaActiva ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            <span className="hidden xs:inline">{cajaActiva ? 'Caja Abierta' : 'Caja Cerrada'}</span>
            <span className="xs:hidden">{cajaActiva ? 'Abierta' : 'Cerrada'}</span>
          </div>

          <div className="hidden md:flex items-center gap-2.5 border-l border-slate-800 pl-3">
            <div className="text-right leading-tight">
              <p className="font-bold text-slate-200 text-xs">
                {perfil?.nombre} {perfil?.apellido || ''}
              </p>
              <p className="text-[10px] text-sky-400 uppercase font-bold">{perfil?.rol}</p>
            </div>

            <button
              onClick={cerrarSesion}
              title="Cerrar sesión"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Menú lateral desplegable */}
      {menuAbierto && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
            onClick={cerrarMenu}
          />

          <aside className="relative w-72 max-w-[85vw] bg-slate-950 border-r border-slate-800 h-full p-5 flex flex-col justify-between shadow-2xl overflow-y-auto">
            <div className="space-y-5">
              {/* Cabecera del menú */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <Link
                  to="/"
                  onClick={() => {
                    cerrarMenu();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex items-center gap-2"
                >
                  <span className="font-black text-base tracking-widest text-white">{nombreMarca}</span>
                  <span className="text-[10px] bg-slate-900 text-sky-400 font-mono px-1.5 py-0.5 rounded border border-slate-800">
                    v1.0
                  </span>
                </Link>
                <button
                  onClick={cerrarMenu}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Selector de Sucursal dentro del menú */}
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2 block">
                  Sucursal de Trabajo
                </span>
                {esAdmin ? (
                  <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200">
                    <Store className="w-4 h-4 text-sky-400 mr-2 shrink-0" />
                    <select
                      value={sucursalActiva?.id || ''}
                      onChange={(e) => {
                        const encontrada = sucursales.find((s) => s.id === e.target.value);
                        if (encontrada) setSucursalActiva(encontrada);
                      }}
                      className="bg-transparent font-bold text-xs text-white focus:outline-none w-full cursor-pointer"
                    >
                      {sucursales.map((s) => (
                        <option key={s.id} value={s.id} className="bg-slate-950 text-white">
                          {s.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200">
                    <Store className="w-4 h-4 text-sky-400 mr-2.5 shrink-0" />
                    <span className="font-bold text-xs text-white">
                      {sucursalActiva?.nombre || 'Mi Sucursal'}
                    </span>
                  </div>
                )}
              </div>

              {/* Lista de Secciones */}
              <nav className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2 block">
                  Operación Diaria
                </span>

                <NavLink
                  to="/"
                  onClick={cerrarMenu}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20' : 'text-slate-300 hover:bg-slate-900'
                    }`
                  }
                >
                  <ShoppingCart className="w-4 h-4 shrink-0" />
                  Tus Ventas
                </NavLink>

                <NavLink
                  to="/caja"
                  onClick={cerrarMenu}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20' : 'text-slate-300 hover:bg-slate-900'
                    }`
                  }
                >
                  <DollarSign className="w-4 h-4 shrink-0" />
                  Tu Caja
                </NavLink>

                {empresa?.modulo_senas !== false && (
                  <NavLink
                    to="/reservas"
                    onClick={cerrarMenu}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isActive ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20' : 'text-slate-300 hover:bg-slate-900'
                      }`
                    }
                  >
                    <BookmarkCheck className="w-4 h-4 shrink-0" />
                    Reservas
                  </NavLink>
                )}

                {empresa?.modulo_cambios !== false && (
                  <NavLink
                    to="/cambios"
                    onClick={cerrarMenu}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isActive ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20' : 'text-slate-300 hover:bg-slate-900'
                      }`
                    }
                  >
                    <RotateCcw className="w-4 h-4 shrink-0" />
                    Cambios
                  </NavLink>
                )}

                <NavLink
                  to="/catalogo"
                  onClick={cerrarMenu}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20' : 'text-slate-300 hover:bg-slate-900'
                    }`
                  }
                >
                  <Boxes className="w-4 h-4 shrink-0" />
                  Tus Prendas
                </NavLink>

                {empresa?.modulo_traspasos && (
                  <NavLink
                    to="/traspasos"
                    onClick={cerrarMenu}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isActive ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20' : 'text-slate-300 hover:bg-slate-900'
                      }`
                    }
                  >
                    <ArrowLeftRight className="w-4 h-4 shrink-0" />
                    Mover Stock
                  </NavLink>
                )}

                {Boolean((empresa as any)?.modulo_tareas) && (
                  <NavLink
                    to="/tareas"
                    onClick={cerrarMenu}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isActive ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20' : 'text-slate-300 hover:bg-slate-900'
                      }`
                    }
                  >
                    <CheckSquare className="w-4 h-4 shrink-0" />
                    Tareas
                  </NavLink>
                )}

                {(empresa as any)?.modulo_calendario !== false && (
                  <NavLink
                    to="/calendario"
                    onClick={cerrarMenu}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isActive ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20' : 'text-slate-300 hover:bg-slate-900'
                      }`
                    }
                  >
                    <Calendar className="w-4 h-4 shrink-0" />
                    Agenda {nombreLocalActual}
                  </NavLink>
                )}

                {esAdmin && (
                  <div className="pt-3 mt-3 border-t border-slate-800/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2 block">
                      Dirección & Marketing
                    </span>

                    {(empresa as any)?.modulo_campaign_studio !== false && (
                      <NavLink
                        to="/gemi-ai"
                        onClick={cerrarMenu}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            isActive
                              ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                              : 'text-sky-400 bg-sky-500/10 border border-sky-500/20'
                          }`
                        }
                      >
                        <Sparkles className="w-4 h-4 shrink-0" />
                        GEMI AI
                      </NavLink>
                    )}

                    <NavLink
                      to="/admin"
                      onClick={cerrarMenu}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                            : 'text-sky-400 bg-sky-500/10 border border-sky-500/20'
                        }`
                      }
                    >
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      Panel Admin
                    </NavLink>
                  </div>
                )}
              </nav>
            </div>

            {/* Pie del menú con usuario y cerrar sesión */}
            <div className="pt-4 border-t border-slate-800 space-y-3 mt-6">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-xs">
                    {perfil?.nombre} {perfil?.apellido || ''}
                  </p>
                  <p className="text-[10px] text-sky-400 uppercase font-bold">{perfil?.rol}</p>
                </div>
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    online ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                  }`}
                >
                  {online ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                  <span>{online ? 'Online' : 'Offline'}</span>
                </div>
              </div>

              <button
                onClick={cerrarSesion}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600/10 border border-rose-500/30 text-rose-400 hover:bg-rose-600 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Cerrar Sesión
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};