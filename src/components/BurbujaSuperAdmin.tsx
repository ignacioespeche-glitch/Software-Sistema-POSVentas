import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export const CORREOS_FUNDADORES = [
  'igna03espeche@gmail.com',
  'ignacioespeche4@gmail.com',
  'giulimicarelli1@gmail.com',
  'gimenezjuan2468@gmail.com'
];

export const BurbujaSuperAdmin = () => {
  const [esFundador, setEsFundador] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data?.user?.email?.toLowerCase() || '';
      setEsFundador(CORREOS_FUNDADORES.includes(email));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email?.toLowerCase() || '';
      setEsFundador(CORREOS_FUNDADORES.includes(email));
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (!esFundador) {
    return null;
  }

  const estaEnSuperAdmin = location.pathname === '/superadmin';

  return (
    <button
      type="button"
      onClick={() => navigate(estaEnSuperAdmin ? '/' : '/superadmin')}
      title={estaEnSuperAdmin ? 'Volver al Punto de Venta' : 'Abrir Panel SuperAdmin'}
      className="fixed bottom-5 left-5 z-50 group flex items-center gap-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black p-3.5 rounded-full shadow-2xl shadow-sky-500/30 border-2 border-slate-950 transition-all duration-200 hover:scale-105 cursor-pointer"
    >
      {estaEnSuperAdmin ? (
        <>
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          <span className="text-xs uppercase tracking-wider pr-1">Volver al POS</span>
        </>
      ) : (
        <>
          <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
          <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 text-xs uppercase tracking-wider">
            SuperAdmin
          </span>
        </>
      )}
    </button>
  );
};