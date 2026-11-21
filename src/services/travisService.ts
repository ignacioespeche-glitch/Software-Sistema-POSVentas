import { supabase } from '../lib/supabase';

export interface OportunidadCampana {
  producto_id: string;
  producto_nombre: string;
  imagen_url: string | null;
  precio_costo: number;
  precio_venta: number;
  margen_actual_pct: number;
  stock_total: number;
  unidades_vendidas_30d: number;
  tipo_oportunidad: 'liquidacion' | 'producto_estrella' | 'exceso_inventario' | 'venta_cruzada' | 'caida_ventas' | 'estacional';
  prioridad: number;
  descuento_max_sugerido_pct: number;
  motivo_recomendacion: string;
}

export interface BrandKit {
  id?: string;
  empresa_id: string;
  nombre_marca: string;
  logo_principal_url: string | null;
  logo_secundario_url?: string | null;
  color_primario: string;
  color_secundario: string;
  color_acento: string;
  tipografia_titulos: string;
  tipografia_cuerpo: string;
  tono_comunicacion: string;
  estilo_fotografico: string;
  reglas_identidad?: string | null;
  margen_minimo_pct: number;
}

export const travisService = {
  // 1. Detectar oportunidades comerciales reales de la empresa
  async obtenerOportunidades(empresaId: string): Promise<OportunidadCampana[]> {
    const { data, error } = await supabase.rpc('detectar_oportunidades_campana', {
      p_empresa_id: empresaId,
    });
    if (error) throw error;
    return (data ?? []).map((item: any) => ({
      ...item,
      precio_costo: Number(item.precio_costo),
      precio_venta: Number(item.precio_venta),
      margen_actual_pct: Number(item.margen_actual_pct),
      stock_total: Number(item.stock_total),
      unidades_vendidas_30d: Number(item.unidades_vendidas_30d),
      descuento_max_sugerido_pct: Number(item.descuento_max_sugerido_pct),
    }));
  },

  // 2. Listar campañas de la empresa
  async listarCampanas(empresaId: string) {
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        campaign_promotions (*),
        campaign_objectives (*),
        campaign_metrics (*)
      `)
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  // 3. Obtener detalle completo de una campaña
  async obtenerDetalleCampana(campaignId: string) {
    const [
      { data: campana, error: cErr },
      { data: productos },
      { data: promociones },
      { data: copies },
      { data: assets },
      { data: calendario },
      { data: objetivos },
      { data: metricas },
    ] = await Promise.all([
      supabase.from('campaigns').select('*').eq('id', campaignId).single(),
      supabase.from('campaign_products').select('*, productos(imagen_url)').eq('campaign_id', campaignId),
      supabase.from('campaign_promotions').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: false }),
      supabase.from('campaign_copies').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: true }),
      supabase.from('campaign_assets').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: true }),
      supabase.from('campaign_calendar').select('*').eq('campaign_id', campaignId).order('fecha_programada', { ascending: true }),
      supabase.from('campaign_objectives').select('*').eq('campaign_id', campaignId),
      supabase.from('campaign_metrics').select('*').eq('campaign_id', campaignId).maybeSingle(),
    ]);

    if (cErr) throw cErr;
    return {
      campana,
      productos: productos ?? [],
      promociones: promociones ?? [],
      copies: copies ?? [],
      assets: assets ?? [],
      calendario: calendario ?? [],
      objetivos: objetivos ?? [],
      metricas,
    };
  },

  // 4. Invocar a TRAVIS AI Orchestrator (Edge Function)
  async generarCampanaConIA(payload: {
    origen: 'manual' | 'opportunity_finder';
    tipo_oportunidad?: string;
    datos_respaldo?: Record<string, unknown>;
    objetivo_usuario?: string;
    productos: { producto_id: string; rol_en_campana?: 'principal' | 'combo' | 'cross_sell' }[];
    descuento_solicitado_pct?: number;
  }) {
    const { data, error } = await supabase.functions.invoke('travis-orchestrator', {
      body: payload,
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  },

  // 5. Actualizar simulación de promoción (Promotion Engine en vivo)
  async actualizarPromocion(
    promoId: string,
    updates: {
      nombre_promo?: string;
      valor_descuento: number;
      precio_promocional_promedio: number;
      margen_bruto_resultante_pct: number;
      alerta_margen: boolean;
      mensaje_alerta: string | null;
      estado_aprobacion?: 'pendiente' | 'aprobado' | 'rechazado' | 'requiere_cambios';
    }
  ) {
    const { data, error } = await supabase
      .from('campaign_promotions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', promoId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 6. Editar o aprobar un copy
  async actualizarCopy(
    copyId: string,
    updates: {
      titulo?: string;
      cuerpo?: string;
      llamado_accion?: string;
      estado_aprobacion?: 'pendiente' | 'aprobado' | 'rechazado' | 'requiere_cambios';
    }
  ) {
    const { data, error } = await supabase
      .from('campaign_copies')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', copyId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 7. Aprobar pieza visual o campaña completa
  async aprobarComponente(params: {
    empresaId: string;
    campaignId: string;
    componenteTipo: 'estrategia' | 'promocion' | 'copy' | 'pieza_grafica' | 'calendario' | 'campana_completa';
    componenteId: string;
    accion: 'aprobado' | 'rechazado' | 'requiere_cambios';
    usuarioId: string;
    comentarios?: string;
  }) {
    await supabase.from('campaign_approvals').insert({
      empresa_id: params.empresaId,
      campaign_id: params.campaignId,
      componente_tipo: params.componenteTipo,
      componente_id: params.componenteId,
      accion: params.accion,
      comentarios: params.comentarios ?? null,
      revisado_por: params.usuarioId,
    });

    if (params.componenteTipo === 'campana_completa' && params.accion === 'aprobado') {
      await supabase
        .from('campaigns')
        .update({ estado: 'activa', updated_at: new Date().toISOString() })
        .eq('id', params.campaignId);
    }
  },

  // 8. Obtener y guardar Brand Kit
  async obtenerBrandKit(empresaId: string): Promise<BrandKit | null> {
    const { data, error } = await supabase
      .from('brand_kits')
      .select('*')
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async guardarBrandKit(kit: BrandKit): Promise<BrandKit> {
    const { data, error } = await supabase
      .from('brand_kits')
      .upsert(
        {
          ...kit,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'empresa_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 9. Subir logo o foto de producto al bucket privado 'campaign-studio'
  async subirArchivoPrivado(empresaId: string, carpeta: string, file: File): Promise<string> {
    const ext = file.name.split('.').pop() || 'png';
    const path = `${empresaId}/${carpeta}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('campaign-studio').upload(path, file, {
      upsert: true,
    });
    if (error) throw error;

    const { data: signed } = await supabase.storage
      .from('campaign-studio')
      .createSignedUrl(path, 60 * 60 * 24 * 365);

    return signed?.signedUrl ?? path;
  },
};