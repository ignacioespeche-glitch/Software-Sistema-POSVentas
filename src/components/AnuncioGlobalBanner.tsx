import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Megaphone, Hand, CheckCircle2, MessageCircle, X } from 'lucide-react';

interface Interesado {
  empresa_id: string;
  nombre: string;
  fecha: string;
}

interface AnuncioGlobal {
  id: string;
  mensaje: string;
  activo: boolean;
  interesados: Interesado[];
}

export const AnuncioGlobalBanner = () => {
  const { perfil } = useAuth();
  const [anuncio, setAnuncio] = useState<AnuncioGlobal | null>(null);
  const [empresaNombre, setEmpresaNombre] = useState<string>('');
  const [enviando, setEnviando] = useState(false);
  const [cerradoTemporal, setCerradoTemporal] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase
        .from('saas_anuncios')
        .select('id, mensaje, activo, interesados')
        .eq('activo', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) setAnuncio(data as AnuncioGlobal);

      if (perfil?.empresa_id) {
        const { data: emp } = await supabase
          .from('empresas')
          .select('nombre')
          .eq('id', perfil.empresa_id)
          .single();
        if (emp) setEmpresaNombre(emp.nombre);
      }
    };

    cargar();
  }, [perfil?.empresa_id]);

  if (!anuncio || !anuncio.activo || cerradoTemporal || !perfil?.empresa_id) {
    return null;
  }

  const yaInteresado = (anuncio.interesados || []).some(
    (i) => i.empresa_id === perfil.empresa_id
  );

  const handleMeInteresa = async () => {
    if (yaInteresado || enviando) return;
    setEnviando(true);

    const nombreFinal = empresaNombre || 'Local Cliente';
    await supabase.rpc('registrar_interes_anuncio', {
      p_anuncio_id: anuncio.id,
      p_empresa_id: perfil.empresa_id,
      p_empresa_nombre: nombreFinal
    });

    setAnuncio({
      ...anuncio,
      interesados: [
        ...(anuncio.interesados || []),
        { empresa_id: perfil.empresa_id, nombre: nombreFinal, fecha: new Date().toISOString() }
      ]
    });
    setEnviando(false);
  };

  const whatsappUrl = `https://wa.me/5492610000000?text=${encodeURIComponent(
    `Hola equipo de G.E.M.I.! Somos de *${empresaNombre || 'nuestro local'}* y estamos interesados en la novedad: "${anuncio.mensaje}".`
  )}`;

  return (
    <div className="bg-sky-500/15 border-b border-sky-500/30 text-sky-100 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Megaphone className="w-4 h-4 text-sky-400 shrink-0" />
        <span className="font-semibold">{anuncio.mensaje}</span>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {yaInteresado ? (
          <span className="inline-flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold px-2.5 py-1 rounded-lg text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" /> ¡Interés registrado!
          </span>
        ) : (
          <button
            type="button"
            disabled={enviando}
            onClick={handleMeInteresa}
            className="inline-flex items-center gap-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black px-3 py-1 rounded-lg text-[11px] cursor-pointer transition-colors"
          >
            <Hand className="w-3.5 h-3.5" />
            {enviando ? 'Enviando...' : 'Estamos interesados'}
          </button>
        )}

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          title="Escribir por WhatsApp con mensaje prearmado"
          className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold px-2.5 py-1 rounded-lg text-[11px] transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp
        </a>

        <button
          type="button"
          onClick={() => setCerradoTemporal(true)}
          className="text-slate-400 hover:text-white p-1 cursor-pointer"
          title="Ocultar por ahora"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
